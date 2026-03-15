// Assumes createBagl is available and you have a <canvas> bound elsewhere.
import { createBagl } from "../src/index";

export function createDomainWarpExample() {
  const bagl = createBagl();

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

  const drawWarped = bagl({
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
    out vec4 color;

    uniform float uTime;
    uniform vec2 uResolution;

    uniform float uWarpStrength;
    uniform float uChi;
    uniform float uAlpha;
    uniform float uDelta;
    uniform float uOmega0;

    // ---------- cheap hash / noise / fbm ----------

    float hash(vec3 p) {
      // Very cheap hash
      p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);

      // Smoothstep curve
      f = f * f * (3.0 - 2.0 * f);

      float n000 = hash(i + vec3(0.0, 0.0, 0.0));
      float n100 = hash(i + vec3(1.0, 0.0, 0.0));
      float n010 = hash(i + vec3(0.0, 1.0, 0.0));
      float n110 = hash(i + vec3(1.0, 1.0, 0.0));
      float n001 = hash(i + vec3(0.0, 0.0, 1.0));
      float n101 = hash(i + vec3(1.0, 0.0, 1.0));
      float n011 = hash(i + vec3(0.0, 1.0, 1.0));
      float n111 = hash(i + vec3(1.0, 1.0, 1.0));

      float nx00 = mix(n000, n100, f.x);
      float nx10 = mix(n010, n110, f.x);
      float nx01 = mix(n001, n101, f.x);
      float nx11 = mix(n011, n111, f.x);

      float nxy0 = mix(nx00, nx10, f.y);
      float nxy1 = mix(nx01, nx11, f.y);

      return mix(nxy0, nxy1, f.z);
    }

    float fbm(vec3 p) {
      float sum = 0.0;
      float amp = 0.5;
      float freq = 1.0;
      for (int i = 0; i < 2; i++) {
        sum += amp * noise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
      }
      return sum;
    }

    // ---------- basic SDF ----------

    float sdBox(vec3 p, vec3 b) {
      vec3 d = abs(p) - b;
      return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
    }

    // ---------- your divergence-style warp ----------

    vec3 applyDivergenceWarp(vec3 p) {
      float warpFactor = clamp(uWarpStrength, 0.0, 10.0);
      if (warpFactor <= 0.0) {
        return p;
      }

      vec3 seed = p + vec3(uChi, uAlpha, uDelta);
      vec3 warpSeed = seed * 1.5;

      vec3 warpOffset = vec3(
        fbm(warpSeed + vec3(0.0, 13.7, 27.1)),
        fbm(warpSeed + vec3(39.4, 7.5, 18.3)),
        fbm(warpSeed + vec3(21.6, 31.8, 44.2))
      );

      // Map fbm [0,1] -> [-1,1]
      vec3 displacement = (warpOffset * 2.0 - 1.0) * (warpFactor * 1.2);

      vec3 swirlDir = vec3(
        fbm(seed.yzx * 1.2 + vec3(13.7, 2.1, 4.5)),
        fbm(seed.zxy * 1.5 + vec3(5.9, 17.3, 1.1)),
        fbm(seed.xyz * 1.8 + vec3(9.2, 6.4, 12.7))
      );

      vec3 swirl = normalize(swirlDir * 2.0 - 1.0 + 1e-5);

      float wave = sin(length(p) * (2.0 + uOmega0) + uTime * 0.8);
      float strength = warpFactor * (0.45 + 0.55 * warpFactor);

      vec3 warped = p + displacement; // + swirl * (strength * wave);
      vec3 dir = normalize(warped + 1e-5);

      return warped + dir * (wave * 0.5 * warpFactor);
    }

    // ---------- scene map: warped cube + mirrored copies ----------

    float map(vec3 p) {
      // Central warped cube
      vec3 wp = applyDivergenceWarp(p);
      float dCentral = sdBox(wp, vec3(0.8));

      // Mirrored, offset warped neighbors (gives the vortexy cross feel)
      vec3 mp = abs(p) - vec3(1.6);
      vec3 wq = applyDivergenceWarp(mp);
      float dNeighbors = sdBox(wq, vec3(0.55));

      return min(dCentral, dNeighbors);
    }

    // ---------- normal & raymarch ----------

    vec3 calcNormal(vec3 p) {
      float e = 0.001;
      vec2 h = vec2(e, 0.0);
      float dx = map(p + vec3(h.x, h.y, h.y)) - map(p - vec3(h.x, h.y, h.y));
      float dy = map(p + vec3(h.y, h.x, h.y)) - map(p - vec3(h.y, h.x, h.y));
      float dz = map(p + vec3(h.y, h.y, h.x)) - map(p - vec3(h.y, h.y, h.x));
      return normalize(vec3(dx, dy, dz));
    }

    vec4 shade(vec3 ro, vec3 rd) {
      float t = 0.0;
      float maxDist = 20.0;

      for (int i = 0; i < 16; i++) {
        vec3 pos = ro + rd * t;

        if (t > 5.0) break;
        float d = map(pos);

        if (d < 0.1) {
          vec3 n = calcNormal(pos);

          vec3 lightDir = normalize(vec3(0.4, 0.7, 0.2));
          float diff = max(dot(n, lightDir), 0.0);

          // // Soft fake AO based on distance marched
          float ao = clamp(1.2 - 0.08 * t, 0.1, 1.0);

          // // Slight rim + warped color accent
          float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.0);
          float warpMask = fbm(pos * 1.5 + vec3(uTime * 0.3));

          vec3 base = mix(vec3(0.06, 0.04, 0.09), vec3(0.95, 0.85, 0.7), diff);
          base += rim * 0.3;
          base *= ao;
          base *= mix(0.8, 1.4, warpMask);

          return vec4(base, 1.0);
        }

        if (t > maxDist) break;
        t += d * 1.0; // relaxed step for nice details
      }

      // Background
      vec3 bg = vec3(0.01, 0.0, 0.03);
      return vec4(bg, 1.0);
    }

    // ---------- main ----------

    void main() {
      // Normalized screen coords
      vec2 uv = vUv * 2.0 - 1.0;
      uv.x *= uResolution.x / uResolution.y;

      // Orbiting camera
      float camRadius = 4.0;
      float angle = uTime * 0.25;
      vec3 ro = vec3(
        camRadius * cos(angle),
        camRadius * 0.25 * sin(uTime * 0.17),
        camRadius * sin(angle)
      );
      vec3 target = vec3(0.0);
      vec3 ww = normalize(target - ro);
      vec3 uu = normalize(cross(vec3(0.0, 1.0, 0.0), ww));
      vec3 vv = cross(ww, uu);

      vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.8 * ww);

      color = shade(ro, rd);
    }
    `,

    attributes: {
      position: positions,
    },

    count: 6,

    uniforms: {
      uTime: (ctx: any) => ctx.time,
      uResolution: (ctx: any) => [ctx.width, ctx.height],

      // You can expose these to UI controls; here are some defaults.
      uWarpStrength: (_ctx: any, props: any) => props.warpStrength ?? 1.4,
      uChi: (_ctx: any, props: any) => props.chi ?? 0.0,
      uAlpha: (_ctx: any, props: any) => props.alpha ?? 0.5,
      uDelta: (_ctx: any, props: any) => props.delta ?? 1.0,
      uOmega0: (_ctx: any, props: any) => props.omega0 ?? 0.0,
    },

    depth: {
      enable: false,
    },
  });

  function render(props: any = {}) {
    bagl.clear({ color: [0, 0, 0, 1], depth: 1 });
    drawWarped(props);
  }

  return { bagl, render };
}
