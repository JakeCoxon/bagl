// WebGL constant mapping utilities (like regl)

import type {
  BufferType, BufferUsage, TextureFormat, TextureInternalFormat, TextureType,
  TextureFilter, TextureWrap, PrimitiveType, BlendFunc, BlendEquation,
  DepthFunc, CullFace, FrontFace, StencilFunc, StencilOp
} from './types';

const GL = WebGL2RenderingContext;


export function getBufferTarget(type: BufferType): number {
  switch (type) {
    case 'array': return GL.ARRAY_BUFFER;
    case 'elements': return GL.ELEMENT_ARRAY_BUFFER;
    default: return GL.ARRAY_BUFFER;
  }
}

export function getBufferUsage(usage: BufferUsage): number {
  switch (usage) {
    case 'static': return GL.STATIC_DRAW;
    case 'dynamic': return GL.DYNAMIC_DRAW;
    case 'stream': return GL.STREAM_DRAW;
    default: return GL.STATIC_DRAW;
  }
}

export function getTextureFormat(format: TextureFormat): number {
  switch (format) {
    case 'rgba': return GL.RGBA;
    case 'rgb': return GL.RGB;
    case 'luminance': return GL.LUMINANCE;
    case 'luminance-alpha': return GL.LUMINANCE_ALPHA;
    case 'alpha': return GL.ALPHA;
    case 'depth': return GL.DEPTH_COMPONENT;
    case 'depth-stencil': return GL.DEPTH_STENCIL;
    case 'red': return GL.RED;
    default: return GL.RGBA;
  }
}

export function getTextureInternalFormat(format: TextureInternalFormat): number {
  switch (format) {
    case 'rgba8': return GL.RGBA8;
    case 'rgb8': return GL.RGB8;
    case 'luminance8': return GL.LUMINANCE;
    case 'luminance-alpha8': return GL.LUMINANCE_ALPHA;
    case 'alpha8': return GL.ALPHA;
    case 'depth24': return GL.DEPTH_COMPONENT24;
    case 'depth24-stencil8': return GL.DEPTH24_STENCIL8;
    case 'rgba16f': return GL.RGBA16F;
    case 'rgba32f': return GL.RGBA32F;
    case 'rgb16f': return GL.RGB16F;
    case 'rgb32f': return GL.RGB32F;
    case 'r32f': return GL.R32F;
    default: return GL.RGBA8;
  }
}

export function getTextureType(type: TextureType): number {
  switch (type) {
    case 'ubyte': return GL.UNSIGNED_BYTE;
    case 'ushort': return GL.UNSIGNED_SHORT;
    case 'uint': return GL.UNSIGNED_INT;
    case 'float': return GL.FLOAT;
    case 'half-float': return GL.HALF_FLOAT;
    case 'uint-24-8': return GL.UNSIGNED_INT_24_8;
    case 'uint-24-8-stencil8': return GL.UNSIGNED_INT_24_8;
    default: return GL.UNSIGNED_BYTE;
  }
}

export function getTextureFilter(filter: TextureFilter): number {
  switch (filter) {
    case 'nearest': return GL.NEAREST;
    case 'linear': return GL.LINEAR;
    case 'nearest-mipmap-nearest': return GL.NEAREST_MIPMAP_NEAREST;
    case 'linear-mipmap-nearest': return GL.LINEAR_MIPMAP_NEAREST;
    case 'nearest-mipmap-linear': return GL.NEAREST_MIPMAP_LINEAR;
    case 'linear-mipmap-linear': return GL.LINEAR_MIPMAP_LINEAR;
    default: return GL.LINEAR;
  }
}

export function getTextureWrap(wrap: TextureWrap): number {
  switch (wrap) {
    case 'clamp': return GL.CLAMP_TO_EDGE;
    case 'repeat': return GL.REPEAT;
    case 'mirror-repeat': return GL.MIRRORED_REPEAT;
    case 'clamp-to-edge': return GL.CLAMP_TO_EDGE;
    case 'clamp-to-border': return GL.CLAMP_TO_EDGE;
    default: return GL.CLAMP_TO_EDGE;
  }
}

export function getPrimitiveType(primitive: PrimitiveType): number {
  switch (primitive) {
    case 'points': return GL.POINTS;
    case 'lines': return GL.LINES;
    case 'line-strip': return GL.LINE_STRIP;
    case 'line-loop': return GL.LINE_LOOP;
    case 'triangles': return GL.TRIANGLES;
    case 'triangle-strip': return GL.TRIANGLE_STRIP;
    case 'triangle-fan': return GL.TRIANGLE_FAN;
    default: return GL.TRIANGLES;
  }
}

export function getBlendFunc(func: BlendFunc): number {
  switch (func) {
    case 'zero': return GL.ZERO;
    case 'one': return GL.ONE;
    case 'src-color': return GL.SRC_COLOR;
    case 'one-minus-src-color': return GL.ONE_MINUS_SRC_COLOR;
    case 'src-alpha': return GL.SRC_ALPHA;
    case 'one-minus-src-alpha': return GL.ONE_MINUS_SRC_ALPHA;
    case 'dst-alpha': return GL.DST_ALPHA;
    case 'one-minus-dst-alpha': return GL.ONE_MINUS_DST_ALPHA;
    case 'dst-color': return GL.DST_COLOR;
    case 'one-minus-dst-color': return GL.ONE_MINUS_DST_COLOR;
    default: return GL.ONE;
  }
}

export function getBlendEquation(equation: BlendEquation): number {
  switch (equation) {
    case 'add': return GL.FUNC_ADD;
    case 'subtract': return GL.FUNC_SUBTRACT;
    case 'reverse-subtract': return GL.FUNC_REVERSE_SUBTRACT;
    case 'min': return GL.MIN;
    case 'max': return GL.MAX;
    default: return GL.FUNC_ADD;
  }
}

export function getDepthFunc(func: DepthFunc): number {
  switch (func) {
    case 'never': return GL.NEVER;
    case 'less': return GL.LESS;
    case 'equal': return GL.EQUAL;
    case 'lequal': return GL.LEQUAL;
    case 'greater': return GL.GREATER;
    case 'notequal': return GL.NOTEQUAL;
    case 'gequal': return GL.GEQUAL;
    case 'always': return GL.ALWAYS;
    default: return GL.LESS;
  }
}

export function getCullFace(face: CullFace): number {
  switch (face) {
    case 'front': return GL.FRONT;
    case 'back': return GL.BACK;
    case 'front-and-back': return GL.FRONT_AND_BACK;
    default: return GL.BACK;
  }
}

export function getFrontFace(face: FrontFace): number {
  switch (face) {
    case 'cw': return GL.CW;
    case 'ccw': return GL.CCW;
    default: return GL.CCW;
  }
}

export function getStencilFunc(func: StencilFunc): number {
  switch (func) {
    case 'never': return GL.NEVER;
    case 'less': return GL.LESS;
    case 'equal': return GL.EQUAL;
    case 'lequal': return GL.LEQUAL;
    case 'greater': return GL.GREATER;
    case 'notequal': return GL.NOTEQUAL;
    case 'gequal': return GL.GEQUAL;
    case 'always': return GL.ALWAYS;
    default: return GL.ALWAYS;
  }
}

export function getStencilOp(op: StencilOp): number {
  switch (op) {
    case 'keep': return GL.KEEP;
    case 'zero': return GL.ZERO;
    case 'replace': return GL.REPLACE;
    case 'incr': return GL.INCR;
    case 'incr-wrap': return GL.INCR_WRAP;
    case 'decr': return GL.DECR;
    case 'decr-wrap': return GL.DECR_WRAP;
    case 'invert': return GL.INVERT;
    default: return GL.KEEP;
  }
}


// Conversion functions to map string enums to GL constants
export function depthFuncToGL(gl: WebGL2RenderingContext, func: DepthFunc): number {
  switch (func) {
    case 'never': return gl.NEVER;
    case 'less': return gl.LESS;
    case 'equal': return gl.EQUAL;
    case 'lequal': return gl.LEQUAL;
    case 'greater': return gl.GREATER;
    case 'notequal': return gl.NOTEQUAL;
    case 'gequal': return gl.GEQUAL;
    case 'always': return gl.ALWAYS;
    default: return gl.LESS;
  }
}

export function blendFuncToGL(gl: WebGL2RenderingContext, func: BlendFunc): number {
  switch (func) {
    case 'zero': return gl.ZERO;
    case 'one': return gl.ONE;
    case 'src-color': return gl.SRC_COLOR;
    case 'one-minus-src-color': return gl.ONE_MINUS_SRC_COLOR;
    case 'src-alpha': return gl.SRC_ALPHA;
    case 'one-minus-src-alpha': return gl.ONE_MINUS_SRC_ALPHA;
    case 'dst-alpha': return gl.DST_ALPHA;
    case 'one-minus-dst-alpha': return gl.ONE_MINUS_DST_ALPHA;
    case 'dst-color': return gl.DST_COLOR;
    case 'one-minus-dst-color': return gl.ONE_MINUS_DST_COLOR;
    default: return gl.SRC_ALPHA;
  }
}

export function blendEquationToGL(gl: WebGL2RenderingContext, equation: BlendEquation): number {
  switch (equation) {
    case 'add': return gl.FUNC_ADD;
    case 'subtract': return gl.FUNC_SUBTRACT;
    case 'reverse-subtract': return gl.FUNC_REVERSE_SUBTRACT;
    case 'min': return gl.MIN;
    case 'max': return gl.MAX;
    default: return gl.FUNC_ADD;
  }
}

export function cullFaceToGL(gl: WebGL2RenderingContext, face: CullFace): number {
  switch (face) {
    case 'front': return gl.FRONT;
    case 'back': return gl.BACK;
    case 'front-and-back': return gl.FRONT_AND_BACK;
    default: return gl.BACK;
  }
}

export function frontFaceToGL(gl: WebGL2RenderingContext, face: FrontFace): number {
  switch (face) {
    case 'cw': return gl.CW;
    case 'ccw': return gl.CCW;
    default: return gl.CCW;
  }
}

export function stencilFuncToGL(gl: WebGL2RenderingContext, func: StencilFunc): number {
  switch (func) {
    case 'never': return gl.NEVER;
    case 'less': return gl.LESS;
    case 'equal': return gl.EQUAL;
    case 'lequal': return gl.LEQUAL;
    case 'greater': return gl.GREATER;
    case 'notequal': return gl.NOTEQUAL;
    case 'gequal': return gl.GEQUAL;
    case 'always': return gl.ALWAYS;
    default: return gl.ALWAYS;
  }
}

export function stencilOpToGL(gl: WebGL2RenderingContext, op: StencilOp): number {
  switch (op) {
    case 'keep': return gl.KEEP;
    case 'zero': return gl.ZERO;
    case 'replace': return gl.REPLACE;
    case 'incr': return gl.INCR;
    case 'incr-wrap': return gl.INCR_WRAP;
    case 'decr': return gl.DECR;
    case 'decr-wrap': return gl.DECR_WRAP;
    case 'invert': return gl.INVERT;
    default: return gl.KEEP;
  }
}

export function primitiveToGL(gl: WebGL2RenderingContext, primitive: PrimitiveType): number {
  switch (primitive) {
    case 'points': return gl.POINTS;
    case 'lines': return gl.LINES;
    case 'line-strip': return gl.LINE_STRIP;
    case 'line-loop': return gl.LINE_LOOP;
    case 'triangles': return gl.TRIANGLES;
    case 'triangle-strip': return gl.TRIANGLE_STRIP;
    case 'triangle-fan': return gl.TRIANGLE_FAN;
    default: return gl.TRIANGLES;
  }
}

export const mapGlArgs = (name: string, args: any[]) => {

  const mapBufferTarget = (target: number) => {
    switch (target) {
      case GL.ARRAY_BUFFER: return 'ARRAY_BUFFER';
      case GL.ELEMENT_ARRAY_BUFFER: return 'ELEMENT_ARRAY_BUFFER';
      default: return target;
    }
  }


  const mapBindBufferArgs = (args: any[]) => {
    const [target, buffer] = args;
    return [mapBufferTarget(target), buffer];
  }

  const mapBindTextureArgs = (args: any[]) => {
    const [target, texture] = args;
    return [mapTextureTarget(target), texture];
  }

  const mapTexImage2DArgs = (args: any[]) => {
    const [target, level, internalFormat, width, height, border, format, type, source] = args;
    return [mapTextureTarget(target), level, mapInternalFormat(internalFormat), width, height, border, mapTextureFormat(format), mapTextureType(type), source];
  }

  const mapTextureFormat = (format: number) => {
    switch (format) {
      case GL.RGBA: return 'RGBA';
      case GL.RGB: return 'RGB';
      case GL.LUMINANCE: return 'LUMINANCE';
      case GL.LUMINANCE_ALPHA: return 'LUMINANCE_ALPHA';
      case GL.ALPHA: return 'ALPHA';
      case GL.RED: return 'RED';
      default: return format;
    }
  }

  const mapTextureType = (type: number) => {
    switch (type) {
      case GL.UNSIGNED_BYTE: return 'UNSIGNED_BYTE';
      case GL.UNSIGNED_SHORT: return 'UNSIGNED_SHORT';
      case GL.UNSIGNED_INT: return 'UNSIGNED_INT';
      case GL.UNSIGNED_INT_24_8: return 'UNSIGNED_INT_24_8';
      case GL.FLOAT: return 'FLOAT';
      default: return type;
    }
  }

  const mapTexParameteriArgs = (args: any[]) => {
    const [target, pname, param] = args;
    return [mapTextureTarget(target), pname, param];
  }

  const mapPixelStoreiArgs = (args: any[]) => {
    const [pname, param] = args;
    return [pname, param];
  }

  const mapDrawElementsArgs = (args: any[]) => {
    const [mode, count, type, offset] = args;
    return [mapPrimitiveType(mode), count, mapElementType(type), offset];
  }

  const mapElementType = (type: number) => {
    switch (type) {
      case GL.UNSIGNED_BYTE: return 'UNSIGNED_BYTE';
      case GL.UNSIGNED_SHORT: return 'UNSIGNED_SHORT';
      case GL.UNSIGNED_INT: return 'UNSIGNED_INT';
      default: return type;
    }
  }

  const mapDrawArraysArgs = (args: any[]) => {
    const [mode, first, count] = args;
    return [mapPrimitiveType(mode), first, count];
  }

  const mapClearArgs = (args: any[]) => {
    const [mask] = args;
    return [mapClearMask(mask)];
  }

  const mapClearMask = (mask: number) => {
    let result = [];
    if (mask & GL.COLOR_BUFFER_BIT) result.push('COLOR_BUFFER_BIT');
    if (mask & GL.DEPTH_BUFFER_BIT) result.push('DEPTH_BUFFER_BIT');
    if (mask & GL.STENCIL_BUFFER_BIT) result.push('STENCIL_BUFFER_BIT');
    return result.join(' | ');
  }

  const mapClearColorArgs = (args: any[]) => {
    const [r, g, b, a] = args;
    return [r, g, b, a];
  }

  const mapClearDepthArgs = (args: any[]) => {
    const [depth] = args;
    return [depth];
  }

  const mapClearStencilArgs = (args: any[]) => {
    const [stencil] = args;
    return [stencil];
  }

  const mapPrimitiveType = (type: number) => {
    switch (type) {
      case GL.POINTS: return 'POINTS';
      case GL.LINES: return 'LINES';
      case GL.LINE_STRIP: return 'LINE_STRIP';
      case GL.LINE_LOOP: return 'LINE_LOOP';
      case GL.TRIANGLES: return 'TRIANGLES';
      case GL.TRIANGLE_STRIP: return 'TRIANGLE_STRIP';
      case GL.TRIANGLE_FAN: return 'TRIANGLE_FAN';
      default: return type;
    }
  }

  const mapBlendFuncArgs = (args: any[]) => {
    const [src, dst] = args;
    return [mapBlendFunc(src), mapBlendFunc(dst)];
  }

  const mapBlendEquationArgs = (args: any[]) => {
    const [equation] = args;
    return [mapBlendEquation(equation)];
  }

  const mapDepthFuncArgs = (args: any[]) => {
    const [func] = args;
    return [mapDepthFunc(func)];
  }

  const mapCullFaceArgs = (args: any[]) => {
    const [face] = args;
    return [mapCullFace(face)];
  }

  const mapFrontFaceArgs = (args: any[]) => {
    const [face] = args;
    return [mapFrontFace(face)];
  }

  const mapStencilFuncArgs = (args: any[]) => {
    const [func, ref, mask] = args;
    return [mapStencilFunc(func), ref, mask];
  }

  const mapStencilOpArgs = (args: any[]) => {
    const [fail, zfail, zpass] = args;
    return [mapStencilOp(fail), mapStencilOp(zfail), mapStencilOp(zpass)];
  }

  const mapBlendFunc = (func: number) => {
    switch (func) {
      case GL.ZERO: return 'ZERO';
      case GL.ONE: return 'ONE';
      case GL.SRC_COLOR: return 'SRC_COLOR';
      case GL.ONE_MINUS_SRC_COLOR: return 'ONE_MINUS_SRC_COLOR';
      case GL.SRC_ALPHA: return 'SRC_ALPHA';
      case GL.ONE_MINUS_SRC_ALPHA: return 'ONE_MINUS_SRC_ALPHA';
      case GL.DST_ALPHA: return 'DST_ALPHA';
      case GL.ONE_MINUS_DST_ALPHA: return 'ONE_MINUS_DST_ALPHA';
      case GL.DST_COLOR: return 'DST_COLOR';
      case GL.ONE_MINUS_DST_COLOR: return 'ONE_MINUS_DST_COLOR';
      default: return func;
    }
  }

  const mapBlendEquation = (equation: number) => {
    switch (equation) {
      case GL.FUNC_ADD: return 'ADD';
      case GL.FUNC_SUBTRACT: return 'SUBTRACT'; 
      case GL.FUNC_REVERSE_SUBTRACT: return 'REVERSE_SUBTRACT';
      case GL.MIN: return 'MIN';
      case GL.MAX: return 'MAX';
      default: return equation;
    }
  }

  const mapDepthFunc = (func: number) => {
    switch (func) {
      case GL.NEVER: return 'NEVER';
      case GL.LESS: return 'LESS';
      case GL.EQUAL: return 'EQUAL';
      case GL.LEQUAL: return 'LEQUAL';
      case GL.GREATER: return 'GREATER';
      case GL.NOTEQUAL: return 'NOTEQUAL';
      case GL.GEQUAL: return 'GEQUAL';
      case GL.ALWAYS: return 'ALWAYS';
      default: return func;
    }
  }

  const mapCullFace = (face: number) => {
    switch (face) {
      case GL.FRONT: return 'FRONT';
      case GL.BACK: return 'BACK';
      case GL.FRONT_AND_BACK: return 'FRONT_AND_BACK';
      default: return face;
    }
  }

  const mapFrontFace = (face: number) => {
    switch (face) {
      case GL.CW: return 'CW';
      case GL.CCW: return 'CCW';
      default: return face;
    }
  }

  const mapStencilFunc = (func: number) => {
    switch (func) {
      case GL.NEVER: return 'NEVER';
      case GL.LESS: return 'LESS';
      case GL.EQUAL: return 'EQUAL';
      case GL.LEQUAL: return 'LEQUAL';
      case GL.GREATER: return 'GREATER';
      case GL.NOTEQUAL: return 'NOTEQUAL';
      case GL.GEQUAL: return 'GEQUAL';
      case GL.ALWAYS: return 'ALWAYS';
      default: return func;
    }
  }

  const mapStencilOp = (op: number) => {
    switch (op) {
      case GL.KEEP: return 'KEEP';
      case GL.ZERO: return 'ZERO';
      case GL.REPLACE: return 'REPLACE';
      case GL.INCR: return 'INCR';
      case GL.INCR_WRAP: return 'INCR_WRAP';
      case GL.DECR: return 'DECR';
      case GL.DECR_WRAP: return 'DECR_WRAP';
      case GL.INVERT: return 'INVERT';
      default: return op;
    }
  }

  const mapViewportArgs = (args: any[]) => {
    const [x, y, width, height] = args;
    return [x, y, width, height];
  }

  const mapLineWidthArgs = (args: any[]) => {
    const [width] = args;
    return [width];
  }

  const mapPolygonOffsetArgs = (args: any[]) => {
    const [factor, units] = args;
    return [factor, units];
  }

  const mapScissorArgs = (args: any[]) => {
    const [x, y, width, height] = args;
    return [x, y, width, height];
  }

  const mapDepthRangeArgs = (args: any[]) => {
    const [near, far] = args;
    return [near, far];
  }

  const mapEnableArgs = (args: any[]) => {
    const [cap] = args;
    return [mapEnable(cap)];
  }

  const mapDisableArgs = (args: any[]) => {
    const [cap] = args;
    return [mapEnable(cap)];
  }

  const mapIsEnabledArgs = (args: any[]) => {
    const [cap] = args;
    return [mapEnable(cap)];
  }

  const mapEnable = (cap: number) => {
    switch (cap) {
      case GL.DEPTH_TEST: return 'DEPTH_TEST';
      case GL.CULL_FACE: return 'CULL_FACE';
      case GL.BLEND: return 'BLEND';
      case GL.DITHER: return 'DITHER';
      case GL.STENCIL_TEST: return 'STENCIL_TEST';
      case GL.POLYGON_OFFSET_FILL: return 'POLYGON_OFFSET_FILL';
      case GL.SAMPLE_ALPHA_TO_COVERAGE: return 'SAMPLE_ALPHA_TO_COVERAGE';
      case GL.SAMPLE_COVERAGE: return 'SAMPLE_COVERAGE';
      case GL.SCISSOR_TEST: return 'SCISSOR_TEST';
      default: return cap;
    }
  }

  const mapVertexAttribPointerArgs = (args: any[]) => {
    const [index, size, type, normalized, stride, offset] = args;
    return [index, size, mapVertexAttribType(type), normalized, stride, offset];
  }

  const mapVertexAttribType = (type: number) => {
    switch (type) {
      case GL.BYTE: return 'BYTE';
      case GL.UNSIGNED_BYTE: return 'UNSIGNED_BYTE';
      case GL.SHORT: return 'SHORT';
      case GL.UNSIGNED_SHORT: return 'UNSIGNED_SHORT';
      case GL.INT: return 'INT';
      case GL.UNSIGNED_INT: return 'UNSIGNED_INT';
      case GL.FLOAT: return 'FLOAT';
      case GL.HALF_FLOAT: return 'HALF_FLOAT';
      default: return type;
    }
  }

  const mapCreateBufferArgs = (args: any[]) => {
    const [numOfChannels, length, sampleRate] = args;
    return [numOfChannels, length, sampleRate];
  }

  const mapBufferUsage = (usage: number) => {
    switch (usage) {
      case GL.STATIC_DRAW: return 'STATIC_DRAW';
      case GL.DYNAMIC_DRAW: return 'DYNAMIC_DRAW';
      case GL.STREAM_DRAW: return 'STREAM_DRAW';
      default: return usage;
    }
  }

  const mapCreateTextureArgs = (args: any[]) => {
    const [target, level, internalFormat, width, height, border, format, type, source] = args;
    return [mapTextureTarget(target), level, mapInternalFormat(internalFormat), width, height, border, format, type, source];
  }

  const mapCreateFramebufferArgs = (args: any[]) => {
    const [target, width, height] = args;
    return [mapFramebufferTarget(target), width, height];
  }

  const mapCreateRenderbufferArgs = (args: any[]) => {
    const [target, width, height] = args;
    return [mapRenderbufferTarget(target), width, height];
  }

  const mapFramebufferTarget = (target: number) => {
    switch (target) {
      case GL.FRAMEBUFFER: return 'FRAMEBUFFER';
      default: return target;
    }
  }

  const mapRenderbufferTarget = (target: number) => {
    switch (target) {
      case GL.RENDERBUFFER: return 'RENDERBUFFER';
      default: return target;
    }
  }

  const mapCreateShaderArgs = (args: any[]) => {
    const [type, source] = args;
    return [mapCreateShader(type), source];
  }

  const mapCreateQueryArgs = (args: any[]) => {
    const [target] = args;
    return [mapCreateQuery(target)];
  }

  const mapCreateSamplerArgs = (args: any[]) => {
    const [target] = args;
    return [mapTextureTarget(target)];
  }

  const mapCreateShader = (type: number) => {
    switch (type) {
      case GL.VERTEX_SHADER: return 'VERTEX_SHADER';
      case GL.FRAGMENT_SHADER: return 'FRAGMENT_SHADER';
      default: return type;
    }
  }

  const mapCreateQuery = (target: number) => {
    switch (target) {
      default: return target;
    }
  }

  const mapTextureTarget = (target: number) => {
    switch (target) {
      case GL.TEXTURE_CUBE_MAP_NEGATIVE_X: return 'TEXTURE_CUBE_MAP_NEGATIVE_X';
      case GL.TEXTURE_CUBE_MAP_POSITIVE_X: return 'TEXTURE_CUBE_MAP_POSITIVE_X';
      case GL.TEXTURE_CUBE_MAP_NEGATIVE_Y: return 'TEXTURE_CUBE_MAP_NEGATIVE_Y';
      case GL.TEXTURE_CUBE_MAP_POSITIVE_Y: return 'TEXTURE_CUBE_MAP_POSITIVE_Y';
      case GL.TEXTURE_CUBE_MAP_NEGATIVE_Z: return 'TEXTURE_CUBE_MAP_NEGATIVE_Z';
      case GL.TEXTURE_CUBE_MAP_POSITIVE_Z: return 'TEXTURE_CUBE_MAP_POSITIVE_Z';
      case GL.TEXTURE_2D: return 'TEXTURE_2D';
      case GL.TEXTURE_2D_ARRAY: return 'TEXTURE_2D_ARRAY';
      default: return target;
    }
  }

  const mapCreateRenderbuffer = (target: number) => {
    switch (target) {
      case GL.RENDERBUFFER: return 'RENDERBUFFER';
      default: return target;
    }
  }

  const mapCreateVertexArrayArgs = (args: any[]) => {
    const [buffer] = args;
    return [mapCreateVertexArray(buffer)];
  }

  const mapBindVertexArrayArgs = (args: any[]) => {
    const [buffer] = args;
    return [mapCreateVertexArray(buffer)];
  }

  const mapCreateVertexArray = (buffer: number) => {
    switch (buffer) {
      case GL.ARRAY_BUFFER: return 'ARRAY_BUFFER';
      case GL.ELEMENT_ARRAY_BUFFER: return 'ELEMENT_ARRAY_BUFFER';
      default: return buffer;
    }
  }

  const mapVertexAttribDivisorArgs = (args: any[]) => {
    const [index, divisor] = args;
    return [index, divisor];
  }

  const mapVertexAttribIPointerArgs = (args: any[]) => {
    const [index, size, type, stride, offset] = args;
    return [index, size, mapVertexAttribType(type), stride, offset];
  }

  const mapBindFramebufferArgs = (args: any[]) => {
    const [target, framebuffer] = args;
    return [mapFramebufferTarget(target), framebuffer];
  }

  const mapBindRenderbufferArgs = (args: any[]) => {
    const [target, renderbuffer] = args;
    return [mapRenderbufferTarget(target), renderbuffer];
  }

  const mapBindProgramArgs = (args: any[]) => {
    const [program] = args;
    return [program];
  }

  const mapBindQueryArgs = (args: any[]) => {
    const [target, query] = args;
    return [mapCreateQuery(target), query];
  }

  const mapBindSamplerArgs = (args: any[]) => {
    const [target, sampler] = args;
    return [mapTextureTarget(target), sampler];
  }

  const mapBindImageTextureArgs = (args: any[]) => {
    const [unit, texture, level, layered, layer, access, format] = args;
    return [unit, texture, level, layered, layer, access, format];
  }

  const mapBindBufferBaseArgs = (args: any[]) => {
    const [target, index, buffer] = args;
    return [mapBufferTarget(target), index, buffer];
  }

  const mapBindBufferRangeArgs = (args: any[]) => {
    const [target, index, buffer, offset, size] = args;
    return [mapBufferTarget(target), index, buffer, offset, size];
  }

  const mapBindTransformFeedbackArgs = (args: any[]) => {
    const [target, transformFeedback] = args;
    return [mapCreateTransformFeedback(target), transformFeedback];
  }

  const mapBindVertexBufferArgs = (args: any[]) => {
    const [bindingIndex, buffer, offset, stride, divisor] = args;
    return [bindingIndex, buffer, offset, stride, divisor];
  }

  const mapCreateTransformFeedbackArgs = (args: any[]) => {
    const [target] = args;
    return [mapCreateTransformFeedback(target)];
  }

  const mapCreateTransformFeedback = (target: number) => {
    switch (target) {
      case GL.TRANSFORM_FEEDBACK: return 'TRANSFORM_FEEDBACK';
      default: return target;
    }
  }

  const mapGetShaderParameterArgs = (args: any[]) => {
    const [shader, pname] = args;
    return [shader, mapGetShaderParameter(pname)];
  }

  const mapGetShaderParameter = (pname: number) => {
    switch (pname) {
      case GL.COMPILE_STATUS: return 'COMPILE_STATUS';
      case GL.SHADER_TYPE: return 'SHADER_TYPE';
      case GL.DELETE_STATUS: return 'DELETE_STATUS';
      case GL.LINK_STATUS: return 'LINK_STATUS';
      case GL.VALIDATE_STATUS: return 'VALIDATE_STATUS';
      case GL.ACTIVE_UNIFORM_BLOCKS: return 'ACTIVE_UNIFORM_BLOCKS';
      case GL.ATTACHED_SHADERS: return 'ATTACHED_SHADERS';
      case GL.ACTIVE_UNIFORMS: return 'ACTIVE_UNIFORMS';
      case GL.ACTIVE_ATTRIBUTES: return 'ACTIVE_ATTRIBUTES';
      default: return pname;
    }
  }

  const mapGetProgramParameterArgs = (args: any[]) => {
    const [program, pname] = args;
    return [program, mapGetShaderParameter(pname)];
  }
  
  const mapGetProgramInfoLogArgs = (args: any[]) => {
    const [program] = args;
    return [program];
  }

  const mapGetShaderInfoLogArgs = (args: any[]) => {
    const [shader] = args;
    return [shader];
  }

  const mapGetShaderPrecisionFormatArgs = (args: any[]) => {
    const [shadertype, precisionType] = args;
    return [shadertype, precisionType];
  }

  const mapGetUniformBlockIndexArgs = (args: any[]) => {
    const [program, uniformBlockName] = args;
    return [program, uniformBlockName];
  }

  const mapGetUniformIndicesArgs = (args: any[]) => {
    const [program, uniformBlockName] = args;
    return [program, uniformBlockName];
  }

  const mapGetUniformSubroutineuivArgs = (args: any[]) => {
    const [program, pname, index, data] = args;
    return [program, pname, index, data];
  }

  const mapGetUniformuivArgs = (args: any[]) => {
    const [program, pname, index, data] = args;
    return [program, pname, index, data];
  }

  const mapGetVertexAttribOffsetArgs = (args: any[]) => {
    const [index, pname] = args;
    return [index, mapGetVertexAttribParam(pname)];
  }

  const mapGetVertexAttribPointervArgs = (args: any[]) => {
    const [index, pname] = args;
    return [index, mapGetVertexAttribParam(pname)];
  }

  const mapGetVertexAttribIivArgs = (args: any[]) => {
    const [index, pname] = args;
    return [index, mapGetVertexAttribParam(pname)];
  }

  const mapGetVertexAttribParam = (pname: number) => {
    switch (pname) {
      case GL.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: return 'VERTEX_ATTRIB_ARRAY_BUFFER_BINDING';
      case GL.VERTEX_ATTRIB_ARRAY_POINTER: return 'VERTEX_ATTRIB_ARRAY_POINTER';
      case GL.VERTEX_ATTRIB_ARRAY_SIZE: return 'VERTEX_ATTRIB_ARRAY_SIZE';
      case GL.VERTEX_ATTRIB_ARRAY_STRIDE: return 'VERTEX_ATTRIB_ARRAY_STRIDE';
      case GL.VERTEX_ATTRIB_ARRAY_TYPE: return 'VERTEX_ATTRIB_ARRAY_TYPE';
      case GL.VERTEX_ATTRIB_ARRAY_NORMALIZED: return 'VERTEX_ATTRIB_ARRAY_NORMALIZED';
      case GL.VERTEX_ATTRIB_ARRAY_INTEGER: return 'VERTEX_ATTRIB_ARRAY_INTEGER';
      case GL.VERTEX_ATTRIB_ARRAY_DIVISOR: return 'VERTEX_ATTRIB_ARRAY_DIVISOR';
      default: return pname;
    }
  }

  const mapGetVertexAttribIuivArgs = (args: any[]) => {
    const [index, pname] = args;
    return [index, mapGetVertexAttribParam(pname)];
  }

  const mapGetVertexAttribfvArgs = (args: any[]) => {
    const [index, pname] = args;
    return [index, mapGetVertexAttribParam(pname)];
  }

  const mapGetVertexAttribdvArgs = (args: any[]) => {
    const [index, pname] = args;
    return [index, pname];
  }

  const mapBufferDataArgs = (args: any[]) => {
    const [target, sizeOrSrcData, usage] = args;
    return [mapBufferTarget(target), sizeOrSrcData, mapBufferUsage(usage)];
  }

  const mapGetParameterArgs = (args: any[]) => {
    const [pname] = args;
    return [mapGetParameter(pname)];
  }

  const mapGetParameter = (pname: number) => {
    switch (pname) {
      case GL.MAX_TEXTURE_SIZE: return 'MAX_TEXTURE_SIZE';
      case GL.MAX_CUBE_MAP_TEXTURE_SIZE: return 'MAX_CUBE_MAP_TEXTURE_SIZE';
      case GL.MAX_RENDERBUFFER_SIZE: return 'MAX_RENDERBUFFER_SIZE';
      case GL.MAX_TEXTURE_IMAGE_UNITS: return 'MAX_TEXTURE_IMAGE_UNITS';
      case GL.MAX_VERTEX_UNIFORM_BLOCKS: return 'MAX_VERTEX_UNIFORM_BLOCKS';
      case GL.MAX_FRAGMENT_UNIFORM_BLOCKS: return 'MAX_FRAGMENT_UNIFORM_BLOCKS';
      case GL.MAX_VERTEX_UNIFORM_VECTORS: return 'MAX_VERTEX_UNIFORM_VECTORS';
      case GL.MAX_FRAGMENT_UNIFORM_VECTORS: return 'MAX_FRAGMENT_UNIFORM_VECTORS';
      case GL.MAX_VARYING_VECTORS: return 'MAX_VARYING_VECTORS';
      case GL.MAX_VERTEX_TEXTURE_IMAGE_UNITS: return 'MAX_VERTEX_TEXTURE_IMAGE_UNITS';
      case GL.MAX_TEXTURE_LOD_BIAS: return 'MAX_TEXTURE_LOD_BIAS';
      case GL.MAX_3D_TEXTURE_SIZE: return 'MAX_3D_TEXTURE_SIZE';
      case GL.MAX_ARRAY_TEXTURE_LAYERS: return 'MAX_ARRAY_TEXTURE_LAYERS';
      case GL.MAX_COLOR_ATTACHMENTS: return 'MAX_COLOR_ATTACHMENTS';
      case GL.MAX_DRAW_BUFFERS: return 'MAX_DRAW_BUFFERS';
      case GL.MAX_ELEMENT_INDEX: return 'MAX_ELEMENT_INDEX';
      case GL.MAX_ELEMENTS_INDICES: return 'MAX_ELEMENTS_INDICES';
      case GL.MAX_ELEMENTS_VERTICES: return 'MAX_ELEMENTS_VERTICES';
      case GL.MAX_SERVER_WAIT_TIMEOUT: return 'MAX_SERVER_WAIT_TIMEOUT';
      case GL.MAX_CLIENT_WAIT_TIMEOUT_WEBGL: return 'MAX_CLIENT_WAIT_TIMEOUT_WEBGL';
      case GL.STENCIL_BITS: return 'STENCIL_BITS';
      default: return pname;
    }
  }

  const mapActiveTextureArgs = (args: any[]) => {
    const [texture] = args;
    return [mapBindTexture(texture)];
  }

  const mapBindTexture = (texture: number) => {
    if (texture >= GL.TEXTURE0 && texture <= GL.TEXTURE15) {
      return `TEXTURE${texture - GL.TEXTURE0}`;
    }
    return texture;
  }

  const mapCopyTexImage2DArgs = (args: any[]) => {
    const [target, level, internalformat, x, y, width, height, border] = args;
    return [mapTextureTarget(target), level, mapInternalFormat(internalformat), x, y, width, height, border];
  }

  const mapCopyTexSubImage2DArgs = (args: any[]) => {
    const [target, level, xoffset, yoffset, x, y, width, height] = args;
    return [mapTextureTarget(target), level, xoffset, yoffset, x, y, width, height];
  }


  const mapInternalFormat = (internalformat: number) => {
    switch (internalformat) {
      case GL.RGBA16F: return 'RGBA16F';
      case GL.RGBA32F: return 'RGBA32F';
      case GL.RGB16F: return 'RGB16F';
      case GL.RGB32F: return 'RGB32F';
      case GL.RGBA8: return 'RGBA8';
      case GL.R32F: return 'R32F';
      case GL.RGBA32I: return 'RGBA32I';
      case GL.RGBA32UI: return 'RGBA32UI';
      case GL.RGBA8I: return 'RGBA8I';
      case GL.RGBA8UI: return 'RGBA8UI';
      case GL.RGBA16I: return 'RGBA16I';
      case GL.ALPHA: return 'ALPHA';
      case GL.LUMINANCE: return 'LUMINANCE';
      case GL.LUMINANCE_ALPHA: return 'LUMINANCE_ALPHA';
      default: return internalformat;
    }
  }

  if (name === 'bindBuffer') return mapBindBufferArgs(args);
  if (name === 'bindTexture') return mapBindTextureArgs(args);
  if (name === 'texImage2D') return mapTexImage2DArgs(args);
  if (name === 'texParameteri') return mapTexParameteriArgs(args);
  if (name === 'pixelStorei') return mapPixelStoreiArgs(args);
  if (name === 'drawElements') return mapDrawElementsArgs(args);
  if (name === 'drawArrays') return mapDrawArraysArgs(args);
  if (name === 'clear') return mapClearArgs(args);
  if (name === 'clearColor') return mapClearColorArgs(args);
  if (name === 'clearDepth') return mapClearDepthArgs(args);
  if (name === 'clearStencil') return mapClearStencilArgs(args);
  if (name === 'clearColor') return mapClearColorArgs(args);
  if (name === 'clearDepth') return mapClearDepthArgs(args);
  if (name === 'clearStencil') return mapClearStencilArgs(args);
  if (name === 'clearColor') return mapClearColorArgs(args);
  if (name === 'clearDepth') return mapClearDepthArgs(args);
  if (name === 'clearStencil') return mapClearStencilArgs(args);
  if (name === 'viewport') return mapViewportArgs(args);
  if (name === 'blendFunc') return mapBlendFuncArgs(args);
  if (name === 'blendEquation') return mapBlendEquationArgs(args);
  if (name === 'depthFunc') return mapDepthFuncArgs(args);
  if (name === 'cullFace') return mapCullFaceArgs(args);
  if (name === 'frontFace') return mapFrontFaceArgs(args);
  if (name === 'stencilFunc') return mapStencilFuncArgs(args);
  if (name === 'stencilOp') return mapStencilOpArgs(args);
  if (name === 'lineWidth') return mapLineWidthArgs(args);
  if (name === 'polygonOffset') return mapPolygonOffsetArgs(args);
  if (name === 'scissor') return mapScissorArgs(args);
  if (name === 'depthRange') return mapDepthRangeArgs(args);
  if (name === 'enable') return mapEnableArgs(args);
  if (name === 'disable') return mapDisableArgs(args);
  if (name === 'isEnabled') return mapIsEnabledArgs(args);
  if (name === 'createBuffer') return mapCreateBufferArgs(args);
  if (name === 'createTexture') return mapCreateTextureArgs(args);
  if (name === 'createFramebuffer') return mapCreateFramebufferArgs(args);
  if (name === 'createRenderbuffer') return mapCreateRenderbufferArgs(args);
  if (name === 'createProgram') return args;
  if (name === 'activeTexture') return mapActiveTextureArgs(args);
  if (name === 'createShader') return mapCreateShaderArgs(args);
  if (name === 'createQuery') return mapCreateQueryArgs(args);
  if (name === 'createSampler') return mapCreateSamplerArgs(args);
  if (name === 'createVertexArray') return mapCreateVertexArrayArgs(args);
  if (name === 'copyTexImage2D') return mapCopyTexImage2DArgs(args);
  if (name === 'copyTexSubImage2D') return mapCopyTexSubImage2DArgs(args);
  if (name === 'getShaderParameter') return mapGetShaderParameterArgs(args);
  if (name === 'getProgramParameter') return mapGetProgramParameterArgs(args);
  if (name === 'getProgramInfoLog') return mapGetProgramInfoLogArgs(args);
  if (name === 'getShaderInfoLog') return mapGetShaderInfoLogArgs(args);
  if (name === 'getShaderPrecisionFormat') return mapGetShaderPrecisionFormatArgs(args);
  if (name === 'getParameter') return mapGetParameterArgs(args);
  if (name === 'getUniformBlockIndex') return mapGetUniformBlockIndexArgs(args);
  if (name === 'getUniformIndices') return mapGetUniformIndicesArgs(args);
  if (name === 'getUniformSubroutineuiv') return mapGetUniformSubroutineuivArgs(args);
  if (name === 'getUniformuiv') return mapGetUniformuivArgs(args);
  if (name === 'getVertexAttribOffset') return mapGetVertexAttribOffsetArgs(args);
  if (name === 'getVertexAttribPointerv') return mapGetVertexAttribPointervArgs(args);
  if (name === 'getVertexAttribIiv') return mapGetVertexAttribIivArgs(args);
  if (name === 'getVertexAttribIuiv') return mapGetVertexAttribIuivArgs(args);
  if (name === 'getVertexAttribfv') return mapGetVertexAttribfvArgs(args);
  if (name === 'getVertexAttribdv') return mapGetVertexAttribdvArgs(args);
  if (name === 'getVertexAttribPointerv') return mapGetVertexAttribPointervArgs(args);
  if (name === 'getVertexAttribIiv') return mapGetVertexAttribIivArgs(args);
  if (name === 'getVertexAttribIuiv') return mapGetVertexAttribIuivArgs(args);
  if (name === 'bindVertexArray') return mapBindVertexArrayArgs(args);
  if (name === 'bindBuffer') return mapBindBufferArgs(args);
  if (name === 'bindTexture') return mapBindTextureArgs(args);
  if (name === 'bindFramebuffer') return mapBindFramebufferArgs(args);
  if (name === 'bindRenderbuffer') return mapBindRenderbufferArgs(args);
  if (name === 'bindProgram') return mapBindProgramArgs(args);
  if (name === 'bindQuery') return mapBindQueryArgs(args);
  if (name === 'bindSampler') return mapBindSamplerArgs(args);
  if (name === 'bindImageTexture') return mapBindImageTextureArgs(args);
  if (name === 'bindBufferBase') return mapBindBufferBaseArgs(args);
  if (name === 'bindBufferRange') return mapBindBufferRangeArgs(args);
  if (name === 'bindTransformFeedback') return mapBindTransformFeedbackArgs(args);
  if (name === 'bindVertexBuffer') return mapBindVertexBufferArgs(args);
  if (name === 'bufferData') return mapBufferDataArgs(args);
  if (name === 'vertexAttribPointer') return mapVertexAttribPointerArgs(args);
  if (name === 'vertexAttribDivisor') return mapVertexAttribDivisorArgs(args);
  if (name === 'vertexAttribIPointer') return mapVertexAttribIPointerArgs(args);
  if (name === 'vertexAttribI4i') return args
  if (name === 'vertexAttribI4ui') return args;
  if (name === 'vertexAttribI4iv') return args;
  if (name === 'vertexAttribI4uiv') return args;
  if (name === 'vertexAttribI4fv') return args;
  if (name === 'vertexAttribI4dv') return args;
  if (name === 'vertexAttribI4ubv') return args;
  return args;
}
