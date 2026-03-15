import { vi } from "vitest";
import { GLStateCache } from "../src/state";

const Constants = {
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  DRAW: 35044,
  DYNAMIC_DRAW: 35048,
  STREAM_DRAW: 35040,
  
  TEXTURE_2D: 3553,
  TEXTURE_CUBE_MAP: 34067,
  TEXTURE_CUBE_MAP_POSITIVE_X: 34069,
  TEXTURE_CUBE_MAP_NEGATIVE_X: 34070,
  TEXTURE_CUBE_MAP_POSITIVE_Y: 34071,
  TEXTURE_CUBE_MAP_NEGATIVE_Y: 34072,
  TEXTURE_CUBE_MAP_POSITIVE_Z: 34073,
  TEXTURE_CUBE_MAP_NEGATIVE_Z: 34074,
  
  RGBA: 6408,
  RGB: 6407,
  RGBA8: 32856,
  RGB8: 32849,
  UNSIGNED_BYTE: 5121,
  FLOAT: 5126,
  
  LINEAR: 9729,
  NEAREST: 9728,
  CLAMP_TO_EDGE: 33071,
  REPEAT: 10497,
  
  TEXTURE_MIN_FILTER: 10241,
  TEXTURE_MAG_FILTER: 10240,
  TEXTURE_WRAP_S: 10242,
  TEXTURE_WRAP_T: 10243,
  
  FRAMEBUFFER: 36160,
  COLOR_ATTACHMENT0: 36064,
  COLOR_ATTACHMENT1: 36065,
  COLOR_ATTACHMENT2: 36066,
  COLOR_ATTACHMENT3: 36067,
  COLOR_ATTACHMENT4: 36068,
  COLOR_ATTACHMENT5: 36069,
  COLOR_ATTACHMENT6: 36070,
  COLOR_ATTACHMENT7: 36071,
  COLOR_ATTACHMENT8: 36072,

  DEPTH_ATTACHMENT: 36096,
  STENCIL_ATTACHMENT: 36128,
  
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  
  BLEND: 3042,
  DEPTH_TEST: 2929,
  CULL_FACE: 2884,
  STENCIL_TEST: 2960,
  SCISSOR_TEST: 3089,
  POLYGON_OFFSET_FILL: 32823,
  
  ZERO: 0,
  ONE: 1,
  SRC_COLOR: 768,
  ONE_MINUS_SRC_COLOR: 769,
  SRC_ALPHA: 770,
  ONE_MINUS_SRC_ALPHA: 771,
  DST_ALPHA: 772,
  ONE_MINUS_DST_ALPHA: 773,
  
  FUNC_ADD: 32774,
  FUNC_SUBTRACT: 32778,
  FUNC_REVERSE_SUBTRACT: 32779,
  
  NEVER: 512,
  LESS: 513,
  EQUAL: 514,
  LEQUAL: 515,
  GREATER: 516,
  NOTEQUAL: 517,
  GEQUAL: 518,
  ALWAYS: 519,
  
  KEEP: 7680,
  REPLACE: 7681,
  INCR: 7682,
  DECR: 7683,
  INVERT: 5386,
  INCR_WRAP: 34055,
  DECR_WRAP: 34056,

  VIEWPORT: 0x0BA2,
  SCISSOR_BOX: 0x0C10,
  LINE_WIDTH: 0x0B21,
  FRAMEBUFFER_COMPLETE: 0x8CD5,
  FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 0x8CD6,

  MAX_VIEWPORT_DIMS: 34962,
  MAX_TEXTURE_SIZE: 34024,
  MAX_TEXTURE_IMAGE_UNITS: 34930,
  MAX_VERTEX_ATTRIBS: 34921,
  MAX_VERTEX_UNIFORM_VECTORS: 35638,
  MAX_DRAW_BUFFERS: 34945,
  MAX_FRAGMENT_UNIFORM_VECTORS: 35639,
  MAX_CUBE_MAP_TEXTURE_SIZE: 34076,
  MAX_VARYING_VECTORS: 35637,
  
  CW: 2304,
  CCW: 2305,
  BACK: 1029,
  FRONT: 1028,
  FRONT_AND_BACK: 1032,
  
  COLOR_BUFFER_BIT: 16384,
  DEPTH_BUFFER_BIT: 256,
  STENCIL_BUFFER_BIT: 1024,
  
  TRIANGLES: 4,
  TRIANGLE_STRIP: 5,
  TRIANGLE_FAN: 6,
  LINES: 1,
  LINE_STRIP: 3,
  LINE_LOOP: 2,
  POINTS: 0,
  
  UNSIGNED_SHORT: 5123,
  UNSIGNED_INT: 5125,
  
  UNPACK_FLIP_Y_WEBGL: 37440,
  UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,

  ACTIVE_ATTRIBUTES: 35721,
  ACTIVE_UNIFORMS: 35718,

  DEPTH24_STENCIL8: 35056,
  DEPTH_STENCIL: 34041,
  UNSIGNED_INT_24_8: 34042,
}

export class MockWebGL2RenderingContext {
  canvas: HTMLCanvasElement | null = null;

  log: any[][] = [];
  ignoreCalls = new Set<string>();

  constructor() {
    for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
      if (typeof this[key as keyof MockWebGL2RenderingContext] === 'function') {
        const original = this[key as keyof MockWebGL2RenderingContext] as any;
        vi.spyOn(this, key as any).mockImplementation((...args) => {
          if (!this.ignoreCalls.has(key)) {
            this.log.push([key, ...args]);
          }
          return original.apply(this, args);
        });
      }
    }
  }

  // Buffer methods
  createBuffer() { return {} as WebGLBuffer; }
  deleteBuffer(buffer: WebGLBuffer) {}
  bindBuffer(target: number, buffer: WebGLBuffer | null) {}
  bufferData(target: number, data: any, usage: number) {}
  bufferSubData(target: number, offset: number, data: any) {}
  
  // Texture methods
  createTexture() { return {} as WebGLTexture; }
  deleteTexture(texture: WebGLTexture) {}
  bindTexture(target: number, texture: WebGLTexture | null) {}
  texImage2D(target: number, level: number, internalformat: number, width: number, height: number, border: number, format: number, type: number, pixels: any) {}
  texSubImage2D(target: number, level: number, xoffset: number, yoffset: number, width: number, height: number, format: number, type: number, pixels: any) {}
  texParameteri(target: number, pname: number, param: number) {}
  
  // Framebuffer methods
  createFramebuffer() { return {} as WebGLFramebuffer; }
  deleteFramebuffer(framebuffer: WebGLFramebuffer) {}
  bindFramebuffer(target: number, framebuffer: WebGLFramebuffer | null) {}
  framebufferTexture2D(target: number, attachment: number, textarget: number, texture: WebGLTexture | null, level: number) {}
  drawBuffers(buffers: number[]) {}
  checkFramebufferStatus(target: number) { return Constants.FRAMEBUFFER_COMPLETE; }
  
  // Shader and program methods
  createShader(type: number) { return {} as WebGLShader; }
  deleteShader(shader: WebGLShader) {}
  shaderSource(shader: WebGLShader, source: string) {}
  compileShader(shader: WebGLShader) {}
  getShaderParameter(shader: WebGLShader, pname: number) { return true; }
  getShaderInfoLog(shader: WebGLShader) { return ''; }
  
  createProgram() { return {} as WebGLProgram; }
  deleteProgram(program: WebGLProgram) {}
  attachShader(program: WebGLProgram, shader: WebGLShader) {}
  linkProgram(program: WebGLProgram) {}
  getProgramParameter(program: WebGLProgram, pname: number) {
    if (pname === Constants.ACTIVE_ATTRIBUTES) return this._attribs?.length ?? 0;
    if (pname === Constants.ACTIVE_UNIFORMS) return this._uniforms?.length ?? 0;
    return true;
  }
  getProgramInfoLog(program: WebGLProgram) { return ''; }
  useProgram(program: WebGLProgram | null) {}
  
  // VAO methods
  createVertexArray() { return {} as WebGLVertexArrayObject; }
  deleteVertexArray(vao: WebGLVertexArrayObject) {}
  bindVertexArray(vao: WebGLVertexArrayObject | null) {}
  enableVertexAttribArray(index: number) {}
  vertexAttribPointer(index: number, size: number, type: number, normalized: boolean, stride: number, offset: number) {}

  _uniforms: string[] | null = null
  test_setUniforms(uniforms: string[]) {
    this._uniforms = uniforms;
  }

  _attribs: string[] | null = null
  test_setAttribs(attribs: string[]) {
    this._attribs = attribs;
  }

  getActiveAttrib(program: WebGLProgram, index: number) { 
    if (!this._attribs) throw new Error('bagl: getActiveAttrib called before setAttribs');
    return { name: this._attribs[index] };
  }
  getActiveUniform(program: WebGLProgram, index: number) { 
    if (!this._uniforms) throw new Error('bagl: getActiveUniform called before setUniforms');
    return { name: this._uniforms[index] }
  }
  getAttribLocation(program: WebGLProgram, name: string) { return 0; }
  getUniformLocation(program: WebGLProgram, name: string) { return {} as WebGLUniformLocation; }
  
  // Drawing methods
  drawArrays(mode: number, first: number, count: number) {}
  drawElements(mode: number, count: number, type: number, offset: number) {}

  pixelStorei(pname: number, param: number) {}
  
  // State methods
  enable(cap: number) {}
  disable(cap: number) {}
  isEnabled(cap: number) { return false; }
  blendFunc(sfactor: number, dfactor: number) {}
  blendEquation(mode: number) {}
  blendColor(red: number, green: number, blue: number, alpha: number) {}
  depthFunc(func: number) {}
  depthMask(flag: boolean) {}
  depthRange(zNear: number, zFar: number) {}
  cullFace(mode: number) {}
  frontFace(mode: number) {}
  stencilFunc(func: number, ref: number, mask: number) {}
  stencilOp(fail: number, zfail: number, zpass: number) {}
  stencilMask(mask: number) {}
  scissor(x: number, y: number, width: number, height: number) {}
  viewport(x: number, y: number, width: number, height: number) {}
  polygonOffset(factor: number, units: number) {}
  lineWidth(width: number) {}
  colorMask(red: boolean, green: boolean, blue: boolean, alpha: boolean) {}
  
  // Clear methods
  clear(mask: number) {}
  clearColor(red: number, green: number, blue: number, alpha: number) {}
  clearDepth(depth: number) {}
  clearStencil(s: number) {}
  
  // Parameter querying
  getParameter(param: number): any { return 0; }
  getSupportedExtensions() { return [] as string[]; }
  getExtension(name: string) { 
    const supportedExtensions = this.getSupportedExtensions() ?? []
    if (supportedExtensions.includes(name)) return {} as any;
    return null;
  }
  
  // Uniform methods
  uniform1f(location: WebGLUniformLocation | null, x: number) {}
  uniform2f(location: WebGLUniformLocation | null, x: number, y: number) {}
  uniform3f(location: WebGLUniformLocation | null, x: number, y: number, z: number) {}
  uniform4f(location: WebGLUniformLocation | null, x: number, y: number, z: number, w: number) {}
  uniform1i(location: WebGLUniformLocation | null, x: number) {}
  uniform2i(location: WebGLUniformLocation | null, x: number, y: number) {}
  uniform3i(location: WebGLUniformLocation | null, x: number, y: number, z: number) {}
  uniform4i(location: WebGLUniformLocation | null, x: number, y: number, z: number, w: number) {}

}

// Make sure the constants are available on the class and the prototype
Object.assign(MockWebGL2RenderingContext, Constants);
Object.assign(MockWebGL2RenderingContext.prototype, Constants);

/** 
 * Sets/mocks the uniforms for a given WebGL2RenderingContext that would be returned 
 * by the getActiveUniforms function from a shader. Ignores the specified shader program.
 */
export function mockGlSetUniforms(gl: WebGL2RenderingContext, uniforms: string[]) {
  (gl as unknown as MockWebGL2RenderingContext).test_setUniforms(uniforms);

}

/**
 * Sets/mocks the attributes for a given WebGL2RenderingContext that would be returned 
 * by the getActiveAttributes function from a shader. Ignores the specified shader program.
 */
export function mockGlSetAttribs(gl: WebGL2RenderingContext, attribs: string[]) {
  (gl as unknown as MockWebGL2RenderingContext).test_setAttribs(attribs);
}


export function clearMockGlLog(gl: WebGL2RenderingContext) {
  (gl as unknown as MockWebGL2RenderingContext).log = [];
  (gl as unknown as MockWebGL2RenderingContext).ignoreCalls.clear();
}

export function ignoreMockGlCalls(gl: WebGL2RenderingContext, calls: string[]) {
  for (const call of calls) {
    (gl as unknown as MockWebGL2RenderingContext).ignoreCalls.add(call);
  }
}

export function getMockGlLog(gl: WebGL2RenderingContext) {
  return (gl as unknown as MockWebGL2RenderingContext).log;
}


export function mockGlState(gl: WebGL2RenderingContext, state: Partial<GLStateCache>) {
  clearMockGlLog(gl);
  
  const mockGL = (gl as unknown as MockWebGL2RenderingContext)
  vi.spyOn(mockGL, 'isEnabled').mockImplementation((param) => {
    if (param === undefined) throw new Error('bagl: getParameter called with undefined parameter');
    switch (param) {
      case Constants.BLEND: return state.blend ?? false;
      case Constants.DEPTH_TEST: return state.depthTest ?? false;
      case Constants.CULL_FACE: return state.cull ?? false;
      case Constants.STENCIL_TEST: return state.stencilTest ?? false;
      case Constants.SCISSOR_TEST: return state.scissorTest ?? false;
      case Constants.POLYGON_OFFSET_FILL: return state.polygonOffset ?? false;
    }
    return false;
  });

  vi.spyOn(mockGL, 'getParameter').mockImplementation((param) => {
    if (param === undefined) throw new Error('bagl: getParameter called with undefined parameter');
    switch (param) {
      case Constants.VIEWPORT: return [...(state.viewport ?? [0, 0, 0, 0])];
      case Constants.SCISSOR_BOX: return [...(state.scissorBox ?? [0, 0, 0, 0])];
    }
    return 0;
  });
}