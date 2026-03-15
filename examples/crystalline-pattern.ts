import { createBagl } from '../src/index';
import { Pane } from 'tweakpane';

export function createCrystallinePatternExample() {
  const bagl = createBagl();

  const params = {
    // uPeriod: 5.0,
    uWarpStrength: 0.3,
    uWarpFreq: 0.3,
    uWarpSpeed: 0.1,
    uRotationAmount: 1.0,
    uLayer1Freq: 1.0,
    uLayer2Freq: 2.0,
    uLayer3Freq: 4.0,
    uLayer2Mix: 0.5,
    uLayer3Mix: 0.3,
  };

  const pane = (new Pane()) as any;
  // pane.addBinding(params, 'uPeriod', { min: 2, max: 15, step: 0.5 });
  pane.addBinding(params, 'uWarpStrength', { min: 0, max: 1, step: 0.01 });
  pane.addBinding(params, 'uWarpFreq', { min: 0.1, max: 1, step: 0.05 });
  pane.addBinding(params, 'uWarpSpeed', { min: 0, max: 0.5, step: 0.01 });
  pane.addBinding(params, 'uRotationAmount', { min: 0, max: 2, step: 0.1 });
  pane.addBinding(params, 'uLayer1Freq', { min: 0.5, max: 3, step: 0.1 });
  pane.addBinding(params, 'uLayer2Freq', { min: 1, max: 6, step: 0.1 });
  pane.addBinding(params, 'uLayer3Freq', { min: 2, max: 12, step: 0.1 });
  pane.addBinding(params, 'uLayer2Mix', { min: 0, max: 1, step: 0.05 });
  pane.addBinding(params, 'uLayer3Mix', { min: 0, max: 1, step: 0.05 });

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

  const drawCrystalline = bagl({
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

    uniform vec2 uResolution;
    uniform float uTime;
    // uniform float uPeriod;
    uniform float uWarpStrength;
    uniform float uWarpFreq;
    uniform float uWarpSpeed;
    uniform float uRotationAmount;
    uniform float uLayer1Freq;
    uniform float uLayer2Freq;
    uniform float uLayer3Freq;
    uniform float uLayer2Mix;
    uniform float uLayer3Mix;

    // ---------- Hash functions for randomization ----------
    
    float hash11(float p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p * (p * p * 15731.0 + 789221.0) + 1376312589.0);
    }

    vec2 hash21(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * vec3(0.3183099, 0.3678794, 0.3183099));
      p3 += dot(p3, p3.yzx + 19.19);
      return fract((p3.xx + p3.yz) * p3.zy);
    }

    float hash31(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * vec3(0.3183099, 0.3678794, 0.3183099));
      p3 += dot(p3, p3.yzx + 19.19);
      return fract((p3.x + p3.y) * p3.z);
    }

    // ---------- Noise functions ----------

    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      float n000 = hash11(dot(i + vec3(0.0, 0.0, 0.0), vec3(37.0, 17.0, 13.0)));
      float n100 = hash11(dot(i + vec3(1.0, 0.0, 0.0), vec3(37.0, 17.0, 13.0)));
      float n010 = hash11(dot(i + vec3(0.0, 1.0, 0.0), vec3(37.0, 17.0, 13.0)));
      float n110 = hash11(dot(i + vec3(1.0, 1.0, 0.0), vec3(37.0, 17.0, 13.0)));
      float n001 = hash11(dot(i + vec3(0.0, 0.0, 1.0), vec3(37.0, 17.0, 13.0)));
      float n101 = hash11(dot(i + vec3(1.0, 0.0, 1.0), vec3(37.0, 17.0, 13.0)));
      float n011 = hash11(dot(i + vec3(0.0, 1.0, 1.0), vec3(37.0, 17.0, 13.0)));
      float n111 = hash11(dot(i + vec3(1.0, 1.0, 1.0), vec3(37.0, 17.0, 13.0)));

      float nx00 = mix(n000, n100, f.x);
      float nx10 = mix(n010, n110, f.x);
      float nx01 = mix(n001, n101, f.x);
      float nx11 = mix(n011, n111, f.x);

      float nxy0 = mix(nx00, nx10, f.y);
      float nxy1 = mix(nx01, nx11, f.y);

      return mix(nxy0, nxy1, f.z);
    }

    float snoise(vec3 p) {
      return noise(p) * 2.0 - 1.0;
    }

    // ---------- Domain warping ----------

    vec2 warp(vec2 uv, float t) {
      float n1 = snoise(vec3(uv * uWarpFreq * 0.5, t * uWarpSpeed));
      float n2 = snoise(vec3(uv * uWarpFreq + vec2(10.0, 0.0), t * uWarpSpeed));
      return uv + vec2(n1, n2) * uWarpStrength;
    }

    // ---------- Rotation matrix ----------

    mat2 rot(float angle) {
      float c = cos(angle);
      float s = sin(angle);
      return mat2(c, -s, s, c);
    }

    // ---------- Sharp structural motifs (V/arrow-like shapes) ----------

    float motif(vec2 p) {
      // Create V-shaped or arrow-like patterns using SDFs and lines
      
      // V shape using two lines
      float v1 = abs(p.y - 0.3 * abs(p.x));
      float v2 = abs(p.y + 0.3 * abs(p.x));
      float v = min(v1, v2);
      
      // Horizontal line
      float h = abs(p.y);
      
      // Diagonal lines
      float d1 = abs(p.x - p.y) * 0.7;
      float d2 = abs(p.x + p.y) * 0.7;
      
      // Combine into sharp crystalline pattern
      float pattern = min(min(v, h), min(d1, d2));
      
      // Create sharp edges with smoothstep
      return smoothstep(0.01, 0.0, pattern);
    }

    // ---------- Base repetition function ----------

    vec2 repeat(vec2 uv, float period) {
      return fract(uv * period);
    }

    // ---------- Pattern layer with cell-based variation ----------

    float patternLayer(vec2 uv, float freq) {
      // Apply domain warping first
      vec2 warped = warp(uv, uTime);
      
      // Apply hex/tri basis skew to create non-square cells
      // This transforms square cells into triangular/hexagonal cells
      mat2 B = mat2(1.0, 0.0,
                    0.5, 0.8660254); // sqrt(3)/2
      vec2 uvh = B * warped;
      
      // Get cell coordinates using skewed coordinates
      vec2 cell = floor(uvh * freq);
      vec2 local = fract(uvh * freq) - 0.5;
      
      // Use cell index as seed for variation
      float seed = hash31(cell);
      float angle = seed * 6.28318 * uRotationAmount;
      
      // Rotate the local coordinates
      mat2 rotation = rot(angle);
      vec2 rotated = rotation * local;
      
      // Apply motif
      return motif(rotated);
    }

    // ---------- Main shader ----------

    void main() {
      vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
      uv.x *= uResolution.x / uResolution.y;
      
      // Layered repetition with different frequencies
      float layer1 = patternLayer(uv, uLayer1Freq);
      float layer2 = patternLayer(uv, uLayer2Freq);
      float layer3 = patternLayer(uv, uLayer3Freq);
      
      // Combine layers
      float pattern = layer1;
      pattern = mix(pattern, layer2, uLayer2Mix);
      pattern += layer3 * uLayer3Mix;
      
      // Clamp and enhance contrast
      pattern = clamp(pattern, 0.0, 1.0);
      
      // Color mapping - crystalline blue/white theme
      vec3 baseColor = vec3(0.05, 0.08, 0.12);
      vec3 patternColor = vec3(0.9, 0.95, 1.0);
      
      vec3 color = mix(baseColor, patternColor, pattern);
      
      // Add slight color variation based on position
      float colorVar = noise(vec3(uv * 2.0, uTime * 0.1)) * 0.1;
      color += vec3(colorVar);
      
      fragColor = vec4(color, 1.0);
    }
    `,

    attributes: {
      position: positions,
    },

    count: 6,

    uniforms: {
      uTime: (ctx: any) => ctx.time,
      uResolution: (ctx: any) => [ctx.width, ctx.height],
      // // uPeriod: () => params.uPeriod,
      uWarpStrength: () => params.uWarpStrength,
      uWarpFreq: () => params.uWarpFreq,
      uWarpSpeed: () => params.uWarpSpeed,
      uRotationAmount: () => params.uRotationAmount,
      uLayer1Freq: () => params.uLayer1Freq,
      uLayer2Freq: () => params.uLayer2Freq,
      uLayer3Freq: () => params.uLayer3Freq,
      uLayer2Mix: () => params.uLayer2Mix,
      uLayer3Mix: () => params.uLayer3Mix,
    },

    depth: {
      enable: false,
    },
  });

  function render(props: any = {}) {
    bagl.clear({ color: [0, 0, 0, 1], depth: 1 });
    drawCrystalline(props);
  }

  return { bagl, render };
}
