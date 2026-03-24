// Resource management with deferred context binding

import type { 
  BufferHandle, ElementsHandle, Texture2DHandle, CubeMapHandle, 
  FramebufferHandle, FramebufferCubeHandle,
  BufferInit, ElementsInit, Tex2DInit, CubeMapInit, FBOInit, FBOCubeInit, 
  TextureType,
  Tex2DData
} from './types';
import type { AttachFn, ContextLifecycle, DetachFn } from './context-life';
import type { InternalState } from './api';
import {
  getBufferTarget, getBufferUsage, getTextureFormat, getTextureInternalFormat,
  getTextureType, getTextureFilter, getTextureWrap
} from './gl-constants';
import { assign2 } from './utils';

export interface ResourceRegistry {
  buffers: Set<BufferHandle>;
  elements: Set<ElementsHandle>;
  textures: Set<Texture2DHandle>;
  cubemaps: Set<CubeMapHandle>;
  framebuffers: Set<FramebufferHandle>;
  framebufferCubes: Set<FramebufferCubeHandle>;
  programs: Set<WebGLProgram>;
  vaos: Set<WebGLVertexArrayObject>;

  addResource(obj: any, set: Set<any>, attach: AttachFn, detach: DetachFn): void;
  removeAndDetachResource(obj: any, set: Set<any>): void;
  destroy(): void;
}

export function createResourceRegistry(context: ContextLifecycle): ResourceRegistry {
  const registry: ResourceRegistry = {
    buffers: new Set(),
    elements: new Set(),
    textures: new Set(),
    cubemaps: new Set(),
    framebuffers: new Set(),
    framebufferCubes: new Set(),
    programs: new Set(),
    vaos: new Set(),

    addResource(obj: any, set: Set<any>, attach: AttachFn, detach: DetachFn): void {
      set.add(obj);
      context.resourceLifecycle(obj, attach, detach);
    },

    removeAndDetachResource(obj: any, set: Set<any>): void {
      set.delete(obj);
      context.resourceDetach(obj);
    },

    destroy(): void {
      registry.buffers.forEach(buffer => buffer.destroy());
      registry.elements.forEach(elements => elements.destroy());
      registry.textures.forEach(texture => texture.destroy());
      registry.cubemaps.forEach(cubemap => cubemap.destroy());
      registry.framebuffers.forEach(fbo => fbo.destroy());
      registry.framebufferCubes.forEach(fboCube => fboCube.destroy());
    }
  };

  // Hook into context lifecycle
  context.onAttach((gl) => {
    // Recreate all GPU resources
    registry.buffers.forEach(context.resourceAttach);
    registry.elements.forEach(context.resourceAttach);
    registry.textures.forEach(context.resourceAttach);
    registry.cubemaps.forEach(context.resourceAttach);
    registry.framebuffers.forEach(context.resourceAttach);
    registry.framebufferCubes.forEach(context.resourceAttach);
  });

  context.onDetach(() => {
    // Destroy all GPU resources
    registry.buffers.forEach(context.resourceDetach);
    registry.elements.forEach(context.resourceDetach);
    registry.textures.forEach(context.resourceDetach);
    registry.cubemaps.forEach(context.resourceDetach);
    registry.framebuffers.forEach(context.resourceDetach);
    registry.framebufferCubes.forEach(context.resourceDetach);
    registry.programs.clear();
    registry.vaos.clear();
  });

  return registry;
}

// Buffer implementation
export function createBuffer(init: BufferInit, registry: ResourceRegistry, context: ContextLifecycle): BufferHandle {
  const backingData = copyToTypedArray(init.data);
  let gpu: WebGLBuffer | null = null;
  let gl: WebGL2RenderingContext | null = null;
  const target = getBufferTarget(init.type ?? 'array');
  const usage = getBufferUsage(init.usage ?? 'static');
  const size = init.size ?? 2; // Default to 2 components

  if (init.type === 'elements') {
    if (!(backingData instanceof Uint16Array)) throw new Error('bagl: elements data must be a Uint16Array');
  }

  function _attach(glContext: WebGL2RenderingContext) {
    gl = glContext;
    gpu = gl.createBuffer();
    
    gl.bindBuffer(target, gpu);
    gl.bufferData(target, backingData, usage);
  }

  function _detach() {
    if (gpu && gl) {
      gl.deleteBuffer(gpu);
    }
    gpu = null;
    gl = null;
  }

  function subdata(data: ArrayBufferView, offset = 0) {
    // Always update the backing data, regardless of GPU context
    updateBackingData(backingData, data, offset);

    // Only update GPU if context is available
    if (gl && gpu) {
      gl.bindBuffer(target, gpu);
      gl.bufferSubData(target, offset, data);
    }
  }

  const registrySet = init.type === 'elements' ? registry.elements : registry.buffers;
  function destroy() {
    registry.removeAndDetachResource(api, registrySet);
  }

  const api: BufferHandle = {
    get baglType() { return init.type === 'elements' ? 'elements' : 'buffer' as any; },
    subdata,
    destroy,
    get data() { return backingData; },
    get size() { return size; },
    get byteLength() { return backingData.byteLength; },
    get _gpu() { return gpu; }
  };

  // Add lifecycle hooks, GPU reference, and size
  registry.addResource(api, registrySet, _attach, _detach);

  return api;
}

// Elements implementation
export function createElements(init: ElementsInit, registry: ResourceRegistry, context: ContextLifecycle): ElementsHandle {
  const buffer = createBuffer({ ...init, type: 'elements' } as BufferInit, registry, context);
  return buffer as unknown as ElementsHandle;
}

let placeholderImageData: ImageData | null = null;
const getOrCreatePlaceholderImageData = () => {
  if (placeholderImageData) return placeholderImageData;
  const data = new Uint8ClampedArray(32 * 32 * 4)
  for (let i = 0; i < 32 * 32; i++) {
    data[i * 4] = 255;
    data[i * 4 + 1] = 0;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  placeholderImageData = { width: 32, height: 32, data, colorSpace: 'srgb' };
  return placeholderImageData;
}

// Texture2D implementation
export function createTexture2D(init: Tex2DInit, internalState: InternalState, registry: ResourceRegistry, context: ContextLifecycle): Texture2DHandle {
  let gpu: WebGLTexture | null = null;
  let gl: WebGL2RenderingContext | null = null;
  const format = getTextureFormat(init.format ?? 'rgba');
  const internalFormat = getTextureInternalFormat(init.internalFormat ?? 'rgba8');
  const type = getTextureType(init.type ?? 'ubyte');
  const min = getTextureFilter(init.min ?? 'linear');
  const mag = getTextureFilter(init.mag ?? 'linear');
  const wrapS = getTextureWrap(init.wrapS ?? 'clamp-to-edge');
  const wrapT = getTextureWrap(init.wrapT ?? 'clamp-to-edge');
  const flipY = init.flipY ?? false;
  const premultiplyAlpha = init.premultiplyAlpha ?? false;
  let isTemporaryTexture = false
  const intrinsicSize = getImageDataSize(init.data);
  let width = init.width ?? intrinsicSize?.[0] ?? 1;
  let height = init.height ?? intrinsicSize?.[1] ?? 1;

  function setupTextureParameters() {
    if (!gl || !gpu) throw new Error('bagl: texture.setupTextureParameters() called when not attached to a context');
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    
    if (!isTemporaryTexture) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY ? 1 : 0);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha ? 1 : 0);
    }

  }


  function uploadTextureData(
    data?: Tex2DData,
    newWidth?: number,
    newHeight?: number
  ) {
    if (!gl || !gpu) throw new Error('bagl: texture.uploadTextureData() called when not attached to a context');

    const targetWidth = newWidth ?? width;
    const targetHeight = newHeight ?? height;

    if (!data) {
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, targetWidth, targetHeight, 0, format, type, null);
    } else if (data instanceof HTMLImageElement || 
        data instanceof HTMLCanvasElement || 
        data instanceof HTMLVideoElement) {

      if (data instanceof HTMLImageElement && !data.complete) {
        throw new Error('bagl: texture.uploadTextureData() called with incomplete image data');
      }
      
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, targetWidth, targetHeight, 0, format, type, data);
    } else if (ArrayBuffer.isView(data)) {
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, targetWidth, targetHeight, 0, format, type, data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, targetWidth, targetHeight, 0, format, type, data);
    }
  }

  // Shared function to handle texture data
  function handleTextureData(
    data?: Tex2DData,
    newWidth?: number,
    newHeight?: number,
    copyFromBuffer = false
  ) {
    if (!gl || !gpu) throw new Error('bagl: texture.handleTextureData() called when not attached to a context');

    const targetWidth = newWidth ?? width;
    const targetHeight = newHeight ?? height;

    if (copyFromBuffer) {
      gl.copyTexImage2D(gl.TEXTURE_2D, 0, internalFormat, 0, 0, targetWidth, targetHeight, 0);
      return
    }
     
    if (data instanceof HTMLImageElement && !data.complete) {
      handleIncompleteImage(data);
      return
    }

    uploadTextureData(data, targetWidth, targetHeight);
  }

  function handleIncompleteImage(img: HTMLImageElement) {
    const placeholderImageData = getOrCreatePlaceholderImageData();
    uploadTextureData(placeholderImageData, placeholderImageData.width, placeholderImageData.height);

    img.addEventListener('load', () => {
      if (!gl || !gpu) return;

      isTemporaryTexture = false
      
      // Update dimensions and re-upload the actual image data
      width = img.width;
      height = img.height;

      const { state } = internalState.glContextState!;

      state.storeCurrentTexture();
      gl.bindTexture(gl.TEXTURE_2D, gpu);
      setupTextureParameters();
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, type, img);
      state.restoreCurrentTexture();
    }, { once: true });
  }

  function _attach(glContext: WebGL2RenderingContext) {
    gl = glContext;
    gpu = gl.createTexture();
    const { state } = internalState.glContextState!;

    isTemporaryTexture = init.data instanceof HTMLImageElement && !init.data.complete;

    state.storeCurrentTexture();
    gl.bindTexture(gl.TEXTURE_2D, gpu);
    
    setupTextureParameters();
    handleTextureData(init.data, width, height);
    state.restoreCurrentTexture();
  }

  function _detach() {
    if (gpu && gl) {
      gl.deleteTexture(gpu);
    }
    gpu = null;
    gl = null;
  }

  function subdata(data: ArrayBufferView, x = 0, y = 0, w = width, h = height) {
    if (!gl || !gpu) {
      throw new Error('bagl: texture.subdata() called when not attached to a context');
    }
    gl.bindTexture(gl.TEXTURE_2D, gpu);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, w, h, format, type, data);
  }

  function resize(w: number, h: number) {
    width = w;
    height = h;
    if (gl && gpu) {
      gl.bindTexture(gl.TEXTURE_2D, gpu);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);
    }
  }

  function destroy() {
    registry.removeAndDetachResource(api, registry.textures);
  }

  function getImageDataSize(data: Tex2DData | undefined): [number, number] | undefined {
    if (!data) return undefined;
    if (data instanceof HTMLImageElement || 
        data instanceof HTMLCanvasElement || 
        data instanceof HTMLVideoElement) {
      return [data.width, data.height];
    } else if ('width' in data) {
      // ImageBitmap | ImageData | OffscreenCanvas
      return [data.width, data.height];
    } else if ('codedWidth' in data) {
      // VideoFrame
      return [data.codedWidth, data.codedHeight];
    }
  }

  function textureUpdater(props: Tex2DInit) {
    if (!gl || !gpu) {
      throw new Error('bagl: texture.update() called when not attached to a context');
    }

    const intrinsicSize = getImageDataSize(props.data);
    const newWidth = props.width ?? intrinsicSize?.[0] ?? width;
    const newHeight = props.height ?? intrinsicSize?.[1] ?? height;
    
    if (newWidth <= 0 || newHeight <= 0) {
      throw new Error('bagl: texture dimensions must be positive');
    }

    width = newWidth;
    height = newHeight;

    const { state } = internalState.glContextState!;

    state.storeCurrentTexture();
    gl.bindTexture(gl.TEXTURE_2D, gpu);
    handleTextureData(props.data, width, height, props.copyFromBuffer ?? false);
    state.restoreCurrentTexture();
  }

  function readPixels(x: number, y: number, w: number, h: number): Uint8Array {
    if (!gl || !gpu) throw new Error('bagl: texture.readPixels() called when not attached to a context');
    const data = new Uint8Array(w * h * 4);
    // TODO: implement this
    // gl.bindTexture(gl.TEXTURE_2D, gpu);
    // gl.readPixels(x, y, w, h, format, type, data);
    return data;
  }

  const api: Texture2DHandle = assign2(textureUpdater, {
    get baglType() { return 'texture2d' as const; },
    subdata,
    resize,
    destroy,
    readPixels,
    get width() { return width; },
    get height() { return height; },
    get _gpu() { return gpu; }
  })

  registry.addResource(api, registry.textures, _attach, _detach);

  return api;
}

// CubeMap implementation
export function createCubeMap(init: CubeMapInit, registry: ResourceRegistry, context: ContextLifecycle): CubeMapHandle {
  let gpu: WebGLTexture | null = null;
  let gl: WebGL2RenderingContext | null = null;
  let size = init.size ?? 1;
  const format = getTextureFormat(init.format ?? 'rgba');
  const internalFormat = getTextureInternalFormat(init.internalFormat ?? 'rgba8');
  const type = getTextureType(init.type ?? 'ubyte');
  const min = getTextureFilter(init.min ?? 'linear');
  const mag = getTextureFilter(init.mag ?? 'linear');
  const wrapS = getTextureWrap(init.wrapS ?? 'clamp-to-edge');
  const wrapT = getTextureWrap(init.wrapT ?? 'clamp-to-edge');
  const wrapR = getTextureWrap(init.wrapR ?? 'clamp-to-edge');

  function _attach(glContext: WebGL2RenderingContext) {
    gl = glContext;
    gpu = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, gpu);
    
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, mag);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, wrapT);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, wrapR);

    if (init.data) {
      if (init.data instanceof HTMLImageElement || 
          init.data instanceof HTMLCanvasElement || 
          init.data instanceof HTMLVideoElement) {
        for (let face = 0; face < 6; face++) {
          gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, 0, internalFormat, format, type, init.data);
        }
        size = init.data.width;
      } else {
        for (let face = 0; face < 6; face++) {
          gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, 0, internalFormat, size, size, 0, format, type, init.data);
        }
      }
    } else {
      for (let face = 0; face < 6; face++) {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, 0, internalFormat, size, size, 0, format, type, null);
      }
    }
  }

  function _detach() {
    if (gpu && gl) {
      gl.deleteTexture(gpu);
    }
    gpu = null;
    gl = null;
  }

  function subdata(data: ArrayBufferView, face = 0, x = 0, y = 0, w = size, h = size) {
    if (!gl || !gpu) {
      throw new Error('bagl: cubemap.subdata() called when not attached to a context');
    }
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, gpu);
    gl.texSubImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, 0, x, y, w, h, format, type, data);
  }

  function resize(s: number) {
    size = s;
    if (gl && gpu) {
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, gpu);
      for (let face = 0; face < 6; face++) {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, 0, internalFormat, size, size, 0, format, type, null);
      }
    }
  }

  function destroy() {
    registry.removeAndDetachResource(api, registry.cubemaps);
  }

  const api: CubeMapHandle = {
    get baglType() { return 'cubemap' as const; },
    subdata,
    resize,
    destroy,
    get size() { return size; },
    get _gpu() { return gpu; }
  };

  registry.addResource(api, registry.cubemaps, _attach, _detach);

  return api;
}

// Framebuffer implementation
export function createFramebuffer(init: FBOInit = {}, internalState: InternalState, registry: ResourceRegistry, context: ContextLifecycle): FramebufferHandle {
  let gpu: WebGLFramebuffer | null = null;
  let gl: WebGL2RenderingContext | null = null;
  let width = init.width ?? 256;
  let height = init.height ?? 256;
  const colorAttachments = init.color ?? 1;
  const hasDepth = init.depth ?? false;
  const hasStencil = init.stencil ?? false;
  const format = init.format ?? 'rgba'
  const internalFormat = init.internalFormat ?? 'rgba8'
  const type = init.type ?? 'ubyte'
  
  let colorTextures: Texture2DHandle[] = [];
  let depthStencilTexture: Texture2DHandle | null = null;

  for (let i = 0; i < colorAttachments; i++) {
    const colorTexture = createTexture2D({ width, height, format, internalFormat, type }, internalState, registry, context);
    colorTextures.push(colorTexture);
  }

  if (hasDepth || hasStencil) {
    const internalFormat = hasDepth && hasStencil ? 'depth24-stencil8' : 'depth24';
    const format = hasDepth && hasStencil ? 'depth-stencil' : 'depth';
    const type: TextureType = hasDepth && hasStencil ? 'uint-24-8' : 'uint';

    depthStencilTexture = createTexture2D({ width, height, format, internalFormat, type }, internalState, registry, context);
  }


  function _attach(glContext: WebGL2RenderingContext) {
    gl = glContext;
    
    // Check for floating-point support
    const hasFloatSupport = gl.getExtension('EXT_color_buffer_float') || gl.getExtension('OES_texture_float');
    
    // If we requested floating-point but don't have support, throw an error
    if ((internalFormat === 'rgba32f' || internalFormat === 'rgb32f' || internalFormat === 'rgba16f' || internalFormat === 'rgb16f') && !hasFloatSupport) {
      throw new Error('bagl: Floating-point framebuffer not supported');
    }
    
    const { state } = internalState.glContextState!;
    state.storeCurrentTexture();
    
    gpu = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, gpu);

    // Create color attachments
    const drawBuffers: number[] = [];
    for (let i = 0; i < colorAttachments; i++) {
      const colorTexture = colorTextures[i];
      gl.bindTexture(gl.TEXTURE_2D, colorTexture._gpu);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, colorTexture._gpu, 0);
      drawBuffers.push(gl.COLOR_ATTACHMENT0 + i);
    }

    // Defines the draw buffers for the current framebuffer
    if (drawBuffers.length > 0) {
      gl.drawBuffers(drawBuffers);
    }

    // Create depth/stencil attachment
    if (hasDepth || hasStencil) {
      if (!depthStencilTexture) throw new Error('bagl: depth/stencil texture not found');
      
      gl.bindTexture(gl.TEXTURE_2D, depthStencilTexture._gpu);
      
      if (hasDepth) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthStencilTexture._gpu, 0);
      }
      if (hasStencil) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.TEXTURE_2D, depthStencilTexture._gpu, 0);
      }
    }

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      // TODO: convert status code to string
      throw new Error(`bagl: framebuffer incomplete: ${status}`);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    state.restoreCurrentTexture();
  }

  function _detach() {
    if (gpu && gl) {
      gl.deleteFramebuffer(gpu);
      // Textures will be detatched by the registry
    }
    gpu = null;
    gl = null;
  }

  function resize(w: number, h: number) {
    width = w;
    height = h;
    colorTextures.forEach(texture => texture.resize(w, h));
    if (depthStencilTexture) depthStencilTexture.resize(w, h);
  }

  function destroy() {
    registry.removeAndDetachResource(api, registry.framebuffers);
    colorTextures.forEach(texture => texture.destroy());
    if (depthStencilTexture) depthStencilTexture.destroy();
  }

  function colorTexture(index = 0): Texture2DHandle | null {
    return index < colorTextures.length ? colorTextures[index] : null;
  }

  const api: FramebufferHandle = {
    get baglType() { return 'framebuffer' as const; },
    resize,
    destroy,
    colorTexture,
    get width() { return width; },
    get height() { return height; },
    get _gpu() { return gpu; }
  };

  registry.addResource(api, registry.framebuffers, _attach, _detach);

  return api;
}

// FramebufferCube implementation
export function createFramebufferCube(init: FBOCubeInit = {}, registry: ResourceRegistry, context: ContextLifecycle): FramebufferCubeHandle {
  let gpu: WebGLFramebuffer | null = null;
  let gl: WebGL2RenderingContext | null = null;
  let size = init.size ?? 256;
  const colorAttachments = init.color ?? 1;
  const hasDepth = init.depth ?? false;
  const hasStencil = init.stencil ?? false;

  function _attach(glContext: WebGL2RenderingContext) {
    gl = glContext;
    gpu = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, gpu);

    // Create color attachments
    const drawBuffers: number[] = [];
    for (let i = 0; i < colorAttachments; i++) {
      const colorTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, colorTexture);
      for (let face = 0; face < 6; face++) {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_CUBE_MAP, colorTexture, 0);
      drawBuffers.push(gl.COLOR_ATTACHMENT0 + i);
    }

    if (drawBuffers.length > 0) {
      gl.drawBuffers(drawBuffers);
    }

    // Create depth/stencil attachment
    if (hasDepth || hasStencil) {
      const depthStencilTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, depthStencilTexture);
      const internalFormat = hasDepth && hasStencil ? gl.DEPTH24_STENCIL8 : gl.DEPTH_COMPONENT24;
      const format = hasDepth && hasStencil ? gl.DEPTH_STENCIL : gl.DEPTH_COMPONENT;
      const type = hasDepth && hasStencil ? gl.UNSIGNED_INT_24_8 : gl.UNSIGNED_INT;
      
      for (let face = 0; face < 6; face++) {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, 0, internalFormat, size, size, 0, format, type, null);
      }
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      
      if (hasDepth) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_CUBE_MAP, depthStencilTexture, 0);
      }
      if (hasStencil) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.TEXTURE_CUBE_MAP, depthStencilTexture, 0);
      }
    }

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`bagl: framebuffer cube incomplete: ${status}`);
    }
  }

  function _detach() {
    if (gpu && gl) {
      gl.deleteFramebuffer(gpu);
    }
    gpu = null;
    gl = null;
  }

  function resize(s: number) {
    size = s;
    if (gl && gpu) {
      _detach();
      _attach(gl);
    }
  }

  function destroy() {
    registry.removeAndDetachResource(api, registry.framebufferCubes);
  }

  const api: FramebufferCubeHandle = {
    get baglType() { return 'framebufferCube' as const; },
    resize,
    destroy,
    get size() { return size; },
    get _gpu() { return gpu; }
  };

  registry.addResource(api, registry.framebufferCubes, _attach, _detach);

  return api;
}

// Utility functions
function copyToTypedArray(data: ArrayBufferView): ArrayBufferView {
  if (data instanceof Float32Array || 
      data instanceof Int32Array || 
      data instanceof Uint32Array || 
      data instanceof Int16Array || 
      data instanceof Uint16Array || 
      data instanceof Int8Array || 
      data instanceof Uint8Array) {
    return new (data.constructor as any)(data);
  }
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function updateBackingData(backing: ArrayBufferView, data: ArrayBufferView, offset: number): void {
  const dest = new Uint8Array(backing.buffer, backing.byteOffset, backing.byteLength);
  const src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  dest.set(src, offset);
} 