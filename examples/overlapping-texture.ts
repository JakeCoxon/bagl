import { createBagl } from '../src/index';
import { Pane } from 'tweakpane';

export function createOverlappingTextureExample() {
  const bagl = createBagl();

  const params = {
    uTiles: 8.0,
    uVarAmt: 0.25,
    uBlendSize: 0.55,
  };

  const pane = (new Pane()) as any;
  pane.addBinding(params, 'uTiles', { min: 1, max: 20, step: 0.5 });
  pane.addBinding(params, 'uVarAmt', { min: 0, max: 1, step: 0.01 });
  pane.addBinding(params, 'uBlendSize', { min: 0, max: 1, step: 0.01 });

  // Create a UV grid texture
  const textureSize = 256;
  const gridDivisions = 8; // Number of grid cells
  const lineWidth = 2; // Width of grid lines in pixels
  const textureData = new Uint8Array(textureSize * textureSize * 4);
  
  for (let y = 0; y < textureSize; y++) {
    for (let x = 0; x < textureSize; x++) {
      const idx = (y * textureSize + x) * 4;
      const u = x / textureSize;
      const v = y / textureSize;
      
      // Grid line detection - use local coordinates within each cell for seamless tiling
      const localU = (u * gridDivisions) % 1.0;
      const localV = (v * gridDivisions) % 1.0;
      
      // Check if we're on a grid line (accounting for edges)
      const gridLineThickness = lineWidth / textureSize * gridDivisions;
      const onGridLine = 
        localU < gridLineThickness ||
        localU > (1.0 - gridLineThickness) ||
        localV < gridLineThickness ||
        localV > (1.0 - gridLineThickness);
      
      // Use local coordinates for colors so each cell has the same pattern
      // This makes it tile seamlessly
      const r = localU; // Red increases with local U
      const g = localV; // Green increases with local V
      const b = 0.2; // Small blue component
      
      // Darker grid lines
      if (onGridLine) {
        textureData[idx] = Math.floor(r * 0.3 * 255);
        textureData[idx + 1] = Math.floor(g * 0.3 * 255);
        textureData[idx + 2] = Math.floor(b * 0.3 * 255);
      } else {
        textureData[idx] = Math.floor(r * 255);
        textureData[idx + 1] = Math.floor(g * 255);
        textureData[idx + 2] = Math.floor(b * 255);
      }
      textureData[idx + 3] = 255;
    }
  }

  const uTex = bagl.texture({
    data: textureData,
    width: textureSize,
    height: textureSize,
    format: 'rgba',
    wrapS: 'repeat', // Important for tiling
    wrapT: 'repeat', // Important for tiling
    min: 'linear',
    mag: 'linear',
  });

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

  const drawPattern = bagl({
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
    uniform float uTime;
    uniform sampler2D uTex;
    uniform float uTiles;
    uniform float uVarAmt;
    uniform float uBlendSize;

    // --- tiny hashing ---
    float hash11(float x) {
      return fract(sin(x * 1.2345679) * 43758.5453123);
    }

    float hash21(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    vec2 rand2(vec2 p) {
      float n = sin(dot(p, vec2(41.3, 289.1)));
      return fract(vec2(262144.0 * n, 32768.0 * n));
    }

    mat2 rot(float a) {
      float c = cos(a);
      float s = sin(a);
      return mat2(c, -s, s, c);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy / uRes) * 2.0 - 1.0;
      uv.x *= uRes.x / uRes.y;

      // base grid (unwarped) for stable IDs
      vec2 g = uv * uTiles;
      vec2 baseId = floor(g);
      vec2 f = fract(g) - 0.5; // local in [-.5,.5]

      // accumulate overlapping samples from neighbor cells
      vec3 acc = vec3(0.0);
      float wsum = 0.0;

      // 3x3 neighborhood; increase range for more overlap
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 id = baseId + vec2(float(i), float(j));
          
          // per-cell random params (locked to id)
          vec2 r2 = rand2(id);
          float a = (r2.x - 0.5) * 0.6 * uVarAmt;            // rotation
          float s = mix(0.9, 1.1, r2.y * uVarAmt);           // scale
          vec2 jtr = (rand2(id + 19.3) - 0.5) * 0.4 * uVarAmt;  // jitter

          // local coords for this neighbor cell
          vec2 local = (g - id) - 0.5; // [-.5,.5] in neighbor
          
          // Calculate blend weight BEFORE rotation so blend zones are square and align
          // square-based distance (Chebyshev/chessboard distance)
          float d = max(abs(local.x), abs(local.y)) / 0.5; // 0 at center, 1 at edge
          float w = smoothstep(uBlendSize, 0.0, d); // higher = more overlap
          
          // Now apply transform for texture sampling
          local = rot(a) * (local + jtr) / s;

          // convert to texture UV; wrap with fract() or set sampler to REPEAT
          vec2 st = fract(local + 0.5); // 0..1 within each transformed cell

          // sample the base texture
          vec3 c = texture(uTex, st).rgb;

          acc += c * w;
          wsum += w;
        }
      }

      vec3 col = acc / max(wsum, 1e-4);
      fragColor = vec4(col, 1.0);
    }
    `,

    attributes: {
      position: positions,
    },

    count: 6,

    uniforms: {
      // uTime: (ctx: any) => ctx.time,
      uRes: (ctx: any) => [ctx.width, ctx.height],
      uTex: () => uTex,
      uTiles: () => params.uTiles,
      uVarAmt: () => params.uVarAmt,
      uBlendSize: () => params.uBlendSize,
    },

    depth: {
      enable: false,
    },
  });

  function render(props: any = {}) {
    bagl.clear({ color: [0, 0, 0, 1], depth: 1 });
    drawPattern(props);
  }

  return { bagl, render };
}
