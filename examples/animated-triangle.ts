import { createBagl } from '../src/index';

export function createAnimatedTriangleExample() {
  const bagl = createBagl();
  
  // Create vertex buffer
  const vertices = bagl.buffer({
    data: new Float32Array([
      -0.5, -0.5,  // bottom left
       0.5, -0.5,  // bottom right
       0.0,  0.5   // top
    ]),
    size: 2 // 2 components per vertex (x, y)
  });

  // Create animated draw command
  const drawAnimatedTriangle = bagl({
    vert: `
      #version 300 es
      precision mediump float;
      in vec2 position;
      uniform float time;
      void main() {
        vec2 pos = position;
        pos.x += sin(time) * 0.1;
        pos.y += cos(time * 0.7) * 0.1;
        gl_Position = vec4(pos, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;
      uniform float time;
      out vec4 color;
      void main() {
        vec3 col = vec3(
          0.5 + 0.5 * sin(time),
          0.5 + 0.5 * sin(time + 2.094), // 2π/3
          0.5 + 0.5 * sin(time + 4.189)  // 4π/3
        );
        color = vec4(col, 1.0);
      }
    `,
    attributes: {
      position: vertices
    },
    uniforms: {
      time: (context, props) => context.time
    },
    count: 3
  });

  // Render function
  function render() {
    bagl.clear({ color: [0, 0, 0, 1] });
    drawAnimatedTriangle();
  }

  return { bagl, render };
} 