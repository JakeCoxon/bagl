import { createBagl } from '../src/index';
import { Pane } from 'tweakpane';

export function createDomainWarpedWorleyExample() {
  const bagl = createBagl();

  const params = {
    uScale: 6.0,
    uWarpStrength: 0.5,
    uWarpSpeed: 1.0,
    uSmoothness: 0.4,
    uWarpFreq: 1.5,
    uWarpTimeScale: 0.1,
    uFbmOctaves: 3,
    uJitter: 0.9,
    uAnimRadius: 0.08,
    uAnimSpeed: 0.2,
    uDistVariation: 0.3,
    uContrast: 0.9,
    uColorIntensity: 1.2,
    uHueOffset: 0.0,
  };

  const pane = (new Pane()) as any;
  const scaleFolder = pane.addFolder({ title: 'Scale & Pattern' });
  scaleFolder.addBinding(params, 'uScale', { min: 1, max: 20, step: 0.5 });
  scaleFolder.addBinding(params, 'uSmoothness', { min: 0, max: 1, step: 0.01 });
  scaleFolder.addBinding(params, 'uJitter', { min: 0, max: 1, step: 0.01 });
  
  const warpFolder = pane.addFolder({ title: 'Domain Warp' });
  warpFolder.addBinding(params, 'uWarpStrength', { min: 0, max: 2, step: 0.05 });
  warpFolder.addBinding(params, 'uWarpSpeed', { min: 0, max: 3, step: 0.1 });
  warpFolder.addBinding(params, 'uWarpFreq', { min: 0.5, max: 3, step: 0.1 });
  warpFolder.addBinding(params, 'uWarpTimeScale', { min: 0, max: 0.5, step: 0.01 });
  warpFolder.addBinding(params, 'uFbmOctaves', { min: 1, max: 5, step: 1 });
  
  const animFolder = pane.addFolder({ title: 'Animation' });
  animFolder.addBinding(params, 'uAnimRadius', { min: 0, max: 0.3, step: 0.01 });
  animFolder.addBinding(params, 'uAnimSpeed', { min: 0, max: 1, step: 0.01 });
  
  const colorFolder = pane.addFolder({ title: 'Color & Post' });
  colorFolder.addBinding(params, 'uDistVariation', { min: 0, max: 1, step: 0.01 });
  colorFolder.addBinding(params, 'uContrast', { min: 0.5, max: 1.5, step: 0.01 });
  colorFolder.addBinding(params, 'uColorIntensity', { min: 0.5, max: 2, step: 0.05 });
  colorFolder.addBinding(params, 'uHueOffset', { min: 0, max: 6.28, step: 0.1 });

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

  const drawWorley = bagl({
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
    uniform float uWarpStrength;
    uniform float uWarpSpeed;
    uniform float uSmoothness;
    uniform float uWarpFreq;
    uniform float uWarpTimeScale;
    uniform float uFbmOctaves;
    uniform float uJitter;
    uniform float uAnimRadius;
    uniform float uAnimSpeed;
    uniform float uDistVariation;
    uniform float uContrast;
    uniform float uColorIntensity;
    uniform float uHueOffset;

    // Hash function for generating pseudo-random points
    vec2 hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.xx + p3.yz) * p3.zy);
    }

    // 3D noise for domain warping
    float hash3(vec3 p) {
      p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise3(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      float n000 = hash3(i + vec3(0.0, 0.0, 0.0));
      float n100 = hash3(i + vec3(1.0, 0.0, 0.0));
      float n010 = hash3(i + vec3(0.0, 1.0, 0.0));
      float n110 = hash3(i + vec3(1.0, 1.0, 0.0));
      float n001 = hash3(i + vec3(0.0, 0.0, 1.0));
      float n101 = hash3(i + vec3(1.0, 0.0, 1.0));
      float n011 = hash3(i + vec3(0.0, 1.0, 1.0));
      float n111 = hash3(i + vec3(1.0, 1.0, 1.0));

      float nx00 = mix(n000, n100, f.x);
      float nx10 = mix(n010, n110, f.x);
      float nx01 = mix(n001, n101, f.x);
      float nx11 = mix(n011, n111, f.x);

      float nxy0 = mix(nx00, nx10, f.y);
      float nxy1 = mix(nx01, nx11, f.y);

      return mix(nxy0, nxy1, f.z);
    }

    // FBM for smooth domain warping
    float fbm(vec3 p) {
      float sum = 0.0;
      float amp = 0.5;
      float freq = 1.0;
      float octaves = clamp(uFbmOctaves, 1.0, 5.0);
      for (int i = 0; i < 5; i++) {
        float weight = step(float(i), octaves - 0.5);
        sum += weight * amp * noise3(p * freq);
        freq *= 2.0;
        amp *= 0.5;
      }
      return sum;
    }

    // Domain warp function - warps 2D coordinates using 3D noise
    vec2 domainWarp(vec2 p) {
      float time = uTime * uWarpSpeed;
      vec3 warpSeed = vec3(p * uWarpFreq, time * uWarpTimeScale);
      
      // Get warping offsets from noise
      vec2 warp = vec2(
        fbm(warpSeed + vec3(0.0, 13.7, 27.1)),
        fbm(warpSeed + vec3(39.4, 7.5, 18.3))
      );
      
      // Map from [0,1] to [-1,1] and apply strength
      warp = (warp * 2.0 - 1.0) * uWarpStrength;
      
      return p + warp;
    }

    // Worley noise (Voronoi) with smooth interpolation
    vec3 worleyNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);

      // k controls smoothness: higher = sharper, lower = smoother
      float k = mix(32.0, 1.0, uSmoothness);
      
      float minDist = 1e10;
      float secondDist = 1e10;
      vec3 closestColor = vec3(0.0);
      vec3 secondColor = vec3(0.0);
      
      // Check 3x3 neighborhood
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 cell = i + neighbor;
          vec2 h = hash(cell);
          
          // Center and scale the jitter
          vec2 jitter = (h - 0.5) * uJitter;
          vec2 point = neighbor + 0.5 + jitter;
          
          // Subtle animation
          float phase = h.x * 6.28;
          point += uAnimRadius * vec2(
            sin(uTime * uAnimSpeed + phase), 
            cos(uTime * uAnimSpeed + phase * 1.3)
          );
          
          // Distance from current point to feature point
          vec2 r = point - f;
          float d = length(r);
          
          // Track closest and second closest
          if (d < minDist) {
            secondDist = minDist;
            secondColor = closestColor;
            minDist = d;
            closestColor = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + h.x * 6.28 + uHueOffset);
          } else if (d < secondDist) {
            secondDist = d;
            secondColor = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + h.x * 6.28 + uHueOffset);
          }
        }
      }
      
      // Use exponential weighting for smooth blending
      float weight1 = exp(-k * minDist);
      float weight2 = exp(-k * secondDist);
      float totalWeight = weight1 + weight2;
      
      // Blend between closest and second closest
      vec3 col = (weight1 * closestColor + weight2 * secondColor) / totalWeight;
      
      // Add distance-based variation
      float distVariation = minDist * 0.5;
      col = mix(col, vec3(distVariation), uDistVariation);
      
      return col;
    }

    void main() {
      vec2 uv = vUv;
      uv.x *= uResolution.x / uResolution.y;
      
      // Scale the space
      vec2 p = uv * uScale;
      
      // Apply domain warping before computing Worley noise
      vec2 warpedP = domainWarp(p);
      
      // Compute Worley noise on the warped coordinates
      vec3 col = worleyNoise(warpedP);
      
      // Enhance contrast and add subtle color grading
      col = pow(col, vec3(uContrast));
      col = mix(vec3(0.1, 0.05, 0.15), col, uColorIntensity);
      
      // Gamma correction
      col = pow(col, vec3(1.0 / 2.2));
      
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
      uScale: () => params.uScale,
      uWarpStrength: () => params.uWarpStrength,
      uWarpSpeed: () => params.uWarpSpeed,
      uSmoothness: () => params.uSmoothness,
      uWarpFreq: () => params.uWarpFreq,
      uWarpTimeScale: () => params.uWarpTimeScale,
      uFbmOctaves: () => params.uFbmOctaves,
      uJitter: () => params.uJitter,
      uAnimRadius: () => params.uAnimRadius,
      uAnimSpeed: () => params.uAnimSpeed,
      uDistVariation: () => params.uDistVariation,
      uContrast: () => params.uContrast,
      uColorIntensity: () => params.uColorIntensity,
      uHueOffset: () => params.uHueOffset,
    },

    depth: {
      enable: false,
    },
  });

  function render(props: any = {}) {
    bagl.clear({ color: [0, 0, 0, 1], depth: 1 });
    drawWorley(props);
  }

  return { bagl, render };
}
