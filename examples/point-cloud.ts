import { createBagl } from '../src/index'; // adjust as needed

export function createSDFPointCloudExample() {
  const bagl = createBagl();

  const drawSDFPoints = bagl({
    vert: `#version 300 es
    precision mediump float;

    out vec2 vUv;

    const vec2 POSITIONS[3] = vec2[](
      vec2(-1.0, -1.0),
      vec2( 3.0, -1.0),
      vec2(-1.0,  3.0)
    );

    void main() {
      vec2 pos = POSITIONS[gl_VertexID];
      vUv = pos * 0.5 + 0.5;
      gl_Position = vec4(pos, 0.0, 1.0);
    }
    `,

    frag: `#version 300 es
    precision highp float;

    in vec2 vUv;
    out vec4 color;

    uniform float time;
    uniform vec2 resolution;

    // Pseudo-random hash
    float hash(vec3 p) {
      float h = dot(p, vec3(27.1, 61.7, 12.4));
      return fract(sin(h) * 43758.5453123);
    }

    // Rotate around Y and X for the shape
    vec3 rotateShape(vec3 p, float t) {
      float ay = t * 0.6;
      float ax = t * 0.4;

      float cy = cos(ay), sy = sin(ay);
      float cx = cos(ax), sx = sin(ax);

      mat3 rotY = mat3(
        cy, 0.0, sy,
        0.0, 1.0, 0.0,
        -sy, 0.0, cy
      );

      mat3 rotX = mat3(
        1.0, 0.0, 0.0,
        0.0, cx, -sx,
        0.0, sx, cx
      );

      return rotY * (rotX * p);
    }

    // SDF scene in rotating object space
    float sdfScene(vec3 p) {
      p = rotateShape(p, time);

      // Slight wobble
      p.y += sin(time * 0.6 + p.x * 1.3) * 0.08;
      p.x += sin(time * 0.4 + p.z * 1.1) * 0.06;

      // Sphere
      float sphere = length(p) - 0.9;

      // Box
      vec3 b = vec3(0.5);
      vec3 q = abs(p - vec3(0.6, 0.0, 0.0)) - b;
      float box = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);

      // Smooth min blend
      float k = 0.3;
      float h = clamp(0.5 + 0.5 * (box - sphere) / k, 0.0, 1.0);
      float d = mix(box, sphere, h) - 0.02;

      return d;
    }

    vec3 calcNormal(vec3 p) {
      float e = 0.001;
      vec2 h = vec2(e, 0.0);
      float dx = sdfScene(p + vec3(h.x, h.y, h.y)) - sdfScene(p - vec3(h.x, h.y, h.y));
      float dy = sdfScene(p + vec3(h.y, h.x, h.y)) - sdfScene(p - vec3(h.y, h.x, h.y));
      float dz = sdfScene(p + vec3(h.y, h.y, h.x)) - sdfScene(p - vec3(h.y, h.y, h.x));
      return normalize(vec3(dx, dy, dz));
    }

    vec3 shadePoint(vec3 p, vec3 n, vec3 rd) {
      // Moving light
      vec3 lightPos = vec3(
        sin(time * 0.7) * 2.0,
        cos(time * 0.5) * 1.5,
        2.0
      );
      vec3 l = normalize(lightPos - p);
      vec3 v = normalize(-rd);
      vec3 h = normalize(l + v);

      float diff = max(dot(n, l), 0.0);
      float spec = pow(max(dot(n, h), 0.0), 32.0);

      // Palette-ish
      vec3 baseA = vec3(0.35, 0.8, 1.0);
      vec3 baseB = vec3(1.0, 0.6, 0.3);
      float t = 0.5 + 0.5 * n.y;
      vec3 baseCol = mix(baseA, baseB, t);

      return baseCol * (0.2 + 1.3 * diff) + 0.9 * spec;
    }

    void main() {
      // NDC -> ray dir
      vec2 uv = (gl_FragCoord.xy / resolution) * 2.0 - 1.0;
      uv.x *= resolution.x / resolution.y;

      vec3 ro = vec3(0.0, 0.0, 3.2);
      vec3 rd = normalize(vec3(uv, -1.8));

      float t = 0.0;
      float maxDist = 10.0;
      float eps = 0.001;

      vec3 accCol = vec3(0.0);
      float accAlpha = 0.0;

      const int MAX_STEPS = 128;

      for (int i = 0; i < MAX_STEPS; i++) {
        if (t > maxDist || accAlpha > 0.99) break;

        vec3 p = ro + rd * t;
        float d = sdfScene(p);

        if (d < eps) {
          // Close to surface: decide if this cell spawns a point
          float density = 70.0;
          vec3 cell = floor(p * density);
          float h = hash(cell);

          // tweak for sparsity / twinkle
          float threshold = 0.97 + 0.02 * sin(time + cell.x * 0.11);

          if (h > threshold) {
            // Visible point: shade & alpha blend
            vec3 n = calcNormal(p);
            vec3 c = shadePoint(p, n, rd);

            // Slight distance fade so back layers show through nicely
            float df = smoothstep(maxDist, 0.0, t);
            float a = 0.85 * df; // point alpha

            c *= 0.6 + 0.4 * h; // tiny variation per cell

            accCol += (1.0 - accAlpha) * c * a;
            accAlpha += (1.0 - accAlpha) * a;
          }

          // KEY PART:
          // We *do not* terminate on hit.
          // Step a bit forward so we can catch more surfaces behind.
          t += 0.02;
        } else {
          // Normal SDF march
          t += d;
        }
      }

      if (accAlpha <= 0.0) {
        // Empty ray = background
        // Slight vignette so it feels enclosed.
        float r = length(uv);
        float vignette = smoothstep(1.2, 0.2, r);
        vec3 bg = vec3(0.02, 0.02, 0.04) * vignette;
        color = vec4(bg, 1.0);
      } else {
        // Soft additive glow on top of background
        vec3 bg = vec3(0.01, 0.01, 0.02);
        vec3 finalCol = bg + accCol;
        color = vec4(finalCol, 1.0);
      }
    }
    `,

    attributes: {},
    count: 3,

    uniforms: {
      time: (ctx: any) => ctx.time,
      resolution: (ctx: any) => [ctx.width, ctx.height],
    },

    depth: {
      enable: false,
    },
  });

  function render() {
    bagl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
    });

    drawSDFPoints();
  }

  return { bagl, render };
}
