// Shader compilation and program management

import type { GLContextState } from './api';
import type { GLSLThunk, Context, ElementsHandle, BufferHandle, GLLimits, CommandDesc, PropValue, AttributeInit, ElementsDescInit } from './types';
import { isTexture2D, isCubeMap, isFramebuffer, isBuffer, isElements, isBaglObject } from './types';

export type AttributeType = 'float' | 'float_vec2' | 'float_vec3' | 'float_vec4' | 'int_vec2' | 'int_vec3' | 'int_vec4';
export type AttributeInfo = { location: number, size: number, element: AttributeType, sizeBytes: number };

export interface CompiledProgram {
  program: WebGLProgram;
  attributes: Map<string, AttributeInfo>;
  uniforms: Map<string, WebGLUniformLocation>;
}

export interface EvaluatedCommandDesc<P> {
  program: CompiledProgram;
  attributes: Record<string, AttributeInit>;
  elements?: ElementsDescInit;
}

export interface CompiledVAO<P> {
  vao: WebGLVertexArrayObject;
  applyAttributes: (gl: WebGL2RenderingContext, evaluatedDesc: EvaluatedCommandDesc<P>) => void;
  dispose: () => void;
}

export function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('bagl: failed to create shader');
  }

  gl.shaderSource(shader, source.trim());
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`bagl: shader compilation failed: ${info}`);
  }

  return shader;
}

export function linkProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('bagl: failed to create program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`bagl: program linking failed: ${info}`);
  }

  return program;
}

export function buildProgram<P>(gl: WebGL2RenderingContext, vert: GLSLThunk<P>, frag: GLSLThunk<P>, props?: P, context?: Context): CompiledProgram {
  const vertexSource = typeof vert === 'string' ? vert : vert(context!, props!);
  const fragmentSource = typeof frag === 'string' ? frag : frag(context!, props!);

  // Add version directive if not present
  const vertexShaderSource = vertexSource.includes('#version') ? vertexSource : `#version 300 es\n${vertexSource}`;
  const fragmentShaderSource = fragmentSource.includes('#version') ? fragmentSource : `#version 300 es\n${fragmentSource}`;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = linkProgram(gl, vertexShader, fragmentShader);

  // Clean up shaders
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  // Extract attribute and uniform information
  const attributes = new Map<string, AttributeInfo>();
  const uniforms = new Map<string, WebGLUniformLocation>();

  const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < numAttributes; i++) {
    const info = gl.getActiveAttrib(program, i);
    if (!info) continue;
    const location = gl.getAttribLocation(program, info.name);
    if (location === -1) continue;

    const size = info.size;
    const element = info.type === gl.FLOAT ? 'float' : info.type === gl.FLOAT_VEC2 ? 'float_vec2' : info.type === gl.FLOAT_VEC3 ? 'float_vec3' : info.type === gl.FLOAT_VEC4 ? 'float_vec4' : info.type === gl.INT_VEC2 ? 'int_vec2' : info.type === gl.INT_VEC3 ? 'int_vec3' : info.type === gl.INT_VEC4 ? 'int_vec4' : 'float';
    let sizeBytes = element === 'float' ? 4 : element === 'float_vec2' ? 8 : element === 'float_vec3' ? 12 : element === 'float_vec4' ? 16 : element === 'int_vec2' ? 8 : element === 'int_vec3' ? 12 : element === 'int_vec4' ? 16 : 4;
    sizeBytes *= size;

    attributes.set(info.name, { location, size, element, sizeBytes });
  }

  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < numUniforms; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) {
      const location = gl.getUniformLocation(program, info.name);
      if (location) {
        uniforms.set(info.name, location);
      }
    }
  }

  return { program, attributes, uniforms };
}

export function compileVAO<P>(gl: WebGL2RenderingContext, program: CompiledProgram, desc: CommandDesc<P>): CompiledVAO<P> {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('bagl: failed to create vertex array object');

  let appliedAttributes: Record<string, AttributeInit> = {};
  let internalBuffers: Record<string, WebGLBuffer> = {};

  // Internal buffers are used when the user provides the data as an array
  // so we need to cache the buffer object and reuse it, and dispose of it later
  function getOrCreateInternalBuffer(name: string): WebGLBuffer {
    if (internalBuffers[name]) return internalBuffers[name];

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error(`bagl: failed to create buffer`);
    internalBuffers[name] = buffer;
    return buffer;
  }

  function toUint16Array(elements: any): Uint16Array {
    if (elements instanceof Uint16Array) return elements;
    if (Array.isArray(elements)) return new Uint16Array(elements);
    throw new Error(`bagl: unsupported elements type: ${typeof elements}`);
  }

  function applyAttributes(gl: WebGL2RenderingContext, evaluatedDesc: EvaluatedCommandDesc<P>): void {

    const { elements, attributes } = evaluatedDesc;

    // Bind element buffer if provided.
    // It is not part of the VAO so we need to always bind it here.
    if (elements) {
      if (isElements(elements)) {
        if (!elements._gpu) throw new Error(`bagl: elements not attached to GPU yet`);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements._gpu);
      } else if (elements instanceof Uint16Array || Array.isArray(elements)) {
        const buffer = getOrCreateInternalBuffer('@elements');
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, toUint16Array(elements), gl.STATIC_DRAW);
      } else if (typeof elements === 'object') {
        const buffer = getOrCreateInternalBuffer('@elements');
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, toUint16Array(elements.data), gl.STATIC_DRAW);
      } else {
        throw new Error(`bagl: unsupported elements type: ${typeof elements}`);
      }
    }

    for (const [name, attr] of Object.entries(attributes)) {
      const location = program.attributes.get(name)!.location;
      
      if (location === undefined) {
        throw new Error(`bagl: attribute '${name}' not found in shader`);
      }

      if (isElements(attr)) throw new Error(`bagl: element buffer '${name}' should not be used as a vertex attribute`);

      if (isBuffer(attr)) {
        // Skip if the buffer has already been applied to this VAO
        if (appliedAttributes[name] === attr) continue;
        
        // It's a vertex buffer handle
        if (!attr._gpu) throw new Error(`bagl: buffer '${name}' not attached to GPU yet`);

        gl.bindBuffer(gl.ARRAY_BUFFER, attr._gpu);
        gl.enableVertexAttribArray(location);
        
        if (!attr.size) throw new Error(`bagl: buffer '${name}' has no size`);
        
        gl.vertexAttribPointer(location, attr.size, gl.FLOAT, false, 0, 0);
        
      } else if (Array.isArray(attr)) {
        // We need size data to be provided, so we can't infer it directly from the array
        throw new Error(`bagl: static arrays are not supported as vertex attributes`);
      } else if (typeof attr === 'object') {
        const buffer = getOrCreateInternalBuffer(name);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, attr.data, gl.STATIC_DRAW);
        
        gl.enableVertexAttribArray(location);
        
        if (!attr.size) throw new Error(`bagl: buffer '${name}' has no size`);
        
        gl.vertexAttribPointer(location, attr.size, gl.FLOAT, false, 0, 0);
      } else {
        throw new Error(`bagl: unsupported attribute type for '${name}': ${typeof attr}`);
      }

      appliedAttributes[name] = attr;
    }
  }
  
  function dispose(): void {
    for (const buffer of Object.values(internalBuffers)) {
      gl.deleteBuffer(buffer);
    }
    internalBuffers = {};
  }
  
  return { vao, applyAttributes, dispose };
}


export function applyUniforms<P>(
  glContextState: GLContextState,
  program: CompiledProgram,
  uniforms: Record<string, any> | undefined,
  props: P,
  context: Context
): void {
  if (!uniforms) return;

  for (const [name, value] of Object.entries(uniforms)) {
    const location = program.uniforms.get(name);
    if (location === undefined) {
      throw new Error(`bagl: uniform '${name}' not found in shader`);
    }

    const finalValue = isBaglObject(value) ? value : typeof value === 'function' ? value(context, props) : value;
    
    setUniform(glContextState, name, location, finalValue);
  }
}

function isTypedArray(value: any): value is Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array {
  return value instanceof Int8Array || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int16Array || value instanceof Uint16Array || value instanceof Int32Array || value instanceof Uint32Array || value instanceof Float32Array || value instanceof Float64Array;
}

function setUniform(
  glContextState: GLContextState,
  name: string,
  location: WebGLUniformLocation,
  value: any
): void {
  const { gl, state } = glContextState;
  if (typeof value === 'number') {
    gl.uniform1f(location, value);
  } else if (typeof value === 'boolean') {
    gl.uniform1i(location, value ? 1 : 0);
  } else if (isTypedArray(value)) {
    const len = value.length;
    const ctor = value.constructor;
    const isInt = ctor === Int32Array || ctor === Uint32Array;

    if (!isInt) {
      if (len === 9) return gl.uniformMatrix3fv(location, false, value as Float32Array);
      if (len === 16) return gl.uniformMatrix4fv(location, false, value as Float32Array);
    }

    const dim = isInt ? 'i' : 'f';
    const func = gl[`uniform${len}${dim}v` as keyof WebGL2RenderingContext] as (location: WebGLUniformLocation, value: any) => void;
    if (func) {
      func(location, value as any);
    } else {
      throw new Error(`bagl: unsupported TypedArray length: ${len}`);
    }

  } else if (Array.isArray(value) && typeof value[0] === 'number') {
    const len = value.length;
    if (len === 2) {
      gl.uniform2f(location, value[0], value[1]);
    } else if (len === 3) {
      gl.uniform3f(location, value[0], value[1], value[2]);
    } else if (len === 4) {
      gl.uniform4f(location, value[0], value[1], value[2], value[3]);
    } else if (len === 9) {
      gl.uniformMatrix3fv(location, false, value);
    } else if (len === 16) {
      gl.uniformMatrix4fv(location, false, value);
    } else {
      throw new Error(`bagl: unsupported uniform array length: ${len}`);
    }
  } else if (Array.isArray(value) && Array.isArray(value[0])) {
    const len = value[0].length;
    const flat = value.flat();
    if (len === 2) {
      gl.uniform2fv(location, flat);
    } else if (len === 3) {
      gl.uniform3fv(location, flat);
    } else if (len === 4) {
      gl.uniform4fv(location, flat);
    } else {
      throw new Error(`bagl: unsupported uniform array length: ${len}`);
    }
  } else if (value) {
    
    if (value instanceof WebGLTexture) {
      const unit = state.bindTexture(value);
      gl.uniform1i(location, unit);
    }
    else if (isTexture2D(value)) {
      if (!value._gpu) { throw new Error(`bagl: texture not attached to GPU yet`); }

      const unit = state.bindTexture(value._gpu);
      gl.uniform1i(location, unit);
    }
    else if (isFramebuffer(value)) {
      const framebufferHandle = value;
      const texture = framebufferHandle.colorTexture(0); // Get first color attachment
      if (!texture) { throw new Error(`bagl: framebuffer has no color texture`); }

      const unit = state.bindTexture(texture._gpu);
      gl.uniform1i(location, unit);
    }
    else if (isCubeMap(value)) {
      const cubemapHandle = value;
      if (!cubemapHandle._gpu) { throw new Error(`bagl: cubemap not attached to GPU yet`); }

      const unit = state.bindTexture(cubemapHandle._gpu);
      gl.uniform1i(location, unit);
    }
    else {
      throw new Error(`bagl: unsupported uniform type: ${typeof value} for ${name}`);
    }
  } else {
    throw new Error(`bagl: unsupported uniform type: ${typeof value} for ${name}`);
  }
}
