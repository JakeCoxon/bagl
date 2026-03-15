// Frame loop management with deferred context binding

import type { FrameCallback, CancelFn, FrameInfo, Context } from './types';
import type { ContextLifecycle } from './context-life';
import type { GLContextState } from './api';

export interface LoopManager {
  frame(cb: FrameCallback): CancelFn;
}

export function createLoopManager(context: ContextLifecycle, contextObj?: Context): LoopManager {
  const pendingFrames: FrameCallback[] = [];
  const activeLoops: { running: boolean; cb: FrameCallback; cancel: () => void }[] = [];
  let glContextState_: GLContextState | null = null;

  context.onAttach((glContextState) => {
    glContextState_ = glContextState;
    pendingFrames.forEach(callback => {
      const loop = startLoop(glContextState, callback, contextObj);
      activeLoops.push(loop);
    });
    pendingFrames.length = 0;
  });

  context.onDetach(() => {
    glContextState_ = null;
    // Stop all active loops
    activeLoops.forEach(loop => {
      loop.cancel();
    });
    activeLoops.length = 0;
  });

  return {
    frame(cb: FrameCallback): CancelFn {
      if (context.attached) {
        // Context is already attached, start immediately
        const loop = startLoop(glContextState_!, cb, contextObj);
        activeLoops.push(loop);
        return loop.cancel;
      } else {
        // Context not attached yet, queue for later
        pendingFrames.push(cb);
        return () => {
          if (context.attached) {
            const index = activeLoops.findIndex(loop => loop.cb === cb);
            if (index !== -1) {
              activeLoops[index].cancel();
              activeLoops.splice(index, 1);
            }
          } else {
            const index = pendingFrames.indexOf(cb);
            if (index !== -1) {
              pendingFrames.splice(index, 1);
            }
          }
        };
      }
    }
  };
}

function startLoop(glContextState: GLContextState, callback: FrameCallback, contextObj?: Context): { running: boolean; cb: FrameCallback; cancel: () => void } {
  let running = true;
  let lastTime = performance.now();
  const info: FrameInfo = { ticks: 0, time: 0, deltaTime: 0 };

  function frame() {
    if (!running) return;

    const now = performance.now();
    info.deltaTime = (now - lastTime) * 1e-3;
    lastTime = now;
    info.time += info.deltaTime;
    info.ticks++;

    // Update context object if provided
    if (contextObj) {
      contextObj.time = info.time;
      contextObj.ticks = info.ticks;
      contextObj.deltaTime = info.deltaTime;
    }

    try {
      callback(contextObj!);
    } catch (error) {
      console.error('bagl: frame callback error:', error);
      running = false;
      return;
    }

    if (running) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);

  return {
    cb: callback,
    get running() { return running; },
    cancel: () => {
      running = false;
    }
  };
} 