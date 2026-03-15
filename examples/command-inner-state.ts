import { createBagl } from '../src/index';

/**
 * Demonstrates state-only commands and the inner-function feature. The outer
 * command has no vert/frag/attributes—it only sets framebuffer + blend (state
 * only, no draw). When called with an inner callback, it applies that state
 * and runs the inner; the inner runs drawTriangleNoState (a draw command with
 * no state of its own), so both triangles are drawn to the same FBO with the
 * same blend. We then show the FBO on screen so you see both triangles.
 */
export function createCommandInnerStateExample() {
  const bagl = createBagl();

  const fbo = bagl.framebuffer({
    color: 1,
    depth: false,
    width: 800,
    height: 600,
  });

  const triangleVertices = bagl.buffer({
    data: new Float32Array([
      -0.5, -0.5,
      0.5, -0.5,
      0.0, 0.5,
    ]),
    size: 2,
  });

  const quadVertices = bagl.buffer({
    data: new Float32Array([
      -1, -1, 1, -1, 1, 1, -1, 1,
    ]),
    size: 2,
  });
  const quadIndices = bagl.elements({
    data: new Uint16Array([0, 1, 2, 0, 2, 3]),
  });

  type TriangleProps = { offset?: [number, number]; tint?: [number, number, number] };

  const triangleVert = `
    #version 300 es
    precision mediump float;
    in vec2 position;
    uniform vec2 offset;
    void main() {
      gl_Position = vec4(position + offset, 0.0, 1.0);
    }
  `;
  const triangleFrag = `
    #version 300 es
    precision mediump float;
    uniform vec3 tint;
    out vec4 color;
    void main() {
      color = vec4(tint, 0.85);
    }
  `;
  const triangleUniforms = {
    offset: (_: any, props: TriangleProps) => props.offset ?? [0, 0],
    tint: (_: any, props: TriangleProps) => props.tint ?? [1, 0.2, 0.2],
  };

  // State-only command: sets framebuffer + blend, no draw; inner runs with this state
  const withDrawStateCommand = bagl({
    framebuffer: fbo,
    blend: {
      enable: true,
      func: ['src-alpha', 'one-minus-src-alpha'],
    },
  });

  // Inner command: no framebuffer, no blend—inherits outer state when called inside inner callback
  const drawTriangleNoState = bagl({
    vert: triangleVert,
    frag: triangleFrag,
    attributes: { position: triangleVertices },
    uniforms: triangleUniforms,
    count: 3,
  });

  const drawFboToScreen = bagl({
    vert: `
      #version 300 es
      precision mediump float;
      in vec2 position;
      out vec2 vTexCoord;
      void main() {
        vTexCoord = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;
      in vec2 vTexCoord;
      uniform sampler2D uTexture;
      out vec4 color;
      void main() {
        color = texture(uTexture, vTexCoord);
      }
    `,
    attributes: { position: quadVertices },
    elements: quadIndices,
    uniforms: { uTexture: fbo },
  });

  function render() {
    bagl.clear({ framebuffer: fbo, color: [0.08, 0.08, 0.12, 1] });

    // State-only command sets FBO + blend; inner draws both triangles (no state) so they use that state
    withDrawStateCommand(
      {},
      () => {
        drawTriangleNoState({ offset: [-0.35, 0], tint: [1, 0.2, 0.2] });
        drawTriangleNoState({ offset: [0.35, 0], tint: [0.2, 1, 0.4] });
      }
    );

    bagl.clear({ framebuffer: null, color: [0.05, 0.05, 0.08, 1] });
    drawFboToScreen();
  }

  return { bagl, render };
}
