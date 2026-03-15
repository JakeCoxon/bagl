import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createContextLifecycle } from '../src/context-life';
import { createBaglInternalState } from '../src/api';

describe('ContextLifecycle', () => {
  let context: ReturnType<typeof createContextLifecycle>;
  let mockCanvas: HTMLCanvasElement;
  let mockGL: WebGL2RenderingContext;

  beforeEach(() => {
    const internalState = createBaglInternalState();
    context = createContextLifecycle(internalState, {});
    mockCanvas = document.createElement('canvas');
    mockGL = mockCanvas.getContext('webgl2')!;
  });

  describe('initial state', () => {
    it('should start detached', () => {
      expect(context.attached).toBe(false);
      expect(context.gl).toBe(null);
    });
  });

  describe('attach', () => {
    it('should attach to canvas', () => {
      context.attach(mockCanvas);
      
      expect(context.attached).toBe(true);
      expect(context.gl).toBe(mockGL);
    });

    it('should attach to WebGL2 context directly', () => {
      context.attach(mockGL);
      
      expect(context.attached).toBe(true);
      expect(context.gl).toBe(mockGL);
    });

    it('should call onAttach hooks when attaching', () => {
      const onAttachHook = vi.fn();
      context.onAttach(onAttachHook);
      
      context.attach(mockCanvas);
      
      expect(onAttachHook).toHaveBeenCalled();
    });

    it('should call multiple onAttach hooks', () => {
      const hook1 = vi.fn();
      const hook2 = vi.fn();
      
      context.onAttach(hook1);
      context.onAttach(hook2);
      context.attach(mockCanvas);
      
      expect(hook1).toHaveBeenCalled();
      expect(hook2).toHaveBeenCalled();
    });
  });

  describe('detach', () => {
    beforeEach(() => {
      context.attach(mockCanvas);
    });

    it('should detach from context', () => {
      context.detach();
      
      expect(context.attached).toBe(false);
      expect(context.gl).toBe(null);
    });

    it('should call onDetach hooks when detaching', () => {
      const onDetachHook = vi.fn();
      context.onDetach(onDetachHook);
      
      context.detach();
      
      expect(onDetachHook).toHaveBeenCalled();
    });

    it('should call multiple onDetach hooks', () => {
      const hook1 = vi.fn();
      const hook2 = vi.fn();
      
      context.onDetach(hook1);
      context.onDetach(hook2);
      context.detach();
      
      expect(hook1).toHaveBeenCalled();
      expect(hook2).toHaveBeenCalled();
    });
  });

  describe('hooks', () => {
    it('should register onAttach hooks before attachment', () => {
      const hook = vi.fn();
      context.onAttach(hook);
      context.attach(mockCanvas);
      
      expect(hook).toHaveBeenCalled()
    });

    it('should register onAttach hooks after attachment', () => {
      context.attach(mockCanvas);
      const hook = vi.fn();
      context.onAttach(hook);
      
      expect(hook).toHaveBeenCalled();
    });

    it('should register onDetach hooks before detachment', () => {
      context.attach(mockCanvas);
      const hook = vi.fn();
      context.onDetach(hook);
      context.detach();
      
      expect(hook).toHaveBeenCalled();
    });

    it('should not call onDetach hooks if not attached', () => {
      const hook = vi.fn();
      context.onDetach(hook);
      
      expect(hook).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle invalid canvas', () => {
      const invalidCanvas = {} as HTMLCanvasElement;
      expect(() => context.attach(invalidCanvas)).toThrow();
    });

    it('should handle canvas without WebGL2 support', () => {
      const canvasWithoutWebGL = document.createElement('canvas');
      // Mock getContext to return null
      vi.spyOn(canvasWithoutWebGL, 'getContext').mockReturnValue(null);
      
      expect(() => context.attach(canvasWithoutWebGL)).toThrow();
    });
  });
}); 