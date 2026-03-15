import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryLimits, queryExtensions } from '../src/limits';

describe('Limits and Extensions', () => {
  let mockGL: WebGL2RenderingContext;

  beforeEach(() => {
    const canvas = document.createElement('canvas');
    mockGL = canvas.getContext('webgl2')!;
  });

  describe('queryLimits', () => {
    it('should query WebGL2 limits', () => {
      // Mock getParameter calls
      vi.spyOn(mockGL, 'getParameter').mockImplementation((param) => {
        if (param === undefined) throw new Error('bagl: getParameter called with undefined parameter');
        switch (param) {
          case mockGL.MAX_TEXTURE_SIZE: return 16384;
          case mockGL.MAX_VIEWPORT_DIMS: return [16384, 16384];
          case mockGL.MAX_VERTEX_ATTRIBS: return 16;
          case mockGL.MAX_VERTEX_UNIFORM_VECTORS: return 4096;
          case mockGL.MAX_VERTEX_UNIFORM_BLOCKS: return 14;
          case mockGL.MAX_VERTEX_OUTPUT_COMPONENTS: return 64;
          case mockGL.MAX_FRAGMENT_INPUT_COMPONENTS: return 60;
          case mockGL.MAX_VERTEX_TEXTURE_IMAGE_UNITS: return 16;
          case mockGL.MAX_TEXTURE_IMAGE_UNITS: return 16;
          case mockGL.MAX_COMBINED_TEXTURE_IMAGE_UNITS: return 32;
          case mockGL.MAX_UNIFORM_BUFFER_BINDINGS: return 24;
          case mockGL.MAX_UNIFORM_BLOCK_SIZE: return 16384;
          case mockGL.MAX_COMBINED_UNIFORM_BLOCKS: return 24;
          case mockGL.MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS: return 64;
          case mockGL.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS: return 4;
          case mockGL.MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS: return 4;
          case mockGL.MAX_VERTEX_UNIFORM_COMPONENTS: return 4096;
          case mockGL.MAX_COLOR_ATTACHMENTS: return 8;
          case mockGL.MAX_DRAW_BUFFERS: return 8;
          case mockGL.MAX_ELEMENTS_INDICES: return 150000;
          case mockGL.MAX_ELEMENTS_VERTICES: return 1048576;
          case mockGL.MAX_FRAGMENT_UNIFORM_VECTORS: return 1024;
          case mockGL.MAX_FRAGMENT_UNIFORM_BLOCKS: return 14;
          case mockGL.MAX_FRAGMENT_UNIFORM_COMPONENTS: return 1024;
          case mockGL.MIN_PROGRAM_TEXEL_OFFSET: return -8;
          case mockGL.MAX_PROGRAM_TEXEL_OFFSET: return 7;
          case mockGL.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS: return 233472;
          case mockGL.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS: return 233472;
          default: return 0;
        }
      });

      const limits = queryLimits(mockGL);

      expect(limits.maxTextureSize).toBe(16384);
      expect(limits.maxViewportDims).toEqual([16384, 16384]);
      expect(limits.maxVertexAttribs).toBe(16);
      expect(limits.maxVertexUniformVectors).toBe(4096);
      expect(limits.maxDrawBuffers).toBe(8);
      expect(limits.maxFragmentUniformVectors).toBe(1024);
    });
  });

  describe('queryExtensions', () => {
    it('should query WebGL2 extensions', () => {
      // Mock getSupportedExtensions
      vi.spyOn(mockGL, 'getSupportedExtensions').mockReturnValue([
        'EXT_color_buffer_float',
        'EXT_texture_filter_anisotropic',
        'OES_texture_float_linear',
        'WEBGL_debug_renderer_info',
        'WEBGL_debug_shaders',
        'WEBGL_lose_context',
        'WEBGL_depth_texture',
        'WEBGL_draw_buffers',
        'OES_vertex_array_object'
      ]);

      const extensions = queryExtensions(mockGL);

      expect(extensions.EXT_color_buffer_float).toBeDefined();
      expect(extensions.EXT_texture_filter_anisotropic).toBeDefined();
      expect(extensions.OES_texture_float_linear).toBeDefined();
      expect(extensions.WEBGL_debug_renderer_info).toBeDefined();
      expect(extensions.WEBGL_debug_shaders).toBeDefined();
      expect(extensions.WEBGL_lose_context).toBeDefined();
      expect(extensions.WEBGL_depth_texture).toBeDefined();
      expect(extensions.WEBGL_draw_buffers).toBeDefined();
      expect(extensions.OES_vertex_array_object).toBeDefined();
    });

    it('should handle no extensions', () => {
      vi.spyOn(mockGL, 'getSupportedExtensions').mockReturnValue([]);

      const extensions = queryExtensions(mockGL);

      expect(Object.keys(extensions)).toHaveLength(0);
    });

    it('should handle null extensions', () => {
      vi.spyOn(mockGL, 'getSupportedExtensions').mockReturnValue(null);

      const extensions = queryExtensions(mockGL);

      expect(Object.keys(extensions)).toHaveLength(0);
    });
  });
}); 