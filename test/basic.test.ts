import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBagl } from '../src/api';
import { mockGlState } from './mock';

describe('Basic Bagl Tests', () => {
  let bagl: ReturnType<typeof createBagl>;
  let mockCanvas: HTMLCanvasElement;
  let mockGL: WebGL2RenderingContext;

  beforeEach(() => {
    mockCanvas = document.createElement('canvas');
    mockGL = mockCanvas.getContext('webgl2')!;
    bagl = createBagl();
    mockGlState(mockGL, {})
  });

  describe('Core Functionality', () => {
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

  describe('Resource Creation', () => {
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
  });

  describe('Clear Functionality', () => {
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
  });

  describe('Context Object', () => {
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

  describe('Error Handling', () => {
    it('should throw error when clear called without context', () => {
      expect(() => bagl.clear()).toThrow('bagl: clear() called when not attached to a context');
    });

    it('should throw error when poll called without context', () => {
      expect(() => bagl.poll()).toThrow('bagl: poll() called when not attached to a context');
    });
  });

  describe('Lifecycle Hooks', () => {
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

  describe('Utility Functions', () => {
    it('should provide now function', () => {
      expect(typeof bagl.now).toBe('function');
      expect(typeof bagl.now()).toBe('number');
    });
  });
}); 