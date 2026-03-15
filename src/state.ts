// WebGL state management with diffing for performance

import type { ClearDesc, FramebufferHandle, GLLimits } from "./types";

type ReadonlyValues<T> = {
  [K in keyof T]: Readonly<T[K]>;
}

// Ensure that the values of this object are constant
// so that we can use Object.assign to update the object
// without worrying about the values changing
export type GLStateCache = ReadonlyValues<{
  // Blend state
  blend: boolean;
  blendFunc: [number, number];
  blendEquation: number;
  blendColor: [number, number, number, number];
  
  // Depth state
  depthTest: boolean;
  depthFunc: number;
  depthMask: boolean;
  depthRange: [number, number];
  
  // Cull state
  cull: boolean;
  cullFace: number;
  frontFace: number;
  
  // Stencil state
  stencilTest: boolean;
  stencilFunc: [number, number, number];
  stencilOp: [number, number, number];
  stencilMask: number;
  
  // Scissor state
  scissorTest: boolean;
  scissorBox: [number, number, number, number];
  
  // Viewport
  viewport: [number, number, number, number];
  
  // Polygon offset
  polygonOffset: boolean;
  polygonOffsetFactor: number;
  polygonOffsetUnits: number;
  
  // Line width
  lineWidth: number;
  
  // Color mask
  colorMask: [boolean, boolean, boolean, boolean];
  
  // Current objects
  framebuffer: FramebufferHandle | null;
  program: WebGLProgram | null;
  vao: WebGLVertexArrayObject | null;
}>

export interface StateManager {
  set(next: Partial<GLStateCache>): void;
  setDefaults(): void;
  forceSync(): void;
  push(): void;
  pop(): void;
  flush(opts?: { clearOnly?: boolean }): void;
  get current(): GLStateCache;
  readonly batching: boolean;
  bindTexture(texture: WebGLTexture | null): number;
  unbindTexture(unit: number): void;
  storeCurrentTexture(): void;
  restoreCurrentTexture(): void;
  readonly currentTextureUnit: number;
  readonly currentTexture: WebGLTexture | null;
  readonly gl: WebGL2RenderingContext;
}

export interface StateManagerConfig {
  batching?: boolean;
}

export function createStateManager(
  gl: WebGL2RenderingContext,
  limits: GLLimits,
  config: StateManagerConfig = {}
): StateManager {
  
  const current: GLStateCache = initialSnapshot(gl);
  const stack: GLStateCache[] = [];
  const lastFlushed: GLStateCache = { ...current };

  const doubleBuffer = { ...current };

  const batching = config.batching ?? false;

  function getBuffered(current: GLStateCache, next: Partial<GLStateCache>): GLStateCache {
    return Object.assign(doubleBuffer, current, next);
  }

  function set(next: Partial<GLStateCache>): void {
    // If batching is enabled, we just assign the next state to the current state,
    // and we expect flush to be called to apply the changes to the GL.

    if (batching) {
      Object.assign(current, next);
    } else {
      setImmediately(current, getBuffered(current, next));
    }
  }

  function flush(opts: { clearOnly?: boolean } = {}): void {
    if (!batching) throw new Error('bagl: flush called without batching');

    let next: Partial<GLStateCache> = current

    // For clear only, we only need to set the framebuffer, and a few other things
    if (opts.clearOnly) {
      next = {
        framebuffer: current.framebuffer,
        scissorTest: current.scissorTest,
        scissorBox: current.scissorBox,
      }
    }

    setImmediately(lastFlushed, getBuffered(lastFlushed, next));
  }

  function setImmediately(current: GLStateCache, next: GLStateCache): void {

    // Blend state
    if (next.blend !== current.blend) {
      next.blend ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND);
    }
    
    if ((next.blendFunc[0] !== current.blendFunc[0] || next.blendFunc[1] !== current.blendFunc[1])) {
      gl.blendFunc(next.blendFunc[0], next.blendFunc[1]);
    }
    
    if (next.blendEquation !== current.blendEquation) {
      gl.blendEquation(next.blendEquation);
    }
    
    if ((next.blendColor[0] !== current.blendColor[0] || 
         next.blendColor[1] !== current.blendColor[1] || 
         next.blendColor[2] !== current.blendColor[2] || 
         next.blendColor[3] !== current.blendColor[3])) {
      gl.blendColor(next.blendColor[0], next.blendColor[1], next.blendColor[2], next.blendColor[3]);
    }

    // Depth state
    if (next.depthTest !== current.depthTest) {
      next.depthTest ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST);
    }

    if (next.depthFunc !== current.depthFunc) {
      gl.depthFunc(next.depthFunc);
    }
    
    if (next.depthMask !== current.depthMask) {
      gl.depthMask(next.depthMask);
    }
    
    if (next.depthRange[0] !== current.depthRange[0] || next.depthRange[1] !== current.depthRange[1]) {
      gl.depthRange(next.depthRange[0], next.depthRange[1]);
    }

    // Cull state
    if (next.cull !== current.cull) {
      next.cull ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE);
    }
    
    if (next.cullFace !== current.cullFace) {
      gl.cullFace(next.cullFace);
    }
    
    if (next.frontFace !== current.frontFace) {
      gl.frontFace(next.frontFace);
    }

    // Stencil state
    if (next.stencilTest !== current.stencilTest) {
      next.stencilTest ? gl.enable(gl.STENCIL_TEST) : gl.disable(gl.STENCIL_TEST);
    }
    
    if (next.stencilFunc[0] !== current.stencilFunc[0] || 
        next.stencilFunc[1] !== current.stencilFunc[1] || 
        next.stencilFunc[2] !== current.stencilFunc[2]) {
      gl.stencilFunc(next.stencilFunc[0], next.stencilFunc[1], next.stencilFunc[2]);
    }
    
    if (next.stencilOp[0] !== current.stencilOp[0] || 
        next.stencilOp[1] !== current.stencilOp[1] || 
        next.stencilOp[2] !== current.stencilOp[2]) {
      gl.stencilOp(next.stencilOp[0], next.stencilOp[1], next.stencilOp[2]);
    }
    
    if (next.stencilMask !== current.stencilMask) {
      gl.stencilMask(next.stencilMask);
    }

    // Scissor state
    if (next.scissorTest !== current.scissorTest) {
      next.scissorTest ? gl.enable(gl.SCISSOR_TEST) : gl.disable(gl.SCISSOR_TEST);
    }
    
    if (next.scissorBox[0] !== current.scissorBox[0] || 
        next.scissorBox[1] !== current.scissorBox[1] || 
        next.scissorBox[2] !== current.scissorBox[2] || 
        next.scissorBox[3] !== current.scissorBox[3]) {
      gl.scissor(next.scissorBox[0], next.scissorBox[1], next.scissorBox[2], next.scissorBox[3]);
    }

    // Viewport
    if (next.viewport[0] !== current.viewport[0] || 
        next.viewport[1] !== current.viewport[1] || 
        next.viewport[2] !== current.viewport[2] || 
        next.viewport[3] !== current.viewport[3]) {
      gl.viewport(next.viewport[0], next.viewport[1], next.viewport[2], next.viewport[3]);
    }

    // Polygon offset
    if (next.polygonOffset !== current.polygonOffset) {
      next.polygonOffset ? gl.enable(gl.POLYGON_OFFSET_FILL) : gl.disable(gl.POLYGON_OFFSET_FILL);
    }
    
    if (next.polygonOffsetFactor !== current.polygonOffsetFactor) {
      gl.polygonOffset(next.polygonOffsetFactor, next.polygonOffsetUnits);
    }
    
    if (next.polygonOffsetUnits !== current.polygonOffsetUnits) {
      gl.polygonOffset(next.polygonOffsetFactor, next.polygonOffsetUnits);
    }

    // Line width
    if (next.lineWidth !== current.lineWidth) {
      gl.lineWidth(next.lineWidth);
    }

    // Color mask
    if (next.colorMask[0] !== current.colorMask[0] || 
        next.colorMask[1] !== current.colorMask[1] || 
        next.colorMask[2] !== current.colorMask[2] || 
        next.colorMask[3] !== current.colorMask[3]) {
      gl.colorMask(next.colorMask[0], next.colorMask[1], next.colorMask[2], next.colorMask[3]);
    }

    // Current objects
    if (next.framebuffer !== current.framebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, next.framebuffer?._gpu ?? null );
    }
    
    if (next.program !== current.program) {
      gl.useProgram(next.program);
    }
    
    if (next.vao !== current.vao) {
      gl.bindVertexArray(next.vao);
    }

    Object.assign(current, next);
  }

  function forceSync(): void {
    // Read back current GL state and update our cache
    // This is expensive, so only call when necessary
    Object.assign(current, readbackSnapshot(gl));
  }

  function push(): void {
    stack.push({...current});
  }

  function pop(): void {
    if (stack.length === 0) {
      throw new Error('bagl: state stack underflow');
    }
    const previous = stack.pop()!;
    set(previous);
  }

  const textureBindings = new Map<number, WebGLTexture | null>();
  const bindingsToUnits = new Map<WebGLTexture | null, number>();

  function getNextTextureUnit(): number {
    for (let i = 0; i < limits.maxTextureUnits; i++) {
      if (!textureBindings.has(i)) {
        return i;
      }
    }
    throw new Error('bagl: no more texture units available');
  }

  let currentTextureUnit = 0;
  function bindTexture(texture: WebGLTexture | null): number {
    if (bindingsToUnits.has(texture)) {
      return bindingsToUnits.get(texture)!;
    }
    const unit = getNextTextureUnit();
    textureBindings.set(unit, texture);
    bindingsToUnits.set(texture, unit);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    currentTextureUnit = unit;
    return unit;
  }

  function unbindTexture(unit: number): void {
    bindingsToUnits.delete(textureBindings.get(unit)!);
    textureBindings.delete(unit);
  }

  function currentTexture(): WebGLTexture | null {
    return textureBindings.get(currentTextureUnit) ?? null
  }

  let previousImmediateTexture: WebGLTexture | null = null;
  function storeCurrentTexture(): void {
    if (previousImmediateTexture) throw new Error('bagl: bindImmediateTexture called without revertImmediateTexture');
    const current = currentTexture();
    previousImmediateTexture = current;
  }

  function restoreCurrentTexture(): void {
    let prev = previousImmediateTexture;
    previousImmediateTexture = null;
    gl.bindTexture(gl.TEXTURE_2D, prev);
  }

  function setDefaults(): void {
    set(getDefaults(gl));
  }

  return {
    set,
    flush,
    forceSync,
    push,
    pop,
    bindTexture,
    unbindTexture,
    storeCurrentTexture,
    restoreCurrentTexture,
    setDefaults,
    get currentTextureUnit() { return currentTextureUnit; },
    get currentTexture() { return currentTexture() },
    get batching() { return batching; },
    get current() { return {...current}; },
    get gl() { return gl; }
  };
}

export function runClear(state: StateManager, opts: ClearDesc) {
  state.push();

  // Bind the framebuffer if provided
  if (opts.framebuffer !== undefined) state.set({ framebuffer: opts.framebuffer ?? null });

  if (state.batching) state.flush({ clearOnly: true });

  const gl = state.gl;

  if (opts.attachment !== undefined) {
    if (opts.color) {
      gl.clearBufferfv(gl.COLOR, opts.attachment, opts.color);
    }
  } else {
    const mask = (opts.color ? gl.COLOR_BUFFER_BIT : 0) |
                  (opts.depth !== undefined ? gl.DEPTH_BUFFER_BIT : 0) |
                  (opts.stencil !== undefined ? gl.STENCIL_BUFFER_BIT : 0);
    if (opts.color) {
      gl.clearColor(opts.color[0], opts.color[1], opts.color[2], opts.color[3]);
    }
    if (opts.depth !== undefined) {
      gl.clearDepth(opts.depth);
    }
    if (opts.stencil !== undefined) {
      gl.clearStencil(opts.stencil);
    }
    
    gl.clear(mask);
  }
  state.pop();

}

function initialSnapshot(gl: WebGL2RenderingContext): GLStateCache {
  return readbackSnapshot(gl) as GLStateCache;
}

function readbackSnapshot(gl: WebGL2RenderingContext): Partial<GLStateCache> {
  // TODO: Flesh this out
  return {
    blend: gl.isEnabled(gl.BLEND),
    blendFunc: [gl.ONE, gl.ZERO],
    blendEquation: gl.FUNC_ADD,
    blendColor: [0, 0, 0, 0],
    
    depthTest: gl.isEnabled(gl.DEPTH_TEST),
    depthFunc: gl.LESS,
    depthMask: true,
    depthRange: [0, 1],
    
    cull: gl.isEnabled(gl.CULL_FACE),
    cullFace: gl.BACK,
    frontFace: gl.CCW,
    
    stencilTest: gl.isEnabled(gl.STENCIL_TEST),
    stencilFunc: [gl.ALWAYS, 0, 0xFFFFFFFF],
    stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP],
    stencilMask: 0xFFFFFFFF,
    
    scissorTest: gl.isEnabled(gl.SCISSOR_TEST),
    scissorBox: [...gl.getParameter(gl.SCISSOR_BOX)] as [number, number, number, number],
    
    viewport: [...gl.getParameter(gl.VIEWPORT)] as [number, number, number, number],
    
    polygonOffset: gl.isEnabled(gl.POLYGON_OFFSET_FILL),
    polygonOffsetFactor: 0,
    polygonOffsetUnits: 0,
    
    lineWidth: gl.getParameter(gl.LINE_WIDTH) as number,
    
    colorMask: [true, true, true, true],
    
    framebuffer: null,
    program: null,
    vao: null
  };
}

const getDefaults = (gl: WebGL2RenderingContext): GLStateCache => {
  return {
    blend: false,
    blendFunc: [gl.ONE, gl.ZERO],
    blendEquation: gl.FUNC_ADD,
    blendColor: [0, 0, 0, 0],
    
    depthTest: false,
    depthFunc: gl.LESS,
    depthMask: true,
    depthRange: [0, 1],

    cull: false,
    cullFace: gl.BACK,
    frontFace: gl.CCW,

    stencilTest: false,
    stencilFunc: [gl.ALWAYS, 0, 0xFFFFFFFF],
    stencilOp: [gl.KEEP, gl.KEEP, gl.KEEP],
    stencilMask: 0xFFFFFFFF,
    
    scissorTest: false,
    scissorBox: [0, 0, 0, 0],
    viewport: [0, 0, 0, 0],
    polygonOffset: false,
    polygonOffsetFactor: 0,
    polygonOffsetUnits: 0,
    lineWidth: 1,
    colorMask: [true, true, true, true],
    framebuffer: null,
    program: null,
    vao: null
  }
}