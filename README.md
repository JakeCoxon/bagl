# Bagl

A modern WebGL2 wrapper with deferred context binding, inspired by the original regl library.

## Features

- **Deferred Context Binding**: Create resources and commands before a WebGL context is available
- **WebGL2 Native**: Built specifically for WebGL2 with modern features like VAOs and instanced rendering
- **State Management**: Efficient state caching and diffing for optimal performance
- **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- **Context Loss Handling**: Graceful handling of WebGL context loss and restoration
- **Resource Management**: Automatic cleanup and resource lifecycle management
- **Context Object**: Built-in time, ticks, width, height tracking for animations
- **Uniform Functions**: Support for dynamic uniforms with context and props parameters

## Installation

```bash
npm install bagl-js
```

## Basic Usage

### Immediate Context Binding

```typescript
import { createBagl } from 'bagl-js';

const canvas = document.querySelector('canvas')!;
const bagl = createBagl(canvas);

const drawTriangle = bagl({
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
      color = vec4(0.3, 0.7, 0.9, 1.0);
    }
  `,
  attributes: {
    position: bagl.buffer({
      data: new Float32Array([-1, -1, 1, -1, 0, 1]),
      size: 2 // 2 components per vertex (x, y)
    })
  },
  count: 3
});

bagl.frame(() => {
  bagl.clear({ color: [0, 0, 0, 1] });
  drawTriangle();
});
```

### Deferred Context Binding

```typescript
import { createBagl } from 'bagl-js';

// Create bagl without a canvas
const bagl = createBagl();

// Prepare resources and commands before DOM is ready
const vertices = bagl.buffer({
  data: new Float32Array([-1, -1, 1, -1, 0, 1]),
  size: 2
});

const drawTriangle = bagl({
  vert: `#version 300 es
         precision mediump float;
         in vec2 position;
         void main() { gl_Position = vec4(position, 0.0, 1.0); }`,
  frag: `#version 300 es
         precision mediump float;
         out vec4 color;
         void main() { color = vec4(0.3, 0.7, 0.9, 1.0); }`,
  attributes: { position: vertices },
  count: 3
});

// Set up render loop
bagl.frame(() => {
  bagl.clear({ color: [0, 0, 0, 1] });
  drawTriangle();
});

// Later, attach to canvas
const canvas = document.querySelector('canvas')!;
bagl.attach(canvas);
```

### Animated Example with Context

```typescript
import { createBagl } from 'bagl-js';

const bagl = createBagl();

const vertices = bagl.buffer({
  data: new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.0, 0.5]),
  size: 2
});

const drawAnimatedTriangle = bagl({
  vert: `
    #version 300 es
    precision mediump float;
    in vec2 position;
    uniform float time;
    void main() {
      vec2 pos = position;
      pos.x += sin(time) * 0.1;
      pos.y += cos(time * 0.5) * 0.05;
      gl_Position = vec4(pos, 0.0, 1.0);
    }
  `,
  frag: `
    #version 300 es
    precision mediump float;
    uniform float time;
    out vec4 color;
    void main() {
      color = vec4(
        0.5 + 0.5 * sin(time), 
        0.3 + 0.3 * cos(time * 0.7), 
        0.7 + 0.3 * sin(time * 1.3), 
        1.0
      );
    }
  `,
  attributes: { position: vertices },
  uniforms: {
    time: (context, props) => context.time
  },
  count: 3
});

bagl.frame(() => {
  bagl.clear({ color: [0, 0, 0, 1] });
  drawAnimatedTriangle();
});
```

## API Reference

### Core Functions

#### `createBagl(canvas?)`
Creates a new bagl instance. If a canvas is provided, immediately attaches to it.

#### `bagl.attach(target)`
Attaches to a canvas or WebGL2 context.

#### `bagl.detach()`
Detaches from the current context and destroys all GPU resources.

#### `bagl.destroy()`
Destroys the bagl instance, cancels all animation loops, and cleans up resources.

#### `bagl.attached`
Boolean indicating if currently attached to a context.

### Context Object

The bagl instance provides a context object with timing and dimension information:

```typescript
bagl.context.time      // Current time in seconds
bagl.context.ticks     // Frame count
bagl.context.width     // Canvas width
bagl.context.height    // Canvas height
bagl.context.deltaTime // Time since last frame
```

### Resource Creation

#### `bagl.buffer(data)`
Creates a buffer for vertex data.

```typescript
const buffer = bagl.buffer({
  data: new Float32Array([...]),
  size: 3, // Number of components per vertex (1-4)
  type: 'array', // or 'elements'
  usage: 'static' // 'static', 'dynamic', or 'stream'
});
```

#### `bagl.elements(data)`
Creates an element buffer for indexed drawing.

```typescript
const elements = bagl.elements({
  data: new Uint16Array([...]),
  usage: 'static'
});
```

#### `bagl.texture(options)`
Creates a 2D texture.

```typescript
const texture = bagl.texture({
  data: imageData,
  width: 512,
  height: 512,
  format: 'rgba',
  min: 'linear',
  mag: 'linear'
});
```

#### `bagl.cube(options)`
Creates a cubemap texture.

#### `bagl.framebuffer(options)`
Creates a framebuffer for render-to-texture.

```typescript
const fbo = bagl.framebuffer({
  color: 1,
  depth: true,
  width: 512,
  height: 512
});
```

### Drawing Commands

#### `bagl(description)`
Creates a draw command.

```typescript
const draw = bagl({
  vert: 'vertex shader source',
  frag: 'fragment shader source',
  attributes: { position: buffer },
  uniforms: { 
    time: (context, props) => context.time,
    resolution: (context, props) => [context.width, context.height]
  },
  count: 3,
  framebuffer: fbo
});
```

### Uniform Functions

Uniforms can be static values or functions that receive context and props:

```typescript
uniforms: {
  // Static value
  color: [1, 0, 0, 1],
  
  // Function with context
  time: (context, props) => context.time,
  
  // Function with context and props
  scale: (context, props) => props.scale || 1.0,
  
  // Dynamic matrix
  model: (context, props) => {
    const model = mat4.create();
    mat4.rotateY(model, model, context.time);
    return model;
  }
}
```

### State Management

#### `bagl.clear(options)`
Clears the framebuffer.

```typescript
bagl.clear({
  color: [0, 0, 0, 1],
  depth: 1,
  stencil: 0
});
```

#### `bagl.frame(callback)`
Sets up a render loop.

```typescript
const cancel = bagl.frame(({ time, deltaTime, tick }) => {
  // Render frame
});

// Later, cancel the loop
cancel();
```

### Context Information

#### `bagl.limits`
Access to WebGL2 limits.

#### `bagl.extensions`
Available WebGL2 extensions.

## Advanced Features

### 3D Rendering with Lighting

```typescript
import { createBagl } from 'bagl-js';
import * as mat4 from 'gl-mat4';

const bagl = createBagl();

// Create cube with normals
const positions = bagl.buffer({
  data: new Float32Array([/* cube vertices */]),
  size: 3
});

const normals = bagl.buffer({
  data: new Float32Array([/* cube normals */]),
  size: 3
});

const drawCube = bagl({
  vert: `
    #version 300 es
    precision mediump float;
    in vec3 position;
    in vec3 normal;
    uniform mat4 model, view, projection;
    out vec3 vNormal, vPosition;
    void main() {
      vPosition = position;
      vNormal = normal;
      gl_Position = projection * view * model * vec4(position, 1.0);
    }
  `,
  frag: `
    #version 300 es
    precision mediump float;
    uniform float time;
    uniform mat4 model;
    in vec3 vNormal, vPosition;
    out vec4 color;
    void main() {
      mat3 normalMatrix = mat3(model);
      vec3 worldNormal = normalize(normalMatrix * vNormal);
      vec3 lightDir = normalize(vec3(sin(time), cos(time), 0.5));
      float diffuse = max(dot(worldNormal, lightDir), 0.0);
      vec3 baseColor = vec3(0.8, 0.6, 0.4);
      color = vec4(baseColor * (0.2 + 0.8 * diffuse), 1.0);
    }
  `,
  attributes: { position: positions, normal: normals },
  uniforms: {
    model: (context, props) => {
      const model = mat4.create();
      mat4.rotateY(model, model, context.time * 0.5);
      return model;
    },
    view: (context, props) => {
      const view = mat4.create();
      mat4.translate(view, view, [0, 0, -3]);
      return view;
    },
    projection: (context, props) => {
      const projection = mat4.create();
      const aspect = context.width / context.height;
      mat4.perspective(projection, Math.PI / 4, aspect, 0.1, 100.0);
      return projection;
    },
    time: (context, props) => context.time
  },
  depth: { enable: true, func: 'less' },
  count: 36
});

bagl.frame(() => {
  bagl.clear({ color: [0, 0, 0, 1], depth: 1 });
  drawCube();
});
```

### Context Loss Handling

```typescript
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  bagl.detach();
});

canvas.addEventListener('webglcontextrestored', () => {
  bagl.attach(canvas);
});
```

### Resource Lifecycle

Resources are automatically managed, but you can manually destroy them:

```typescript
const buffer = bagl.buffer({ data: new Float32Array([...]) });
// ... use buffer
buffer.destroy(); // Manually destroy
```

## Performance Considerations

- **State Diffing**: Bagl automatically caches WebGL state and only updates what has changed
- **VAOs**: Uses WebGL2 Vertex Array Objects for efficient attribute binding
- **Resource Pooling**: Resources are reused when possible
- **Lazy Compilation**: Shaders are compiled only when needed
- **Loop Management**: Animation loops are automatically cancelled when the bagl instance is destroyed

## Browser Support

- WebGL2 capable browsers
- Modern browsers with ES2015+ support
- TypeScript 4.0+

## License

MIT 