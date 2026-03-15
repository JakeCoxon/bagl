import { createBagl } from '../src/index';
import { Pane } from 'tweakpane';

export function createVoronoiOrganicExample() {
  const bagl = createBagl();

  const params = {
    uFreq: 4.0,
    uBand: 0.08,
    uScale: 400.0,
    uJitter: 0.5,
  };

  const pane = (new Pane()) as any;
  pane.addBinding(params, 'uFreq', { min: 0.5, max: 16, step: 0.5 });
  pane.addBinding(params, 'uBand', { min: 0.01, max: 0.3, step: 0.01 });
  pane.addBinding(params, 'uScale', { min: 100, max: 1000, step: 10 });
  pane.addBinding(params, 'uJitter', { min: 0, max: 1, step: 0.01 });

  // Fullscreen quad positions (two triangles)
  const positions = bagl.buffer({
    data: new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]),
    size: 2,
  });

  const drawVoronoi = bagl({
    vert: `#version 300 es
    in vec2 position;
    out vec2 vUv;

    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
    `,

    frag: `#version 300 es
    precision highp float;

    in vec2 vUv;
    out vec4 fragColor;

    uniform vec2 uRes;
    uniform float uFreq;
    uniform float uBand;
    uniform float uScale;
    uniform float uJitter;

    // --- tiny utils ---
    float hash11(float x) {
      return fract(sin(x * 1.1337) * 43758.5453);
    }

    vec2 hash21(vec2 p) {
      float n = sin(dot(p, vec2(27.168, 91.467)));
      return fract(vec2(262144.0 * n, 32768.0 * n));
    }

    float valueNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash11(dot(i + vec2(0.0, 0.0), vec2(1.0, 57.0)));
      float b = hash11(dot(i + vec2(1.0, 0.0), vec2(1.0, 57.0)));
      float c = hash11(dot(i + vec2(0.0, 1.0), vec2(1.0, 57.0)));
      float d = hash11(dot(i + vec2(1.0, 1.0), vec2(1.0, 57.0)));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    // Return nearest & 2nd-nearest Voronoi feature (F1/F2 data)
    struct VHit {
      vec2 id1, id2;
      vec2 g1, g2;
      float d1, d2;
    };

    VHit voronoiF1F2(vec2 p) {
      vec2 ip = floor(p);
      float d1 = 1e9;
      float d2 = 1e9;
      vec2 g1 = vec2(0.0);
      vec2 g2 = vec2(0.0);
      vec2 id1 = vec2(0.0);
      vec2 id2 = vec2(0.0);
      
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 o = vec2(float(x), float(y));
          vec2 cell = ip + o;
          
          // jittered feature point inside the cell (repeatable)
          vec2 j = (hash21(cell) - 0.5) * uJitter;
          vec2 fp = cell + 0.5 + j;          // feature position
          vec2 delta = p - fp;
          float d = dot(delta, delta);       // squared distance
          
          if (d < d1) {
            d2 = d1;
            g2 = g1;
            id2 = id1;
            d1 = d;
            g1 = fp;
            id1 = cell;
          } else if (d < d2 && d > d1) {  // Ensure d2 is different from d1
            d2 = d;
            g2 = fp;
            id2 = cell;
          }
        }
      }
      
      // Ensure we have valid F2 (fallback if all distances were equal)
      if (d2 >= 1e8) {
        d2 = d1 + 0.001;  // Small offset to ensure valid F2
        g2 = g1;
        id2 = id1;
      }
      
      VHit h;
      h.id1 = id1;
      h.id2 = id2;
      h.g1 = g1;
      h.g2 = g2;
      h.d1 = sqrt(d1);
      h.d2 = sqrt(d2);
      return h;
    }

    // Hard mix between two cells with ORGANIC boundary
    // - 'freq' controls how wiggly the cut is
    // - 'band' confines the wiggle to a small region around the natural edge
    bool chooseCellA(vec2 p, VHit h, float freq, float band) {
      // Signed edge signal: negative means inside A (nearest), positive toward B
      float e = h.d2 - h.d1;

      // Only let noise influence decision near the edge (keeps cores stable)
      // Use smooth falloff for better transitions
      float falloff = smoothstep(band, 0.0, abs(e));
      
      // Create stable noise field - use sorted cell IDs for consistency
      // This ensures the same noise value regardless of which cell we're evaluating from
      vec2 idMin = min(h.id1, h.id2);
      vec2 idMax = max(h.id1, h.id2);
      vec2 seed = idMin * 0.173 + idMax * 0.271;
      float n = valueNoise(p * freq + seed);
      
      // Offset should be proportional to band and falloff
      // Clamp offset to prevent it from being larger than the edge distance
      float maxOffset = abs(e) * 0.9;  // Don't let offset exceed 90% of edge distance
      float offset = clamp((n - 0.5) * 2.0 * band * falloff, -maxOffset, maxOffset);

      // Final hard decision (no blend)
      return (e + offset) < 0.0;
    }

    // Sample cell content
    vec3 sampleCell(vec2 p, vec2 gid, vec2 gpos) {
      // local UV inside that cell (rotate/scale/jitter as you like)
      vec2 local = p - gpos;               // centered at feature point
      
      // Per-cell color based on cell ID
      float hue = hash11(dot(gid, vec2(1.0, 57.0)));
      vec3 baseCol = 0.5 + 0.5 * cos(vec3(0.0, 2.094, 4.189) + hue * 6.28318); // HSV to RGB
      
      // Create a distinctive pattern - radial gradient with cross pattern
      float dist = length(local);
      float angle = atan(local.y, local.x);
      
      // Radial gradient from center
      float radial = 1.0 - smoothstep(0.0, 0.45, dist);
      
      // Cross pattern (4-fold symmetry)
      float cross = abs(sin(angle * 2.0)) * abs(cos(angle * 2.0));
      cross = smoothstep(0.3, 0.7, cross);
      
      // Combine patterns
      float pattern = mix(radial, cross, 0.4);
      
      // Add subtle edge highlight
      float edge = smoothstep(0.42, 0.45, dist);
      
      vec3 col = baseCol * (0.3 + 0.7 * pattern) + edge * 0.2;
      return col;
    }

    void main() {
      // world coords in "cell units"
      vec2 p = gl_FragCoord.xy / uScale;

      // Calculate Voronoi F1/F2 once
      VHit h = voronoiF1F2(p);
      
      // Choose which cell based on organic boundary
      bool pickA = chooseCellA(p, h, uFreq, uBand);

      // Sample both cells
      vec3 a = sampleCell(p, h.id1, h.g1);
      vec3 b = sampleCell(p, h.id2, h.g2);

      // HARD selection, no blending
      vec3 color = pickA ? a : b;
      fragColor = vec4(color, 1.0);
    }
    `,

    attributes: {
      position: positions,
    },

    count: 6,

    uniforms: {
      // uRes: (ctx: any) => [ctx.width, ctx.height],
      uFreq: () => params.uFreq,
      uBand: () => params.uBand,
      uScale: () => params.uScale,
      uJitter: () => params.uJitter,
    },

    depth: {
      enable: false,
    },
  });

  function render(props: any = {}) {
    bagl.clear({ color: [0, 0, 0, 1], depth: 1 });
    drawVoronoi(props);
  }

  return { bagl, render };
}
