// WebGL2 limits and extensions query

import type { GLLimits, WebGLExtensions } from './types';

export function queryLimits(gl: WebGL2RenderingContext): GLLimits {
  return {
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    maxCubeMapSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
    maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS),
    maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
  };
}

export function queryExtensions(gl: WebGL2RenderingContext): Partial<Record<keyof WebGLExtensions, any>> {
  const extensions: Partial<Record<keyof WebGLExtensions, any>> = {};

  // WebGL2 extensions
  const extensionNames = [
    'OES_texture_float',
    'OES_texture_float_linear',
    'OES_texture_half_float',
    'OES_texture_half_float_linear',
    'OES_standard_derivatives',
    'OES_element_index_uint',
    'OES_vertex_array_object',
    'WEBGL_depth_texture',
    'WEBGL_draw_buffers',
    'EXT_texture_filter_anisotropic',
    'EXT_frag_depth',
    'EXT_shader_texture_lod',
    'EXT_color_buffer_float',
    'EXT_color_buffer_half_float',
    'EXT_disjoint_timer_query',
    'EXT_float_blend',
    'EXT_texture_compression_bptc',
    'EXT_texture_compression_rgtc',
    'EXT_texture_norm16',
    'OES_draw_buffers_indexed',
    'OES_sample_variables',
    'WEBGL_compressed_texture_s3tc',
    'WEBGL_compressed_texture_s3tc_srgb',
    'WEBGL_compressed_texture_etc',
    'WEBGL_compressed_texture_pvrtc',
    'WEBGL_compressed_texture_astc',
    'WEBGL_debug_renderer_info',
    'WEBGL_debug_shaders',
    'WEBGL_lose_context',
    'WEBGL_multi_draw'
  ];

  for (const name of extensionNames) {
    const ext = gl.getExtension(name);
    if (ext) {
      extensions[name as keyof WebGLExtensions] = ext;
    }
  }

  return extensions;
} 