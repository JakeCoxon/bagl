import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createResourceRegistry, createBuffer, createElements, createTexture2D, createFramebuffer } from '../src/resources';
import { createContextLifecycle } from '../src/context-life';
import { createBaglInternalState, createStateManagerFactory } from '../src/api';
import { BufferHandle, BufferInit, FBOInit, FramebufferHandle, Tex2DInit, Texture2DHandle } from '../src/types';
import { clearMockGlLog, getMockGlLog, ignoreMockGlCalls, mockGlState } from './mock';

describe('ResourceRegistry', () => {
  let registry: ReturnType<typeof createResourceRegistry>;
  let context: ReturnType<typeof createContextLifecycle>;
  let mockGL: WebGL2RenderingContext;
  let internalState: ReturnType<typeof createBaglInternalState>;

  beforeEach(() => {
    internalState = createBaglInternalState();
    context = createContextLifecycle(internalState);
    registry = createResourceRegistry(context);
    const canvas = document.createElement('canvas');
    mockGL = canvas.getContext('webgl2')!;
  });

  const createFramebuffer_ = (init: FBOInit = {}): FramebufferHandle => {
    return createFramebuffer(init, internalState, registry, context);
  }

  const createTexture2D_ = (init: Tex2DInit): Texture2DHandle => {
    return createTexture2D(init, internalState, registry, context);
  }

  const createBuffer_ = (init: BufferInit): BufferHandle => {
    return createBuffer(init, registry, context);
  }

  describe('initial state', () => {
    it('should have empty resource sets', () => {
      expect(registry.buffers.size).toBe(0);
      expect(registry.elements.size).toBe(0);
      expect(registry.textures.size).toBe(0);
      expect(registry.cubemaps.size).toBe(0);
      expect(registry.framebuffers.size).toBe(0);
      expect(registry.framebufferCubes.size).toBe(0);
      expect(registry.programs.size).toBe(0);
      expect(registry.vaos.size).toBe(0);
    });
  });

  describe('context lifecycle hooks', () => {
    it('should attach resources when context is attached', () => {
      const buffer = createBuffer_({
        data: new Float32Array([1, 2, 3, 4]),
        size: 2
      });

      const attachSpy = vi.spyOn(buffer as any, '_attach');
      
      context.attach(mockGL);
      
      expect(attachSpy).toHaveBeenCalledWith(mockGL);
    });

    it('should detach resources when context is detached', () => {
      const buffer = createBuffer_({
        data: new Float32Array([1, 2, 3, 4]),
        size: 2
      });

      context.attach(mockGL);
      const detachSpy = vi.spyOn(buffer as any, '_detach');
      
      context.detach();
      
      expect(detachSpy).toHaveBeenCalled();
    });
  });
});

describe('Buffer', () => {
  let context: ReturnType<typeof createContextLifecycle>;
  let registry: ReturnType<typeof createResourceRegistry>;
  let mockGL: WebGL2RenderingContext;

  const createBuffer_ = (init: BufferInit): BufferHandle => {
    return createBuffer(init, registry, context);
  }

  beforeEach(() => {
    const internalState = createBaglInternalState();
    context = createContextLifecycle(internalState);
    createStateManagerFactory(internalState, {});
    registry = createResourceRegistry(context);
    const canvas = document.createElement('canvas');
    mockGL = canvas.getContext('webgl2')!;
    mockGlState(mockGL, {});
  });

  describe('creation', () => {
    it('should create buffer with default options', () => {
      const buffer = createBuffer_({
        data: new Float32Array([1, 2, 3, 4])
      });

      expect(buffer.baglType).toBe('buffer');
      expect(buffer.size).toBe(2); // Default size
      expect(buffer.byteLength).toBe(16); // 4 floats * 4 bytes
      expect(registry.buffers.has(buffer)).toBe(true);
    });

    it('should create buffer with custom options', () => {
      const buffer = createBuffer_({
        data: new Float32Array([1, 2, 3, 4, 5, 6]),
        size: 3,
        type: 'array',
        usage: 'dynamic'
      });

      expect(buffer.size).toBe(3);
      expect(buffer.byteLength).toBe(24); // 6 floats * 4 bytes
    });

    it('should create buffer immediately if context is attached', () => {
      context.attach(mockGL);
      
      const createBufferSpy = vi.spyOn(mockGL, 'createBuffer');
      const bufferDataSpy = vi.spyOn(mockGL, 'bufferData');
      
      const buffer = createBuffer_({
        data: new Float32Array([1, 2, 3, 4])
      });

      expect(createBufferSpy).toHaveBeenCalled();
      expect(bufferDataSpy).toHaveBeenCalled();
    });
  });

  describe('subdata', () => {
    it('should update buffer data', () => {
      const buffer = createBuffer({
        data: new Float32Array([1, 2, 3, 4])
      }, registry, context);

      context.attach(mockGL);
      
      const bufferSubDataSpy = vi.spyOn(mockGL, 'bufferSubData');
      
      buffer.subdata(new Float32Array([5, 6, 7, 8]));
      
      expect(bufferSubDataSpy).toHaveBeenCalled();
    });

    it('should update buffer data with offset', () => {
      const buffer = createBuffer({
        data: new Float32Array([1, 2, 3, 4, 5, 6])
      }, registry, context);

      context.attach(mockGL);
      
      const bufferSubDataSpy = vi.spyOn(mockGL, 'bufferSubData');
      
      buffer.subdata(new Float32Array([9, 10]), 8); // Offset by 2 floats
      
      expect(bufferSubDataSpy).toHaveBeenCalledWith(mockGL.ARRAY_BUFFER, 8, new Float32Array([9, 10]));
    });
  });

  describe('destroy', () => {
    it('should remove buffer from registry and detach', () => {
      const buffer = createBuffer({
        data: new Float32Array([1, 2, 3, 4])
      }, registry, context);

      context.attach(mockGL);
      
      const deleteBufferSpy = vi.spyOn(mockGL, 'deleteBuffer');
      const detachSpy = vi.spyOn(buffer as any, '_detach');
      
      buffer.destroy();
      
      expect(registry.buffers.has(buffer)).toBe(false);
      expect(detachSpy).toHaveBeenCalled();
      expect(deleteBufferSpy).toHaveBeenCalled();
    });
  });
});

describe('Elements', () => {
  let context: ReturnType<typeof createContextLifecycle>;
  let registry: ReturnType<typeof createResourceRegistry>;
  let mockGL: WebGL2RenderingContext;

  beforeEach(() => {
    const internalState = createBaglInternalState();
    context = createContextLifecycle(internalState);
    registry = createResourceRegistry(context);
    const canvas = document.createElement('canvas');
    mockGL = canvas.getContext('webgl2')!;
  });

  describe('creation', () => {
    it('should create elements buffer', () => {
      const elements = createElements({
        data: new Uint16Array([0, 1, 2])
      }, registry, context);

      expect(elements.baglType).toBe('elements');
      expect(registry.elements.has(elements)).toBe(true);
    });

    it('should create elements with custom usage', () => {
      const elements = createElements({
        data: new Uint16Array([0, 1, 2]),
        usage: 'dynamic'
      }, registry, context);

      expect(elements.byteLength).toBe(6); // 3 shorts * 2 bytes
    });
  });
});

describe('Texture2D', () => {
  let context: ReturnType<typeof createContextLifecycle>;
  let registry: ReturnType<typeof createResourceRegistry>;
  let mockGL: WebGL2RenderingContext;
  let internalState: ReturnType<typeof createBaglInternalState>;

  const createTexture2D_ = (init: Tex2DInit): Texture2DHandle => {
    return createTexture2D(init, internalState, registry, context);
  }

  beforeEach(() => {
    internalState = createBaglInternalState();
    context = createContextLifecycle(internalState);
    createStateManagerFactory(internalState, {});
    registry = createResourceRegistry(context);
    const canvas = document.createElement('canvas');
    mockGL = canvas.getContext('webgl2')!;
    mockGlState(mockGL, {});
  });

  describe('creation', () => {
    it('should create texture with default options', () => {
      const texture = createTexture2D_({
        width: 64,
        height: 64
      });

      expect(texture.baglType).toBe('texture2d');
      expect(texture.width).toBe(64);
      expect(texture.height).toBe(64);
      expect(registry.textures.has(texture)).toBe(true);
    });

    it('should create texture with custom options', () => {
      const texture = createTexture2D_({
        width: 128,
        height: 128,
        format: 'rgb',
        internalFormat: 'rgb8',
        type: 'ubyte',
        min: 'nearest',
        mag: 'linear',
        wrapS: 'repeat',
        wrapT: 'clamp-to-edge',
        flipY: true,
        premultiplyAlpha: true
      });

      expect(texture.width).toBe(128);
      expect(texture.height).toBe(128);
    });

    it('should create texture with data', () => {
      const data = new Uint8Array(64 * 64 * 4); // RGBA data
      const texture = createTexture2D_({
        width: 64,
        height: 64,
        data
      });

      expect(texture.width).toBe(64);
      expect(texture.height).toBe(64);
    });

    it('should create texture sized from canvas image data when width and height are omitted', () => {
      const source = document.createElement('canvas');
      source.width = 12;
      source.height = 34;
      const texture = createTexture2D_({
        data: source
      });

      context.attach(mockGL);

      expect(texture.width).toBe(12);
      expect(texture.height).toBe(34);
    });

    it('should create texture sized from source image data when width and height are omitted', () => {
      const imageData = {
        width: 12,
        height: 34,
        data: new Uint8ClampedArray(12 * 34 * 4),
        colorSpace: 'srgb'
      } satisfies ImageData;
      
      const texture = createTexture2D_({
        data: imageData
      });

      context.attach(mockGL);

      expect(texture.width).toBe(12);
      expect(texture.height).toBe(34);
    });

    it('should update texture size when an initially-unloaded image becomes loaded', () => {
      const image = Object.create(HTMLImageElement.prototype) as HTMLImageElement;
      Object.defineProperty(image, 'complete', { value: false, writable: true, configurable: true });
      Object.defineProperty(image, 'width', { value: 0, writable: true, configurable: true });
      Object.defineProperty(image, 'height', { value: 0, writable: true, configurable: true });
      let onLoad: ((event: Event) => void) | undefined;
      (image as any).addEventListener = (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'load' && typeof listener === 'function') {
          onLoad = listener as (event: Event) => void;
        }
      };
      const texImage2DSpy = vi.spyOn(mockGL, 'texImage2D');
      const texture = createTexture2D_({
        data: image
      });
      context.attach(mockGL);
      expect(texture._gpu).not.toBeNull();
      image.width = 21;
      image.height = 13;
      (image as any).complete = true;
      onLoad?.(new Event('load'));
      expect(texture.width).toBe(21);
      expect(texture.height).toBe(13);
      expect(texImage2DSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('subdata', () => {
    it('should update texture data', () => {
      const texture = createTexture2D_({
        width: 64,
        height: 64
      });

      context.attach(mockGL);
      
      const texSubImage2DSpy = vi.spyOn(mockGL, 'texSubImage2D');
      
      const data = new Uint8Array(32 * 32 * 4);
      texture.subdata(data, 16, 16, 32, 32);
      
      expect(texSubImage2DSpy).toHaveBeenCalled();
    });

    it('should throw error when not attached', () => {
      const texture = createTexture2D_({
        width: 64,
        height: 64
      });

      const data = new Uint8Array(64 * 64 * 4);
      
      expect(() => texture.subdata(data)).toThrow('bagl: texture.subdata() called when not attached to a context');
    });
  });

  describe('resize', () => {
    it('should resize texture', () => {
      const texture = createTexture2D_({
        width: 64,
        height: 64
      });

      context.attach(mockGL);
      
      const texImage2DSpy = vi.spyOn(mockGL, 'texImage2D');
      
      texture.resize(128, 128);
      
      expect(texture.width).toBe(128);
      expect(texture.height).toBe(128);
      expect(texImage2DSpy).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should remove texture from registry and detach', () => {
      const texture = createTexture2D_({
        width: 64,
        height: 64
      });

      context.attach(mockGL);
      
      const deleteTextureSpy = vi.spyOn(mockGL, 'deleteTexture');
      const detachSpy = vi.spyOn(texture as any, '_detach');
      
      texture.destroy();
      
      expect(registry.textures.has(texture)).toBe(false);
      expect(detachSpy).toHaveBeenCalled();
      expect(deleteTextureSpy).toHaveBeenCalled();
    });
  });
});

describe('Framebuffer', () => {
  let context: ReturnType<typeof createContextLifecycle>;
  let registry: ReturnType<typeof createResourceRegistry>;
  let mockGL: WebGL2RenderingContext;
  let internalState: ReturnType<typeof createBaglInternalState>;

  const createFramebuffer_ = (init: FBOInit = {}): FramebufferHandle => {
    return createFramebuffer(init, internalState, registry, context);
  }

  beforeEach(() => {
    internalState = createBaglInternalState();
    context = createContextLifecycle(internalState);
    createStateManagerFactory(internalState, {});
    registry = createResourceRegistry(context);
    const canvas = document.createElement('canvas');
    mockGL = canvas.getContext('webgl2')!;
    mockGlState(mockGL, {});
    ignoreMockGlCalls(mockGL, ['getExtension', 'getSupportedExtensions', 'getParameter']);
  });

  describe('creation', () => {
    it('should create framebuffer with default options', () => {
      const framebuffer = createFramebuffer_({});

      expect(framebuffer.baglType).toBe('framebuffer');
      expect(framebuffer.width).toBe(256); // Default width
      expect(framebuffer.height).toBe(256); // Default height
      expect(registry.framebuffers.has(framebuffer)).toBe(true);
    });

    it('should create framebuffer with custom options', () => {
      const framebuffer = createFramebuffer_({
        width: 800,
        height: 600,
        color: 2, // Multiple color attachments
        depth: true,
        stencil: true
      });

      expect(framebuffer.width).toBe(800);
      expect(framebuffer.height).toBe(600);
    });

    it('should create framebuffer with 8-bit format', () => {
      const framebuffer = createFramebuffer_({
        width: 512,
        height: 512,
        format: 'rgba',
        internalFormat: 'rgba8',
        type: 'ubyte'
      });

      const createFramebufferSpy = vi.spyOn(mockGL, 'createFramebuffer');
      const createTextureSpy = vi.spyOn(mockGL, 'createTexture');
      const texImage2DSpy = vi.spyOn(mockGL, 'texImage2D');
      const framebufferTexture2DSpy = vi.spyOn(mockGL, 'framebufferTexture2D');
      const checkFramebufferStatusSpy = vi.spyOn(mockGL, 'checkFramebufferStatus');
      
      // Trigger attachment
      context.attach(mockGL);
      
      expect(createFramebufferSpy).toHaveBeenCalled();
      expect(createTextureSpy).toHaveBeenCalled();
      expect(texImage2DSpy).toHaveBeenCalledWith(
        mockGL.TEXTURE_2D, 0, mockGL.RGBA8, 512, 512, 0, mockGL.RGBA, mockGL.UNSIGNED_BYTE, null
      );
      expect(framebufferTexture2DSpy).toHaveBeenCalledWith(
        mockGL.FRAMEBUFFER, mockGL.COLOR_ATTACHMENT0, mockGL.TEXTURE_2D, expect.any(Object), 0
      );
      expect(checkFramebufferStatusSpy).toHaveBeenCalledWith(mockGL.FRAMEBUFFER);
    });

    it('should create framebuffer with floating-point format when supported', () => {
      // Mock floating-point extension support
      vi.spyOn(mockGL, 'getExtension').mockImplementation((name) => {
        if (name === 'EXT_color_buffer_float') {
          return {} as any;
        }
        return null;
      });

      const framebuffer = createFramebuffer_({
        width: 512,
        height: 512,
        internalFormat: 'rgba16f',
        type: 'float'
      });

      const texImage2DSpy = vi.spyOn(mockGL, 'texImage2D');
      
      // Trigger attachment
      context.attach(mockGL);
      
      expect(texImage2DSpy).toHaveBeenCalledWith(
        mockGL.TEXTURE_2D, 0, mockGL.RGBA16F, 512, 512, 0, mockGL.RGBA, mockGL.FLOAT, null
      );
    });

    it('should error when floating-point not supported', () => {
      // Mock no floating-point extension support
      vi.spyOn(mockGL, 'getExtension').mockReturnValue(null);
      
      const framebuffer = createFramebuffer_({
        width: 512,
        height: 512,
        internalFormat: 'rgba16f',
        type: 'float'
      });

      expect(() => context.attach(mockGL)).toThrow('bagl: Floating-point framebuffer not supported');
    });

    it('should create multiple color attachments', () => {
      const framebuffer = createFramebuffer_({
        width: 256,
        height: 256,
        color: 3 // 3 color attachments
      });

      const createTextureSpy = vi.spyOn(mockGL, 'createTexture');
      const framebufferTexture2DSpy = vi.spyOn(mockGL, 'framebufferTexture2D');
      const drawBuffersSpy = vi.spyOn(mockGL, 'drawBuffers');
      
      // Trigger attachment
      context.attach(mockGL);
      
      expect(createTextureSpy).toHaveBeenCalledTimes(3);
      expect(framebufferTexture2DSpy).toHaveBeenCalledTimes(3);
      expect(drawBuffersSpy).toHaveBeenCalledWith([
        mockGL.COLOR_ATTACHMENT0,
        mockGL.COLOR_ATTACHMENT1,
        mockGL.COLOR_ATTACHMENT2
      ]);
    });

    it('should create depth attachment', () => {
      const framebuffer = createFramebuffer_({
        width: 256,
        height: 256,
        depth: true
      });

      const createTextureSpy = vi.spyOn(mockGL, 'createTexture');
      const framebufferTexture2DSpy = vi.spyOn(mockGL, 'framebufferTexture2D');
      const texImage2DSpy = vi.spyOn(mockGL, 'texImage2D');
      
      // Trigger attachment
      context.attach(mockGL);
      
      expect(createTextureSpy).toHaveBeenCalledTimes(2); // Color + depth
      expect(framebufferTexture2DSpy).toHaveBeenCalledWith(
        mockGL.FRAMEBUFFER, mockGL.DEPTH_ATTACHMENT, mockGL.TEXTURE_2D, expect.any(Object), 0
      );
      expect(texImage2DSpy).toHaveBeenCalledWith(
        mockGL.TEXTURE_2D, 0, mockGL.DEPTH_COMPONENT24, 256, 256, 0, mockGL.DEPTH_COMPONENT, mockGL.UNSIGNED_INT, null
      );
    });

    it('should create depth-stencil attachment', () => {
      const framebuffer = createFramebuffer_({
        width: 256,
        height: 256,
        depth: true,
        stencil: true
      });

      
      // Trigger attachment
      context.attach(mockGL);

      expect(getMockGlLog(mockGL)).toEqual([
        ['createTexture'],
        ['bindTexture', mockGL.TEXTURE_2D, expect.any(Object)],
        ['texParameteri', mockGL.TEXTURE_2D, mockGL.TEXTURE_MIN_FILTER, mockGL.LINEAR],
        ['texParameteri', mockGL.TEXTURE_2D, mockGL.TEXTURE_MAG_FILTER, mockGL.LINEAR],
        ['texParameteri', mockGL.TEXTURE_2D, mockGL.TEXTURE_WRAP_S, mockGL.CLAMP_TO_EDGE],
        ['texParameteri', mockGL.TEXTURE_2D, mockGL.TEXTURE_WRAP_T, mockGL.CLAMP_TO_EDGE],
        ['pixelStorei', mockGL.UNPACK_FLIP_Y_WEBGL, 0],
        ['pixelStorei', mockGL.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0],
        ['texImage2D', mockGL.TEXTURE_2D, 0, mockGL.RGBA8, 256, 256, 0, mockGL.RGBA, mockGL.UNSIGNED_BYTE, null],
        ['bindTexture', mockGL.TEXTURE_2D, expect.any(Object)],
        ['createTexture'],
        ['bindTexture', mockGL.TEXTURE_2D, expect.any(Object)],
        ['texParameteri', mockGL.TEXTURE_2D, mockGL.TEXTURE_MIN_FILTER, mockGL.LINEAR],
        ['texParameteri', mockGL.TEXTURE_2D, mockGL.TEXTURE_MAG_FILTER, mockGL.LINEAR],
        ['texParameteri', mockGL.TEXTURE_2D, mockGL.TEXTURE_WRAP_S, mockGL.CLAMP_TO_EDGE],
        ['texParameteri', mockGL.TEXTURE_2D, mockGL.TEXTURE_WRAP_T, mockGL.CLAMP_TO_EDGE],
        ['pixelStorei', mockGL.UNPACK_FLIP_Y_WEBGL, 0],
        ['pixelStorei', mockGL.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0],
        ['texImage2D', mockGL.TEXTURE_2D, 0, mockGL.DEPTH24_STENCIL8, 256, 256, 0, mockGL.DEPTH_STENCIL, mockGL.UNSIGNED_INT_24_8, null],
        ['bindTexture', mockGL.TEXTURE_2D, expect.any(Object)],
        ['createFramebuffer'],
        ['bindFramebuffer', mockGL.FRAMEBUFFER, expect.any(Object)],
        ['bindTexture', mockGL.TEXTURE_2D, expect.any(Object)],
        ['framebufferTexture2D', mockGL.FRAMEBUFFER, mockGL.COLOR_ATTACHMENT0, mockGL.TEXTURE_2D, expect.any(Object), 0],
        ['drawBuffers', [mockGL.COLOR_ATTACHMENT0]],
        ['bindTexture', mockGL.TEXTURE_2D, expect.any(Object)],
        ['framebufferTexture2D', mockGL.FRAMEBUFFER, mockGL.DEPTH_ATTACHMENT, mockGL.TEXTURE_2D, expect.any(Object), 0],
        ['framebufferTexture2D', mockGL.FRAMEBUFFER, mockGL.STENCIL_ATTACHMENT, mockGL.TEXTURE_2D, expect.any(Object), 0],
        ['checkFramebufferStatus', mockGL.FRAMEBUFFER],
        ['bindFramebuffer', mockGL.FRAMEBUFFER, null],
        ['bindTexture', mockGL.TEXTURE_2D, null],
      ]);
      
    });
  });

  describe('resize', () => {
    it('should resize framebuffer', () => {
      const framebuffer = createFramebuffer_({
        width: 256,
        height: 256
      });

      context.attach(mockGL);
      
      const texImage2DSpy = vi.spyOn(mockGL, 'texImage2D');
      
      framebuffer.resize(512, 512);
      
      expect(framebuffer.width).toBe(512);
      expect(framebuffer.height).toBe(512);
      expect(texImage2DSpy).toHaveBeenCalled();
    });
  });

  describe('colorTexture', () => {
    it('should return color texture', () => {
      const framebuffer = createFramebuffer_({
        width: 256,
        height: 256
      });

      context.attach(mockGL);
      
      const texture = framebuffer.colorTexture(0);
      expect(texture).toBeInstanceOf(Object);
    });

    it('should return null for invalid index', () => {
      const framebuffer = createFramebuffer_({
        width: 256,
        height: 256
      });

      context.attach(mockGL);
      
      const texture = framebuffer.colorTexture(10);
      expect(texture).toBeNull();
    });
  });

  describe('destroy', () => {
    it('should remove framebuffer from registry and detach', () => {
      const framebuffer = createFramebuffer_({
        width: 256,
        height: 256
      });

      context.attach(mockGL);
      clearMockGlLog(mockGL);
      const detachSpy = vi.spyOn(framebuffer as any, '_detach');

      const fboGpu = framebuffer._gpu;
      const colorGpu = framebuffer.colorTexture(0)!._gpu;
      expect(fboGpu).toBeDefined();
      expect(colorGpu).toBeDefined();
      
      framebuffer.destroy();
      
      expect(registry.framebuffers.has(framebuffer)).toBe(false);
      expect(detachSpy).toHaveBeenCalled();
      expect(getMockGlLog(mockGL)).toEqual([
        ['deleteFramebuffer', fboGpu],
        ['deleteTexture', colorGpu],
      ]);
    });
  });

  describe('error handling', () => {
    it('should throw error for incomplete framebuffer', () => {
      // Mock framebuffer status to be incomplete
      vi.spyOn(mockGL, 'checkFramebufferStatus').mockReturnValue(mockGL.FRAMEBUFFER_INCOMPLETE_ATTACHMENT);

      const framebuffer = createFramebuffer_({
        width: 256,
        height: 256
      });

      expect(() => context.attach(mockGL)).toThrow('bagl: framebuffer incomplete: 36054');
    });
  });
}); 