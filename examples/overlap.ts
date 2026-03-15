import { createBagl } from "../src/index";

export function createOverlappingRowExample() {
  const bagl = createBagl();

  // Fullscreen quad (clip-space)
  const quad = bagl.buffer({
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

  const drawRow = bagl({
    vert: `#version 300 es
    in vec2 position;
    out vec2 vUV;

    void main() {
        // Map from clip-space [-1,1] to UV [0,1]
        vUV = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
    }
    `,

    frag: `#version 300 es
    precision highp float;

    in vec2 vUV;
    out vec4 outColor;

    uniform float uTime;
    uniform float uNumShapes;

    // Circle centered at (centerX, 0.5)
    float circleAt(vec2 uv, float centerX, float radius) {
        vec2 p = uv - vec2(centerX, 0.5);
        float d = length(p);
        float edge = 0.002;
        return smoothstep(radius, radius - edge, d);
    }

    void main() {
        float N = uNumShapes;
        float cellWidth = 1.0 / N;

        // Which cell are we roughly in?
        float baseIndex = floor(vUV.x * N);

        vec3 accumulatedColor = vec3(0.0);
        float totalAlpha = 0.0;

        // Check left, current, right cell so overlap can happen
        for (int offset = -1; offset <= 1; offset++) {
            float idx = baseIndex + float(offset);

            if (idx < 0.0 || idx >= N) {
                continue;
            }

            // Center of this shape in UV space
            float centerX = (idx + 0.5) * cellWidth;

            // Radius > 0.5 * cellWidth => overlap between neighbours
            float radius = cellWidth * 0.7;

            float a = circleAt(vUV, centerX, radius);

            if (a > 0.0) {
                // Simple color ramp based on index, animated a bit by time
                float t = idx / max(N - 1.0, 1.0);
                vec3 baseA = vec3(0.9, 0.2, 0.4);
                vec3 baseB = vec3(0.2, 0.6, 1.0);

                float wobble = 0.5 + 0.5 * sin(uTime + idx * 0.7);
                vec3 color = mix(baseA, baseB, t) * (0.6 + 0.4 * wobble);

                // Accumulate color weighted by alpha
                accumulatedColor += color * a;
                totalAlpha += a;
            }
        }

        // Normalize color by total alpha to prevent over-brightening
        // Clamp total alpha to prevent values > 1.0
        totalAlpha = min(totalAlpha, 1.0);
        vec3 finalColor = totalAlpha > 0.0 ? accumulatedColor / totalAlpha : vec3(0.0);

        outColor = vec4(finalColor, totalAlpha);
    }
    `,

    attributes: {
      position: quad,
    },

    uniforms: {
      uTime: ({tick}: any) => tick * 0.016,
      uNumShapes: () => 10.0,
    },

    count: 6,
    primitive: "triangles",

    depth: { enable: false },

    // Transparent background + alpha blending
    blend: {
      enable: true,
      func: ["src-alpha", "one-minus-src-alpha"],
    },
  });

  // Make the canvas background transparent

  function render() {
    bagl.clear({ color: [0, 0, 0, 0] });
    drawRow();
    requestAnimationFrame(render);
  }


  return { bagl, render };
}
