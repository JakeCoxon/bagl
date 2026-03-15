import { createBagl } from '../src/index';

// Warped grid example using bagl-style (regl-like) API
// - fullscreen quad
// - domain-warped UVs
// - grid-indexed cells drawn with visible borders

export function createWarpedGridExample() {
  const bagl = createBagl();

  const positions = bagl.buffer({
    data: new Float32Array([
      -1, -1, 0,
       1, -1, 0,
      -1,  1, 0,
       1,  1, 0,
    ]),
    size: 3,
  });

  const indices = bagl.elements({
    data: new Uint16Array([0, 1, 2, 2, 1, 3]),
  });

  const draw = bagl({
    vert: `
      #version 300 es
      precision mediump float;

      in vec3 position;
      out vec2 vUV;

      void main() {
        vUV = position.xy * 0.5 + 0.5;
        gl_Position = vec4(position, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;

      in vec2 vUV;
      out vec4 color;

      uniform float time;
      uniform vec2 resolution;

      // ---------- hash / noise ----------
      float hash21(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      vec2 hash22(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract(vec2(p3.x * p3.z, p3.y * p3.x));
      }

      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 m = mat2(1.6, -1.2, 1.2, 1.6);
        for (int i = 0; i < 5; i++) {
          v += a * vnoise(p);
          p = m * p;
          a *= 0.5;
        }
        return v;
      }

      // ---------- global warp ----------
      vec2 warp(vec2 p, float t) {
        float s1 = 1.3;
        float s2 = 3.7;
        float a = 0.18;

        vec2 o1 = vec2(
          fbm(p * s1 + vec2(0.0, t * 0.18)),
          fbm(p.yx * s1 + vec2(t * 0.11, 2.3))
        );

        vec2 o2 = vec2(
          fbm(p * s2 + vec2(3.1, -t * 0.29)),
          fbm(p.yx * s2 + vec2(-1.3, t * 0.21))
        );

        return p + a * (o1 * 0.6 + o2 * 0.4);
      }

      // ---------- hard-edged motif texture ----------
      float sampleTexture(vec2 uv) {
        uv *= 0.5;

        // angular stripes
        float a = uv.x * 5.0 + uv.y * 11.0;
        float stripes1 = step(0.5, fract(a));

        // orthogonal micro grid
        float gx = step(0.8, fract(uv.x * 3.0));
        float gy = step(0.8, fract(uv.y * 7.0));
        float gridCuts = max(gx, gy);

        // random chips from fbm, but HARD thresholded
        float chips = step(0.72, fbm(uv * 2.7));

        float v = stripes1;
        v = max(v * (1.0 - gridCuts), chips);

        return v > 0.5 ? 1.0 : 0.0;
      }

      void main() {
        vec2 uv = vUV;
        vec2 aspect = vec2(
          resolution.x / max(resolution.y, 1.0),
          resolution.y / max(resolution.y, 1.0)
        );
        vec2 p = (uv - 0.5) * aspect + 0.5;

        // slow flowing warp
        vec2 pw = warp(p, time * 0.3);

        // ---------- jittered Voronoi (find two closest) ----------
        float N = 9.0;
        vec2 gv = pw * N;
        vec2 base = floor(gv);

        float bestDist = 1e9;
        float secondDist = 1e9;
        vec2 bestId = vec2(0.0);
        vec2 secondId = vec2(0.0);
        vec2 bestCenter = vec2(0.0);
        vec2 secondCenter = vec2(0.0);

        for (int j = -1; j <= 1; j++) {
          for (int i = -1; i <= 1; i++) {
            vec2 cid = base + vec2(float(i), float(j));
            vec2 jitter = (hash22(cid) - 0.5) * 0.9;
            vec2 center = cid + jitter;
            float d = distance(gv, center);
            if (d < bestDist) {
              secondDist = bestDist;
              secondId = bestId;
              secondCenter = bestCenter;
              bestDist = d;
              bestId = cid;
              bestCenter = center;
            } else if (d < secondDist) {
              secondDist = d;
              secondId = cid;
              secondCenter = center;
            }
          }
        }

        vec2 local = gv - bestCenter;
        vec2 local2 = gv - secondCenter;
        float edge = secondDist - bestDist;
        float blend = clamp(edge, 0.0, 1.0) / 10.0;
// blend = pow(blend, 0.7);


        // ---------- per-cell transforms ----------
        float ang1 = hash21(bestId + 13.17) * 6.2831853;
        float ang2 = hash21(secondId + 13.17) * 6.2831853;
        float sc1  = mix(0.7, 1.8, hash21(bestId + 91.3));
        float sc2  = mix(0.7, 1.8, hash21(secondId + 91.3));
        vec2 off1  = hash22(bestId + 7.31) * 10.0;
        vec2 off2  = hash22(secondId + 7.31) * 10.0;

        mat2 R1 = mat2(cos(ang1), -sin(ang1), sin(ang1), cos(ang1));
        mat2 R2 = mat2(cos(ang2), -sin(ang2), sin(ang2), cos(ang2));

        // interpolate transforms across edge zone
        mat2 Rmix = mat2(
          mix(R2[0], R1[0], blend),
          mix(R2[1], R1[1], blend)
        );

        float scMix = mix(sc2, sc1, blend);
        vec2 offMix = mix(off2, off1, blend);

        // ---------- motif sampling ----------
        vec2 motifUV = Rmix * (local * scMix) + offMix;

//         motifUV += 0.05 * vec2(
//   fbm(pw * 0.7 + time * 0.21),
//   fbm(pw.yx * 0.7 - time * 0.19)
// );

        float v = sampleTexture(motifUV);

        color = vec4(vec3(v), 1.0);
      }
    `,
    attributes: { position: positions },
    elements: indices,
    uniforms: {
      time: (ctx) => ctx.time,
      resolution: (ctx) => [ctx.width, ctx.height],
    },
    depth: { enable: false },
  });

  function render() {
    bagl.clear({ color: [1, 1, 1, 1], depth: 1 });
    draw();
  }

  return { bagl, render };
}
