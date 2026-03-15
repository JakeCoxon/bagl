import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLoopManager } from '../src/loop';
import { createContextLifecycle } from '../src/context-life'; 
import { createBaglInternalState } from '../src/api';

describe('LoopManager', () => {
  let loopManager: ReturnType<typeof createLoopManager>;
  let context: ReturnType<typeof createContextLifecycle>;
  let contextObj: any;
  let mockGl: WebGL2RenderingContext;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    vi.useFakeTimers()
    const internalState = createBaglInternalState();
    context = createContextLifecycle(internalState);
    contextObj = { time: 0, ticks: 0, deltaTime: 0 };
    loopManager = createLoopManager(context, contextObj);
    mockCanvas = document.createElement('canvas');
    mockGl = mockCanvas.getContext('webgl2')!;
    
    // Mock requestAnimationFrame
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      setTimeout(() => callback(performance.now()), 16);
      return 1;
    });
    
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('frame', () => {
    it('should register frame callback', () => {
      const callback = vi.fn();
      const cancel = loopManager.frame(callback);
      
      expect(typeof cancel).toBe('function');
    });

    it('should call frame callback with context', () => {
      const callback = vi.fn();
      loopManager.frame(callback);
      context.attach(mockGl);
      
      // Simulate frame
      vi.advanceTimersByTime(16);
      
      expect(callback).toHaveBeenCalledWith(contextObj);
    });

    it('should update context time and ticks', () => {
      const callback = vi.fn();
      loopManager.frame(callback);
      context.attach(mockGl);
      
      // Simulate frame
      vi.advanceTimersByTime(16);
      
      expect(contextObj.ticks).toBe(1);
      expect(contextObj.time).toBeGreaterThan(0);
    });

    it('should calculate delta time', () => {
      const callback = vi.fn();
      loopManager.frame(callback);
      context.attach(mockGl);
      
      // Simulate first frame
      vi.advanceTimersByTime(16);
      const firstTime = contextObj.time;
      const firstDelta = contextObj.deltaTime;
      
      // Simulate second frame
      vi.advanceTimersByTime(16);
      
      expect(contextObj.deltaTime).toBeGreaterThan(0);
      expect(contextObj.time).toBeGreaterThan(firstTime);
    });

    it('should cancel frame callback', () => {
      const callback = vi.fn();
      context.attach(mockGl);
      const cancel = loopManager.frame(callback);
      cancel();
      
      // Simulate frame
      vi.advanceTimersByTime(16);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple frame callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      context.attach(mockGl);

      loopManager.frame(callback1);
      loopManager.frame(callback2);
      
      // Simulate frame
      vi.advanceTimersByTime(16);
      
      expect(callback1).toHaveBeenCalledWith(contextObj);
      expect(callback2).toHaveBeenCalledWith(contextObj);
    });

    it('should handle callback that returns true to continue', () => {
      const callback = vi.fn().mockReturnValue(true);
      context.attach(mockGl);
      loopManager.frame(callback);
      
      // Simulate multiple frames
      vi.advanceTimersByTime(16);
      vi.advanceTimersByTime(16);
      vi.advanceTimersByTime(16);
      
      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  describe('context lifecycle', () => {
    it('should stop loop when context is detached', () => {
      const callback = vi.fn();
      context.attach(mockGl);
      loopManager.frame(callback);
      
      // Simulate frame
      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Detach context
      context.detach();
      
      // Simulate another frame
      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
    });

    // TODO: This is not implemented yet. Not sure if it's needed.
    it.skip('should resume loop when context is reattached', () => {
      const callback = vi.fn();
      context.attach(mockGl);
      loopManager.frame(callback);
      
      // Simulate frame
      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Detach and reattach
      context.detach();
      const canvas = document.createElement('canvas');
      context.attach(canvas);
      
      // Simulate another frame
      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should not call frame callback when context is not attached", () => {
      const callback = vi.fn();
      loopManager.frame(callback);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should add to pending frames when context is not attached, then call when attached", () => {
      const callback = vi.fn();
      loopManager.frame(callback);
      expect(callback).not.toHaveBeenCalled();
      context.attach(mockGl);

      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalled();
    });

    it("should not call frame callback when context is detached", () => {
      const callback = vi.fn();
      context.attach(mockGl);
      loopManager.frame(callback);
      context.detach();
      vi.advanceTimersByTime(16);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should be able to cancel if callback is pending", () => {
      const callback = vi.fn();
      const cancel = loopManager.frame(callback);
      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(16);
      expect(callback).not.toHaveBeenCalled();
      cancel();
      vi.advanceTimersByTime(16);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should be able to cancel if callback is pending and then attached", () => {
      const callback = vi.fn();
      const cancel = loopManager.frame(callback);
      expect(callback).not.toHaveBeenCalled();
      context.attach(mockGl);
      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalled();
      cancel();
      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should be able to cancel if callback is active and then detached", () => {
      const callback = vi.fn();
      context.attach(mockGl);
      const cancel = loopManager.frame(callback);
      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalled();
      context.detach();
      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalledTimes(1);
      cancel();
      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle callback that throws error', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      context.attach(mockGl);
      loopManager.frame(errorCallback);
      
      // Simulate frame
      vi.advanceTimersByTime(16);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should continue loop even if callback throws error', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const normalCallback = vi.fn();
      
      vi.spyOn(console, 'error').mockImplementation(() => {});
      
      context.attach(mockGl);
      loopManager.frame(errorCallback);
      loopManager.frame(normalCallback);
      
      // Simulate frame
      vi.advanceTimersByTime(16);
      
      expect(normalCallback).toHaveBeenCalled();
    });
  });
}); 