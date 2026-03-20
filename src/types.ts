export type BufferType = 'array' | 'elements';
export type BufferUsage = 'static' | 'dynamic' | 'stream';
export type TextureFormat = 'rgba' | 'rgb' | 'luminance' | 'luminance-alpha' | 'alpha' | 'depth' | 'depth-stencil' | 'red';
export type TextureInternalFormat = 'rgba8' | 'rgb8' | 'luminance8' | 'luminance-alpha8' | 'alpha8' | 'depth24' | 'depth24-stencil8' | 'rgba16f' | 'rgba32f' | 'rgb16f' | 'rgb32f' | 'r32f';
export type TextureType = 'ubyte' | 'ushort' | 'uint' | 'float' | 'half-float' | 'uint-24-8' | 'uint-24-8-stencil8';
export type TextureFilter = 'nearest' | 'linear' | 'nearest-mipmap-nearest' | 'linear-mipmap-nearest' | 'nearest-mipmap-linear' | 'linear-mipmap-linear';
export type TextureWrap = 'clamp' | 'repeat' | 'mirror-repeat' | 'clamp-to-edge' | 'clamp-to-border';
export type PrimitiveType = 'points' | 'lines' | 'line-strip' | 'line-loop' | 'triangles' | 'triangle-strip' | 'triangle-fan';
export type BlendFunc = 'zero' | 'one' | 'src-color' | 'one-minus-src-color' | 'src-alpha' | 'one-minus-src-alpha' | 'dst-alpha' | 'one-minus-dst-alpha' | 'dst-color' | 'one-minus-dst-color';
export type BlendEquation = 'add' | 'subtract' | 'reverse-subtract' | 'min' | 'max';
export type DepthFunc = 'never' | 'less' | 'equal' | 'lequal' | 'greater' | 'notequal' | 'gequal' | 'always';
export type CullFace = 'front' | 'back' | 'front-and-back';
export type FrontFace = 'cw' | 'ccw';
export type StencilFunc = 'never' | 'less' | 'equal' | 'lequal' | 'greater' | 'notequal' | 'gequal' | 'always';
export type StencilOp = 'keep' | 'zero' | 'replace' | 'incr' | 'incr-wrap' | 'decr' | 'decr-wrap' | 'invert';

// Basic uniform value types
export type BasicUniformValue = string | boolean | number | [number, number] | [number, number, number] | [number, number, number, number] | [number, number, number, number, number, number, number, number] | [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number] | number[]

// Resource handles that can be used as uniforms (textures)
export type UniformResourceHandle = Texture2DHandle | CubeMapHandle | FramebufferHandle;

// Complete uniform value type including resources
export type UniformValue = BasicUniformValue | UniformResourceHandle;

// Generic helper types for props-based values
export type PropValue<T, P = any> = T | ((context: Context, props: P) => T);
export type NumberProp<P = any> = PropValue<number, P>;
export type BooleanProp<P = any> = PropValue<boolean, P>;
export type StringProp<P = any> = PropValue<string, P>;

// Context interface that provides time, ticks, width, and height
export interface Context {
  time: number;
  ticks: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  deltaTime: number;
}

export type BaglInitObject = {
  canvas?: HTMLCanvasElement;
  gl?: WebGL2RenderingContext;
  disableBatching?: boolean;
  preserveDrawingBuffer?: boolean;
}
export type BaglInit = BaglInitObject | HTMLCanvasElement | WebGL2RenderingContext;

export interface Bagl {
  // Resource factories
  buffer(data: BufferInit): BufferHandle;
  elements(data: ElementsInit): ElementsHandle;
  texture(opts: Tex2DInit): Texture2DHandle;
  cube(opts: CubeMapInit): CubeMapHandle;
  framebuffer(opts?: FBOInit): FramebufferHandle;
  framebufferCube(opts?: FBOCubeInit): FramebufferCubeHandle;

  // Command builder
  <P = Record<string, unknown>>(desc: CommandDesc<MapProps<P>>): DrawCommand<MapProps<P>>;

  // Global helpers
  clear(opts?: ClearDesc): void;
  frame(cb: FrameCallback): CancelFn;
  now(): number;
  poll(): void;
  destroy(): void;

  // State management
  state(changes: StateChange, func: () => void): void;
  flushState(): void;

  // Context management
  attach(target: HTMLCanvasElement | WebGL2RenderingContext): void;
  detach(): void;
  onAttach(hook: (gl: WebGL2RenderingContext) => void | (() => void)): void;
  onDetach(hook: () => void): void;
  readonly attached: boolean;

  readonly gl: WebGL2RenderingContext | null;

  // Context info
  readonly limits: GLLimits;
  readonly extensions: Partial<Record<keyof WebGLExtensions, any>>;
  
  // Context object with time, ticks, width, height
  readonly context: Context;
}

type MapProps<P> = {
  [K in keyof P]: 
    P[K] extends 'texture' ? Texture2DHandle | FramebufferHandle : 
    P[K] extends 'framebuffer' ? FramebufferHandle : 
    P[K] extends 'cubemap' ? CubeMapHandle : 
    P[K] extends 'buffer' ? BufferHandle : 
    P[K] extends 'elements' ? ElementsHandle : 
    P[K]
}

// Resource initialization types
export interface BufferInit {
  data: ArrayBufferView;
  size?: number; // Number of components per vertex (1-4)
  type?: BufferType;
  usage?: BufferUsage;
}

export interface ElementsInit {
  data: ArrayBufferView | number[];
  usage?: BufferUsage;
}

export interface Tex2DInit {
  data?: ArrayBufferView | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
  width?: number;
  height?: number;
  format?: TextureFormat;
  internalFormat?: TextureInternalFormat;
  type?: TextureType;
  min?: TextureFilter;
  mag?: TextureFilter;
  wrapS?: TextureWrap;
  wrapT?: TextureWrap;
  flipY?: boolean;
  premultiplyAlpha?: boolean;
  copyFromBuffer?: boolean
}

export interface CubeMapInit {
  data?: ArrayBufferView | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
  size?: number;
  format?: TextureFormat;
  internalFormat?: TextureInternalFormat;
  type?: TextureType;
  min?: TextureFilter;
  mag?: TextureFilter;
  wrapS?: TextureWrap;
  wrapT?: TextureWrap;
  wrapR?: TextureWrap;
}

export interface FBOInit {
  color?: number;
  depth?: boolean;
  stencil?: boolean;
  width?: number;
  height?: number;
  format?: TextureFormat;
  internalFormat?: TextureInternalFormat;
  type?: TextureType;
}

export interface FBOCubeInit {
  color?: number;
  depth?: boolean;
  stencil?: boolean;
  size?: number;
}

// Resource handle types
export interface BufferHandle {
  readonly baglType: 'buffer';
  subdata(data: ArrayBufferView, offset?: number): void;
  destroy(): void;
  readonly byteLength: number;
  readonly _gpu: WebGLBuffer | null;
  readonly size: number;
  readonly data: ArrayBufferView;
}

export interface ElementsHandle {
  readonly baglType: 'elements';
  subdata(data: ArrayBufferView, offset?: number): void;
  destroy(): void;
  readonly byteLength: number;
  readonly _gpu: WebGLBuffer | null;
  readonly data: ArrayBufferView;
}

export type Texture2DHandle = {
  readonly baglType: 'texture2d';
  subdata(data: ArrayBufferView, x?: number, y?: number, width?: number, height?: number): void;
  resize(width: number, height: number): void;
  destroy(): void;
  readPixels(x: number, y: number, w: number, h: number): Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly _gpu: WebGLTexture | null;
} & ((props: Tex2DInit) => void);

export interface CubeMapHandle {
  readonly baglType: 'cubemap';
  subdata(data: ArrayBufferView, face?: number, x?: number, y?: number, width?: number, height?: number): void;
  resize(size: number): void;
  destroy(): void;
  readonly size: number;
  readonly _gpu: WebGLTexture | null;
}

export interface FramebufferHandle {
  readonly baglType: 'framebuffer';
  resize(width: number, height: number): void;
  colorTexture(index?: number): Texture2DHandle | null;
  destroy(): void;
  readonly width: number;
  readonly height: number;
  readonly _gpu: WebGLFramebuffer | null;
}

export interface FramebufferCubeHandle {
  readonly baglType: 'framebufferCube';
  resize(size: number): void;
  destroy(): void;
  readonly size: number;
  readonly _gpu: WebGLFramebuffer | null;
}

// Command types
export type GLSLThunk<P> = PropValue<string, P>;

export interface CommandDesc<P = any> {
  vert?: GLSLThunk<P>;
  frag?: GLSLThunk<P>;

  // Geometry
  attributes?: AttributeMap<P>;
  elements?: PropValue<ElementsDescInit, P>;
  instances?: NumberProp<P>;
  count?: NumberProp<P>;
  primitive?: PropValue<PrimitiveType, P>;
  // Draw-call offset (first vertex for drawArrays, byte offset for drawElements)
  offset?: NumberProp<P>;

  // Uniforms & textures
  uniforms?: UniformMap<P>;

  // Global state
  depth?: PropValue<DepthState<P>, P>;
  blend?: PropValue<BlendState<P>, P>;
  cull?: PropValue<CullState<P>, P>;
  stencil?: PropValue<StencilState<P>, P>;
  scissor?: PropValue<ScissorState<P>, P>;
  viewport?: PropValue<ViewportState<P>, P>;
  polygonOffset?: PropValue<PolygonOffsetState<P>, P>;
  lineWidth?: NumberProp<P>;

  // Output
  framebuffer?: PropValue<FramebufferHandle | null, P>;
}

export type StateChange = {
  framebuffer?: FramebufferHandle | null;
  color?: [number, number, number, number];
  depth?: number;
  stencil?: number;
}

export type DrawCommand<P = any> = (props?: P, inner?: () => void) => void;

export type BaglObject = BufferHandle | ElementsHandle | Texture2DHandle | CubeMapHandle | FramebufferHandle | FramebufferCubeHandle;

export type ElementsDescInit = ElementsHandle | ElementsInit | Uint16Array | number[];

export interface AttributeDataInit {
  data: ArrayBufferView;
  size?: number;
}

export interface AttributeBufferDescriptor {
  buffer: BufferHandle;
  size?: number;
  // Byte offset in the bound vertex buffer
  offset?: number;
  // Byte stride in the bound vertex buffer (0 = tightly packed)
  stride?: number;
}

export type AttributeInit = BufferHandle | AttributeDataInit | AttributeBufferDescriptor;

// Attribute and uniform maps
export type AttributeMap<P> = Record<string, PropValue<AttributeInit, P>>;
export type UniformMap<P> = Record<string, PropValue<UniformValue, P>>;

// State types
export interface DepthState<P> {
  enable?: BooleanProp<P>;
  func?: PropValue<DepthFunc, P>;
  mask?: BooleanProp<P>;
  range?: PropValue<[number, number], P>;
}

export interface BlendState<P> {
  enable?: BooleanProp<P>;
  func?: PropValue<[BlendFunc, BlendFunc], P>;
  equation?: PropValue<BlendEquation, P>;
  color?: PropValue<[number, number, number, number], P>;
}

export interface CullState<P> {
  enable?: BooleanProp<P>;
  face?: PropValue<CullFace, P>;
  frontFace?: PropValue<FrontFace, P>;
}

export interface StencilState<P> {
  enable?: BooleanProp<P>;
  func?: PropValue<[StencilFunc, number, number], P>;
  op?: PropValue<[StencilOp, StencilOp, StencilOp], P>;
  mask?: NumberProp<P>;
}

export interface ScissorState<P> {
  enable?: BooleanProp<P>;
  box?: PropValue<[number, number, number, number], P>;
}

export interface ViewportState<P> {
  x?: NumberProp<P>;
  y?: NumberProp<P>;
  width?: NumberProp<P>;
  height?: NumberProp<P>;
}

export interface PolygonOffsetState<P> {
  enable?: BooleanProp<P>;
  factor?: NumberProp<P>;
  units?: NumberProp<P>;
}

// Clear description
export interface ClearDesc {
  framebuffer?: FramebufferHandle | null;
  color?: [number, number, number, number];
  depth?: number;
  stencil?: number;
  attachment?: number;
}

// Frame callback
export interface FrameInfo {
  ticks: number;
  time: number;
  deltaTime: number;
}

export type FrameCallback = (context: Context) => void;
export type CancelFn = () => void;

// GL limits and extensions
export interface GLLimits {
  maxTextureSize: number;
  maxTextureUnits: number;
  maxCubeMapSize: number;
  maxDrawBuffers: number;
  maxVertexAttribs: number;
  maxVertexUniformVectors: number;
  maxFragmentUniformVectors: number;
  maxVaryingVectors: number;
  maxViewportDims: [number, number];
}

export interface WebGLExtensions {
  OES_texture_float: any;
  OES_texture_float_linear: any;
  OES_texture_half_float: any;
  OES_texture_half_float_linear: any;
  OES_standard_derivatives: any;
  OES_element_index_uint: any;
  OES_vertex_array_object: any;
  WEBGL_depth_texture: any;
  WEBGL_draw_buffers: any;
  EXT_texture_filter_anisotropic: any;
  EXT_frag_depth: any;
  EXT_shader_texture_lod: any;
  EXT_color_buffer_float: any;
  EXT_color_buffer_half_float: any;
  EXT_disjoint_timer_query: any;
  EXT_float_blend: any;
  EXT_texture_compression_bptc: any;
  EXT_texture_compression_rgtc: any;
  EXT_texture_norm16: any;
  OES_draw_buffers_indexed: any;
  OES_sample_variables: any;
  WEBGL_compressed_texture_s3tc: any;
  WEBGL_compressed_texture_s3tc_srgb: any;
  WEBGL_compressed_texture_etc: any;
  WEBGL_compressed_texture_pvrtc: any;
  WEBGL_compressed_texture_astc: any;
  WEBGL_debug_renderer_info: any;
  WEBGL_debug_shaders: any;
  WEBGL_lose_context: any;
  WEBGL_multi_draw: any;
}

// Type assertion functions
export function isBuffer(handle: any): handle is BufferHandle {
  return handle && typeof handle === 'object' && handle.baglType === 'buffer';
}

export function isElements(handle: any): handle is ElementsHandle {
  return handle && typeof handle === 'object' && handle.baglType === 'elements';
}

export function isTexture2D(handle: any): handle is Texture2DHandle {
  return handle && typeof handle === 'function' && handle.baglType === 'texture2d';

}

export function isCubeMap(handle: any): handle is CubeMapHandle {
  return handle && typeof handle === 'object' && handle.baglType === 'cubemap';
}

export function isFramebuffer(handle: any): handle is FramebufferHandle {
  return handle && typeof handle === 'object' && handle.baglType === 'framebuffer';
}

export function isFramebufferCube(handle: any): handle is FramebufferCubeHandle {
  return handle && typeof handle === 'object' && handle.baglType === 'framebufferCube';
}

export function isTexture(handle: any): handle is Texture2DHandle | CubeMapHandle {
  return isTexture2D(handle) || isCubeMap(handle);
}

export function isUniformResource(handle: any): handle is UniformResourceHandle {
  return isTexture2D(handle) || isCubeMap(handle) || isFramebuffer(handle);
} 

export function isBaglObject(handle: any): handle is BaglObject {
  return isBuffer(handle) || isElements(handle) || isTexture2D(handle) || isCubeMap(handle) || isFramebuffer(handle) || isFramebufferCube(handle);
}