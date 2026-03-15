import { createBagl } from '../src/index'; // adjust path

export function createSDEdgePointCloudExample() {
  const bagl = createBagl();

  const draw = bagl({
    vert: `#version 300 es
    precision mediump float;

    const vec2 POSITIONS[3] = vec2[](
      vec2(-1.0, -1.0),
      vec2( 3.0, -1.0),
      vec2(-1.0,  3.0)
    );

    out vec2 vUv;

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

    // ---------------------------
    // Utility
    // ---------------------------

    float hash(vec3 p) {
      float h = dot(p, vec3(27.1, 61.7, 12.4));
      return fract(sin(h) * 43758.5453123);
    }

    vec3 rotateYX(vec3 p, float t) {
      float ay = t * 0.5;
      float ax = t * 0.37;

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

    // ---------------------------
    // SDF primitives
    // ---------------------------

    float sdBox(vec3 p, vec3 b) {
      vec3 d = abs(p) - b;
      return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
    }

    float sdSphere(vec3 p, float r) {
      return length(p) - r;
    }

    // ---------------------------
    // Scene SDF
    // Make something with real sharp edges: box with cuts.
    // ---------------------------

    float mapScene(vec3 p) {
      // Rotate whole shape
      p = rotateYX(p, time * 0.8);

      // Base box
      float box = sdBox(p, vec3(0.9));

      // Cut a diagonal wedge (CSG difference) to create crisp edges
      vec3 q = p - vec3(0.3, 0.3, 0.3);
      float cutter = (q.x + q.y + q.z) * 0.7; // plane-ish
      float sphereCut = sdSphere(p - vec3(-0.4, -0.2, 0.4), 0.7);

      // Combine: box minus max(cutter-plane, small sphere)
      float cutShape = max(cutter, -sphereCut);
      float shape = max(box, -cutShape);

      return shape;
    }

    // Normal from SDF
    vec3 calcNormal(vec3 p) {
      float e = 0.0015;
      vec2 h = vec2(e, 0.0);
      float dx = mapScene(p + vec3(h.x, h.y, h.y)) - mapScene(p - vec3(h.x, h.y, h.y));
      float dy = mapScene(p + vec3(h.y, h.x, h.y)) - mapScene(p - vec3(h.y, h.x, h.y));
      float dz = mapScene(p + vec3(h.y, h.y, h.x)) - mapScene(p - vec3(h.y, h.y, h.x));
      return normalize(vec3(dx, dy, dz));
    }

    // ---------------------------
    // Edge detector:
    // high normal variation => sharp edge / corner
    // ---------------------------
    float edgeFactor(vec3 p) {
      float e = 0.01;
      vec3 n0 = calcNormal(p);
      float m = 0.0;

      vec3 n1 = calcNormal(p + vec3(e, 0.0, 0.0));
      vec3 n2 = calcNormal(p + vec3(0.0, e, 0.0));
      vec3 n3 = calcNormal(p + vec3(0.0, 0.0, e));
      vec3 n4 = calcNormal(p - vec3(e, 0.0, 0.0));
      vec3 n5 = calcNormal(p - vec3(0.0, e, 0.0));
      vec3 n6 = calcNormal(p - vec3(0.0, 0.0, e));

      m = max(m, length(n0 - n1));
      m = max(m, length(n0 - n2));
      m = max(m, length(n0 - n3));
      m = max(m, length(n0 - n4));
      m = max(m, length(n0 - n5));
      m = max(m, length(n0 - n6));

      return m; // ~0 on flats, large on edges/corners/CSG seams
    }

    vec3 shade(vec3 p, vec3 n, vec3 rd, float edgeStrength, float noise) {
      // Moving light
      vec3 lp = vec3(
        sin(time * 0.7) * 2.0,
        cos(time * 0.4) * 1.5,
        2.0
      );
      vec3 l = normalize(lp - p);
      vec3 v = normalize(-rd);
      vec3 h = normalize(l + v);

      float diff = max(dot(n, l), 0.0);
      float spec = pow(max(dot(n, h), 0.0), 48.0);

      // EdgeStrength boosts brightness near sharp features
      float edgeBoost = smoothstep(0.3, 1.0, edgeStrength);

      // Palette
      vec3 c1 = vec3(0.6, 0.9, 1.0);
      vec3 c2 = vec3(1.0, 0.5, 0.2);
      float mixv = 0.5 + 0.5 * n.y;
      vec3 base = mix(c1, c2, mixv);

      vec3 col = base * (0.15 + 1.5 * diff) + 0.8 * spec;
      col *= (0.4 + 1.6 * edgeBoost);
      col *= (0.8 + 0.4 * noise); // small per-particle variation

      return col;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy / resolution) * 2.0 - 1.0;
      uv.x *= resolution.x / resolution.y;

      // Camera
      float camDist = 3.5;
      vec3 ro = vec3(0.0, 0.0, camDist);
      vec3 rd = normalize(vec3(uv, -1.8));

      float t = 0.0;
      float maxDist = 10.0;
      float eps = 0.0015;

      vec3 accCol = vec3(0.0);
      float accAlpha = 0.0;

      const int MAX_STEPS = 140;

      for (int i = 0; i < MAX_STEPS; i++) {
        if (t > maxDist || accAlpha > 0.995) break;

        vec3 p = ro + rd * t;
        float d = mapScene(p);

        if (d < eps) {
          // Near surface: test edge-ness
          float e = edgeFactor(p);

          // Threshold: only keep SHARP features
          // Flats ~0.0, edges/corners significantly higher.
          float edgeThresh = 0.12;
          if (e > edgeThresh) {
            // Hash per edge cell for sparse particles
            float density = 200.0; // spatial frequency -> "point size" feel
            vec3 cell = floor(p * density);
            float h = hash(cell);

            // Only some cells spawn a visible particle
            float spawn = 0.565; // raise = sparser
            if (h > spawn) {
              vec3 n = calcNormal(p);
              vec3 c = shade(p, n, rd, e, h);

              // Alpha: based on edge strength & depth
              float df = smoothstep(maxDist, 0.0, t);
              float a = 0.9 * df * smoothstep(edgeThresh, 0.4, e);

              // Composite
              accCol += (1.0 - accAlpha) * c * a;
              accAlpha += (1.0 - accAlpha) * a;
            }
          }

          // Keep marching so we see back edges too
          t += 0.02; // thickness through which we "scan" for more edges
        } else {
          // Normal sphere tracing step
          t += d;
        }
      }

      // Background + result
      vec3 bg;
      {
        float r = length(uv);
        float vignette = smoothstep(1.2, 0.2, r);
        bg = vec3(0.01, 0.01, 0.02) * vignette;
      }

      if (accAlpha <= 0.0) {
        color = vec4(bg, 1.0);
      } else {
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
    draw();
  }

  return { bagl, render };
}
