import { Pane } from 'tweakpane';
import { createBagl } from '../src/index';
import * as mat4 from 'gl-mat4';

export function createLinesExample() {
  const bagl = createBagl();

  const params = {
    thickness: 50,
    fringe: 30,
    joinType: 'miter',
    wireframe: false,
    invSq: false,
    center: true,
  }

  const pane = (new Pane()) as any;
  pane.addBinding(params, 'thickness');
  pane.addBinding(params, 'fringe');
  pane.addBinding(params, 'joinType', { step: 1, min: 0, max: 2 });
  pane.addBinding(params, 'wireframe');
  pane.addBinding(params, 'invSq');
  pane.addBinding(params, 'center');

  type LineBuffer = {
    vertices: number[],
    alphas: number[]
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



  const drawUnderlingLines = bagl<{
    color: [number, number, number, number],
    wireframe: boolean,
    buffer: LineBuffer,
    featherRadius: number
  }>({
    vert: `#version 300 es
    precision mediump float;
    in vec2 position;
    in vec2 alpha;
    out vec2 vAlpha;
    uniform mat4 projection;
    void main () {
      gl_Position = projection * vec4(position, 0, 1);
      vAlpha = alpha;
    }`,

    frag: `#version 300 es
    precision mediump float;
    in vec2 vAlpha;
    out vec4 outColor;
    uniform sampler2D gaussTex;
    uniform vec4 color;
    uniform float featherRadius;

    // float gaussCDF(float t) {
    //   float alpha = texture(gaussTex, vec2(clamp(t, 0.0, 1.0), 0.5)).r;
    //   return clamp(alpha, 0.0, 1.0);
    // }

    float gaussCDF(float signedDistance) {
      float t = 0.5 + signedDistance / (2.0 * featherRadius);
      return texture(gaussTex, vec2(clamp(t, 0.0, 1.0), 0.5)).r;
    }

  
    void main () { gaussTex; featherRadius;
      outColor = color;

      float d = min(vAlpha.x, vAlpha.y);

      d = max(d, -featherRadius);
  
      // outColor.r = d / -1e5;

      outColor.a = gaussCDF(d);
      // outColor.a = 1.0;
    }`,

    attributes: {
      position: (c, p) => bagl.buffer({ data: new Float32Array(p.buffer.vertices), size: 2 }),
      alpha: (c, p) => bagl.buffer({ data: new Float32Array(p.buffer.alphas), size: 2 })
    },

    uniforms: {
      projection: ({width, height}) =>
        mat4.ortho([], 0, width, 0, height, 0, 1) as number[],
      gaussTex: () => params.invSq ? invSqTex : gaussTex,
      color: (c, p) => p.color,
      featherRadius: (c, p) => p.featherRadius
    },

    count: (c, p) => p.buffer.vertices.length / 2,

    blend: {
      enable: (c, p) => p.wireframe ? false : true,
      func: ['src-alpha', 'one-minus-src-alpha']
      // func: {
        
      //   srcRGB: 'src alpha',
      //   dstRGB: 'one minus src alpha',
      //   srcAlpha: 'one',
      //   dstAlpha: 'one minus src alpha'
      // }
    },

    depth: { enable: false },

    primitive: (c, p) => p.wireframe ? 'lines' : 'triangles'
  })

  function createDrawLinePath({ points, thickness = 0.03, fringe = 0.01, joinType = 'miter', wireframe = false, color = [1, 1, 1, 1] }: { points: Vector[], thickness?: number, fringe?: number, joinType?: 'miter' | 'round' | 'bevel' }) {


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
    function pushQuad(buf: LineBuffer, a: number[], b: number[], c: number[], d: number[], dist1: Vector, dist2: Vector) {
      buf.vertices.push(a[0], a[1], b[0], b[1], c[0], c[1], a[0], a[1], c[0], c[1], d[0], d[1])
      buf.alphas.push(...dist1, ...dist1, ...dist2, ...dist1, ...dist2, ...dist2)
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

      // Solid center using adjusted endpoints
      if (params.center) {
        pushQuad(buf, offset(p0, -half, -prevShorten), offset(p1, -half, nextShorten), offset(p1, half, nextShorten), offset(p0, half, -prevShorten), 
          [BIG, BIG], [BIG, BIG])
      }

      // TODO: Fringes are rotated 180 degrees from the line direction for some reason

      // Left fringe
      pushQuad(buf, offset(p0, -outer, -prevShorten), offset(p1, -outer, nextShorten), offset(p1, -half, nextShorten), offset(p0, -half, -prevShorten), 
        // [0, 0], [0, 0])
        [-fringe, BIG], [0.0, BIG])

      // Right fringe
      pushQuad(buf, offset(p0, half, -prevShorten), offset(p1, half, nextShorten), offset(p1, outer, nextShorten), offset(p0, outer, -prevShorten), 
        // [0, 0], [0, 0])
        [BIG, 0.0], [BIG, -fringe])

    }

    function extendMiter(p, nA, nC, thickness) {
      const bisect = normalize([nA[0] + nC[0], nA[1] + nC[1]])
      const scale = thickness / (2 * dot(bisect, normalize(nA)))
      return [p[0] + bisect[0] * scale, p[1] + bisect[1] * scale]
    }



    // Math helpers
    function sub(a: Vector, b: Vector): Vector {
      return [a[0] - b[0], a[1] - b[1]]
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

    const buf: LineBuffer = { vertices: [], alphas: [] }

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
    let prevCorner = createEdgeCorner(points[0])
    let nextCorner = createEdgeCorner(points[0])
    let nextDir = normalize(sub(points[1], points[0]))
    let currentDir = nextDir

    for (let i = 0; i < points.length - 1; i++) {
      prevCorner = nextCorner
      currentDir = nextDir

      if (i < points.length - 2) {
        nextDir = normalize(sub(points[i+2], points[i+1]))
        nextCorner = createCorner(points[i+1], currentDir, nextDir)
      } else {
        nextCorner = createEdgeCorner(points[i+1])
      }
      
      buildSegment(buf, points[i], points[i + 1], prevCorner, nextCorner, currentDir)
    }



    return (props: { color: [number, number, number, number], wireframe: boolean }) => {
      drawUnderlingLines({
        color: props.color || [1, 1, 1, 1],
        wireframe: props.wireframe || false,
        buffer: buf,
        featherRadius: fringe
      })
    }

  }



  // Render function
  function render() {
    bagl.clear({ color: [0, 0, 0, 1] });
    
    const drawLine = createDrawLinePath({
      points: [
        [50, 400],
        [200, 250],
        [500, 200]
      ],
      

      thickness: params.thickness,
      fringe: params.fringe,
      joinType: ['miter', 'round', 'bevel'][params.joinType],
    })
    drawLine({ color: [1, 1, 1, 1], wireframe: false })


    if (params.wireframe) {
      drawLine({ color: [1, 0, 0, 1], wireframe: true })
    }
  }

  return { bagl, render };
} 