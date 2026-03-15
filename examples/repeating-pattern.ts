import { createBagl } from '../src/index';
import { Pane } from 'tweakpane';

export function createRepeatingPatternExample() {
  const bagl = createBagl();

  const params = {
    uTile: 8.0,
    uWarpAmp: 0.15,
    uWarpFreq: 1.5,
    uVarAmount: 0.25,
  };

  const pane = (new Pane()) as any;
  pane.addBinding(params, 'uTile', { min: 1, max: 20, step: 0.5 });
  pane.addBinding(params, 'uWarpAmp', { min: 0, max: 1, step: 0.01 });
  pane.addBinding(params, 'uWarpFreq', { min: 0.5, max: 5, step: 0.1 });
  pane.addBinding(params, 'uVarAmount', { min: 0, max: 1, step: 0.01 });

  // Fullscreen quad positions (two triangles)
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

  const drawPattern = bagl({
    vert: `#version 300 es
    in vec2 position;
    out vec2 vUv;

    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
    `,

    frag: `#version 300 es
    precision highp float;

    in vec2 vUv;
    out vec4 fragColor;

    uniform vec2 uRes;
    uniform float uTime;
    uniform float uTile;
    uniform float uWarpAmp;
    uniform float uWarpFreq;
    uniform float uVarAmount;

    // --- tiny hash & noise ---
    float hash11(float x) {
      return fract(sin(x * 1.2345679) * 43758.5453123);
    }

    vec2 hash21(vec2 p) {
      float n = sin(dot(p, vec2(127.1, 311.7)));
      return fract(vec2(43758.5453 * n, 22578.1459 * n));
    }

    vec3 hash31(vec2 p) {
      vec2 h = hash21(p);
      return vec3(h, hash11(h.x + h.y));
    }

    // value noise (cheap)
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      // 2x2 hash corners
      float a = hash11(dot(i + vec2(0.0, 0.0), vec2(37.0, 17.0)));
      float b = hash11(dot(i + vec2(1.0, 0.0), vec2(37.0, 17.0)));
      float c = hash11(dot(i + vec2(0.0, 1.0), vec2(37.0, 17.0)));
      float d = hash11(dot(i + vec2(1.0, 1.0), vec2(37.0, 17.0)));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float a = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 5; i++) {
        a += amp * vnoise(p);
        p = p * 2.02 + 13.1;
        amp *= 0.5;
      }
      return a;
    }

    // rotation
    mat2 rot(float a) {
      float c = cos(a);
      float s = sin(a);
      return mat2(c, -s, s, c);
    }

    // SDFs
    float sdCircle(vec2 p, float r) {
      return length(p) - r;
    }

    float sdBox(vec2 p, vec2 b) {
      vec2 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy / uRes) * 2.0 - 1.0;
      uv.x *= uRes.x / uRes.y;

      // 1) pick a stable cell id from *unwarped* grid
      vec2 g = uv * uTile;
      vec2 cellId = floor(g);           // integer id
      vec2 local = fract(g) - 0.5;     // local coords in [-.5,.5]

      // 2) per-cell parameters (locked to cellId)
      vec3 rnd = hash31(cellId);
      float ang = (rnd.x - 0.5) * 1.0 * uVarAmount;   // small rotation
      float scale = mix(0.85, 1.15, rnd.y * uVarAmount);
      float morph = rnd.z;                              // shape mix 0..1
      vec2 jitter = (hash21(cellId + 17.0) - 0.5) * 0.35 * uVarAmount;

      // 3) low-frequency domain warp (applied to *local* so IDs don't change)
      //    Give each cell a phase so the warp differs per cell but is time-coherent.
      vec2 warpP = (local + jitter) * uWarpFreq + cellId * 0.73;
      vec2 w = vec2(
        fbm(warpP + 10.0 + 0.1 * uTime),
        fbm(warpP + 27.0 - 0.08 * uTime)
      );
      local += (w - 0.5) * 2.0 * uWarpAmp;

      // 4) per-cell transform & shape
      local = rot(ang) * (local / scale);

      // Mix between a box and a circle for variety
      float dCircle = sdCircle(local, 0.33);
      float dBox = sdBox(local, vec2(0.28));
      float d = mix(dBox, dCircle, morph);

      // 5) soft outline + fill
      float edge = 0.003;
      float fill = smoothstep(0.0, -edge, d);
      float line = smoothstep(edge, 0.0, abs(d) - 0.015);

      // color also varies per cell
      vec3 baseCol = mix(vec3(0.12, 0.14, 0.18), vec3(0.18, 0.16, 0.12), rnd.x);
      vec3 inkCol = mix(vec3(0.9, 0.8, 0.7), vec3(0.7, 0.85, 0.95), rnd.y);

      vec3 col = baseCol * (1.0 - 0.2 * fbm(uv * 2.0)) + inkCol * (0.75 * fill + 0.35 * line);
      fragColor = vec4(col, 1.0);
    }
    `,

    attributes: {
      position: positions,
    },

    count: 6,

    uniforms: {
      uTime: (ctx: any) => ctx.time,
      uRes: (ctx: any) => [ctx.width, ctx.height],
      uTile: () => params.uTile,
      uWarpAmp: () => params.uWarpAmp,
      uWarpFreq: () => params.uWarpFreq,
      uVarAmount: () => params.uVarAmount,
    },

    depth: {
      enable: false,
    },
  });

  function render(props: any = {}) {
    bagl.clear({ color: [0, 0, 0, 1], depth: 1 });
    drawPattern(props);
  }

  return { bagl, render };
}
