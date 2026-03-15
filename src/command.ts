// Command building system with deferred context binding

import type { CommandDesc, DrawCommand, Context, PropValue, AttributeInit, StateChange } from './types';
import type { ContextLifecycle } from './context-life';
import type { GLStateCache, StateManager } from './state';
import { buildProgram, compileVAO, applyUniforms, type CompiledProgram, type EvaluatedCommandDesc, type CompiledVAO } from './shader';
import { isElements } from './types';
import { 
  depthFuncToGL, blendFuncToGL, blendEquationToGL, cullFaceToGL, 
  frontFaceToGL, stencilFuncToGL, stencilOpToGL, primitiveToGL 
} from './gl-constants';
import type { GLContextState, InternalState } from './api';

// Helper function to evaluate PropValue with context support
function evaluatePropValue<T, P>(
  value: PropValue<T, P>,
  props: P,
  context: Context
): T {
  if (typeof value === 'function') {
    return (value as (context: Context, props: P) => T)(context, props);
  }
  return value;
}

export interface CommandBuilder {
  build<P>(desc: CommandDesc<P>, context: ContextLifecycle, contextObj: Context): DrawCommand<P>;
}

export function createCommandBuilder(internalState: InternalState): CommandBuilder {
  return {
    build<P>(desc: CommandDesc<P>, context: ContextLifecycle, contextObj: Context): DrawCommand<P> {
      let impl: ((props: P, inner?: () => void) => void) | null = null;
      let program: any = null;
      let vao: WebGLVertexArrayObject | null = null;

      // Register hooks for context lifecycle
      context.onAttach((glContextState) => {
        try {
          const stateOnly = desc.vert === undefined && desc.frag === undefined;
          if (!stateOnly && (desc.vert === undefined || desc.frag === undefined)) {
            throw new Error('bagl: command must provide both vert and frag for draw, or omit both for state-only command');
          }
          if (!stateOnly && desc.attributes === undefined) {
            throw new Error('bagl: draw command must provide attributes');
          }

          if (stateOnly) {
            impl = createStateOnlyImpl(glContextState, desc, contextObj);
          } else {
            const { gl } = glContextState;
            program = buildProgram(gl, desc.vert!, desc.frag!, undefined, contextObj);
            const vao = compileVAO(gl, program, desc as Required<Pick<CommandDesc<P>, 'vert' | 'frag' | 'attributes'>>);
            impl = createDrawImpl(glContextState, program, vao, desc as Required<Pick<CommandDesc<P>, 'vert' | 'frag' | 'attributes'>>, contextObj);
          }
        } catch (error) {
          impl = null;
          throw error;
        }
      });

      context.onDetach(() => {
        impl = null;
        program = null;
        vao = null;
      });

      return function draw(props?: P, inner?: () => void): void {
        if (!impl) {
          throw new Error('bagl: draw() called when not attached to a context');
        }
        impl(props || {} as P, inner);
      };
    }
  };
}

function evaluateCommandDesc<P>(
  desc: CommandDesc<P>, 
  props: P,
  contextObj: Context, 
  program: CompiledProgram
): EvaluatedCommandDesc<P> {
  const elements = desc.elements ? evaluatePropValue(desc.elements, props, contextObj) : undefined;
  // Evaluate attributes if they're functions
  const evaluatedAttributes: Record<string, AttributeInit> = {};
  for (const [name, attr] of Object.entries(desc.attributes ?? {})) {
    evaluatedAttributes[name] = evaluatePropValue(attr, props, contextObj);
  }

  return { program, elements, attributes: evaluatedAttributes };
}

function createStateOnlyImpl<P>(
  glContextState: GLContextState,
  desc: CommandDesc<P>,
  contextObj: Context
): (props: P, inner?: () => void) => void {
  return function draw(props: P, inner?: () => void): void {
    const { state } = glContextState;
    state.push();
    applyState(glContextState.gl, state, desc, props, contextObj);
    if (inner) inner();
    state.pop();
  };
}

function createDrawImpl<P>(
  glContextState: GLContextState,
  program: CompiledProgram,
  vao: CompiledVAO<P>,
  desc: CommandDesc<P>,
  contextObj: Context
): (props: P, inner?: () => void) => void {
  return function draw(props: P, inner?: () => void): void {
    const { gl, state } = glContextState;
    state.push();

    applyState(gl, state, desc, props, contextObj);

    state.set({ program: program.program, vao: vao.vao });
    if (state.batching) state.flush();

    applyUniforms(glContextState, program, desc.uniforms, props, contextObj);
    const evaluatedDesc = evaluateCommandDesc(desc, props, contextObj, program);
    vao.applyAttributes(gl, evaluatedDesc);

    performDraw(gl, program, desc, props, contextObj);

    if (inner) inner();
    state.pop();
  };
}

export function applyFlatState(
  gl: WebGL2RenderingContext,
  state: StateManager,
  changes: StateChange
): void {
  const stateUpdates: Partial<GLStateCache> = {};
  if (changes.framebuffer !== undefined) {
    stateUpdates.framebuffer = changes.framebuffer;
  }

  if (Object.keys(stateUpdates).length > 0) {
    state.set(stateUpdates);
  }
}

function applyState<P>(
  gl: WebGL2RenderingContext,
  state: StateManager,
  desc: CommandDesc<P>,
  props: P,
  contextObj: Context
): void {
  const stateUpdates: Partial<GLStateCache> = {};

  // Framebuffer
  if (desc.framebuffer !== undefined) {
    const framebuffer = evaluatePropValue(desc.framebuffer, props, contextObj);
    stateUpdates.framebuffer = framebuffer;
  }
  const currentFrameBuffer = stateUpdates.framebuffer === undefined ? state.current.framebuffer : stateUpdates.framebuffer;


  // Viewport
  if (desc.viewport) {
    const viewport = evaluatePropValue(desc.viewport, props, contextObj);
    if (viewport.x !== undefined || viewport.y !== undefined || viewport.width !== undefined || viewport.height !== undefined) {
      const current = state.current.viewport;
      const newViewport: [number, number, number, number] = [
        evaluatePropValue(viewport.x, props, contextObj) ?? current[0],
        evaluatePropValue(viewport.y, props, contextObj) ?? current[1],
        evaluatePropValue(viewport.width, props, contextObj) ?? current[2],
        evaluatePropValue(viewport.height, props, contextObj) ?? current[3]
      ];
      stateUpdates.viewport = newViewport;
    }
  } else {
    stateUpdates.viewport = currentFrameBuffer ? 
      [0, 0, currentFrameBuffer.width, currentFrameBuffer.height]
      : [0, 0, contextObj.width, contextObj.height];
  }

  const currentViewport = stateUpdates.viewport === undefined ? state.current.viewport : stateUpdates.viewport;

  //
  // TODO: context should update to reflect new viewport
  //

  // Depth state
  if (desc.depth) {
    const depth = evaluatePropValue(desc.depth, props, contextObj);
    if (depth.enable !== undefined) {
      stateUpdates.depthTest = evaluatePropValue(depth.enable, props, contextObj);
    }
    if (depth.func !== undefined) {
      stateUpdates.depthFunc = depthFuncToGL(gl, evaluatePropValue(depth.func, props, contextObj));
    }
    if (depth.mask !== undefined) {
      stateUpdates.depthMask = evaluatePropValue(depth.mask, props, contextObj);
    }
    if (depth.range !== undefined) {
      stateUpdates.depthRange = evaluatePropValue(depth.range, props, contextObj);
    }
  }

  // Blend state
  if (desc.blend) {
    const blend = evaluatePropValue(desc.blend, props, contextObj);
    if (blend.enable !== undefined) {
      stateUpdates.blend = evaluatePropValue(blend.enable, props, contextObj);
    }
    if (blend.func !== undefined) {
      const func = evaluatePropValue(blend.func, props, contextObj);
      stateUpdates.blendFunc = [blendFuncToGL(gl, func[0]), blendFuncToGL(gl, func[1])];
    }
    if (blend.equation !== undefined) {
      stateUpdates.blendEquation = blendEquationToGL(gl, evaluatePropValue(blend.equation, props, contextObj));
    }
    if (blend.color !== undefined) {
      stateUpdates.blendColor = evaluatePropValue(blend.color, props, contextObj);
    }
  }

  // Cull state
  if (desc.cull) {
    const cull = evaluatePropValue(desc.cull, props, contextObj);
    if (cull.enable !== undefined) {
      stateUpdates.cull = evaluatePropValue(cull.enable, props, contextObj);
    }
    if (cull.face !== undefined) {
      stateUpdates.cullFace = cullFaceToGL(gl, evaluatePropValue(cull.face, props, contextObj));
    }
    if (cull.frontFace !== undefined) {
      stateUpdates.frontFace = frontFaceToGL(gl, evaluatePropValue(cull.frontFace, props, contextObj));
    }
  }

  // Stencil state
  if (desc.stencil) {
    const stencil = evaluatePropValue(desc.stencil, props, contextObj);
    if (stencil.enable !== undefined) {
      stateUpdates.stencilTest = evaluatePropValue(stencil.enable, props, contextObj);
    }
    if (stencil.func !== undefined) {
      const func = evaluatePropValue(stencil.func, props, contextObj);
      stateUpdates.stencilFunc = [stencilFuncToGL(gl, func[0]), func[1], func[2]];
    }
    if (stencil.op !== undefined) {
      const op = evaluatePropValue(stencil.op, props, contextObj);
      stateUpdates.stencilOp = [stencilOpToGL(gl, op[0]), stencilOpToGL(gl, op[1]), stencilOpToGL(gl, op[2])];
    }
    if (stencil.mask !== undefined) {
      stateUpdates.stencilMask = evaluatePropValue(stencil.mask, props, contextObj);
    }
  }

  // Scissor state
  if (desc.scissor) {
    const scissor = evaluatePropValue(desc.scissor, props, contextObj);
    if (scissor.enable !== undefined) {
      stateUpdates.scissorTest = evaluatePropValue(scissor.enable, props, contextObj);
    }
    if (scissor.box !== undefined) {
      stateUpdates.scissorBox = evaluatePropValue(scissor.box, props, contextObj);
    }
  }

  // Polygon offset
  if (desc.polygonOffset) {
    const polygonOffset = evaluatePropValue(desc.polygonOffset, props, contextObj);
    if (polygonOffset.enable !== undefined) {
      stateUpdates.polygonOffset = evaluatePropValue(polygonOffset.enable, props, contextObj);
    }
    if (polygonOffset.factor !== undefined) {
      stateUpdates.polygonOffsetFactor = evaluatePropValue(polygonOffset.factor, props, contextObj);
    }
    if (polygonOffset.units !== undefined) {
      stateUpdates.polygonOffsetUnits = evaluatePropValue(polygonOffset.units, props, contextObj);
    }
  }

  // Line width
  if (desc.lineWidth !== undefined) {
    stateUpdates.lineWidth = evaluatePropValue(desc.lineWidth, props, contextObj);
  }

  // Apply all state updates in one call
  if (Object.keys(stateUpdates).length > 0) {
    state.set(stateUpdates);
  }
}

function performDraw<P>(gl: WebGL2RenderingContext, program: CompiledProgram, desc: CommandDesc<P>, props: P, contextObj: Context): void {
  // Get draw parameters
  let count = evaluatePropValue(desc.count, props, contextObj);
  const instances = evaluatePropValue(desc.instances, props, contextObj);
  const offset = evaluatePropValue(desc.offset, props, contextObj) ?? 0;
  const primitiveType = evaluatePropValue(desc.primitive, props, contextObj) ?? 'triangles';
  const primitive = primitiveToGL(gl, primitiveType);

  // Check if we have elements (indexed drawing)
  const elements = evaluatePropValue(desc.elements, props, contextObj);

  const attributes = program.attributes;

  if (elements) {
    if (count !== undefined) throw new Error('bagl: count is not supported for indexed drawing');
    if (isElements(elements)) {
      count = (elements.data as any).length;
    } else if (Array.isArray(elements)) {
      count = elements.length;
    } else {
      throw new Error('bagl: elements is not a valid elements handle');
    }
  }

  // Perform the draw call
  if (elements) {
    // Indexed drawing - element buffer is already bound in VAO
    if (instances && instances > 1) {
      gl.drawElementsInstanced(primitive, count || 0, gl.UNSIGNED_SHORT, offset, instances);
    } else {
      gl.drawElements(primitive, count || 0, gl.UNSIGNED_SHORT, offset);
    }
  } else {
    // Non-indexed drawing
    if (instances && instances > 1) {
      gl.drawArraysInstanced(primitive, offset, count || 0, instances);
    } else {
      gl.drawArrays(primitive, offset, count || 0);
    }
  }
} 