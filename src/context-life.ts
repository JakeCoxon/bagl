// Context lifecycle management for deferred binding

import type { GLContextState, InternalState } from "./api";
import type { BaglInit, BaglInitObject } from "./types";

export type AttachFn = (gl: WebGL2RenderingContext) => void;
export type DetachFn = () => void;

export interface ContextLifecycle {
  resourceLifecycle(obj: any, attach: AttachFn, detach: DetachFn): void;
  resourceAttach(obj: any): void;
  resourceDetach(obj: any): void;
  attach(target: HTMLCanvasElement | WebGL2RenderingContext): void;
  detach(): void;
  onAttach(h: (glContextState: GLContextState) => void | (() => void)): void;
  onDetach(h: () => void): void;
  get gl(): WebGL2RenderingContext | null;
  get attached(): boolean;
}

export function createContextLifecycle(internalState: InternalState, init: BaglInitObject = {}): ContextLifecycle {
  let gl: WebGL2RenderingContext | null = null;
  const attachHooks: ((glContextState: GLContextState) => void)[] = [];
  const detachHooks: (() => void)[] = [];

  function attach(target: HTMLCanvasElement | WebGL2RenderingContext): void {
    if (gl) throw new Error('bagl: already attached to a context');

    if (target instanceof HTMLCanvasElement) {
      const context = target.getContext('webgl2', {
        antialias: true,
        alpha: true,
        depth: true,
        stencil: true,
        preserveDrawingBuffer: init.preserveDrawingBuffer ?? false,
        powerPreference: 'default'
      });
      
      if (!context) {
        throw new Error('bagl: failed to get WebGL2 context from canvas');
      }
      
      gl = context as WebGL2RenderingContext;
    } else if (target instanceof WebGL2RenderingContext) {
      gl = target;
    } else {
      throw new Error('bagl: invalid target for attach() - must be canvas or WebGL2RenderingContext');
    }

    // Call all attach hooks and collect cleanup functions
    const cleanupFunctions: (() => void)[] = [];
    attachHooks.forEach(hook => {
      const result = hook(internalState.glContextState!);
      if (typeof result === 'function') {
        cleanupFunctions.push(result);
      }
    });
    
    // Add cleanup functions to detach hooks
    detachHooks.push(...cleanupFunctions);
  }

  function detach(): void {
    detachHooks.forEach(hook => hook());
    detachHooks.length = 0;
    gl = null;
  }

  function onAttach(hook: (glContextState: GLContextState) => void | (() => void)): void {
    attachHooks.push(hook);
    
    // If already attached, call the hook immediately
    if (gl) {
      const result = hook(internalState.glContextState!);
      if (typeof result === 'function') {
        detachHooks.push(result);
      }
    }
  }

  function onDetach(hook: () => void): void {
    detachHooks.push(hook);
  }

  function resourceLifecycle(obj: any, attach: AttachFn, detach: DetachFn): void {
    obj._attach = attach;
    obj._detach = detach;
    if (gl) {
      attach(gl);
    }
  }

  function resourceDetach(obj: any): void {
    obj._detach?.();
  }

  function resourceAttach(obj: any): void {
    obj._attach?.(gl);
  }

  const context: ContextLifecycle = {
    resourceLifecycle,
    resourceAttach,
    resourceDetach,
    attach,
    detach,
    onAttach,
    onDetach,
    get gl() { return gl; },
    get attached() { return gl !== null; }
  };

  internalState.context = context;

  return context;
} 