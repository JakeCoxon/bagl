import { Pane } from 'tweakpane';
import { createBagl, type Texture2DHandle, type FramebufferHandle } from '../src/index';
import * as mat4 from 'gl-mat4';
import earcut from 'earcut';

type Vector = [number, number]
type Vector3 = [number, number, number]

// Math helpers
function sub(a: Vector, b: Vector): Vector {
  return [a[0] - b[0], a[1] - b[1]]
}
function add(a: Vector, b: Vector): Vector {
  return [a[0] + b[0], a[1] + b[1]]
}
function scale(a: Vector, b: number): Vector {
  return [a[0] * b, a[1] * b]
}
function dot(a: Vector, b: Vector) {
  return a[0] * b[0] + a[1] * b[1]
}
function cross(a: Vector, b: Vector) {
  return a[0] * b[1] - a[1] * b[0]
}
function normalize(v: Vector): Vector {
  const l = Math.hypot(v[0], v[1])
  return l > 0 ? [v[0] / l, v[1] / l] : [0, 0]
}
function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x))
}
function lerpAngle(n0: Vector, n1: Vector, t: number, dir: number) {
  const angle0 = Math.atan2(n0[1], n0[0])
  const angle1 = Math.atan2(n1[1], n1[0])
  const angle = angle0 + dir * (angleDiff(angle0, angle1) * t)
  return [Math.cos(angle), Math.sin(angle)]
}
function angleDiff(a: number, b: number) {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return d
}



export function createScifiExample() {
  const bagl = createBagl();

  const params = {
    thickness: 4,
    fringe: 0,
    joinType: 'miter',
    wireframe: false,
    invSq: false,
    center: true,
    minorBevel: 50,
    majorBevel: 30,
    drawNormals: false,
    drawDepth: false,
    drawAo: false,
    lightDir: {x: -1, y: -1, z: 1},
    aoRadius: 0.14,
    aoBias: 0.002,
    aoScale: 0.004,
    aoMultiplier: 1,
    aoBlur: true,
    aoBlurDepthFalloff: 50,
  }

  const pane = (new Pane()) as any;
  pane.addBinding(params, 'thickness');
  pane.addBinding(params, 'fringe');
  pane.addBinding(params, 'joinType', { step: 1, min: 0, max: 2 });
  pane.addBinding(params, 'wireframe');
  pane.addBinding(params, 'invSq');
  pane.addBinding(params, 'center');
  pane.addBinding(params, 'minorBevel');
  pane.addBinding(params, 'majorBevel');
  pane.addBinding(params, 'drawNormals');
  pane.addBinding(params, 'drawDepth');
  pane.addBinding(params, 'drawAo');
  pane.addBinding(params, 'lightDir');
  pane.addBinding(params, 'aoRadius');
  pane.addBinding(params, 'aoBias', { min: 0, max: 0.01 });
  pane.addBinding(params, 'aoScale');
  pane.addBinding(params, 'aoMultiplier');
  pane.addBinding(params, 'aoBlur');
  pane.addBinding(params, 'aoBlurDepthFalloff');

  type LineBuffer = {
    vertices: number[],
    alphas: number[],
    normals: number[]
  }

  // 1-A  Build a 1-D Gaussian CDF lookup texture ───────────────────────────
  // https://en.wikipedia.org/wiki/Error_function#Approximation_with_elementary_functions
  /**
   * Error function erf(x)  —  Abramowitz & Stegun 7.1.26
   * Maximum relative error ≈ 1.5 × 10⁻⁷
   */
  function erf(x: number) {
    // Save the sign
    const sign = Math.sign(x);
    const ax   = Math.abs(x);

    // A&S coefficients
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    // Horner evaluation of the polynomial
    const t = 1 / (1 + p * ax);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);

    return sign * y;
  }

  const GAUSS_LUT_SIZE = 1024;
  const gaussLUTData = new Float32Array(GAUSS_LUT_SIZE);
  for (let i = 0; i < GAUSS_LUT_SIZE; ++i) {
    // 0 → 1   ↦  −3σ → +3σ           (σ = 1)
    const t = (i / (GAUSS_LUT_SIZE - 1) - 0.5) * 6.0;
    gaussLUTData[i] = 0.5 * (1.0 + erf(t / Math.SQRT2));   // Φ(t)
  }

  const gaussTex = bagl.texture({
    width: GAUSS_LUT_SIZE,
    height: 1,
    data: gaussLUTData,
    format: 'red',        // single channel is enough
    internalFormat: 'r32f',
    type: 'float',
    mag: 'linear',
    min: 'linear'
  });

  const invSqLUT = new Float32Array(GAUSS_LUT_SIZE);
  for (let i = 0; i < GAUSS_LUT_SIZE; ++i) {
    const spread = 20;
    const u  = i / (GAUSS_LUT_SIZE - 1);          // 0 → 1
    const y  = (u - 0.5) * 2.0 * spread;    // −spread‥+spread
    invSqLUT[i] = 0.5 + Math.atan(y) / Math.PI;
  }
  // const lo = invSqLUT[0];
  // const hi = invSqLUT[GAUSS_LUT_SIZE - 1];
  // for (let i = 0; i < GAUSS_LUT_SIZE; ++i) {
  //   invSqLUT[i] = (invSqLUT[i] - lo) / (hi - lo);  // remap to [0, 1]
  // }

  const invSqTex = bagl.texture({
    width: GAUSS_LUT_SIZE,
    height: 1,
    data: invSqLUT,
    format: 'red',        // single channel is enough
    internalFormat: 'r32f',
    type: 'float',
    mag: 'linear',
    min: 'linear'
  });

  const drawUnderlyingLines = bagl<{
    buffer: LineBuffer,
  }>({
    vert: `#version 300 es
    precision mediump float;
    in vec2 position;
    in vec2 alpha;
    in vec2 normal;

    out vec2 vAlpha;
    out vec2 vNormal;
    uniform mat4 projection;
    void main () {
      gl_Position = projection * vec4(position, 0, 1);
      vAlpha = alpha;
      vNormal = normal;
    }`,

    frag: `#version 300 es
    precision mediump float;
    in vec2 vAlpha;
    in vec2 vNormal;
    layout(location = 0) out vec4 outColor;
    layout(location = 1) out vec4 outNormal;

    void main () {
      // Calculate 45-degree bevel normal looking top-down
      vec3 targetNormal = vec3(vNormal.x, vNormal.y, 1.0);
      vec3 upNormal = vec3(0.0, 0.0, 1.0);

      float beta = 0.0;
      float alpha = clamp(vAlpha.y, 0.0, 1.0);

      // if (alpha < 0.5) {
      //   beta = alpha * 2.0;
      // } else {
      //   // beta = (1.0 - vAlpha.x) * 2.0;
      // }
      beta = alpha;
      // beta = 0.5;

      vec3 normal = mix(targetNormal, upNormal, beta);

      normal = normalize(normal); // Normalize to get unit vector
      vec4 colorNormal = vec4(normal * 0.5 + 0.5, 1.0);


      // outColor = vec4(1, 1, 1, 1.0);
      outColor = vec4(vAlpha.x, vAlpha.x, vAlpha.x, 1.0);
      outNormal = colorNormal;
      // float d = min(vAlpha.x, vAlpha.y);

      // d = max(d, -featherRadius);
  
      // // outColor.r = d / -1e5;

      // outColor.a = gaussCDF(d);
      // outColor.a = 1.0;
    }`,

    attributes: {
      position: (c, p) => ({ data: new Float32Array(p.buffer.vertices), size: 2 }),
      alpha: (c, p) => ({ data: new Float32Array(p.buffer.alphas), size: 2 }),
      normal: (c, p) => ({ data: new Float32Array(p.buffer.normals), size: 2 })
    },

    uniforms: {
      projection: ({width, height}) =>
        mat4.ortho([], 0, width, 0, height, 0, 1) as number[],
      // gaussTex: () => params.invSq ? invSqTex : gaussTex,
      // color: (c, p) => p.color,
      // featherRadius: (c, p) => p.featherRadius
    },

    count: (c, p) => p.buffer.vertices.length / 2,

    // blend: {
    //   enable: (c, p) => p.wireframe ? false : true,
    //   func: ['src-alpha', 'one-minus-src-alpha']
    //   // func: {
        
    //   //   srcRGB: 'src alpha',
    //   //   dstRGB: 'one minus src alpha',
    //   //   srcAlpha: 'one',
    //   //   dstAlpha: 'one minus src alpha'
    //   // }
    // },
    blend: { enable: false },

    depth: { enable: false },

    primitive: 'triangles'
  })

  function appendLinePath({ buffer, points, thickness = 0.03, fringe = 0.01, leftDepth = 0, rightDepth = 1 }: { buffer: LineBuffer, points: Vector[], thickness?: number, fringe?: number, leftDepth?: number, rightDepth?: number }) {


    type CornerData = {
      point: Vector,
      dir: Vector,
      normal: Vector,
      dot: number,
      shortenUnit: number
    }

    const half = thickness / 2
    const BIG = 1e5;

    /// forms two triangles abc acd
    //
    //       ^  Line direction
    //       |
    //   B ------ C
    //   |      / |
    //   |     /  |
    //   |   /    |
    //   | /      |
    //   A ------ D
    // dist1    dist2
    //
    function pushQuad(buf: LineBuffer, a: number[], b: number[], c: number[], d: number[], dist1: Vector, dist2: Vector, normal1: Vector, normal2: Vector) {
      buf.vertices.push(a[0], a[1], b[0], b[1], c[0], c[1], a[0], a[1], c[0], c[1], d[0], d[1])
      buf.alphas.push(...dist1, ...dist1, ...dist2, ...dist1, ...dist2, ...dist2)
      buf.normals.push(...normal1, ...normal1, ...normal2, ...normal1, ...normal2, ...normal2)
    }

    function buildSegment(buf: LineBuffer, p0: Vector, p1: Vector, prevCorner: CornerData, nextCorner: CornerData, dir: Vector) {
      const normal = [-dir[1], dir[0]]
      const outer = half + fringe

      function offset(p: Vector, d: number, extent: number = 0): Vector {
        return [p[0] + d * normal[0] + extent * d * dir[0], p[1] + d * normal[1] + extent * d * dir[1]]
      }

      // Adjust segment endpoints to avoid overlap with adjacent segments
      const prevShorten = prevCorner.shortenUnit
      const nextShorten = nextCorner.shortenUnit

      const lineNormal = [dir[1], -dir[0]] as Vector

      // Solid center using adjusted endpoints
      if (params.center) {
        pushQuad(buf, offset(p0, -half, -prevShorten), offset(p1, -half, nextShorten), offset(p1, half, nextShorten), offset(p0, half, -prevShorten), 
          [leftDepth, 0], [rightDepth, 1], lineNormal, lineNormal)
      }

      // TODO: Fringes are rotated 180 degrees from the line direction for some reason

      // // Left fringe
      // pushQuad(buf, offset(p0, -outer, -prevShorten), offset(p1, -outer, nextShorten), offset(p1, -half, nextShorten), offset(p0, -half, -prevShorten), 
      //   // [0, 0], [0, 0])
      //   [-fringe, BIG], [0.0, BIG])

      // // Right fringe
      // pushQuad(buf, offset(p0, half, -prevShorten), offset(p1, half, nextShorten), offset(p1, outer, nextShorten), offset(p0, outer, -prevShorten), 
      //   // [0, 0], [0, 0])
      //   [BIG, 0.0], [BIG, -fringe])

    }

    function extendMiter(p, nA, nC, thickness) {
      const bisect = normalize([nA[0] + nC[0], nA[1] + nC[1]])
      const scale = thickness / (2 * dot(bisect, normalize(nA)))
      return [p[0] + bisect[0] * scale, p[1] + bisect[1] * scale]
    }




    const createEdgeCorner = (point: Vector): CornerData => {
      return { point: point, dir: [0, 0], normal: [0, 0], dot: 1, shortenUnit: 0 }
    }
    const createCorner = (point: Vector, currentDir: Vector, nextDir: Vector): CornerData => {
      const averageDir = normalize([(nextDir[0] + currentDir[0]) / 2, (nextDir[1] + currentDir[1]) / 2])

      let cornerNormal = [-averageDir[1], averageDir[0]] as Vector
      const normal = [-currentDir[1], currentDir[0]] as Vector

      let shortenUnit = ((dot(cornerNormal, currentDir)) / dot(cornerNormal, normal))
      const dot1 = dot(currentDir, nextDir)
      
      return { 
        point: point, 
        dir: averageDir,
        normal: normal,
        dot: dot1,
        shortenUnit: shortenUnit
      }
    }
    let prevCorner = createEdgeCorner(points[points.length - 1])
    let nextCorner = createEdgeCorner(points[points.length - 1])
    let nextDir = normalize(sub(points[0], points[points.length - 1]))
    let currentDir = nextDir

    // TODO: Subtle bug with closed edge

    for (let i = -1; i < points.length; i++) {
      prevCorner = nextCorner
      currentDir = nextDir

      const next = points[(i+1) % points.length]

      if (i < points.length - 1) {
        const nextNext = points[(i+2) % points.length]
        nextDir = normalize(sub(nextNext, next))
        nextCorner = createCorner(next, currentDir, nextDir)
      } else {
        nextCorner = createEdgeCorner(next)
      }
      
      if (i >= 0) buildSegment(buffer, points[i], next, prevCorner, nextCorner, currentDir)
    }

    
  }

  const drawTexture = bagl<{
    texture: Texture2DHandle,
  }>({
    vert: `#version 300 es
    precision mediump float;
    in vec2 position;
    in vec2 uv;
    out vec2 vUv;
    void main () {
      gl_Position = vec4(position, 0.0, 1.0);
      vUv = uv;
    }
    `,
    frag: `#version 300 es
    precision mediump float;
    in vec2 vUv;
    uniform sampler2D image;
    out vec4 outColor;
    void main () {
      outColor = texture(image, vUv);
    }
    `,
    attributes: {
      position: ({
        data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]),
        size: 2
      }),
      uv: ({
        data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]),
        size: 2
      })
    },
    // framebuffer: null,
    uniforms: {
      image: (c, p) => p.texture
    },
    primitive: 'triangles',
    count: 6,
  })


  const drawPlane = bagl<{
    heightMap: Texture2DHandle,
    normalMap: Texture2DHandle,
    aoMap: Texture2DHandle,
    heightScale: number,
    lightDir: Vector3,
  }
  >({
    vert: `#version 300 es
      precision mediump float;
      in vec2 position;
      in vec2 uv;

      uniform sampler2D heightMap;
      uniform float heightScale;

      out vec2 vUv;
      out vec3 vPosition;

      void main() {
        vec3 pos = vec3(position, 0.0);

        // Optional height displacement
        float h = texture(heightMap, uv).r;
        pos.z += h * heightScale;

        vUv = uv;
        vPosition = pos;
        // gl_Position = projection * vec4(pos, 1.0);
        gl_Position = vec4(position, 0.0, 1.0);

      }
    `,

    frag: `#version 300 es
      precision mediump float;
      uniform sampler2D normalMap;
      uniform vec3 lightDir;
      uniform sampler2D aoMap;
      uniform float aoMultiplier;
      
      in vec2 vUv;
      in vec3 vPosition;

      out vec4 outColor;

      void main() { lightDir;
        // Get tangent-space normal from texture
        vec3 normal = texture(normalMap, vUv).rgb;
        normal = normalize(normal * 2.0 - 1.0);
        normal.y *= -1.0;

        // Simple Lambertian lighting
        float diffuse = max(dot(normal, normalize(lightDir)), 0.0);
        vec3 color = vec3(0.0, 0.9, 0.8) * diffuse;
        
        float ao = texture(aoMap, vUv).r;
        color *= 1.0 - ((1.0 - ao) * aoMultiplier);

        outColor = vec4(color, 1.0);
      }
    `,

    attributes: {
      position: ({
        data: new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]),
        size: 2
      }),
      uv: ({
        data: new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]),
        size: 2
      })
    },

    uniforms: {
      // model: mat4.identity([]),
      // view: (c, p) => {
      //   const t = 0.01 * c.ticks
      //   return mat4.lookAt([],
      //     [Math.sin(t*1e-2)*2, 1.5, Math.cos(t*1e-2)*2],
      //     [0, 0, 0],
      //     [0, 1, 0])
      // },
      heightMap: (c, p) => p.heightMap,
      normalMap: (c, p) => p.normalMap,
      aoMap: (c, p) => p.aoMap,
      heightScale: 0.1,
      lightDir: (c, p) => p.lightDir,
      aoMultiplier: () => params.aoMultiplier,
    },
    depth: { enable: false },
    blend: { enable: false },
    cull: { enable: false },

    count: 6
  })

  // Ambient occlusion /////////////////////////////////////////////////

  function mix(a: number, b: number, t: number) {
    return a * (1 - t) + b * t
  }

  function normalize3(v: Vector3): Vector3 {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
    return [v[0] / len, v[1] / len, v[2] / len]
  }

  // const kernelSize = 16;
  // const kernel: Vector3[] = [];
  // for (let i = 0; i < kernelSize; ++i) {
  //   // distribute more samples near the origin
  //   const skew = i / kernelSize;
  //   const scale = mix(0.1, 1.0, skew * skew);
  //   const dir = normalize3([
  //     (Math.random() * 2 - 1),
  //     (Math.random() * 2 - 1),
  //     Math.random()           // only upper hemisphere
  //   ]);
  //   kernel.push(dir.map(v => v * scale) as Vector3);
  // }

  const kernelSize = 32;
  const kernel: Vector3[] = [];
  for (let i = 0; i < kernelSize; ++i) {
    const a = i * 2.399963;           // golden angle in radians
    const r = (i + 0.5) / kernelSize;
    kernel.push([
      Math.cos(a) * r,
      Math.sin(a) * r,
      Math.pow(1.0 - r, 2.0)          // bias toward the center
    ]);
  }


  const noiseData = new Float32Array(16 * 3);
  for (let i = 0; i < 16; ++i) {
    noiseData.set([
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      0.0
    ], i * 3);
  }
  const noiseTex = bagl.texture({
    data: noiseData,
    width: 4,
    height: 4,
    format: 'rgb',
    type: 'float',
    wrapS: 'repeat',
    wrapT: 'repeat'
  });

  const aoPass = bagl<{
    depthTexture: Texture2DHandle,
    normalTexture: Texture2DHandle,
  }>({
    vert: `#version 300 es
      precision mediump float;
      in vec2 position;
      out vec2 vUv;
      void main () {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0, 1);
      }`,
    // framebuffer: aoFbo,   // 1‑channel AO output
    frag: `#version 300 es
    precision mediump float;

    #define KERNEL_SIZE ${kernelSize}

    uniform sampler2D uDepth;      // linear depth, 0‒1
    uniform sampler2D uNormal;     // view‑space normals, xyz in −1‒1
    uniform sampler2D uNoise;      // 4×4 random rotations
    uniform vec2      uResolution; // screen size in px
    uniform vec2      uScaleXY;    // half‑extents of ortho box in view units
    uniform float     uRadius;     // AO radius in view units
    uniform float     uBias;       // small self‑shadow bias
    uniform vec3      uKernel[KERNEL_SIZE];

    in vec2 vUv;
    out vec4 outColor;

    void main () {
      // current pixel
      float depth   = texture(uDepth, vUv).r;
      vec3  normal  = texture(uNormal, vUv).xyz * 2.0 - 1.0;
      vec3  posView = vec3((vUv * 2.0 - 1.0) * uScaleXY, depth);

      // rotate kernel using a per‑pixel noise vector (keeps patterns away)
      vec3 randVec  = normalize(texture(uNoise, vUv * uResolution / 4.0).xyz * 2.0 - 1.0);
      mat3 TBN      = mat3(
          normalize(randVec - normal * dot(randVec, normal)),
          normalize(cross(normal, randVec)),
          normal
      );

      float occ = 0.0;

      for (int i = 0; i < KERNEL_SIZE; ++i) {
        // hemisphere sample in view space
        vec3 sampleVec   = TBN * uKernel[i];
        vec3 samplePos   = posView + sampleVec * uRadius;

        // back to texture space
        vec2 offsetUV    = samplePos.xy / uScaleXY * 0.5 + 0.5;

        // discard samples that fall outside the screen
        if (any(lessThan(offsetUV, vec2(0.0))) ||
            any(greaterThan(offsetUV, vec2(1.0)))) {
          continue;
        }

        float sampleDepth = texture(uDepth, offsetUV).r;
        float rangeCheck  = step(0.0, uRadius - abs(sampleDepth - depth)); // avoid distant hits
        occ += (sampleDepth - depth > uBias ? 1.0 : 0.0) * rangeCheck;
      }

      float ao = 1.0 - occ / float(KERNEL_SIZE);
      // ao = pow(ao, 0.7);
      outColor = vec4(vec3(ao), 1.0);
    }
    `,
    attributes: { position: { data: new Float32Array([-1,-1, -1,1, 1,-1, 1,1]), size: 2 } },
    depth: { enable: false },
    blend: { enable: false },
    cull: { enable: false },
    uniforms: {
      uDepth:    (c, p) => p.depthTexture,
      uNormal:   (c, p) => p.normalTexture,
      uNoise:    noiseTex,
      uResolution: ({viewportWidth, viewportHeight}) => [viewportWidth, viewportHeight],
      uScaleXY:  ({viewportWidth, viewportHeight}) => [viewportWidth*params.aoScale, viewportHeight*params.aoScale],
      uRadius:   (c, p) => params.aoRadius,
      uBias:     (c, p) => params.aoBias,
      "uKernel[0]":   kernel as any
    },
    count: 4,
    primitive: 'triangle-strip'
  });

  const blurPass = bagl<{
    targetFbo: FramebufferHandle,
    sourceTex: 'texture',
    depthFbo: 'texture',
    dir: number,
    depthFalloff: number,
  }>({
    framebuffer: (_, {targetFbo}) => targetFbo,
    vert: `#version 300 es
      precision mediump float;
      in vec2 position;
      out vec2 vUv;
      void main () {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0, 1);
      }`,
    frag: `#version 300 es
    precision mediump float;
    in vec2 vUv;
    out vec4 outColor;

    precision mediump float;

    uniform sampler2D uAo;       // noisy AO texture (R channel)
    uniform sampler2D uDepth;    // linear depth (for edge‑aware weighting)
    uniform vec2      uTexel;    // (1/width, 1/height) – set per pass
    uniform float     uSigma;    // gaussian radius in px (e.g. 4.0)
    uniform float     uDepthFalloff; // depth sensitivity (e.g. 50.0)

    // 7‑tap gaussian weights (mirrored) pre‑normalised for sigma=4
    const float gWeights[4] = float[4](0.204164, 0.304005, 0.093913, 0.012869);

    void main () { uSigma;
      float centerDepth = texture(uDepth, vUv).r;
      float centerAo    = texture(uAo,   vUv).r;

      float sum     = centerAo * gWeights[0];
      float weightSum = gWeights[0];

      // sample ±1…3 on the chosen axis
      for (int i = 1; i <= 3; ++i) {
        vec2 offset = float(i) * uTexel;          // horizontal or vertical step
        float depthL = texture(uDepth, vUv - offset).r;
        float depthR = texture(uDepth, vUv + offset).r;

        float aoL = texture(uAo, vUv - offset).r;
        float aoR = texture(uAo, vUv + offset).r;

        // edge‑aware attenuation based on depth difference (orthographic => linear)
        float wL = gWeights[i] * exp(-abs(depthL - centerDepth) * uDepthFalloff);
        float wR = gWeights[i] * exp(-abs(depthR - centerDepth) * uDepthFalloff);

        sum       += aoL * wL + aoR * wR;
        weightSum += wL       + wR;
      }

      outColor = vec4(vec3(sum / weightSum), 1.0);
      outColor = vec4(vec3(centerAo), 1.0);
    }
    `,
    attributes: { position: { data: new Float32Array([-1,-1, -1,1, 1,-1, 1,1]), size: 2 } },
    uniforms: {
      uAo:        (_, {sourceTex}) => sourceTex,
      uDepth:     (_, {depthFbo}) => depthFbo,
      uSigma:     4.0,
      uDepthFalloff: (c, p) => p.depthFalloff,
      uTexel:     (c, p) =>
          p.dir === 0               // 0 = horizontal, 1 = vertical
            ? [1/p.targetFbo.width, 0]
            : [0, 1/p.targetFbo.height]
    },
    count: 4,
    primitive: 'triangle-strip'
  });

  // --- usage ---
  function blurAO () {
    const aoFbo = aoFramebuffer!.colorTexture(0)!
    const depthFbo = framebuffer!.colorTexture(0)!
    // first pass: horizontal (dir=0)
    blurPass({ sourceTex: aoFbo, targetFbo: aoBlurFbo1!, dir: 0, depthFbo, depthFalloff: params.aoBlurDepthFalloff });
    // second pass: vertical (dir=1)
    blurPass({ sourceTex: aoBlurFbo1!, targetFbo: aoFramebuffer!, dir: 1, depthFbo, depthFalloff: params.aoBlurDepthFalloff });
  }





  // Vector shapes /////////////////////////////////////////////////


  let mouse: Vector = [0, 0] 
  document.addEventListener('mousemove', (e) => {
    mouse = [e.clientX, window.innerHeight - e.clientY]
  })

  let framebuffer: FramebufferHandle | null = null
  let aoFramebuffer: FramebufferHandle | null = null
  let aoBlurFbo1: FramebufferHandle | null = null


  type Shape = {
    points: Vector[],
    isClosed: boolean
  }

  function bevelShape(shape: Shape, radius: number) {
    const points = shape.points
    const newPoints: Vector[] = []
    for (let i = 0; i < points.length + 1; i++) {
      const p = points[i % points.length]
      const next = points[(i + 1) % points.length]
      const prev = points[(i - 1 + points.length) % points.length]
      if (i > 0) {
        const prevDir = normalize(sub(p, prev))
        const p1: Vector = [p[0] - radius * prevDir[0], p[1] - radius * prevDir[1]]
        newPoints.push(p1)
      }

      if (i < points.length) {
        const dir = normalize(sub(next, p))
        const p1: Vector = [p[0] + radius * dir[0], p[1] + radius * dir[1]]
        // const p2: Vector = [p[0] - radius * dir[0], p[1] - radius * dir[1]]
        newPoints.push(p1)
      }
    }
    shape.points = newPoints
  }

  type ShapeBuffer = {
    vertices: number[],
    holes: number[],
    triangles: number[],
    clear: () => void
  }
  
  const shapeBuffer = {
    vertices: [] as number[],
    holes: [] as number[],
    triangles: [] as number[],
    clear: () => {
      shapeBuffer.vertices.length = 0
      shapeBuffer.holes.length = 0
      shapeBuffer.triangles.length = 0
    }
  }

  const shape = {
    points: [] as Vector[],
    isClosed: true,
    clear: () => {
      shape.points.length = 0
    }
  }

  const addRect = (shape: Shape, x: number, y: number, w: number, h: number) => {
    shape.points.push([x, y], [x + w, y], [x + w, y + h], [x, y + h])
  }

  const addShape = (shapeBuffer: ShapeBuffer, shape: Shape) => {
    shapeBuffer.vertices.push(...shape.points.flat())
  }

  const expandShape = (shape: Shape, amount: number) => {
    const newPoints: Vector[] = []
    for (let i = 0; i < shape.points.length; i++) {
      const prev = shape.points[(i - 1 + shape.points.length) % shape.points.length]
      const p = shape.points[i]
      const next = shape.points[(i + 1) % shape.points.length]
      const dir1 = normalize(sub(next, p))
      const normal1: Vector = [dir1[1], -dir1[0]]
      const dir2 = normalize(sub(p, prev))
      const normal2: Vector = [dir2[1], -dir2[0]]
      const normal = scale(add(normal1, normal2), 0.5)
      newPoints.push([p[0] + amount * normal[0], p[1] + amount * normal[1]])
    }
    shape.points = newPoints
  }

  const subtractShape = (shapeBuffer: ShapeBuffer, shape: Shape) => {
    shapeBuffer.holes.push(shapeBuffer.vertices.length / 2)
    const points = [...shape.points].reverse()
    shapeBuffer.vertices.push(...points.flat())
  }

  const createShapeAndAppend = (shapeBuffer: ShapeBuffer, lineBuffer: LineBuffer, depth: number) => {
    shapeBuffer.triangles = earcut(shapeBuffer.vertices, shapeBuffer.holes, 2)
    
    const numTriangles = shapeBuffer.triangles.length / 3

    // Create alpha values for each vertex (all set to 1.0 for now)
    const alphas = new Array(numTriangles * 6).fill(depth);
    const normals = new Array(numTriangles * 6).fill(0.0);

    lineBuffer.alphas.push(...alphas)
    lineBuffer.normals.push(...normals)
    
    const newTriangleVertices = new Array(numTriangles * 6).fill(0)
    for (let i = 0; i < numTriangles; i++) {
      const a = shapeBuffer.triangles[i * 3]
      const b = shapeBuffer.triangles[i * 3 + 1]
      const c = shapeBuffer.triangles[i * 3 + 2]

      newTriangleVertices[i * 6 + 0] = shapeBuffer.vertices[a * 2]
      newTriangleVertices[i * 6 + 1] = shapeBuffer.vertices[a * 2 + 1]
      newTriangleVertices[i * 6 + 2] = shapeBuffer.vertices[b * 2]
      newTriangleVertices[i * 6 + 3] = shapeBuffer.vertices[b * 2 + 1]
      newTriangleVertices[i * 6 + 4] = shapeBuffer.vertices[c * 2]
      newTriangleVertices[i * 6 + 5] = shapeBuffer.vertices[c * 2 + 1]
    }

    lineBuffer.vertices.push(...newTriangleVertices)
  }

  // type Rect = { x: number, y: number, w: number, h: number }
  class Rect {
    constructor(public x: number, public y: number, public w: number, public h: number) {}
    cutLeft(amount: number): Rect {
      const newRect = makeRect(this.x, this.y, amount, this.h)
      this.x += amount
      this.w -= amount
      return newRect
    }
    cutRight(amount: number): Rect {
      const newRect = makeRect(this.x + this.w - amount, this.y, amount, this.h)
      this.w -= amount
      return newRect
    }
    cutTop(amount: number): Rect {
      const newRect = makeRect(this.x, this.y, this.w, amount)
      this.y += amount
      this.h -= amount
      return newRect
    }
    cutBottom(amount: number): Rect {
      const newRect = makeRect(this.x, this.y + amount, this.w, amount)
      this.h -= amount
      return newRect
    }
    expanded(amount: number): Rect {
      return makeRect(this.x - amount, this.y - amount, this.w + amount * 2, this.h + amount * 2)
    }
    insetted(amount: number): Rect {
      return makeRect(this.x + amount, this.y + amount, this.w - amount * 2, this.h - amount * 2)
    }
    clone(): Rect {
      return makeRect(this.x, this.y, this.w, this.h)
    }
  }
  const makeRect = (x: number, y: number, w: number, h: number): Rect => new Rect(x, y, w, h)
  
  

  const lineBuffer: LineBuffer = { vertices: [], alphas: [], normals: [] }
  const clearLineBuffer = () => {
    lineBuffer.vertices.length = 0
    lineBuffer.alphas.length = 0
    lineBuffer.normals.length = 0
  }

  type Segment = {
    points: Vector[],
    isClosed: boolean,
    isReversed: boolean
  }
  const ctx = {
    _segments: [] as Segment[],
    _segment: null! as Segment,

    lineThickness: 4,
    lowDepth: 0,
    depthHeight: 0.1,

    moveTo: (x: number, y: number) => {
      ctx._segments.push({ points: [[x, y]], isClosed: false, isReversed: false })
      ctx._segment = ctx._segments[ctx._segments.length - 1]
    },
    lineTo: (x: number, y: number) => {
      ctx._segment.points.push([x, y])
    },
    lineToRelative: (x: number, y: number) => {
      const last = ctx._segment.points[ctx._segment.points.length - 1]
      ctx._segment.points.push([last[0] + x, last[1] + y])
    },
    cloneSegment: () => {
      const s = ctx._segment
      return { points: [...s.points], isClosed: s.isClosed, isReversed: s.isReversed }
    },
    pushSegment: (segment: Segment) => {
      ctx._segments.push(segment)
      ctx._segment = segment
    },
    rect: (x: number, y: number, w: number, h: number) => {
      ctx.moveTo(x, y)
      ctx.lineTo(x + w, y)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x, y + h)
      ctx._segment.isClosed = true
    },
    bevel: (radius: number) => {
      const points = ctx._segment.points
      const newPoints: Vector[] = []
      for (let i = 0; i < points.length + 1; i++) {
        const p = points[i % points.length]
        const next = points[(i + 1) % points.length]
        const prev = points[(i - 1 + points.length) % points.length]
        if (i > 0) {
          const prevDir = normalize(sub(p, prev))
          const p1: Vector = [p[0] - radius * prevDir[0], p[1] - radius * prevDir[1]]
          newPoints.push(p1)
        }

        if (i < points.length) {
          const dir = normalize(sub(next, p))
          const p1: Vector = [p[0] + radius * dir[0], p[1] + radius * dir[1]]
          // const p2: Vector = [p[0] - radius * dir[0], p[1] - radius * dir[1]]
          newPoints.push(p1)
        }
      }
      ctx._segment.points = newPoints
    },
    expand: (amount: number) => {
      const points = ctx._segment.points
      const newPoints: Vector[] = []
      for (let i = 0; i < points.length; i++) {
        const prev = points[(i - 1 + points.length) % points.length]
        const p = points[i]
        const next = points[(i + 1) % points.length]
        const dir1 = normalize(sub(next, p))
        const normal1: Vector = [dir1[1], -dir1[0]]
        const dir2 = normalize(sub(p, prev))
        const normal2: Vector = [dir2[1], -dir2[0]]
        const normal = scale(add(normal1, normal2), 0.5)
        newPoints.push([p[0] + amount * normal[0], p[1] + amount * normal[1]])
      }
      ctx._segment.points = newPoints
    },
    subtract: () => {
      ctx._segment.isReversed = !ctx._segment.isReversed
      ctx._segment.points.reverse()
    },
    beginPath: () => {
      ctx._segments.length = 0
    },
    stroke: () => {

      ctx._segments.forEach((segment, i) => {

        const points = segment.points
        appendLinePath({
          buffer: lineBuffer,
          points,
          thickness: ctx.lineThickness,
          fringe: 0,
          leftDepth: ctx.lowDepth,
          rightDepth: ctx.lowDepth + ctx.depthHeight,
        })
      })
    },
    fill: () => {
      shapeBuffer.clear()
      ctx._segments.forEach((segment, i) => {
        if (!segment.isReversed) {
          addShape(shapeBuffer, segment)
        }
      })
      ctx._segments.forEach((segment, i) => {
        if (segment.isReversed) {
          shapeBuffer.holes.push(shapeBuffer.vertices.length / 2)
          addShape(shapeBuffer, segment)
        }
      })
      createShapeAndAppend(shapeBuffer, lineBuffer, ctx.lowDepth + ctx.depthHeight)
      
    }
  }

  // Render function
  function render() {
    bagl.clear({ color: [0, 0, 0, 0] });
    

    if (!framebuffer) {
      framebuffer = bagl.framebuffer({
        width: bagl.gl!.canvas.width,
        height: bagl.gl!.canvas.height,
        color: 2,
        depth: true,
        stencil: false
      })

      aoFramebuffer = bagl.framebuffer({
        width: bagl.gl!.canvas.width,
        height: bagl.gl!.canvas.height,
        color: 1,
        depth: false,
        stencil: false
      })

      aoBlurFbo1 = bagl.framebuffer({
        width: bagl.gl!.canvas.width ,
        height: bagl.gl!.canvas.height,
        color: 1,
        depth: false,
        stencil: false
      })
    }
    
    clearLineBuffer()

    shapeBuffer.clear()
    shape.clear()

    const doubleBevel = (rect: Rect, majorBevel: number, minorBevel: number) => {
      ctx.rect(rect.x, rect.y, rect.w, rect.h)
      ctx.bevel(minorBevel)
      // ctx.expand(majorBevel)

      const seg = ctx.cloneSegment()

      // ctx.rect(rect.x, rect.y, rect.w, rect.h)
      // ctx.bevel(minorBevel)
      ctx.pushSegment(seg)
      ctx.expand(-majorBevel * 2)
      ctx.subtract()
    }

    ctx.lineThickness = params.thickness

    const canvasRect = makeRect(0, 0, bagl.gl!.canvas.width, bagl.gl!.canvas.height)
    const innerRect = canvasRect.insetted(20)

    ctx.beginPath()
    ctx.lowDepth = 0
    ctx.rect(innerRect.x, innerRect.y, innerRect.w, innerRect.h)
    ctx.bevel(params.minorBevel)
    ctx.fill()
    ctx.stroke()


    // const rect = makeRect(100, 50, 300, 400)
    const rect = innerRect.clone().insetted(20).cutLeft(300)

    
    ctx.lowDepth = 0.1
    ctx.beginPath()
    const rightRect = makeRect(rect.x + rect.w - 50, rect.y + rect.h - 220, 60, 200)
    ctx.rect(rightRect.x, rightRect.y, rightRect.w, rightRect.h)
    ctx.bevel(20)
    ctx.fill()
    ctx.stroke()

    ctx.lowDepth = 0.2
    ctx.beginPath()
    ctx.rect(rect.x, rect.y, rect.w, rect.h)
    ctx.bevel(50)
    ctx.fill()

    ctx.lowDepth = 0.3
    ctx.beginPath()
    doubleBevel(rect, 10, params.minorBevel)
    ctx.fill()
    ctx.stroke()

    const rect2 = innerRect.clone().insetted(20).cutRight(300)
    ctx.beginPath()
    doubleBevel(rect2, 10, params.minorBevel)
    ctx.fill()
    ctx.stroke()


    // ctx.beginPath()

    





    bagl.state({ framebuffer: framebuffer }, () => {
      bagl.clear({ color: [0, 0, 0, 1], attachment: 0, depth: 1 });
      bagl.clear({ color: [0.5, 0.5, 1, 1], attachment: 1 });

      drawUnderlyingLines({
        buffer: lineBuffer,
      })
    })

    bagl.state({ framebuffer: aoFramebuffer }, () => {
      aoPass({
        depthTexture: framebuffer!.colorTexture(0)!,
        normalTexture: framebuffer!.colorTexture(1)!,
      })
    })

    if (params.aoBlur) {
      blurAO()
    }

    drawPlane({
      heightMap: framebuffer!.colorTexture(0)!,
      normalMap: framebuffer!.colorTexture(1)!,
      aoMap: aoFramebuffer!.colorTexture(0)!,
      heightScale: 0.1,
      lightDir: [params.lightDir.x, params.lightDir.y, params.lightDir.z] as Vector3,
    })

    if (params.drawAo) {
      drawTexture({ texture: aoBlurFbo1!.colorTexture(0)! })
    } else if (params.drawNormals) {
      drawTexture({ texture: framebuffer!.colorTexture(1)! })
    } else if (params.drawDepth) {
      drawTexture({ texture: framebuffer!.colorTexture(0)! })
    }

  }

  (window as any).downloadTexture = () => downloadTexture(bagl.gl!, framebuffer!)


  function downloadTexture(gl: WebGL2RenderingContext, framebuffer: FramebufferHandle) {
    // const data = new Uint8Array(width * height * 4)
    // // gl.bindTexture(gl.TEXTURE_2D, texture)
    // bagl.state({ framebuffer: framebuffer }, () => {
    //   gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data)
    // })
    // if (gl.getError()) {
    //   throw new Error('Error reading pixels')
    // }

    bagl.flushState()

    const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
    const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
    const toString = (x: number) => {
      for (const key in gl) {
        if (gl[key as any] === x) {
          return key
        }
      }
      return 'unknown'
    }
    console.log({ format: toString(format), type: toString(type) })

    const canvas = document.createElement('canvas');
    canvas.width = framebuffer.width;
    canvas.height = framebuffer.height;
    const ctx = canvas.getContext('2d')!

    document.body.appendChild(canvas)

    ctx.drawImage(bagl.gl!.canvas,0,0);
    const data = ctx.getImageData(0,0,framebuffer.width,framebuffer.height).data;
    console.log(data)


    if (!data.some(x => x !== 0)) {
      console.log('no data')
      return
    }

    const imageData = ctx.createImageData(framebuffer.width, framebuffer.height);
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);

    // Flip Y if needed
    // ctx.scale(1, -1); ctx.drawImage(...);

    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob!);
      a.download = 'texture.png';
      a.click();
      a.remove()
      URL.revokeObjectURL(URL.createObjectURL(blob!))
      
    });
  }

  return { bagl, render };
} 
