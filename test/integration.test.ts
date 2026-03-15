import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBagl } from '../src/api';
import { mockGlSetAttribs, mockGlSetUniforms, mockGlState } from './mock';

describe('Bagl Integration', () => {
  let bagl: ReturnType<typeof createBagl>;
  let mockCanvas: HTMLCanvasElement;
  let mockGL: WebGL2RenderingContext;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockGL = mockCanvas.getContext('webgl2')!;
    bagl = createBagl();
    mockGlState(mockGL, {})
  });

  describe('basic functionality', () => {
    it('should create bagl instance', () => {
      expect(bagl).toBeDefined();
      expect(typeof bagl).toBe('function');
    });

    it('should start detached', () => {
      expect(bagl.attached).toBe(false);
    });

    it('should attach to canvas', () => {
      bagl.attach(mockCanvas);
      expect(bagl.attached).toBe(true);
    });

    it('should detach from canvas', () => {
      bagl.attach(mockCanvas);
      bagl.detach();
      expect(bagl.attached).toBe(false);
    });
  });

  describe('resource creation', () => {
    beforeEach(() => {
      bagl.attach(mockCanvas);
    });

    it('should create buffer', () => {
      const buffer = bagl.buffer({
        data: new Float32Array([1, 2, 3, 4]),
        size: 2
      });

      expect(buffer).toBeDefined();
      expect(buffer.baglType).toBe('buffer');
      expect(buffer.size).toBe(2);
      expect(buffer.byteLength).toBe(16);
    });

    it('should create elements', () => {
      const elements = bagl.elements({
        data: new Uint16Array([0, 1, 2])
      });

      expect(elements).toBeDefined();
      expect(elements.baglType).toBe('elements');
    });

    it('should create texture', () => {
      const texture = bagl.texture({
        width: 64,
        height: 64
      });

      expect(texture).toBeDefined();
      expect(texture.baglType).toBe('texture2d');
      expect(texture.width).toBe(64);
      expect(texture.height).toBe(64);
    });

    it('should create framebuffer', () => {
      const fbo = bagl.framebuffer({
        width: 256,
        height: 256
      });

      expect(fbo).toBeDefined();
      expect(fbo.baglType).toBe('framebuffer');
      expect(fbo.width).toBe(256);
      expect(fbo.height).toBe(256);
    });
  });

  describe('command creation', () => {
    beforeEach(() => {
      bagl.attach(mockCanvas);
    });

    it('should create basic command', () => {
      const vertices = bagl.buffer({
        data: new Float32Array([-1, -1, 1, -1, 0, 1]),
        size: 2
      });

      mockGlSetAttribs(mockGL, ['position']);
      mockGlSetUniforms(mockGL, []);
      
      const drawTriangle = bagl({
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: vertices
        },
        count: 3
      });

      
      expect(drawTriangle).toBeDefined();
      expect(typeof drawTriangle).toBe('function');
    });

    it('should execute command', () => {
      const vertices = bagl.buffer({
        data: new Float32Array([-1, -1, 1, -1, 0, 1]),
        size: 2
      });

      mockGlSetAttribs(mockGL, ['position']);
      mockGlSetUniforms(mockGL, []);

      const drawTriangle = bagl({
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: vertices
        },
        count: 3
      });

      // Mock GL calls
      const useProgramSpy = vi.spyOn(mockGL, 'useProgram');
      const drawArraysSpy = vi.spyOn(mockGL, 'drawArrays');

      drawTriangle();

      expect(useProgramSpy).toHaveBeenCalled();
      expect(drawArraysSpy).toHaveBeenCalledWith(mockGL.TRIANGLES, 0, 3);
    });
  });

  describe('clear functionality', () => {
    beforeEach(() => {
      bagl.attach(mockCanvas);
    });

    it('should clear with color', () => {
      const clearColorSpy = vi.spyOn(mockGL, 'clearColor');
      const clearSpy = vi.spyOn(mockGL, 'clear');

      bagl.clear({ color: [0.1, 0.2, 0.3, 1.0] });

      expect(clearColorSpy).toHaveBeenCalledWith(0.1, 0.2, 0.3, 1.0);
      expect(clearSpy).toHaveBeenCalledWith(mockGL.COLOR_BUFFER_BIT);
    });

    it('should clear with depth', () => {
      const clearDepthSpy = vi.spyOn(mockGL, 'clearDepth');
      const clearSpy = vi.spyOn(mockGL, 'clear');

      bagl.clear({ depth: 1.0 });

      expect(clearDepthSpy).toHaveBeenCalledWith(1.0);
      expect(clearSpy).toHaveBeenCalledWith(mockGL.DEPTH_BUFFER_BIT);
    });

    it('should clear with stencil', () => {
      const clearStencilSpy = vi.spyOn(mockGL, 'clearStencil');
      const clearSpy = vi.spyOn(mockGL, 'clear');

      bagl.clear({ stencil: 0 });

      expect(clearStencilSpy).toHaveBeenCalledWith(0);
      expect(clearSpy).toHaveBeenCalledWith(mockGL.STENCIL_BUFFER_BIT);
    });

    it('should clear multiple buffers', () => {
      const clearColorSpy = vi.spyOn(mockGL, 'clearColor');
      const clearDepthSpy = vi.spyOn(mockGL, 'clearDepth');
      const clearSpy = vi.spyOn(mockGL, 'clear');

      bagl.clear({ 
        color: [0, 0, 0, 1], 
        depth: 1.0, 
        stencil: 0 
      });

      expect(clearColorSpy).toHaveBeenCalled();
      expect(clearDepthSpy).toHaveBeenCalled();
      expect(clearSpy).toHaveBeenCalledWith(
        mockGL.COLOR_BUFFER_BIT | mockGL.DEPTH_BUFFER_BIT | mockGL.STENCIL_BUFFER_BIT
      );
    });
  });

  describe('frame loop', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      bagl.attach(mockCanvas);

      // Mock requestAnimationFrame
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
        setTimeout(() => callback(performance.now()), 16);
        return 1;
      });
      
    });

    it('should start frame loop', () => {
      const callback = vi.fn();
      const cancel = bagl.frame(callback);

      expect(typeof cancel).toBe('function');
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should call frame callback', () => {
      const callback = vi.fn();
      bagl.frame(callback);

      // Simulate frame
      vi.advanceTimersByTime(16);

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(bagl.context);
    });

    it('should cancel frame loop', () => {
      const callback = vi.fn();
      const cancel = bagl.frame(callback);

      cancel();

      vi.advanceTimersByTime(16);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('context object', () => {
    beforeEach(() => {
      bagl.attach(mockCanvas);
    });

    it('should have context properties', () => {
      const context = bagl.context;

      expect(context).toBeDefined();
      expect(typeof context.time).toBe('number');
      expect(typeof context.ticks).toBe('number');
      expect(typeof context.width).toBe('number');
      expect(typeof context.height).toBe('number');
      expect(typeof context.deltaTime).toBe('number');
    });

    it('should update context dimensions', () => {
      expect(bagl.context.width).toBe(800); // From mock canvas
      expect(bagl.context.height).toBe(600); // From mock canvas
    });
  });

  describe('error handling', () => {
    it('should throw error when clear called without context', () => {
      expect(() => bagl.clear()).toThrow('bagl: clear() called when not attached to a context');
    });

    it('should throw error when poll called without context', () => {
      expect(() => bagl.poll()).toThrow('bagl: poll() called when not attached to a context');
    });

    it('should throw error when limits accessed without context', () => {
      expect(() => bagl.limits).toThrow('bagl: limits accessed when not attached to a context');
    });

    it('should throw error when extensions accessed without context', () => {
      expect(() => bagl.extensions).toThrow('bagl: extensions accessed when not attached to a context');
    });
  });

  describe('lifecycle hooks', () => {
    it('should register onAttach hook', () => {
      const hook = vi.fn();
      bagl.onAttach(hook);
      
      bagl.attach(mockCanvas);
      
      expect(hook).toHaveBeenCalled();
    });

    it('should register onDetach hook', () => {
      const hook = vi.fn();
      bagl.onDetach(hook);
      
      bagl.attach(mockCanvas);
      bagl.detach();
      
      expect(hook).toHaveBeenCalled();
    });
  });

  describe('utility functions', () => {
    it('should provide now function', () => {
      expect(typeof bagl.now).toBe('function');
      expect(typeof bagl.now()).toBe('number');
    });

    it('should provide poll function', () => {
      bagl.attach(mockCanvas);
      
      bagl.poll();

    });
  });
}); 