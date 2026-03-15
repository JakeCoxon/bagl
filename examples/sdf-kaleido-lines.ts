import { createBagl } from '../src/index';

export function createSdfKaleidoLinesExample() {
  const bagl = createBagl();

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

  const drawKaleidoLines = bagl({
    vert: `#version 300 es
    precision highp float;
    in vec2 a_position;
    in vec2 a_texcoord0;
    out vec2 v_texcoord0;

    void main(void) {
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

    // ----------------------------
    // Helpers
    // ----------------------------
    // Normalize UV to [-aspect, aspect] x [-1,1]
    vec2 getSceneUV() {
      vec2 uv = v_texcoord0;
      vec2 p = uv * 2.0 - 1.0;
      float aspect = u_resolution.x / u_resolution.y;
      p.x *= aspect;
      return p;
    }

    // Kaleidoscope: fold angle into N slices
    vec2 kaleido(vec2 p, float n) {
      float r = length(p);
      float a = atan(p.y, p.x);
      float slice = 6.28318530718 / n;
      // mirror into [0, slice]
      a = mod(a, slice);
      a = abs(a - slice * 0.5);
      return vec2(cos(a), sin(a)) * r;
    }

    // Simple domain warp
    vec2 warp(vec2 p, float t) {
      p += 0.15 * sin(3.0 * p.yx + t * 0.8);
      p += 0.08 * sin(5.0 * p.xy + t * 0.3);
      return p;
    }

    // ----------------------------
    // Base SDF shape (solid)
    // ----------------------------
    // Star-like ring based on angle modulation
    float baseSDF(vec2 p, float t) {
      float r   = length(p);
      float ang = atan(p.y, p.x);
      // modulate radius with angle + time
      float k = 0.55
              + 0.18 * sin(6.0 * ang + t * 0.7)
              + 0.08 * sin(12.0 * ang - t * 0.9);
      // signed distance: inside < 0, outside > 0
      return r - k;
    }

    // Extract a thin line band around the zero-level
    float edgeFromSDF(float d) {
      // screen-space AA thickness
      float w = fwidth(d) * 1.5;
      return 1.0 - smoothstep(0.0, w, abs(d));
    }

    // Extra contour rings from the same SDF (for detail)
    float contourFromSDF(float d, float freq) {
      float x = d * freq;
      float band = abs(fract(x + 0.5) - 0.5); // 0 in center of each band
      float w = fwidth(d) * 0.8;
      return 1.0 - smoothstep(0.0, w * 3.0, band);
    }

    void main() {
      vec2 p = getSceneUV();
      // radial falloff for vignette / background
      float radial = length(p);
      float vignette = smoothstep(1.5, 0.4, radial);

      // fixed kaleidoscope fold
      const float K_SLICES = 6.0;
      vec2 pk = kaleido(p, K_SLICES);

      // ---------------------------------
      // Time-echo accumulation for trails
      // ---------------------------------
      vec3 acc = vec3(0.0);
      float total = 0.0;

      // small number of taps back in time
      const int STEPS = 5;
      for (int i = 0; i < STEPS; ++i) {
        float fi = float(i);
        float t  = u_time - fi * 0.08;         // time offset
        float fade = exp(-fi * 0.8);           // older = dimmer
        vec2 pw = warp(pk, t);
        float d = baseSDF(pw, t);
        float edge    = edgeFromSDF(d);        // main thin edge
        float contour = contourFromSDF(d, 6.0);
        float line    = edge + 0.35 * contour; // combine
        acc += line * fade;
        total += fade;
      }

      float lineCombined = acc.r / max(total, 1e-4);

      // clamp and apply vignette + background
      lineCombined = clamp(lineCombined, 0.0, 1.0);
      vec3 bg   = vec3(0.02, 0.02, 0.03);         // dark background
      vec3 ink  = vec3(1.0);                      // line color
      vec3 col  = mix(bg, ink, lineCombined);     // draw lines
      col *= vignette;                            // fade at edges

      color = vec4(col, 1.0);
    }
    `,

    attributes: {
      a_position: positions,
      a_texcoord0: texcoords,
    },

    count: 6,

    uniforms: {
      u_time: (context) => {
        const time = context.time;
        // Pulse every 1 second: add a pulsing offset that oscillates
        const pulse = 0.2 * Math.pow(Math.sin(time * 1 * Math.PI), 2);
        return time + pulse;
      },
      u_resolution: (context) => [context.width, context.height],
    },

    depth: {
      enable: false,
    },
  });

  function render(props: any = {}) {
    bagl.clear({ color: [0, 0, 0, 1], depth: 1 });
    drawKaleidoLines(props);
  }

  return { bagl, render };
}
