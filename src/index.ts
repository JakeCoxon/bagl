export { createBagl } from './api';

export type {
  Bagl,
  BufferInit,
  ElementsInit,
  Tex2DInit,
  CubeMapInit,
  FBOInit,
  FBOCubeInit,
  BufferHandle,
  ElementsHandle,
  Texture2DHandle,
  CubeMapHandle,
  FramebufferHandle,
  FramebufferCubeHandle,
  CommandDesc,
  DrawCommand,
  GLSLThunk,
  AttributeMap,
  UniformMap,
  DepthState,
  BlendState,
  CullState,
  StencilState,
  ScissorState,
  ViewportState,
  PolygonOffsetState,
  ClearDesc,
  FrameCallback,
  CancelFn,
  FrameInfo,
  GLLimits,
  WebGLExtensions
} from './types';

// Export internal interfaces for advanced usage
export type { ContextLifecycle } from './context-life';
export type { StateManager, GLStateCache } from './state';
export type { ResourceRegistry } from './resources';
export type { CommandBuilder } from './command';
export type { LoopManager } from './loop';
export type { CompiledProgram } from './shader'; 