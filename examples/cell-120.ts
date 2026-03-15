import { createBagl } from '../src/index'; // adjust import
import * as mat4 from 'gl-mat4';

export function createCell120Example() {
  const bagl = createBagl();

  // ------------------------------------------------------------
  // Build a 4D wire structure (several intertwined loops in 4D)
  // ------------------------------------------------------------

  const loops = 6;
  const segmentsPerLoop = 260;

  const positions4: number[] = [];
  const indices: number[] = [];

  for (let l = 0; l < loops; l++) {
    const phase = (l / loops) * Math.PI * 2.0;
    const loopOffset = l * segmentsPerLoop;

    for (let i = 0; i < segmentsPerLoop; i++) {
      const t = (i / segmentsPerLoop) * Math.PI * 2.0;

      // Parametric 4D curve: tweak these to taste.
      const x = Math.cos(t);
      const y = Math.sin(t);
      const z = 0.6 * Math.cos(3.0 * t + phase);
      const w = 0.6 * Math.sin(2.0 * t + phase);

      positions4.push(x, y, z, w);

      // Connect consecutive points into a line strip per loop
      if (i > 0) {
        indices.push(loopOffset + i - 1, loopOffset + i);
      }
    }

    // Close the loop
    indices.push(loopOffset + segmentsPerLoop - 1, loopOffset + 0);
  }

  const positionBuffer = bagl.buffer({
    data: new Float32Array(positions4),
    size: 4, // x,y,z,w
  });

  const elementBuffer = bagl.elements({
    data: new Uint16Array(indices),
  });

  // ------------------------------------------------------------
  // Draw command
  // ------------------------------------------------------------

  const drawWire = bagl({
    vert: `#version 300 es
    precision mediump float;

    in vec4 position;          // 4D position (x,y,z,w)

    uniform mat4 u_viewProj;
    uniform float u_time;

    // 4D rotations in a few planes to get rich motion
    vec4 rotate4(vec4 p, float t) {
        float c, s;
        float x, y, z, w;

        // (x, w) plane
        c = cos(t * 0.35);
        s = sin(t * 0.35);
        x = c * p.x - s * p.w;
        w = s * p.x + c * p.w;
        p.x = x; p.w = w;

        // (y, z) plane
        c = cos(t * 0.57);
        s = sin(t * 0.57);
        y = c * p.y - s * p.z;
        z = s * p.y + c * p.z;
        p.y = y; p.z = z;

        // (x, y) plane
        c = cos(t * 0.21);
        s = sin(t * 0.21);
        x = c * p.x - s * p.y;
        y = s * p.x + c * p.y;
        p.x = x; p.y = y;

        // (z, w) plane
        c = cos(t * 0.13);
        s = sin(t * 0.13);
        z = c * p.z - s * p.w;
        w = s * p.z + c * p.w;
        p.z = z; p.w = w;

        return p;
    }

    vec3 project4to3(vec4 p) {
        // Perspective-like 4D -> 3D projection.
        // Points with larger w feel "closer".
        float wShift = 2.0;
        float denom = (wShift - p.w);
        float k = 1.4;
        float f = k / max(denom, 0.15);
        return p.xyz * f;
    }

    void main() {
        vec4 p4 = rotate4(position, u_time);
        vec3 p3 = project4to3(p4);

        gl_Position = u_viewProj * vec4(p3, 1.0);
    }
    `,

    frag: `#version 300 es
    precision mediump float;

    out vec4 color;

    uniform float u_time;

    void main() {
        // Subtle time-based flicker
        float pulse = 0.7 + 0.3 * sin(u_time * 5.0);

        // Electric blue-ish; alpha drives additive glow
        vec3 base = vec3(0.4, 0.7, 1.6) * pulse;

        color = vec4(base, 0.06); // low alpha; many overlaps accumulate
    }
    `,

    attributes: {
      position: positionBuffer,
    },

    elements: elementBuffer,

    uniforms: {
      u_time: (ctx: any) => ctx.time,
      u_viewProj: (ctx: any) => {
        const aspect = ctx.width / ctx.height;

        const view = mat4.create();
        // Slow orbiting camera for extra motion
        const radius = 4.0;
        const cx = Math.cos(ctx.time * 0.15) * radius;
        const cz = Math.sin(ctx.time * 0.15) * radius;
        mat4.lookAt(view, [cx, 0.5, cz], [0, 0, 0], [0, 1, 0]);

        const proj = mat4.create();
        mat4.perspective(proj, Math.PI / 3, aspect, 0.1, 100.0);

        const viewProj = mat4.create();
        mat4.multiply(viewProj, proj, view);
        return viewProj;
      },
    },

    primitive: 'lines',

    depth: {
      enable: false,
    },

    blend: {
      enable: true,
      func: {
        srcRGB: 'one',
        srcAlpha: 'one',
        dstRGB: 'one',
        dstAlpha: 'one',
      },
    },
  });

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  function render() {
    bagl.clear({
      color: [0.0, 0.0, 0.0, 1.0],
      depth: 1,
    });

    drawWire();
  }

  return { bagl, render };
}
