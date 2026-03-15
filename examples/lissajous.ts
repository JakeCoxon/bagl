import { createBagl } from '../src/index'; // adjust import to your setup

export function createLissajousFigureExample() {
  const bagl = createBagl();

  // --------- CPU-side generation of lines ---------
  const NUM_CURVES = 14;
  const SEGMENTS = 500;

  // 2D positions in clip space
  const positions = new Float32Array(NUM_CURVES * SEGMENTS * 2);

  // Indices for line segments: (0,1), (1,2), ...
  const indices = new Uint16Array(NUM_CURVES * (SEGMENTS - 1) * 2);

  let p = 0;
  let idx = 0;

  const fA = 10.0;
  const fB = 9.8;
  const scale = 0.82;
  const baseRotation = Math.PI * 0.25; // 45 degrees, gives that diagonal "eye"

  for (let j = 0; j < NUM_CURVES; j++) {
    // slight phase and aspect shift per curve for the layered look
    const phase = j * 0.10;
    const aspectSkew = 1.0 + j * 0.015;

    for (let i = 0; i < SEGMENTS; i++) {
      const t = (i / (SEGMENTS - 1)) * Math.PI * 2.0;

      // Lissajous-style parametric curve
      let x = Math.sin(fA * t + phase);
      let y = Math.sin(fB * t);

      // subtle skew/stretch
      x *= aspectSkew;

      // rotate to get the diagonal orientation
      const rx = x * Math.cos(baseRotation) - y * Math.sin(baseRotation);
      const ry = x * Math.sin(baseRotation) + y * Math.cos(baseRotation);

      positions[p++] = rx * scale;
      positions[p++] = ry * scale;

      if (i < SEGMENTS - 1) {
        const a = j * SEGMENTS + i;
        const b = a + 1;
        indices[idx++] = a;
        indices[idx++] = b;
      }
    }
  }

  const positionBuffer = bagl.buffer({
    data: positions,
    size: 2, // vec2
  });

  const indexBuffer = bagl.elements({
    data: indices,
  });

  // --------- Draw command ---------
  const drawLissajous = bagl({
    vert: `#version 300 es
    in vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }`,

    frag: `#version 300 es
    precision mediump float;
    out vec4 color;
    void main() {
      // Soft grey-white lines on black
      color = vec4(vec3(0.92), 1.0);
    }`,

    attributes: {
      position: positionBuffer,
    },

    elements: indexBuffer,
    primitive: 'lines',

    depth: {
      enable: false,
    },
  });

  // --------- Render ---------
  function render() {
    bagl.clear({
      color: [0.0, 0.0, 0.0, 1.0],
      depth: 1,
    });

    drawLissajous();
  }

  return { bagl, render };
}
