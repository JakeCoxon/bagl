import { Pane } from 'tweakpane'

const pane = new Pane() as any

const params = {
  thickness: 100,
  fringe: 20, 
  wireframe: true,
  factor: 1,
  onlyOne: false
}

pane.addBinding(params, 'thickness', { min: 0, max: 200, step: 1 });
pane.addBinding(params, 'fringe', { min: 0, max: 100, step: 1 });
pane.addBinding(params, 'wireframe', { type: 'boolean' });
pane.addBinding(params, 'factor', { min: 0, max: 4, step: 0.01 });
pane.addBinding(params, 'onlyOne', { type: 'boolean' });

const canvas = document.createElement('canvas')
canvas.width = 1000
canvas.height = 1000
document.body.appendChild(canvas)

document.body.style.margin = '0'
const ctx = canvas.getContext('2d')!

type Vector = [number, number]

const debugText = (text: string, pos: Vector) => {
  ctx.fillStyle = 'black'
  ctx.font = '12px Arial'
  ctx.fillText(text, pos[0], pos[1])
}

const debugPointText = (text: string, pos: Vector) => {
  ctx.fillStyle = 'black'
  ctx.font = '12px Arial'
  ctx.fillText(text, pos[0] + 10, pos[1] - 10)
  ctx.beginPath()
  ctx.arc(pos[0], pos[1], 5, 0, 2 * Math.PI)
  ctx.fill()
}

const drawLines = (points: Vector[]) => {
  // ctx.strokeStyle = 'black'
  // ctx.beginPath()
  // ctx.moveTo(points[0][0], points[0][1])
  // ctx.lineTo(points[1][0], points[1][1])
  // ctx.lineTo(points[2][0], points[2][1])
  // ctx.stroke()

  const thickness = params.thickness
  const fringe = params.fringe
  const half = thickness / 2
  const outer = half + fringe

  type LineBuffer = {
    vertices: number[],
    alphas: number[]
  }

  type CornerData = {
    point: Vector,
    bisectDir: Vector,
    normal: Vector,
    cornerDot: number,
    leftMiterClipped: number,
    rightMiterClipped: number
  }

  // Extends a point by a given amount in a direction and normal to the direction
  function offset(p: Vector, dir: Vector, extent: number, normalExtent: number): Vector {
    return [p[0] + normalExtent * -dir[1] + extent * dir[0], p[1] + normalExtent * dir[0] + extent * dir[1]]
  }


  function extendMiter(p, nA, nC, thickness) {
    const bisect = normalize([nA[0] + nC[0], nA[1] + nC[1]])
    const scale = thickness / (2 * dot(bisect, normalize(nA)))
    return [p[0] + bisect[0] * scale, p[1] + bisect[1] * scale]
  }

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
  //  a1       a2
  //
  function pushQuad(buf: LineBuffer, a: number[], b: number[], c: number[], d: number[], a1: number, a2 = a1) {
    buf.vertices.push(a[0], a[1], b[0], b[1], c[0], c[1], a[0], a[1], c[0], c[1], d[0], d[1])
    buf.alphas.push(a1, a1, a2, a1, a2, a2)
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

  const createEdgeCorner = (point: Vector, dir: Vector): CornerData => {
    return { point: point, bisectDir: dir, normal: [-dir[1], dir[0]], cornerDot: 0, leftMiterClipped: 0, rightMiterClipped: 0 }
  }
  const createCorner = (point: Vector, currentDir: Vector, nextDir: Vector): CornerData => {
    const bisectDir = normalize([(nextDir[0] + currentDir[0]) / 2, (nextDir[1] + currentDir[1]) / 2])

    let bisectNormal = [-bisectDir[1], bisectDir[0]] as Vector
    const normal = [-currentDir[1], currentDir[0]] as Vector

    // Positive if anticlockwise
    const cornerDot = dot(bisectNormal, currentDir)
    let miterUnit = cornerDot / dot(bisectNormal, normal)
    
    return { 
      point: point, 
      bisectDir: bisectDir,
      normal: normal,
      cornerDot: cornerDot,
      leftMiterClipped: Math.max(miterUnit, -1),
      rightMiterClipped: Math.min(miterUnit, 1),
    }

  }
  const buildSegment = (buf: LineBuffer, i: number, prevCorner: CornerData, nextCorner: CornerData, dir: Vector, nextDir: Vector, prevDir: Vector | undefined, length: number, nextLength: number) => {
    // Adjust segment endpoints to avoid overlap with adjacent segments

    const p0 = prevCorner.point
    const p1 = nextCorner.point
    let a: Vector, b: Vector, c: Vector, d: Vector;
    let clipAmount: number, clipped: number;

    if (params.onlyOne && i !== 1) return

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

    let leftMidPoint = length / 2
    leftMidPoint = Math.min(leftMidPoint, prevCorner.leftMiterClipped * half)
    leftMidPoint = Math.max(leftMidPoint, length - nextCorner.leftMiterClipped * half)

    const crossed = prevCorner.leftMiterClipped * half > length - nextCorner.leftMiterClipped * half

    const leftMax = Math.min(prevCorner.leftMiterClipped * half, length - half)
    const leftMin = Math.max(length - nextCorner.leftMiterClipped * half, half)
    const midpoint = (leftMin + leftMax) / 2

    // if (crossed) return

    if (i === 1) {
      if (crossed) {
        // debugPointText(`leftMax`, offset(p0, dir, leftMax, -half))
        // debugPointText(`leftMin`, offset(p0, dir, leftMin, -half))
        // debugPointText(`midpoint`, offset(p0, dir, midpoint, -half))
        
      }
    }

    let intersection: Vector | undefined = undefined
    if (crossed) {
      if (!prevDir) return // not sure yet
      const l1 = { 
        point: offset(p0, prevDir, 0, -half), 
        dir: [-prevDir[0], -prevDir[1]] as Vector 
      } // face away
      const l2 = { 
        point: offset(p1, nextDir, 0, -half), 
        dir: [nextDir[0], nextDir[1]] as Vector 
      } // face away

      const intersectLines = (l1: { point: Vector, dir: Vector }, l2: { point: Vector, dir: Vector }) => {
        const perp2 = [-l2.dir[1], l2.dir[0]] as Vector
        const v3 = sub(l2.point, l1.point)
        const t = dot(perp2, v3) / dot(perp2, l1.dir)
        const x = l1.point[0] + t * l1.dir[0]
        const y = l1.point[1] + t * l1.dir[1]
        return [x, y] as Vector
      }
      intersection = intersectLines(l1, l2)
      if (intersection) {
        debugPointText(`intersection`, intersection)

        

        
      }


      
    }


    // Solid center using adjusted endpoints
    clipAmount = length + nextCorner.leftMiterClipped * -half
    const f = (i === 1) ? params.factor : 1
    clipped = -prevCorner.leftMiterClipped * f * -half
    // clipped = Math.min(clipped, clipAmount)
    // if(crossed)clipped = Math.min(clipped, midpoint)
    if (prevCorner.leftMiterClipped * half > length / 2) {
    }
    // clipped = Math.min(clipped, leftMidPoint)
    // clipped = Math.max(clipped, prevCorner.leftMiterClipped * half)
    // if (i === 1) debugPointText(`prevLeftClip`, offset(p0, dir, clipped, -half))
    // clipped = -prevCorner.leftMiterClipped * -half
    a = offset(p0, dir, clipped, -half)

    clipAmount = length + nextCorner.rightMiterClipped * half
    clipped = Math.min( -prevCorner.rightMiterClipped * half, clipAmount)
    clipped = Math.max(clipped, -prevCorner.rightMiterClipped * half)
    d = offset(p0, dir, clipped, half)
    debugPointText('d', d)
    

    clipAmount = -length + prevCorner.leftMiterClipped * half
    clipped = nextCorner.leftMiterClipped * -half
    // clipped = Math.max(clipped, clipAmount);
    // if(crossed)clipped = Math.max(clipped, -length + midpoint);
    // if (i === 1) debugPointText(`nextLeftClip`, offset(p1, dir, clipped, -half))
    // clipped = nextCorner.leftMiterClipped * -half
    b = offset(p1, dir, clipped, -half)

    clipAmount = -length - prevCorner.rightMiterClipped * half
    clipped = Math.max(nextCorner.rightMiterClipped * half, clipAmount);
    clipped = Math.min(clipped, nextCorner.leftMiterClipped * half)
    c = offset(p1, dir, clipped, half)
    debugPointText('c', c)
    
    // if (intersection) {

    //   a = intersection
    //   b = intersection

    // }
    
    if (!intersection) pushQuad(buf, a, b, c, d, 1.0, 1.0)

    if (i === 1) {


      let z = 1
      debugText(`${prevCorner.leftMiterClipped * half}`, [10, z++ * 10])
      debugText(`${nextCorner.leftMiterClipped * half}`, [10, z++ * 10])
      debugText(`l - lmc = ${length - nextCorner.leftMiterClipped * half}`, [10, z++ * 10])
      debugText(`${length / 2}`, [10, z++ * 10])
      debugText(`${leftMidPoint}`, [10, z++ * 10])
      if (crossed) {
        debugText(`crossed`, [10, z++ * 10])
        if (prevDir) {
          debugText(`prevDir ${prevDir[0]} ${prevDir[1]}`, [10, z++ * 10])
        }
      }

      debugText(`a`, a)
      // debugPointText(`midpoint`, offset(p0, dir, leftMidPoint, -half))
    }

    // Left fringe
    a = offset(p0, dir, -prevCorner.leftMiterClipped * -outer, -outer);
    b = offset(p1, dir, nextCorner.leftMiterClipped * -outer, -outer);
    c = offset(p1, dir, nextCorner.leftMiterClipped * -half, -half);
    d = offset(p0, dir, -prevCorner.leftMiterClipped * -half, -half);
    // pushQuad(buf, a, b, c, d, 0.0, 1.0)

    // Right fringe
    a = offset(p0, dir, -prevCorner.rightMiterClipped * half, half);
    b = offset(p1, dir, nextCorner.rightMiterClipped * half, half);
    c = offset(p1, dir, nextCorner.rightMiterClipped * outer, outer);
    d = offset(p0, dir, -prevCorner.rightMiterClipped * outer, outer);
    // pushQuad(buf, a, b, c, d, 1.0, 0.0)

    // Bevel join
    if (nextCorner.leftMiterClipped >= 1 || nextCorner.rightMiterClipped <= -1) {
      const winding = nextCorner.cornerDot > 0 ? 1 : -1 // Positive if anticlockwise
      let b = offset(p1, dir, half, half * winding)
      let c = offset(p1, nextDir, -half, half * winding)
      let a = p1
      if (winding === -1) a = offset(p1, dir, nextCorner.rightMiterClipped * half, half)
      else a = offset(p1, dir, nextCorner.leftMiterClipped * -half, -half)
      
      if (winding === -1) [b, c] = [c, b]
      // pushQuad(buf, a, b, c, a, 1.0, 1.0)
    }
  } 

  let nextDir = normalize(sub(points[1], points[0]))
  let prevCorner: CornerData
  let nextCorner = createEdgeCorner(points[0], nextDir)
  // calculateVertices(nextCorner)
  let dir = nextDir
  let length = 0
  let prevDir: Vector | undefined = undefined
  let nextLength = Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1])

  for (let i = 0; i < points.length - 1; i++) {
    prevCorner = nextCorner
    dir = nextDir
    length = nextLength

    if (i < points.length - 2) {
      nextDir = normalize(sub(points[i+2], points[i+1]))
      nextCorner = createCorner(points[i+1], dir, nextDir)
      nextLength = Math.hypot(points[i+2][0] - points[i+1][0], points[i+2][1] - points[i+1][1])
    } else {
      nextCorner = createEdgeCorner(points[i+1], nextDir)
      nextLength = 0
    }

    buildSegment(buf, i, prevCorner, nextCorner, dir, nextDir, prevDir, length, nextLength)
    prevDir = dir
  }

  ctx.strokeStyle = 'black'
  ctx.fillStyle = 'black'
  ctx.beginPath()

  for (let i = 0; i < buf.vertices.length; i += 6) {
    // if (!params.wireframe) {
    //   const a = i / 6 * 2
    //   if (buf.alphas[a] === 0) continue
    //   if (buf.alphas[a + 1] === 0) continue
    //   if (buf.alphas[a + 2] === 0) continue
    // }

    ctx.moveTo(buf.vertices[i], buf.vertices[i + 1])
    ctx.lineTo(buf.vertices[i + 2], buf.vertices[i + 3])
    ctx.lineTo(buf.vertices[i + 4], buf.vertices[i + 5])
    ctx.closePath()
  }
  if (params.wireframe) {
    ctx.stroke()
  } else {
    ctx.fill()
  }

  
  for (let i = 0; i < points.length; i ++) {
    ctx.fillStyle = 'red'
    ctx.beginPath()
    ctx.moveTo(points[i][0], points[i][1])
    ctx.arc(points[i][0], points[i][1], 10, 0, 2 * Math.PI)
    ctx.fill()
  }


}


let mouse = [200, 250] as Vector
document.addEventListener('mousemove', (e) => {
  mouse = [e.clientX, e.clientY]
})

type DragState = {
  point: Vector,
  dragging: boolean,
  start: (cb: () => void) => void,
  stop: () => void,
  dispose: () => void
}
const Drag = (f: (drag: DragState) => void) => {
  let cb: () => void = () => {}
  const mousemove = (e: MouseEvent) => {
    state.point = [e.clientX, e.clientY]
    cb()
  }
  const mouseup = () => {
    stop()
  }
  const start = (cb_: () => void) => {
    cb = cb_
    state.dragging = true
    document.addEventListener('mousemove', mousemove)
    document.addEventListener('mouseup', mouseup)
  }
  const stop = () => {
    if (!state.dragging) return
    state.dragging = false
    document.removeEventListener('mousemove', mousemove)
    document.removeEventListener('mouseup', mouseup)
  }

  const mousedown = (e: MouseEvent) => {
    state.point = [e.clientX, e.clientY]
    f(state)
  }
  const dispose = () => {
    stop()
    document.removeEventListener('mousedown', mousedown)
  }

  let state: DragState = {
    point: [0, 0],
    dragging: false,
    start, stop, dispose
  }
  document.addEventListener('mousedown', mousedown)
}

Drag((drag) => {
  const p = drag.point
  let point = -1
  for (let i = 0; i < points.length; i++) {
    if (Math.hypot(p[0] - points[i][0], p[1] - points[i][1]) < 20) {
      point = i
      break
    }
  }
  if (point === -1) return
  drag.start(() => {
    points[point][0] = drag.point[0]
    points[point][1] = drag.point[1]
  })
})


const points: Vector[] = [[600,364],[387,648],[761,641],[354,403]]
;(window as any).points = points

const frame = () => {


  ctx.clearRect(0, 0, canvas.width, canvas.height)
  drawLines(points)


  requestAnimationFrame(frame)
}

frame()