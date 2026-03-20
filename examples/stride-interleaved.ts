import { createBagl } from '../src/index';

export function createStrideInterleavedExample() {
  const bagl = createBagl();

  // Interleaved per-vertex layout:
  // [pos.x, pos.y, color.r, color.g, color.b, color.a]
  const interleaved = bagl.buffer({
    data: new Float32Array([
      -0.65, -0.55, 1.0, 0.25, 0.25, 1.0,
       0.65, -0.55, 0.25, 1.0, 0.35, 1.0,
       0.0,   0.65, 0.25, 0.45, 1.0, 1.0
    ]),
    size: 6
  });

  const drawTriangle = bagl({
    vert: `
      #version 300 es
      precision mediump float;

      in vec2 position;
      in vec4 colorAttr;
      out vec4 vColor;

      void main() {
        vColor = colorAttr;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;

      in vec4 vColor;
      out vec4 color;

      void main() {
        color = vColor;
      }
    `,
    attributes: {
      position: { buffer: interleaved, size: 2, stride: 24, offset: 0 },
      colorAttr: { buffer: interleaved, size: 4, stride: 24, offset: 8 }
    },
    count: 3
  });

  function render() {
    bagl.clear({ color: [0.06, 0.07, 0.1, 1] });
    drawTriangle();
  }

  return { bagl, render };
}
