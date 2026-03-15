import { vi } from 'vitest';
import { MockWebGL2RenderingContext } from './mock';


class MockWebGLTexture {
}


// Mock HTMLCanvasElement
class MockHTMLCanvasElement {
  width = 800;
  height = 600;
  _gl: MockWebGL2RenderingContext | null = null;
  getContext(contextId: string) {
    if (contextId === 'webgl2') {
      if (this._gl) return this._gl;
      const gl = new MockWebGL2RenderingContext();
      this._gl = gl;
      gl.canvas = this as any;
      return gl;
    }
    return null;
  }
}

// Mock performance
global.performance = {
  now: vi.fn(() => Date.now())
} as any;

// Mock document
global.document = {
  createElement: (tagName: string) => {
    if (tagName === 'canvas') {
      return new MockHTMLCanvasElement();
    }
    return {} as any;
  }
} as any;

// Mock window
global.window = {
  requestAnimationFrame: vi.fn((callback) => setTimeout(callback, 16)),
  cancelAnimationFrame: vi.fn((id) => clearTimeout(id))
} as any;

// Mock WebGL2RenderingContext globally
global.WebGL2RenderingContext = MockWebGL2RenderingContext as any; 
global.HTMLCanvasElement = MockHTMLCanvasElement as any;
global.WebGLTexture = MockWebGLTexture as any;