import { createBagl } from '../src/index';

export function createBasicTriangleExample() {
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

  // Create draw command
  const drawTriangle = bagl({
    vert: `
      #version 300 es
      precision mediump float;
      in vec2 position;
      uniform vec2 resolution;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;
      uniform vec2 resolution;
      out vec4 color;
      void main() {
        // Use resolution to create a gradient based on screen position
        vec2 uv = gl_FragCoord.xy / resolution;
        color = vec4(0.2 + uv.x * 0.3, 0.6 + uv.y * 0.2, 1.0, 1.0);
      }
    `,
    attributes: {
      position: vertices
    },
    uniforms: {
      resolution: (context, props) => [context.width, context.height]
    },
    count: 3
  });

  // Render function
  function render() {
    bagl.clear({ color: [0, 0, 0, 1] });
    drawTriangle();
  }

  return { bagl, render };
} 