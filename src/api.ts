import type { Bagl, ClearDesc, CommandDesc, DrawCommand, Context, BaglInit, WebGLExtensions, GLLimits, StateChange } from './types';
import { createContextLifecycle, type ContextLifecycle } from './context-life';
import { createStateManager, runClear, type StateManager } from './state';
import { createResourceRegistry, createBuffer, createElements, createTexture2D, createCubeMap, createFramebuffer, createFramebufferCube } from './resources';
import { applyFlatState, createCommandBuilder } from './command';
import { createLoopManager } from './loop';
import { queryLimits, queryExtensions } from './limits';
import { assign2 } from './utils';

export type InternalState = {
  context: ContextLifecycle;
  contextObj: Context;
  glContextState: GLContextState | null;
}
export type GLContextState = {
  gl: WebGL2RenderingContext;
  context: ContextLifecycle;
  state: StateManager;
  limits: GLLimits;
  extensions: Partial<Record<keyof WebGLExtensions, any>>;
}

export function createBaglInternalState(): InternalState {
  return {
    context: null!,
    glContextState: null,
    contextObj: {
      time: 0,
      ticks: 0,
      width: 0,
      height: 0,
      viewportWidth: 0,
      viewportHeight: 0,
      deltaTime: 0
    },
  };
}

export function createStateManagerFactory(
  internalState: InternalState, 
  initObject: any
): void {
  const context = internalState.context;
  context.onAttach(() => {
    const gl = context.gl!;

    const batching = !initObject.disableBatching;
    const limits = queryLimits(gl);
    const state = createStateManager(gl, limits, { batching });
    const extensions = queryExtensions(gl);

    internalState.glContextState = { gl, context, limits, state, extensions };

    if (gl.canvas) {
      internalState.contextObj.width = gl.canvas.width;
      internalState.contextObj.height = gl.canvas.height;
      internalState.contextObj.viewportWidth = gl.canvas.width;
      internalState.contextObj.viewportHeight = gl.canvas.height;
    }
  })
}

export function createBagl(init: BaglInit = {}): Bagl {
  const initObject = (() => {
    if (init instanceof HTMLCanvasElement) return { canvas: init };
    if (init instanceof WebGL2RenderingContext) return { gl: init };
    if (typeof init === 'object') return init;
    throw new Error('bagl: invalid init object');
  })();
  

  const internalState = createBaglInternalState();
  const context = createContextLifecycle(internalState, initObject);
  internalState.context = context;

  createStateManagerFactory(internalState, initObject);
  
  const registry = createResourceRegistry(context);
  const commandBuilder = createCommandBuilder(internalState);
  
  // Create loop manager
  const loopManager = createLoopManager(context, internalState.contextObj);

  // Clear function
  function clear(opts: ClearDesc = {}): void {
    if (!internalState.glContextState) throw new Error('bagl: clear() called when not attached to a context');
    const { state } = internalState.glContextState;
    runClear(state, opts);
  }

  // Poll function
  function poll(): void {
    if (!internalState.glContextState) throw new Error('bagl: poll() called when not attached to a context');
    internalState.glContextState.state.forceSync();
  }

  // Now function
  function now(): number {
    return performance.now() * 1e-3;
  }

  // Destroy function
  function destroy(): void {
    registry.destroy();
    context.detach();
  }

  function createCommand<P>(desc: CommandDesc<P>): DrawCommand<P> {
    return commandBuilder.build(desc, context, internalState.contextObj);
  }

  function state(changes: StateChange, func: () => void) {
    if (!internalState.glContextState) throw new Error('bagl: state() called when not attached to a context');
    const { gl, state } = internalState.glContextState;
    state.push();
    applyFlatState(gl, state, changes);
    func()
    state.pop()
  }

  function flushState() {
    if (!internalState.glContextState) throw new Error('bagl: flushState() called when not attached to a context');
    const { state } = internalState.glContextState;
    state.flush();
  }

  function setDefaults() {
    if (!internalState.glContextState) throw new Error('bagl: setDefaults() called when not attached to a context');
    const { state } = internalState.glContextState;
    state.setDefaults();
  }

  const bagl = assign2(createCommand, {
    // Resource factories
    buffer: (data: any) => createBuffer(data, registry, context),
    elements: (data: any) => createElements(data, registry, context),
    texture: (opts: any) => createTexture2D(opts, internalState, registry, context),
    cube: (opts: any) => createCubeMap(opts, registry, context),
    framebuffer: (opts: any) => createFramebuffer(opts, internalState, registry, context),
    framebufferCube: (opts: any) => createFramebufferCube(opts, registry, context),

    // Global helpers
    clear,
    frame: (cb: any) => loopManager.frame(cb),
    now,
    poll,
    destroy,

    state,
    flushState,

    setDefaults,
    get _internalState() { return internalState; },

    // Context management
    attach: (target: any) => context.attach(target),
    detach: () => context.detach(),
    onAttach: (hook: (gl: WebGL2RenderingContext) => void | (() => void)) => context.onAttach(c => hook(c.gl)),
    onDetach: (hook: () => void) => context.onDetach(hook),

    get gl() { return context.gl; },
    get limits() { 
      if (!internalState.glContextState) throw new Error('bagl: limits accessed when not attached to a context');
      return internalState.glContextState.limits; 
    },
    get extensions() { 
      if (!internalState.glContextState) throw new Error('bagl: extensions accessed when not attached to a context');
      return internalState.glContextState.extensions; 
    },
    get attached() { return context.attached; },
    get context() { return internalState.contextObj; },
  }) satisfies Bagl;

  // If canvas/context was provided, attach immediately
  if (initObject.canvas || initObject.gl) {
    context.attach(initObject.canvas || initObject.gl!);
  }

  return bagl
} 