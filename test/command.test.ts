import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCommandBuilder } from '../src/command';
import { createContextLifecycle } from '../src/context-life';
import { createStateManager } from '../src/state';
import { createBuffer, createFramebuffer, createResourceRegistry } from '../src/resources';
import { CommandDesc, FramebufferHandle } from '../src/types';
import { mockGlSetAttribs, mockGlSetUniforms, mockGlState } from './mock';
import { createBaglInternalState, createStateManagerFactory, InternalState } from '../src/api';

describe('CommandBuilder', () => {
  let commandBuilder: ReturnType<typeof createCommandBuilder>;
  let context: ReturnType<typeof createContextLifecycle>;
  let state: ReturnType<typeof createStateManager>;
  let registry: ReturnType<typeof createResourceRegistry>;
  let mockGL: WebGL2RenderingContext;
  let internalState: InternalState;
  let contextObj: any;

  beforeEach(() => {
    internalState = createBaglInternalState();
    context = createContextLifecycle(internalState);
    createStateManagerFactory(internalState, context);
    registry = createResourceRegistry(context);
    commandBuilder = createCommandBuilder(internalState);
    
    const canvas = document.createElement('canvas');
    mockGL = canvas.getContext('webgl2')!;
    mockGlState(mockGL, {})
    context.attach(mockGL);
    
    state = createStateManager(mockGL, { maxTextureUnits: 16 } as any);
    // internalState = { gl: mockGL, context, state, limits: { maxTextureUnits: 16 } as any };
    contextObj = { time: 0, ticks: 0, width: 800, height: 600, deltaTime: 0 };
  });

  describe('build', () => {
    it('should build basic command', () => {
      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        count: 3
      } satisfies CommandDesc<unknown>;

      mockGlSetUniforms(mockGL, ['position']);
      mockGlSetAttribs(mockGL, ['position']);

      const command = commandBuilder.build(desc, context, contextObj);
      
      expect(command).toBeDefined();
      expect(typeof command).toBe('function');
    });

    it('should build command with uniforms', () => {
      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          uniform float time;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          uniform float time;
          out vec4 color;
          void main() {
            color = vec4(sin(time), 0.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        uniforms: {
          time: (context: any, props: any) => context.time
        },
        count: 3
      } satisfies CommandDesc<unknown>;

      mockGlSetUniforms(mockGL, ['time']);
      mockGlSetAttribs(mockGL, ['position']);

      const command = commandBuilder.build(desc, context, contextObj);
      
      expect(command).toBeDefined();
    });

    it('should build command with state', () => {
      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        blend: {
          enable: true,
          func: ['src-alpha', 'one-minus-src-alpha']
        },
        depth: {
          enable: true,
          func: 'less'
        },
        count: 3
      } satisfies CommandDesc<unknown>;

      mockGlSetAttribs(mockGL, ['position']);
      mockGlSetUniforms(mockGL, ['position']);

      const command = commandBuilder.build(desc, context, contextObj);
      
      expect(command).toBeDefined();
    });

    it('should build command with attributes as functions', () => {
      const staticBuffer = createBuffer({
        data: new Float32Array([-1, -1, 1, -1, 0, 1]),
        size: 2
      }, registry, context);

      const dynamicBuffer = createBuffer({
        data: new Float32Array([-0.5, -0.5, 0.5, -0.5, 0, 0.5]),
        size: 2
      }, registry, context);

      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          in vec2 offset;
          void main() {
            gl_Position = vec4(position + offset, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(0.0, 1.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: staticBuffer,
          offset: (context: any, props: any) => {
            // Return different buffer based on props or context
            return props.useDynamic ? dynamicBuffer : staticBuffer;
          }
        },
        count: 3
      } satisfies CommandDesc<{ useDynamic?: boolean }>;

      mockGlSetAttribs(mockGL, ['position', 'offset']);
      mockGlSetUniforms(mockGL, []);

      const command = commandBuilder.build(desc, context, contextObj);
      
      expect(command).toBeDefined();
      expect(typeof command).toBe('function');
    });
  });

  describe('command execution', () => {
    it('should execute command with basic drawing', () => {
      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        count: 3
      } satisfies CommandDesc<unknown>;

      mockGlSetUniforms(mockGL, ['position']);
      mockGlSetAttribs(mockGL, ['position']);

      const command = commandBuilder.build(desc, context, contextObj);
      
      const useProgramSpy = vi.spyOn(mockGL, 'useProgram');
      const drawArraysSpy = vi.spyOn(mockGL, 'drawArrays');
      
      command();
      
      expect(useProgramSpy).toHaveBeenCalled();
      expect(drawArraysSpy).toHaveBeenCalledWith(mockGL.TRIANGLES, 0, 3);
    });

    it('should execute command with props', () => {
      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          uniform vec2 offset;
          void main() {
            gl_Position = vec4(position + offset, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        uniforms: {
          offset: (context: any, props: any) => props.offset || [0, 0]
        },
        count: 3
      };

      mockGlSetUniforms(mockGL, ['offset']);
      mockGlSetAttribs(mockGL, ['position']);

      const command = commandBuilder.build(desc, context, contextObj);
      
      const uniform2fSpy = vi.spyOn(mockGL, 'uniform2f');
      
      command({ offset: [0.1, 0.2] });
      
      expect(uniform2fSpy).toHaveBeenCalled();
    });

    it('should execute command with state changes', () => {
      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        blend: {
          enable: true,
          func: ['src-alpha', 'one-minus-src-alpha']
        },
        count: 3
      } satisfies CommandDesc<unknown>;

      mockGlSetAttribs(mockGL, ['position']);
      mockGlSetUniforms(mockGL, []);

      const command = commandBuilder.build(desc, context, contextObj);
      
      const enableSpy = vi.spyOn(mockGL, 'enable');
      const blendFuncSpy = vi.spyOn(mockGL, 'blendFunc');
      
      command();
      
      expect(enableSpy).toHaveBeenCalledWith(mockGL.BLEND);
      expect(blendFuncSpy).toHaveBeenCalledWith(mockGL.SRC_ALPHA, mockGL.ONE_MINUS_SRC_ALPHA);
    });

    it('should execute command with attributes as functions', () => {
      const staticBuffer = createBuffer({
        data: new Float32Array([-1, -1, 1, -1, 0, 1]),
        size: 2
      }, registry, context);

      const dynamicBuffer = createBuffer({
        data: new Float32Array([-0.5, -0.5, 0.5, -0.5, 0, 0.5]),
        size: 2
      }, registry, context);

      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          in vec2 offset;
          void main() {
            gl_Position = vec4(position + offset, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(0.0, 1.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: staticBuffer,
          offset: (context: any, props: any) => {
            // Return different buffer based on props
            return props.useDynamic ? dynamicBuffer : staticBuffer;
          }
        },
        count: 3
      } satisfies CommandDesc<{ useDynamic?: boolean }>;

      mockGlSetAttribs(mockGL, ['position', 'offset']);
      mockGlSetUniforms(mockGL, []);

      const command = commandBuilder.build(desc, context, contextObj);
      
      const useProgramSpy = vi.spyOn(mockGL, 'useProgram');
      const drawArraysSpy = vi.spyOn(mockGL, 'drawArrays');
      const bindBufferSpy = vi.spyOn(mockGL, 'bindBuffer');
      
      // Execute with static buffer (default)
      command();
      
      expect(useProgramSpy).toHaveBeenCalled();
      expect(drawArraysSpy).toHaveBeenCalledWith(mockGL.TRIANGLES, 0, 3);
      expect(bindBufferSpy).toHaveBeenCalledWith(mockGL.ARRAY_BUFFER, staticBuffer._gpu);
      expect(bindBufferSpy).toHaveBeenCalledTimes(2); // Include elements

      // Execute with static buffer again, doesn't bind again
      command();
      expect(bindBufferSpy).toHaveBeenCalledTimes(2);

      // Execute with dynamic buffer
      command({ useDynamic: true });
      
      expect(drawArraysSpy).toHaveBeenCalledTimes(3);
    });

    it('should run inner function with command GL state (blend, framebuffer, viewport)', () => {
      const fbo = createFramebuffer(
        { width: 256, height: 128 },
        internalState,
        registry,
        context
      );

      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        framebuffer: fbo,
        blend: {
          enable: true,
          func: ['src-alpha', 'one-minus-src-alpha']
        },
        count: 3
      } satisfies CommandDesc<unknown>;

      mockGlSetUniforms(mockGL, ['position']);
      mockGlSetAttribs(mockGL, ['position']);

      const command = commandBuilder.build(desc, context, contextObj);

      command(undefined, () => {
        const s = internalState.glContextState!.state.current;
        expect(s.blend).toBe(true);
        expect(s.blendFunc).toEqual([mockGL.SRC_ALPHA, mockGL.ONE_MINUS_SRC_ALPHA]);
        expect(s.framebuffer).toBe(fbo);
        expect(s.viewport).toEqual([0, 0, 256, 128]);
      });
    });

    it('should restore state after inner function returns (blend and framebuffer)', () => {
      const fbo = createFramebuffer(
        { width: 64, height: 64 },
        internalState,
        registry,
        context
      );

      const stateManager = internalState.glContextState!.state;
      stateManager.set({
        blend: true,
        blendFunc: [mockGL.ONE, mockGL.ZERO],
        framebuffer: fbo
      });
      if (stateManager.batching) stateManager.flush();

      const stateBefore = { ...stateManager.current };

      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        blend: {
          enable: true,
          func: ['src-alpha', 'one-minus-src-alpha']
        },
        framebuffer: null,
        count: 3
      } satisfies CommandDesc<unknown>;

      mockGlSetUniforms(mockGL, ['position']);
      mockGlSetAttribs(mockGL, ['position']);

      const command = commandBuilder.build(desc, context, contextObj);

      command(undefined, () => {});

      const stateAfter = stateManager.current;
      expect(stateAfter.blend).toBe(stateBefore.blend);
      expect(stateAfter.blendFunc).toEqual(stateBefore.blendFunc);
      expect(stateAfter.framebuffer).toBe(stateBefore.framebuffer);
    });

    it('should run state-only command with inner and apply framebuffer + blend', () => {
      const fbo = createFramebuffer(
        { width: 256, height: 128 },
        internalState,
        registry,
        context
      );

      const desc = {
        framebuffer: fbo,
        blend: {
          enable: true,
          func: ['src-alpha', 'one-minus-src-alpha']
        }
      } satisfies CommandDesc<unknown>;

      const command = commandBuilder.build(desc, context, contextObj);

      command(undefined, () => {
        const s = internalState.glContextState!.state.current;
        expect(s.blend).toBe(true);
        expect(s.blendFunc).toEqual([mockGL.SRC_ALPHA, mockGL.ONE_MINUS_SRC_ALPHA]);
        expect(s.framebuffer).toBe(fbo);
        expect(s.viewport).toEqual([0, 0, 256, 128]);
      });
    });

    it('should restore state after state-only command with inner returns', () => {
      const fbo = createFramebuffer(
        { width: 64, height: 64 },
        internalState,
        registry,
        context
      );

      const stateManager = internalState.glContextState!.state;
      stateManager.set({
        blend: true,
        blendFunc: [mockGL.ONE, mockGL.ZERO],
        framebuffer: fbo
      });
      if (stateManager.batching) stateManager.flush();

      const stateBefore = { ...stateManager.current };

      const command = commandBuilder.build(
        {
          blend: { enable: true, func: ['src-alpha', 'one-minus-src-alpha'] },
          framebuffer: null
        } satisfies CommandDesc<unknown>,
        context,
        contextObj
      );

      command(undefined, () => {});

      const stateAfter = stateManager.current;
      expect(stateAfter.blend).toBe(stateBefore.blend);
      expect(stateAfter.blendFunc).toEqual(stateBefore.blendFunc);
      expect(stateAfter.framebuffer).toBe(stateBefore.framebuffer);
    });
  });

  describe('error handling', () => {
    it('should handle invalid shader compilation', () => {
      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(1.0, 0.0, 0.0, 1.0);
            invalid_syntax_here;
          }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        count: 3
      };

      mockGlSetAttribs(mockGL, ['position']);
      mockGlSetUniforms(mockGL, []);

      // Mock shader compilation to fail
      vi.spyOn(mockGL, 'getShaderParameter').mockReturnValue(false);
      vi.spyOn(mockGL, 'getShaderInfoLog').mockReturnValue('Compilation error');

      expect(() => commandBuilder.build(desc, context, contextObj)).toThrow();
    });

    it('should handle invalid program linking', () => {
      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        count: 3
      } satisfies CommandDesc<unknown>;

      mockGlSetAttribs(mockGL, ['position']);

      // Mock program linking to fail
      vi.spyOn(mockGL, 'getProgramParameter').mockReturnValue(false);
      vi.spyOn(mockGL, 'getProgramInfoLog').mockReturnValue('Linking error');

      expect(() => commandBuilder.build(desc, context, contextObj)).toThrow();
    });

    it('should throw when only vert is provided without frag', () => {
      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() { gl_Position = vec4(position, 0.0, 1.0); }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        count: 3
      } satisfies CommandDesc<unknown>;
      expect(() => commandBuilder.build(desc, context, contextObj)).toThrow(/both vert and frag/);
    });

    it('should throw when only frag is provided without vert', () => {
      const desc = {
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() { color = vec4(1.0, 0.0, 0.0, 1.0); }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        count: 3
      } satisfies CommandDesc<unknown>;
      expect(() => commandBuilder.build(desc, context, contextObj)).toThrow(/both vert and frag/);
    });

    it('should throw when draw command has no attributes', () => {
      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() { gl_Position = vec4(position, 0.0, 1.0); }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() { color = vec4(1.0, 0.0, 0.0, 1.0); }
        `,
        count: 3
      } satisfies CommandDesc<unknown>;
      expect(() => commandBuilder.build(desc, context, contextObj)).toThrow(/attributes/);
    });
  });

  describe('caching', () => {
    // NOTE: Not implemented yet
    it.skip('should cache compiled programs', () => {
      const desc = {
        vert: `
          #version 300 es
          precision mediump float;
          in vec2 position;
          void main() {
            gl_Position = vec4(position, 0.0, 1.0);
          }
        `,
        frag: `
          #version 300 es
          precision mediump float;
          out vec4 color;
          void main() {
            color = vec4(1.0, 0.0, 0.0, 1.0);
          }
        `,
        attributes: {
          position: createBuffer({
            data: new Float32Array([-1, -1, 1, -1, 0, 1]),
            size: 2
          }, registry, context)
        },
        count: 3
      } satisfies CommandDesc<unknown>;

      mockGlSetAttribs(mockGL, ['position']);

      const createShaderSpy = vi.spyOn(mockGL, 'createShader');
      const createProgramSpy = vi.spyOn(mockGL, 'createProgram');

      // Build command twice
      commandBuilder.build(desc, context, contextObj);
      commandBuilder.build(desc, context, contextObj);

      // Should only create shaders and program once
      expect(createShaderSpy).toHaveBeenCalledTimes(2); // vertex + fragment
      expect(createProgramSpy).toHaveBeenCalledTimes(1);
    });
  });
}); 