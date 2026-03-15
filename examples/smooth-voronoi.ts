import { createBagl } from '../src/index';

export function createSmoothVoronoiExample() {
  const bagl = createBagl();

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
    out vec4 color;

    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uScale;
    uniform float uSmoothness;

    // Hash function to generate pseudo-random values with good distribution
    vec2 hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.xx + p3.yz) * p3.zy);
    }

    // Smooth Voronoi based on Inigo Quilez's article
    // Uses exponential weighting for smooth transitions
    vec3 smoothVoronoi(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);

      // k controls smoothness: higher = sharper, lower = smoother
      // Map uSmoothness (0-1) to k range (1-32)
      float k = mix(32.0, 1.0, uSmoothness);
      
      float res = 0.0;
      float totalWeight = 0.0;
      vec3 colorAccum = vec3(0.0); // Accumulate weighted colors
      
      // Check 3x3 neighborhood
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 cell = i + neighbor;
          vec2 h = hash(cell);
          
          // Center and scale the jitter for better distribution
          vec2 jitter = (h - 0.5) * 0.9;
          vec2 point = neighbor + 0.5 + jitter;
          
          // Subtle animation - gentle circular motion
          float phase = h.x * 6.28;
          float animRadius = 0.12;
          point += animRadius * vec2(
            sin(uTime * 0.3 + phase), 
            cos(uTime * 0.3 + phase * 1.3)
          );
          
          // Distance from current point to feature point
          vec2 r = point - f;
          float d = length(r);
          
          // Exponential weighting: closer points get more weight
          float weight = exp(-k * d);
          
          // Accumulate weighted distance (for distance field visualization)
          res += weight * d;
          totalWeight += weight;
          
          // Accumulate weighted color
          vec3 cellColor = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + h.x * 6.28);
          colorAccum += weight * cellColor;
        }
      }
      
      // Normalize: weighted average distance and color
      float smoothDist = res / totalWeight;
      vec3 smoothColor = colorAccum / totalWeight;
      
      // Return color and distance for potential use
      return vec3(smoothColor);
    }

    void main() {
      vec2 uv = vUv;
      uv.x *= uResolution.x / uResolution.y;
      
      // Scale the space
      vec2 p = uv * uScale;
      
      // Get smoothly blended color from Voronoi
      vec3 col = smoothVoronoi(p);
      
      col = pow(col, vec3(1.0 / 2.2)); // Gamma correction
      
      color = vec4(col, 1.0);
    }
    `,

    attributes: {
      position: positions,
    },

    count: 6,

    uniforms: {
      uTime: (ctx: any) => ctx.time,
      uResolution: (ctx: any) => [ctx.width, ctx.height],
      uScale: (_ctx: any, props: any) => props.scale ?? 8.0,
      uSmoothness: (_ctx: any, props: any) => props.smoothness ?? 0.35,
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