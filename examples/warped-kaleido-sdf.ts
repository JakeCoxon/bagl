import { createBagl } from '../src/index';
import { Pane } from 'tweakpane';

export function createWarpedKaleidoSdfExample() {
  const bagl = createBagl();

  const params = {
    uKaleidoSlices: 7.0,
    uCellSize: 0.7,
    uWobbleAmplitude: 0.25,
    uWobbleFreq: 6.0,
    uWobbleSpeed: 0.8,
    uBaseRadius: 0.55,
    uBaseAmp1: 0.18,
    uBaseAmp2: 0.08,
    uBaseSpeed1: 0.7,
    uBaseSpeed2: 0.9,
    uTrailSteps: 6,
    uTimeOffset: 0.07,
    uFadeRate: 0.7,
    uExtraWarpAmp: 0.12,
    uExtraWarpFreq: 4.0,
    uExtraWarpSpeed: 0.9,
    uContourFreq: 5.0,
    uContourIntensity: 0.4,
    uEdgeWidth: 1.5,
    uVignetteOuter: 1.6,
    uVignetteInner: 0.4,
  };

  const pane = (new Pane()) as any;
  const kaleidoFolder = pane.addFolder({ title: 'Kaleidoscope' });
  kaleidoFolder.addBinding(params, 'uKaleidoSlices', { min: 3, max: 12, step: 1 });
  
  const warpFolder = pane.addFolder({ title: 'Chunk Warp' });
  warpFolder.addBinding(params, 'uCellSize', { min: 0.3, max: 1.5, step: 0.1 });
  warpFolder.addBinding(params, 'uWobbleAmplitude', { min: 0, max: 0.5, step: 0.01 });
  warpFolder.addBinding(params, 'uWobbleFreq', { min: 2, max: 12, step: 0.5 });
  warpFolder.addBinding(params, 'uWobbleSpeed', { min: 0, max: 2, step: 0.1 });
  
  const sdfFolder = pane.addFolder({ title: 'SDF Shape' });
  sdfFolder.addBinding(params, 'uBaseRadius', { min: 0.3, max: 0.8, step: 0.01 });
  sdfFolder.addBinding(params, 'uBaseAmp1', { min: 0, max: 0.3, step: 0.01 });
  sdfFolder.addBinding(params, 'uBaseAmp2', { min: 0, max: 0.2, step: 0.01 });
  sdfFolder.addBinding(params, 'uBaseSpeed1', { min: 0, max: 2, step: 0.1 });
  sdfFolder.addBinding(params, 'uBaseSpeed2', { min: 0, max: 2, step: 0.1 });
  
  const trailFolder = pane.addFolder({ title: 'Trails' });
  trailFolder.addBinding(params, 'uTrailSteps', { min: 3, max: 10, step: 1 });
  trailFolder.addBinding(params, 'uTimeOffset', { min: 0.01, max: 0.15, step: 0.01 });
  trailFolder.addBinding(params, 'uFadeRate', { min: 0.3, max: 1.5, step: 0.1 });
  trailFolder.addBinding(params, 'uExtraWarpAmp', { min: 0, max: 0.3, step: 0.01 });
  trailFolder.addBinding(params, 'uExtraWarpFreq', { min: 2, max: 8, step: 0.5 });
  trailFolder.addBinding(params, 'uExtraWarpSpeed', { min: 0, max: 2, step: 0.1 });
  
  const lineFolder = pane.addFolder({ title: 'Line Rendering' });
  lineFolder.addBinding(params, 'uContourFreq', { min: 2, max: 10, step: 0.5 });
  lineFolder.addBinding(params, 'uContourIntensity', { min: 0, max: 1, step: 0.05 });
  lineFolder.addBinding(params, 'uEdgeWidth', { min: 0.5, max: 3, step: 0.1 });
  
  const postFolder = pane.addFolder({ title: 'Post Processing' });
  postFolder.addBinding(params, 'uVignetteOuter', { min: 0.5, max: 2.5, step: 0.1 });
  postFolder.addBinding(params, 'uVignetteInner', { min: 0, max: 1, step: 0.1 });

  // Fullscreen quad positions and texture coordinates
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

  const texcoords = bagl.buffer({
    data: new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1,
    ]),
    size: 2,
  });

  const drawWarpedKaleido = bagl({
    vert: `#version 300 es
    precision highp float;
    in vec2 a_position;
    in vec2 a_texcoord0;
    out vec2 v_texcoord0;

    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texcoord0 = a_texcoord0;
    }
    `,

    frag: `#version 300 es
    precision highp float;
    in vec2 v_texcoord0;
    out vec4 color;

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform float uKaleidoSlices;
    uniform float uCellSize;
    uniform float uWobbleAmplitude;
    uniform float uWobbleFreq;
    uniform float uWobbleSpeed;
    uniform float uBaseRadius;
    uniform float uBaseAmp1;
    uniform float uBaseAmp2;
    uniform float uBaseSpeed1;
    uniform float uBaseSpeed2;
    uniform float uTrailSteps;
    uniform float uTimeOffset;
    uniform float uFadeRate;
    uniform float uExtraWarpAmp;
    uniform float uExtraWarpFreq;
    uniform float uExtraWarpSpeed;
    uniform float uContourFreq;
    uniform float uContourIntensity;
    uniform float uEdgeWidth;
    uniform float uVignetteOuter;
    uniform float uVignetteInner;

    // ----------------------------
    // Helpers
    // ----------------------------
    vec2 getSceneUV() {
      vec2 uv = v_texcoord0;
      vec2 p = uv * 2.0 - 1.0;
      float aspect = u_resolution.x / u_resolution.y;
      p.x *= aspect;
      return p;
    }

    // simple hash
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(27.1, 113.9))) * 43758.5453);
    }

    // Chunky warp field: space broken into big cells,
    // each cell has its own tiny rotation + wobble.
    // Uses smooth interpolation to avoid hard edges between cells.
    vec2 chunkWarp(vec2 p, float t) {
      vec2 cellSize = vec2(uCellSize);
      vec2 id = floor(p / cellSize);
      vec2 f  = fract(p / cellSize);        // local coords in cell [0,1)
      
      // Smooth interpolation curve (smoothstep)
      vec2 u = f * f * (3.0 - 2.0 * f);

      // Sample 4 neighboring cells for smooth interpolation
      vec2 id00 = id;
      vec2 id10 = id + vec2(1.0, 0.0);
      vec2 id01 = id + vec2(0.0, 1.0);
      vec2 id11 = id + vec2(1.0, 1.0);

      // Get hash and rotation for each corner
      float h00 = hash(id00);
      float h10 = hash(id10);
      float h01 = hash(id01);
      float h11 = hash(id11);
      
      float ang00 = h00 * 6.2831853;
      float ang10 = h10 * 6.2831853;
      float ang01 = h01 * 6.2831853;
      float ang11 = h11 * 6.2831853;
      
      mat2 R00 = mat2(cos(ang00), -sin(ang00), sin(ang00), cos(ang00));
      mat2 R10 = mat2(cos(ang10), -sin(ang10), sin(ang10), cos(ang10));
      mat2 R01 = mat2(cos(ang01), -sin(ang01), sin(ang01), cos(ang01));
      mat2 R11 = mat2(cos(ang11), -sin(ang11), sin(ang11), cos(ang11));

      // Local coordinates relative to each cell center
      // For cell 00: f is already in [0,1) relative to that cell
      // For other cells: compute f relative to that cell
      vec2 f10 = f - vec2(1.0, 0.0);
      vec2 f01 = f - vec2(0.0, 1.0);
      vec2 f11 = f - vec2(1.0, 1.0);
      
      vec2 local00 = f - 0.5;
      vec2 local10 = f10 - 0.5;
      vec2 local01 = f01 - 0.5;
      vec2 local11 = f11 - 0.5;
      
      vec2 wobble00 = uWobbleAmplitude * sin(local00 * uWobbleFreq + t * uWobbleSpeed);
      vec2 wobble10 = uWobbleAmplitude * sin(local10 * uWobbleFreq + t * uWobbleSpeed);
      vec2 wobble01 = uWobbleAmplitude * sin(local01 * uWobbleFreq + t * uWobbleSpeed);
      vec2 wobble11 = uWobbleAmplitude * sin(local11 * uWobbleFreq + t * uWobbleSpeed);

      // Transform for each corner
      vec2 q00 = (id00 + 0.5) * cellSize + R00 * (local00 + wobble00);
      vec2 q10 = (id10 + 0.5) * cellSize + R10 * (local10 + wobble10);
      vec2 q01 = (id01 + 0.5) * cellSize + R01 * (local01 + wobble01);
      vec2 q11 = (id11 + 0.5) * cellSize + R11 * (local11 + wobble11);

      // Bilinear interpolation
      vec2 q0 = mix(q00, q10, u.x);
      vec2 q1 = mix(q01, q11, u.x);
      vec2 q = mix(q0, q1, u.y);

      return q;
    }

    // Classic kaleidoscope, but applied in warped space
    vec2 kaleido(vec2 p, float slices) {
      float r = length(p);
      float a = atan(p.y, p.x);
      float s = 6.2831853 / slices;
      // mirror into wedge
      a = mod(a, s);
      a = abs(a - 0.5 * s);
      return vec2(cos(a), sin(a)) * r;
    }

    // ----------------------------
    // Base SDF shape (solid)
    // ----------------------------
    // Star-like ring
    float baseSDF(vec2 p, float t) {
      float r   = length(p);
      float ang = atan(p.y, p.x);
      float k = uBaseRadius
              + uBaseAmp1 * sin(6.0 * ang + t * uBaseSpeed1)
              + uBaseAmp2 * sin(12.0 * ang - t * uBaseSpeed2);
      // signed distance: inside < 0, outside > 0
      return r - k;
    }

    // Extract a thin line band around the zero-level
    float edgeFromSDF(float d) {
      float w = fwidth(d) * uEdgeWidth;
      return 1.0 - smoothstep(0.0, w, abs(d));
    }

    // Extra contour rings from the same SDF
    float contourFromSDF(float d, float freq) {
      float x = d * freq;
      float band = abs(fract(x + 0.5) - 0.5);
      float w = fwidth(d) * 0.8;
      return 1.0 - smoothstep(0.0, w * 3.0, band);
    }

    void main() {
      vec2 p = getSceneUV();
      float radial = length(p);
      float vignette = smoothstep(uVignetteOuter, uVignetteInner, radial);

      // --- warped kaleidoscope space ---
      vec2 q  = chunkWarp(p, u_time);       // irregular patches
      vec2 pk = kaleido(q, uKaleidoSlices);       // kaleidoscope in warped coords

      // --- time echo for trails ---
      vec3 acc = vec3(0.0);
      float total = 0.0;
      int steps = int(uTrailSteps);
      for (int i = 0; i < 10; ++i) {
        if (i >= steps) break;
        float fi   = float(i);
        float t    = u_time - fi * uTimeOffset;
        float fade = exp(-fi * uFadeRate);

        // small extra warp over time
        vec2 pw = pk + uExtraWarpAmp * sin(pk.yx * uExtraWarpFreq + t * uExtraWarpSpeed);
        float d = baseSDF(pw, t);
        float edge    = edgeFromSDF(d);
        float contour = contourFromSDF(d, uContourFreq);
        float line = edge + uContourIntensity * contour;

        acc   += line * fade;
        total += fade;
      }

      float lineCombined = acc.r / max(total, 1e-4);
      lineCombined = clamp(lineCombined, 0.0, 1.0);

      vec3 bg  = vec3(0.02, 0.02, 0.03);
      vec3 ink = vec3(1.0);
      vec3 col = mix(bg, ink, lineCombined);

      col *= vignette;

      color = vec4(col, 1.0);
    }
    `,

    attributes: {
      a_position: positions,
      a_texcoord0: texcoords,
    },

    count: 6,

    uniforms: {
      u_time: (context) => context.time,
      u_resolution: (context) => [context.width, context.height],
      uKaleidoSlices: () => params.uKaleidoSlices,
      uCellSize: () => params.uCellSize,
      uWobbleAmplitude: () => params.uWobbleAmplitude,
      uWobbleFreq: () => params.uWobbleFreq,
      uWobbleSpeed: () => params.uWobbleSpeed,
      uBaseRadius: () => params.uBaseRadius,
      uBaseAmp1: () => params.uBaseAmp1,
      uBaseAmp2: () => params.uBaseAmp2,
      uBaseSpeed1: () => params.uBaseSpeed1,
      uBaseSpeed2: () => params.uBaseSpeed2,
      uTrailSteps: () => params.uTrailSteps,
      uTimeOffset: () => params.uTimeOffset,
      uFadeRate: () => params.uFadeRate,
      uExtraWarpAmp: () => params.uExtraWarpAmp,
      uExtraWarpFreq: () => params.uExtraWarpFreq,
      uExtraWarpSpeed: () => params.uExtraWarpSpeed,
      uContourFreq: () => params.uContourFreq,
      uContourIntensity: () => params.uContourIntensity,
      uEdgeWidth: () => params.uEdgeWidth,
      uVignetteOuter: () => params.uVignetteOuter,
      uVignetteInner: () => params.uVignetteInner,
    },

    depth: {
      enable: false,
    },
  });

  function render(props: any = {}) {
    bagl.clear({ color: [0, 0, 0, 1], depth: 1 });
    drawWarpedKaleido(props);
  }

  return { bagl, render };
}
