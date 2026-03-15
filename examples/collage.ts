import { createBagl } from '../src/index';

export function createOrganicCollageExample() {
  const bagl = createBagl();

  // Fullscreen triangle (attribute-less; uses gl_VertexID)
  const drawCollage = bagl({
    vert: `#version 300 es
    precision mediump float;
    out vec2 vUv;
    void main(){
      // full screen triangle
      vec2 p = vec2((gl_VertexID<<1) & 2, gl_VertexID & 2);
      vUv = p;
      gl_Position = vec4(p*2.0-1.0, 0.0, 1.0);
    }`,

    frag: `#version 300 es
    precision mediump float;

    in vec2 vUv;
    out vec4 fragColor;

    uniform vec2  uResolution;
    uniform float uTime;
    uniform float uScale;        // base Voronoi scale
    uniform float uTiles;        // procedural "atlas" tiling (NxN)
    uniform float uEdgeFeather;  // feather width of torn edge
    uniform float uFray;         // random fray amplitude
    uniform int   uLayers;       // number of collage layers (<= MAX_LAYERS)
    uniform float uSeed;         // global random seed
    uniform float uFlow;         // subtle piece drift

    // ---------------------------- Hash utils
    float hash11(float n){
      return fract(sin(n)*43758.5453123);
    }
    float hash21(vec2 p){
      // low-cost 2D->1 hash
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    vec2 hash22(vec2 p){
      float n = hash21(p);
      return vec2(n, hash21(p + n + 19.19));
    }

    // ---------------------------- Tiny fbm (for ink and drift)
    float noise(vec2 x){
      vec2 f = fract(x);
      vec2 u = f*f*(3.0-2.0*f);
      vec2 i = floor(x);
      float a = hash21(i);
      float b = hash21(i + vec2(1,0));
      float c = hash21(i + vec2(0,1));
      float d = hash21(i + vec2(1,1));
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
    }
    float fbm(vec2 x){
      float s = 0.0, a = 0.5;
      for(int i=0;i<4;i++){
        s += a * noise(x);
        x *= 2.0;
        a *= 0.5;
      }
      return s;
    }

    // ---------------------------- Voronoi (returns F1, F2, id, seed vector)
    struct VOut { vec2 cid; vec2 r; float F1; float F2; };

    VOut voronoi(vec2 p){
      vec2 ip = floor(p);
      vec2 fp = fract(p);

      float F1 = 1e9, F2 = 1e9;
      vec2 bestI = vec2(0.0), bestR = vec2(0.0);

      for(int j=-1;j<=1;j++){
        for(int i=-1;i<=1;i++){
          vec2 g = vec2(float(i), float(j));
          vec2 cellPos = ip + g;
          vec2 seedVec = cellPos + vec2(uSeed);
          vec2 jitter = hash22(seedVec) - 0.5;     // jittered seed
          jitter += 0.15 * sin(seedVec * 1.7);         // tiny structure
          // gentle time drift so pieces "breathe"
          jitter += uFlow * 0.15 * vec2(
            sin(seedVec.x * 0.9 + uTime * 0.15),
            cos(seedVec.y * 1.1 + uTime * 0.12)
          );
          vec2 r = g + jitter - fp;
          float d = dot(r,r);
          if(d < F1){
            F2 = F1; F1 = d; bestI = ip + g; bestR = r;
          }else if(d < F2){
            F2 = d;
          }
        }
      }
      VOut v;
      v.cid = bestI;
      v.r   = bestR;
      v.F1  = sqrt(F1);
      v.F2  = sqrt(F2);
      return v;
    }

    // ---------------------------- Per-cell affine "paper" UV
    vec2 cellUV(vec2 uv01, vec2 cid){
      vec2 h = hash22(cid + uSeed*7.3);
      float ang = 6.2831853 * h.x;
      float sc  = mix(0.7, 1.35, h.y);
      mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
      // slight offset so every scrap samples a different subregion
      vec2 off = (hash22(cid + 11.7) - 0.5) * 0.45;
      return clamp(R * ((uv01 - 0.5) * sc) + 0.5 + off, 0.0, 1.0);
    }

    // ---------------------------- Procedural "atlas" (inky, high-contrast)
    vec3 procAtlas(vec2 uv01, vec2 cid){
      // choose a tile index per cell
      float N = max(1.0, uTiles);
      float idx = floor(N*N * hash21(cid + 3.1));
      vec2  tile = vec2(mod(idx, N), floor(idx / N));
      vec2  tileUV = (tile + uv01) / N;

      // inky black/white with stripes, dots, and smudges
      float ink = 0.0;
      // layered motifs
      float stripes = step(0.5, fract(tileUV.x*12.0 + 1.7*hash21(cid)));
      float dots    = step(0.75, fract(sin((tileUV.x+tileUV.y)*80.0)*43758.5));
      float smear   = smoothstep(0.25, 0.75, fbm(tileUV*6.0 + 7.0*hash21(cid+2.5)));
      float edgeBleed = smoothstep(0.0, 0.15, 1.0 - max(abs(uv01.x-0.5), abs(uv01.y-0.5))*2.0);

      ink = mix(stripes, smear, 0.35);
      ink = max(ink, 0.6*dots);
      ink = mix(ink, 1.0, 0.15*edgeBleed);
      // push to bold black/white
      ink = step(0.5, ink);
      return vec3(ink);
    }

    // ---------------------------- Torn edge mask from Voronoi (F2-F1)
    float tornMask(VOut v){
      float d = (v.F2 - v.F1);                   // 0 at edges, >0 inside
      // fray with per-cell grain
      float grain = hash21(v.cid + floor(v.r*7.0 + 3.0));
      d += (grain - 0.5) * uFray;
      return smoothstep(uEdgeFeather, 0.0, d);
    }

    // ---------------------------- Main
    #define MAX_LAYERS 4

    void main(){
      // NDC-ish UV with aspect fix, centered
      vec2 uv = (vUv * uResolution - 0.5 * uResolution) / uResolution.y;

      vec3 col = vec3(0.0);

      for(int k=0; k<MAX_LAYERS; ++k){
        if(k >= uLayers) break;

        float sc = uScale * pow(1.7, float(k));     // multi-scale shards
        VOut v = voronoi(uv * sc);

        // local orientation inside cell (seed-to-point direction)
        vec2 dir = -normalize(v.r);
        vec2 local01 = 0.5 + dir * 0.5;

        // torn paper alpha
        float m = tornMask(v);

        // per-cell affine and "atlas" sampling
        vec2  cuv = cellUV(local01, v.cid);
        vec3  ink = procAtlas(cuv, v.cid);

        // collage compositing: max-like pile of paper
        col = max(col, ink * m);
      }

      // light paper tint + slight vignette
      float vig = smoothstep(1.2, 0.2, length(uv));
      col = mix(vec3(0.97), col, 0.95) * vig;

      fragColor = vec4(col, 1.0);
    }`,

    // no attributes (gl_VertexID), we draw 3 verts
    attributes: {},
    count: 3,
    primitive: 'triangles',
    depth: { enable: false },
    cull: { enable: false },

    uniforms: {
      uResolution: (ctx: any) => [ctx.width, ctx.height],
      uTime: (ctx: any) => ctx.time,
      uScale: 4.0,
      uTiles: 4.0,
      uEdgeFeather: 0.06,
      uFray: 0.06,
      uLayers: 3,
      uSeed: Math.random()*1000,
      uFlow: 0.0,
    },
  });

  function render(props: any = {}) {
    bagl.clear({ color: [0, 0, 0, 1], depth: 1 });
    drawCollage(props);
  }

  return { bagl, render };
}
