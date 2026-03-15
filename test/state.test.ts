import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStateManager } from '../src/state';
import { mockGlState } from './mock';
import { FramebufferHandle } from '../src';

describe('StateManager', () => {
  let state: ReturnType<typeof createStateManager>;
  let mockGL: WebGL2RenderingContext;

  beforeEach(() => {
    const canvas = document.createElement('canvas');
    mockGL = canvas.getContext('webgl2')!;
    mockGlState(mockGL, {});
    state = createStateManager(mockGL, { maxTextureUnits: 16 } as any);
  });

  describe('initial state', () => {
    it('should have initial state snapshot', () => {
      const current = state.current;
      expect(current).toBeDefined();
      expect(typeof current.blend).toBe('boolean');
      expect(typeof current.depthTest).toBe('boolean');
      expect(typeof current.cull).toBe('boolean');
    });
  });

  describe('blend state', () => {
    it('should set blend enable/disable', () => {
      const enableSpy = vi.spyOn(mockGL, 'enable');
      const disableSpy = vi.spyOn(mockGL, 'disable');

      state.set({ blend: true });
      expect(enableSpy).toHaveBeenCalledWith(mockGL.BLEND);

      state.set({ blend: false });
      expect(disableSpy).toHaveBeenCalledWith(mockGL.BLEND);
    });

    it('should set blend function', () => {
      const blendFuncSpy = vi.spyOn(mockGL, 'blendFunc');
      state.set({ blendFunc: [mockGL.SRC_ALPHA, mockGL.ONE_MINUS_SRC_ALPHA] });
      
      expect(blendFuncSpy).toHaveBeenCalledWith(mockGL.SRC_ALPHA, mockGL.ONE_MINUS_SRC_ALPHA);
    });

    it('should set blend equation', () => {
      const blendEquationSpy = vi.spyOn(mockGL, 'blendEquation');
      state.set({ blendEquation: mockGL.FUNC_SUBTRACT });
      
      expect(blendEquationSpy).toHaveBeenCalledWith(mockGL.FUNC_SUBTRACT);
    });

    it('should set blend color', () => {
      const blendColorSpy = vi.spyOn(mockGL, 'blendColor');
      state.set({ blendColor: [0.5, 0.5, 0.5, 1.0] });
      
      expect(blendColorSpy).toHaveBeenCalledWith(0.5, 0.5, 0.5, 1.0);
    });
  });

  describe('depth state', () => {
    it('should set depth test enable/disable', () => {
      const enableSpy = vi.spyOn(mockGL, 'enable');
      const disableSpy = vi.spyOn(mockGL, 'disable');

      state.set({ depthTest: true });
      expect(enableSpy).toHaveBeenCalledWith(mockGL.DEPTH_TEST);

      state.set({ depthTest: false });
      expect(disableSpy).toHaveBeenCalledWith(mockGL.DEPTH_TEST);
    });

    it('should set depth function', () => {
      const depthFuncSpy = vi.spyOn(mockGL, 'depthFunc');
      state.set({ depthFunc: mockGL.GREATER });
      
      expect(depthFuncSpy).toHaveBeenCalledWith(mockGL.GREATER);
    });

    it('should set depth mask', () => {
      const depthMaskSpy = vi.spyOn(mockGL, 'depthMask');
      state.set({ depthMask: false });
      
      expect(depthMaskSpy).toHaveBeenCalledWith(false);
    });

    it('should set depth range', () => {
      const depthRangeSpy = vi.spyOn(mockGL, 'depthRange');
      state.set({ depthRange: [0.1, 1.0] });
      
      expect(depthRangeSpy).toHaveBeenCalledWith(0.1, 1.0);
    });
  });

  describe('cull state', () => {
    it('should set cull enable/disable', () => {
      const enableSpy = vi.spyOn(mockGL, 'enable');
      const disableSpy = vi.spyOn(mockGL, 'disable');

      state.set({ cull: true });
      expect(enableSpy).toHaveBeenCalledWith(mockGL.CULL_FACE);

      state.set({ cull: false });
      expect(disableSpy).toHaveBeenCalledWith(mockGL.CULL_FACE);
    });

    it('should set cull face', () => {
      const cullFaceSpy = vi.spyOn(mockGL, 'cullFace');
      state.set({ cullFace: mockGL.FRONT });
      
      expect(cullFaceSpy).toHaveBeenCalledWith(mockGL.FRONT);
    });

    it('should set front face', () => {
      const frontFaceSpy = vi.spyOn(mockGL, 'frontFace');
      state.set({ frontFace: mockGL.CW });
      
      expect(frontFaceSpy).toHaveBeenCalledWith(mockGL.CW);
    });
  });

  describe('stencil state', () => {
    it('should set stencil test enable/disable', () => {
      const enableSpy = vi.spyOn(mockGL, 'enable');
      const disableSpy = vi.spyOn(mockGL, 'disable');

      state.set({ stencilTest: true });
      expect(enableSpy).toHaveBeenCalledWith(mockGL.STENCIL_TEST);

      state.set({ stencilTest: false });
      expect(disableSpy).toHaveBeenCalledWith(mockGL.STENCIL_TEST);
    });

    it('should set stencil function', () => {
      const stencilFuncSpy = vi.spyOn(mockGL, 'stencilFunc');
      state.set({ stencilFunc: [mockGL.EQUAL, 1, 0xFF] });
      
      expect(stencilFuncSpy).toHaveBeenCalledWith(mockGL.EQUAL, 1, 0xFF);
    });

    it('should set stencil operation', () => {
      const stencilOpSpy = vi.spyOn(mockGL, 'stencilOp');
      state.set({ stencilOp: [mockGL.KEEP, mockGL.INCR, mockGL.KEEP] });
      
      expect(stencilOpSpy).toHaveBeenCalledWith(mockGL.KEEP, mockGL.INCR, mockGL.KEEP);
    });

    it('should set stencil mask', () => {
      const stencilMaskSpy = vi.spyOn(mockGL, 'stencilMask');
      state.set({ stencilMask: 0xFF });
      
      expect(stencilMaskSpy).toHaveBeenCalledWith(0xFF);
    });
  });

  describe('scissor state', () => {
    it('should set scissor test enable/disable', () => {
      const enableSpy = vi.spyOn(mockGL, 'enable');
      const disableSpy = vi.spyOn(mockGL, 'disable');

      state.set({ scissorTest: true });
      expect(enableSpy).toHaveBeenCalledWith(mockGL.SCISSOR_TEST);

      state.set({ scissorTest: false });
      expect(disableSpy).toHaveBeenCalledWith(mockGL.SCISSOR_TEST);
    });

    it('should set scissor box', () => {
      const scissorSpy = vi.spyOn(mockGL, 'scissor');
      state.set({ scissorBox: [10, 20, 100, 200] });
      
      expect(scissorSpy).toHaveBeenCalledWith(10, 20, 100, 200);
    });
  });

  describe('viewport', () => {
    it('should set viewport', () => {
      const viewportSpy = vi.spyOn(mockGL, 'viewport');
      state.set({ viewport: [0, 0, 100, 100] });
      
      expect(viewportSpy).toHaveBeenCalledWith(0, 0, 100, 100);
    });
  });

  describe('polygon offset', () => {
    it('should set polygon offset enable/disable', () => {
      const enableSpy = vi.spyOn(mockGL, 'enable');
      const disableSpy = vi.spyOn(mockGL, 'disable');

      state.set({ polygonOffset: true });
      expect(enableSpy).toHaveBeenCalledWith(mockGL.POLYGON_OFFSET_FILL);

      state.set({ polygonOffset: false });
      expect(disableSpy).toHaveBeenCalledWith(mockGL.POLYGON_OFFSET_FILL);
    });

    it('should set polygon offset factor and units', () => {
      const polygonOffsetSpy = vi.spyOn(mockGL, 'polygonOffset');
      state.set({ polygonOffsetFactor: 2.0, polygonOffsetUnits: 1.0 });
      
      expect(polygonOffsetSpy).toHaveBeenCalledWith(2.0, 1.0);
    });
  });

  describe('line width', () => {
    it('should set line width', () => {
      const lineWidthSpy = vi.spyOn(mockGL, 'lineWidth');
      state.set({ lineWidth: 3.0 });
      
      expect(lineWidthSpy).toHaveBeenCalledWith(3.0);
    });
  });

  describe('color mask', () => {
    it('should set color mask', () => {
      const colorMaskSpy = vi.spyOn(mockGL, 'colorMask');
      state.set({ colorMask: [true, false, true, false] });
      
      expect(colorMaskSpy).toHaveBeenCalledWith(true, false, true, false);
    });
  });

  describe('state caching', () => {
    it('should not call GL functions for unchanged state', () => {
      const enableSpy = vi.spyOn(mockGL, 'enable');
      
      state.set({ blend: true });
      state.set({ blend: true }); // Same value
      
      expect(enableSpy).toHaveBeenCalledTimes(1);
    });

    it('should update current state', () => {
      state.set({ blend: true, depthTest: false });
      
      expect(state.current.blend).toBe(true);
      expect(state.current.depthTest).toBe(false);
    });
  });

  describe('push/pop', () => {
    it('should push and pop state', () => {
      state.set({ blend: true, depthTest: false });
      state.push();
      
      state.set({ blend: false, depthTest: true });
      expect(state.current.blend).toBe(false);
      expect(state.current.depthTest).toBe(true);
      
      state.pop();
      expect(state.current.blend).toBe(true);
      expect(state.current.depthTest).toBe(false);
    });

    it('should handle multiple push/pop operations', () => {
      state.set({ blend: true });
      state.push();
      state.set({ depthTest: true });
      state.push();
      state.set({ cull: true });
      
      state.pop();
      expect(state.current.blend).toBe(true);
      expect(state.current.depthTest).toBe(true);
      expect(state.current.cull).toBe(false);
      
      state.pop();
      expect(state.current.blend).toBe(true);
      expect(state.current.depthTest).toBe(false);
      expect(state.current.cull).toBe(false);
    });
  });

  describe('forceSync', () => {
    it('should force sync all state', () => {

      mockGlState(mockGL, { blend: true });
      const disableSpy = vi.spyOn(mockGL, 'disable');
      
      state.forceSync();
      state.set({ blend: false });
      
      // Should call GL functions to sync current state
      // expect(enableSpy).toHaveBeenCalled();
      expect(disableSpy).toHaveBeenCalled();
    });
  });

  describe('batching behavior', () => {
    it('should batch multiple state changes and only call GL when flush is triggered', () => {
      // Set initial state
      mockGlState(mockGL, { 
        blend: false,
        depthTest: true,
        blendFunc: [mockGL.SRC_ALPHA, mockGL.ONE_MINUS_SRC_ALPHA],
        depthFunc: mockGL.GREATER,
      })
      state = createStateManager(mockGL, { maxTextureUnits: 16 } as any, { batching: true });

      const enableSpy = vi.spyOn(mockGL, 'enable');
      const disableSpy = vi.spyOn(mockGL, 'disable');
      const blendFuncSpy = vi.spyOn(mockGL, 'blendFunc');
      const depthFuncSpy = vi.spyOn(mockGL, 'depthFunc');
      
      // Multiple push/pop operations with state changes
      state.push();
      state.set({ blend: true, depthTest: false });
      
      state.push();
      state.set({ blendFunc: [mockGL.SRC_ALPHA, mockGL.ONE_MINUS_SRC_ALPHA] });
      
      state.push();
      state.set({ depthFunc: mockGL.GREATER });
      
      // At this point, GL calls should NOT have been made yet
      // (This would require implementing batching in the state manager)
      expect(enableSpy).toHaveBeenCalledTimes(0);
      expect(disableSpy).toHaveBeenCalledTimes(0);
      expect(blendFuncSpy).toHaveBeenCalledTimes(0);
      expect(depthFuncSpy).toHaveBeenCalledTimes(0);

      // Check that the state is tracked correctly
      expect(state.current.blend).toBe(true);
      expect(state.current.depthTest).toBe(false);
      expect(state.current.blendFunc).toEqual([mockGL.SRC_ALPHA, mockGL.ONE_MINUS_SRC_ALPHA]);
      expect(state.current.depthFunc).toBe(mockGL.GREATER);

      // Only when flush() is called should GL calls be made
      state.flush();

      // GL calls should have been made
      expect(enableSpy).toHaveBeenCalledTimes(1);
      expect(disableSpy).toHaveBeenCalledTimes(1);
      expect(blendFuncSpy).toHaveBeenCalledTimes(1);
      expect(depthFuncSpy).toHaveBeenCalledTimes(1);
      
      // Pop operations should also not trigger GL calls
      state.pop(); // depthFunc change
      state.pop(); // blendFunc change  
      state.pop(); // blend/depthTest changes
      
    });

    it('should flush clearOnly state with minimal GL calls', () => {
      // Set initial state
      mockGlState(mockGL, { 
        blend: false,
        depthTest: true,
        scissorTest: false,
        scissorBox: [0, 0, 100, 100],
        framebuffer: null,
      })
      state = createStateManager(mockGL, { maxTextureUnits: 16 } as any, { batching: true });

      const enableSpy = vi.spyOn(mockGL, 'enable');
      const disableSpy = vi.spyOn(mockGL, 'disable');
      const scissorSpy = vi.spyOn(mockGL, 'scissor');
      const bindFramebufferSpy = vi.spyOn(mockGL, 'bindFramebuffer');
      const blendFuncSpy = vi.spyOn(mockGL, 'blendFunc');
      const depthFuncSpy = vi.spyOn(mockGL, 'depthFunc');

      const fbo = { _gpu: {} as WebGLFramebuffer } as FramebufferHandle
      
      // Set various state changes
      state.set({ 
        blend: true, 
        depthTest: false, 
        scissorTest: true, 
        scissorBox: [10, 20, 200, 300],
        framebuffer: fbo
      });
      
      // At this point, GL calls should NOT have been made yet
      expect(enableSpy).toHaveBeenCalledTimes(0);
      expect(disableSpy).toHaveBeenCalledTimes(0);
      expect(scissorSpy).toHaveBeenCalledTimes(0);
      expect(bindFramebufferSpy).toHaveBeenCalledTimes(0);

      // Flush with clearOnly should only set framebuffer, scissor test, and scissor box
      state.flush({ clearOnly: true });

      // Only framebuffer, scissor test, and scissor box should be set
      expect(bindFramebufferSpy).toHaveBeenCalledWith(mockGL.FRAMEBUFFER, fbo._gpu);
      expect(enableSpy).toHaveBeenCalledWith(mockGL.SCISSOR_TEST);
      expect(scissorSpy).toHaveBeenCalledWith(10, 20, 200, 300);
      
      // Other state changes should NOT be applied
      expect(blendFuncSpy).toHaveBeenCalledTimes(0);
      expect(depthFuncSpy).toHaveBeenCalledTimes(0);
      
      // Blend and depth test changes should not be applied in clearOnly mode
      expect(enableSpy).not.toHaveBeenCalledWith(mockGL.BLEND);
      expect(disableSpy).not.toHaveBeenCalledWith(mockGL.DEPTH_TEST);
    });

    it('should not call GL functions when state is popped and not changed', () => {
      // Set initial state
      mockGlState(mockGL, { 
        blend: false,
        depthTest: true,
        blendFunc: [mockGL.SRC_ALPHA, mockGL.ONE_MINUS_SRC_ALPHA],
        depthFunc: mockGL.GREATER,
      })
      state = createStateManager(mockGL, { maxTextureUnits: 16 } as any, { batching: true });

      const enableSpy = vi.spyOn(mockGL, 'enable');
      const disableSpy = vi.spyOn(mockGL, 'disable');
      const blendFuncSpy = vi.spyOn(mockGL, 'blendFunc');
      const depthFuncSpy = vi.spyOn(mockGL, 'depthFunc');
      
      // Multiple push/pop operations with state changes
      state.push();
      state.set({ blend: true, depthTest: false });
      
      state.push();
      state.set({ blendFunc: [mockGL.SRC_ALPHA, mockGL.ONE_MINUS_SRC_ALPHA] });
      
      state.push();
      state.set({ depthFunc: mockGL.GREATER });
      
      // At this point, GL calls should NOT have been made yet
      // (This would require implementing batching in the state manager)
      expect(enableSpy).toHaveBeenCalledTimes(0);
      expect(disableSpy).toHaveBeenCalledTimes(0);
      expect(blendFuncSpy).toHaveBeenCalledTimes(0);
      expect(depthFuncSpy).toHaveBeenCalledTimes(0);

      // Check that the state is tracked correctly
      expect(state.current.blend).toBe(true);
      expect(state.current.depthTest).toBe(false);
      expect(state.current.blendFunc).toEqual([mockGL.SRC_ALPHA, mockGL.ONE_MINUS_SRC_ALPHA]);
      expect(state.current.depthFunc).toBe(mockGL.GREATER);
      
      // Pop operations should also not trigger GL calls
      state.pop(); // depthFunc change
      state.pop(); // blendFunc change  
      state.pop(); // blend/depthTest changes

      // GL calls should NOT have been made
      expect(enableSpy).toHaveBeenCalledTimes(0);
      expect(disableSpy).toHaveBeenCalledTimes(0);
      expect(blendFuncSpy).toHaveBeenCalledTimes(0);
      expect(depthFuncSpy).toHaveBeenCalledTimes(0);
      
    });

    it('should demonstrate current immediate GL call behavior', () => {
      // This test shows the current behavior where GL calls happen immediately
      const enableSpy = vi.spyOn(mockGL, 'enable');
      
      state.push();
      state.set({ blend: true });
      state.set({ depthTest: true });
      state.pop();
      
      // Currently, GL calls happen immediately
      expect(enableSpy).toHaveBeenCalledWith(mockGL.BLEND);
      expect(enableSpy).toHaveBeenCalledWith(mockGL.DEPTH_TEST);
    });

    it('should should handle setting framebuffer and then reverting it to null', () => {
      const bindFramebufferSpy = vi.spyOn(mockGL, 'bindFramebuffer');

      state = createStateManager(mockGL, { maxTextureUnits: 16 } as any, { batching: true });

      state.set({ framebuffer: {} as WebGLFramebuffer });
      state.set({ framebuffer: null });
      // state.set({ framebuffer: {} as WebGLFramebuffer });

      state.flush();

      expect(bindFramebufferSpy).not.toHaveBeenCalled();
    })
  });
}); 