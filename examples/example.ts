// Example usage of bagl with deferred context binding
import { mapGlArgs } from '../src/gl-constants';
import { createBagl } from '../src/index';

// Create bagl instance without a canvas (deferred binding)
const bagl = createBagl();

// Prepare resources and commands before the DOM is ready
const vertices = bagl.buffer({
  data: new Float32Array([
    -1, -1,   // bottom left
     1, -1,   // bottom right
     0,  1    // top
  ])
});

const drawTriangle = bagl({
  vert: `
    #version 300 es
    in vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `,
  frag: `
    #version 300 es
    precision mediump float;
    out vec4 color;
    void main() {
      color = vec4(0.3, 0.7, 0.9, 1.0);
    }
  `,
  attributes: {
    position: vertices
  },
  count: 3
});

// Set up the render loop before attaching
// bagl.frame(({ time }) => {
//   bagl.clear({ color: [0, 0, 0, 1] });
//   drawTriangle();
// });

// Later, when the canvas is available:
function attachToCanvas(canvas: HTMLCanvasElement) {
  function createGLProxy(gl: WebGL2RenderingContext) {
    const calls: Array<{ name: string; args: any[] }> = [];

    const proxy = new Proxy(gl, {
      get(target, prop, receiver) {
        const orig = target[prop as keyof WebGL2RenderingContext];
        // If it's a function, wrap it to log calls
        if (typeof orig === 'function') {
          return function (...args: any[]) {
            const mappedArgs = mapGlArgs(prop.toString(), args);
            calls.push({ name: prop.toString(), args: mappedArgs });
            return (orig as Function).apply(target, args);
          };
        }
        // For non-function properties (including getters), access on the original target
        return target[prop as keyof WebGL2RenderingContext];
      }
    });

    return { gl: proxy, calls };
  }
  
  const origgl = canvas.getContext('webgl2')!;
  const { gl, calls } = createGLProxy(origgl);

  // bagl.attach(gl);
  bagl.clear({ color: [0, 0, 0, 1] });
  drawTriangle();

  const div = document.createElement('div');
  div.style.fontFamily = 'monospace';
  div.style.fontSize = '12px';
  div.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  div.style.color = 'white';
  div.style.padding = '10px';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.overflow = 'auto';
  div.innerHTML = calls.map(call => `${call.name} ${call.args.map((arg: any) => JSON.stringify(arg)).join(', ')}`).join('<br>');
  document.body.appendChild(div);
  
  // The render loop will start automatically
  // All resources will be created on the GPU
}

// Example with dynamic uniforms
// const drawAnimatedTriangle = bagl({
//   vert: `
//     #version 300 es
//     precision mediump float;
//     in vec2 position;
//     uniform float time;
//     void main() {
//       vec2 pos = position;
//       pos.x += sin(time) * 0.1;
//       gl_Position = vec4(pos, 0.0, 1.0);
//     }
//   `,
//   frag: `
//     #version 300 es
//     precision mediump float;
//     uniform float time;
//     out vec4 color;
//     void main() {
//       color = vec4(0.5 + 0.5 * sin(time), 0.3, 0.7, 1.0);
//     }
//   `,
//   attributes: {
//     position: vertices
//   },
//   uniforms: {
//     time: ({ time }: { time: number }) => time
//   },
//   count: 3
// });

// // Example with framebuffer
// const fbo = bagl.framebuffer({
//   color: 1,
//   depth: true,
//   width: 512,
//   height: 512
// });

// const drawToTexture = bagl({
//   vert: `
//     #version 300 es
//     in vec2 position;
//     void main() {
//       gl_Position = vec4(position, 0.0, 1.0);
//     }
//   `,
//   frag: `
//     #version 300 es
//     precision mediump float;
//     out vec4 color;
//     void main() {
//       color = vec4(1.0, 0.0, 0.0, 1.0);
//     }
//   `,
//   attributes: {
//     position: vertices
//   },
//   framebuffer: fbo,
//   count: 3
// });

// Example of context loss handling
function setupContextLossHandling(canvas: HTMLCanvasElement) {
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    bagl.detach();
  });

  canvas.addEventListener('webglcontextrestored', () => {
    bagl.attach(canvas);
  });
}

export { attachToCanvas, setupContextLossHandling }; 