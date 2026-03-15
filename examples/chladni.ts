import { createBagl } from '../src/index'; // adjust import

export function createChladniPatternsExample() {
  const bagl = createBagl();

  // Fullscreen quad (two triangles)
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

  const drawChladni = bagl({
    vert: `#version 300 es
    precision highp float;

    in vec2 position;
    out vec2 vUv;

    void main() {
      // Map from [-1,1] to [0,1]
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
    `,

    frag: `#version 300 es
    precision highp float;

    in vec2 vUv;
    out vec4 color;

    uniform float time;
    uniform vec2 resolution;

    const float PI = 3.14159265359;

    // Basic square-plate mode
    float modeField(vec2 p, vec2 mn) {
      return sin(mn.x * PI * p.x) * sin(mn.y * PI * p.y);
    }

    // Turn field into glowing nodal lines (|u| ~ 0)
    float chladniLine(float u) {
      float d = abs(u);
      float sharpness = 90.0;
      float glow = 0.01;
      return exp(-sharpness * (d + glow));
    }

    void main() {
      // Keep plate square inside the viewport.
      vec2 uv = vUv;
      float aspect = resolution.x / resolution.y;
      if (aspect > 1.0) {
        uv.x = (uv.x - 0.5) / aspect + 0.5;
      } else {
        uv.y = (uv.y - 0.5) * aspect + 0.5;
      }

      // Outside square → black
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        color = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      // --- Pick some (m,n) modes similar to the reference grid ---
      // You can tune this table freely.
      vec2 modes[5];
      modes[0] = vec2(1.0, 1.0);
      modes[1] = vec2(2.0, 1.0);
      modes[2] = vec2(2.0, 2.0);
      modes[3] = vec2(3.0, 2.0);
      modes[4] = vec2(4.0, 3.0);

      // Slowly cycle which modes are active over time
      float t = time * 0.25;
      float phase = time * 2.0;

      float u = 0.0;
      float wSum = 0.0;

      for (int i = 0; i < 5; i++) {
        // weights oscillate so different patterns fade in & out
        float w = 0.5 + 0.5 * sin(t + float(i) * 1.7);
        vec2 mn = modes[i];
        float mField = modeField(uv, mn);

        // add a tiny temporal phase so it feels like vibrating
        mField *= sin(phase + (mn.x + mn.y) * 0.3);

        u += w * mField;
        wSum += w;
      }

      u /= max(wSum, 0.0001);

      // Nodal lines
      float line = chladniLine(u);

      // Soft vignette so edges fall off nicely
      vec2 d = abs(uv - 0.5);
      float vignette = smoothstep(0.6, 0.2, max(d.x, d.y));
      line *= vignette;

      // Map to monochrome glow
      vec3 base = vec3(0.0);
      vec3 lines = vec3(1.0);

      vec3 col = mix(base, lines, line);

      color = vec4(col, 1.0);
    }
    `,

    attributes: {
      position: positions,
    },

    uniforms: {
      time: (ctx: any) => ctx.time,
      resolution: (ctx: any) => [ctx.width, ctx.height],
    },

    count: 6,
    depth: { enable: false },
    // blending optional; enable if you add multiple passes
  });

  function render() {
    bagl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
    });

    drawChladni();
  }

  return { bagl, render };
}
