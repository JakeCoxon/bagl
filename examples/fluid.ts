import { createBagl } from '../src/index';

export function createFluidExample() {
  const bagl = createBagl();
  
  // Simulation resolution (lower = faster, higher = more detailed)
  const simWidth = 256;
  const simHeight = 256;
  
  // Mouse tracking
  let mouseX = 0.5;
  let mouseY = 0.5;
  let prevMouseX = 0.5;
  let prevMouseY = 0.5;
  let mouseDown = false;
  

  bagl.onAttach(() => {

    const canvas = bagl.gl?.canvas;
    if (canvas && 'getBoundingClientRect' in canvas) {
      const updateMouse = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) / rect.width;
        mouseY = 1.0 - (e.clientY - rect.top) / rect.height; // Flip Y
      };
      
      canvas.addEventListener('mousemove', (e) => {
        updateMouse(e as MouseEvent);
      });
      
      canvas.addEventListener('mousedown', (e) => {
        mouseDown = true;
        updateMouse(e as MouseEvent);
      });
      
      canvas.addEventListener('mouseup', () => {
        mouseDown = false;
      });
    }
  })
  
  // Create ping-pong framebuffers for velocity field
  const velocityA = bagl.framebuffer({
    width: simWidth,
    height: simHeight,
    color: 1,
    format: 'rgba',
    internalFormat: 'rgba16f',
    type: 'half-float'
  });
  
  const velocityB = bagl.framebuffer({
    width: simWidth,
    height: simHeight,
    color: 1,
    format: 'rgba',
    internalFormat: 'rgba16f',
    type: 'half-float'
  });
  
  // Create ping-pong framebuffers for density field
  const densityA = bagl.framebuffer({
    width: simWidth,
    height: simHeight,
    color: 1
  });
  
  const densityB = bagl.framebuffer({
    width: simWidth,
    height: simHeight,
    color: 1
  });
  
  // Full-screen quad for rendering
  const quadVertices = bagl.buffer({
    data: new Float32Array([
      -1, -1,
       1, -1,
       1,  1,
      -1,  1
    ]),
    size: 2
  });
  
  const quadIndices = bagl.elements({
    data: new Uint16Array([0, 1, 2, 0, 2, 3])
  });
  
  // Advection shader - moves density and velocity along velocity field
  const advect = bagl<{ velocity: any; source: any; target: any }>({
    vert: `
      #version 300 es
      precision mediump float;
      in vec2 position;
      out vec2 vTexCoord;
      void main() {
        vTexCoord = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;
      in vec2 vTexCoord;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 uResolution;
      uniform float uDeltaTime;
      uniform float uDissipation;
      out vec4 color;
      
      void main() {
        vec2 uv = vTexCoord;
        
        // Sample velocity at current position
        vec2 vel = texture(uVelocity, uv).xy;
        
        // Advect backwards in time
        // Velocity is in normalized coordinates, scale by resolution and time
        vec2 advectedPos = uv - vel * uDeltaTime;
        
        // Clamp to valid texture coordinates
        advectedPos = clamp(advectedPos, 0.0, 1.0);
        
        // Sample source at advected position
        vec4 source = texture(uSource, advectedPos);
        
        // Apply dissipation
        color = source * uDissipation;
      }
    `,
    attributes: { position: quadVertices },
    elements: quadIndices,
    uniforms: {
      uVelocity: (context, props) => props.velocity,
      uSource: (context, props) => props.source,
      // uResolution: () => [simWidth, simHeight],
      uDeltaTime: (context) => Math.min(context.deltaTime, 0.016), // Cap at 60fps
      uDissipation: () => 0.98 // How much the field decays over time
    },
    framebuffer: (context, props) => props.target,
    viewport: {
      width: () => simWidth,
      height: () => simHeight
    }
  });
  
  // Add velocity forces shader - adds velocity at mouse position
  const addVelocity = bagl<{ velocity: any; target: any }>({
    vert: `
      #version 300 es
      precision mediump float;
      in vec2 position;
      out vec2 vTexCoord;
      void main() {
        vTexCoord = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;
      in vec2 vTexCoord;
      uniform sampler2D uVelocity;
      uniform vec2 uMouse;
      uniform vec2 uPrevMouse;
      uniform vec2 uResolution;
      out vec4 color;
      
      void main() {
        vec2 uv = vTexCoord;
        vec2 mouse = uMouse;
        vec2 prevMouse = uPrevMouse;
        
        // Sample existing velocity
        vec4 vel = texture(uVelocity, uv);
        
        // Calculate mouse velocity
        vec2 mouseVel = mouse - prevMouse;
        
        // Distance from mouse
        vec2 diff = uv - mouse;
        float dist = length(diff);
        
        // Add force at mouse position
        float force = exp(-dist * 15.0) * 0.5;
        if (dist > 0.001) {
          vel.xy += normalize(diff) * force * 0.1;
        }
        vel.xy += mouseVel * force * 2.0;
        
        color = vec4(vel.xy, 0.0, 1.0);
      }
    `,
    attributes: { position: quadVertices },
    elements: quadIndices,
    uniforms: {
      uVelocity: (context, props) => props.velocity,
      uMouse: () => [mouseX, mouseY],
      uPrevMouse: () => [prevMouseX, prevMouseY],
      // uResolution: () => [simWidth, simHeight]
    },
    framebuffer: (context, props) => props.target,
    viewport: {
      width: () => simWidth,
      height: () => simHeight
    }
  });
  
  // Add density shader - adds density at mouse position
  const addDensity = bagl<{ density: any; target: any }>({
    vert: `
      #version 300 es
      precision mediump float;
      in vec2 position;
      out vec2 vTexCoord;
      void main() {
        vTexCoord = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;
      in vec2 vTexCoord;
      uniform sampler2D uDensity;
      uniform vec2 uMouse;
      uniform vec2 uResolution;
      uniform float uTime;
      out vec4 color;
      
      void main() {
        vec2 uv = vTexCoord;
        vec4 density = texture(uDensity, uv);
        
        // Add density at mouse position
        vec2 diff = uv - uMouse;
        float dist = length(diff);
        float force = exp(-dist * 15.0) * 0.5;
        
        if (force > 0.01) {
          density.rgb += vec3(
            0.5 + 0.5 * sin(uTime * 2.0),
            0.5 + 0.5 * sin(uTime * 2.0 + 2.0),
            0.5 + 0.5 * sin(uTime * 2.0 + 4.0)
          ) * force * 0.3;
        }
        
        color = density;
      }
    `,
    attributes: { position: quadVertices },
    elements: quadIndices,
    uniforms: {
      uDensity: (context, props) => props.density,
      uMouse: () => [mouseX, mouseY],
      // uResolution: () => [simWidth, simHeight],
      uTime: (context) => context.time
    },
    framebuffer: (context, props) => props.target,
    viewport: {
      width: () => simWidth,
      height: () => simHeight
    }
  });
  
  // Display shader - renders density to screen
  const display = bagl<{ density: any }>({
    vert: `
      #version 300 es
      precision mediump float;
      in vec2 position;
      out vec2 vTexCoord;
      void main() {
        vTexCoord = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;
      in vec2 vTexCoord;
      uniform sampler2D uDensity;
      uniform vec2 uResolution;
      out vec4 color;
      
      // Reinhard tone mapping
      vec3 reinhardToneMap(vec3 color) {
        return color / (1.0 + color);
      }
      
      // Gamma correction
      vec3 gammaCorrect(vec3 color) {
        return pow(color, vec3(1.0 / 2.2));
      }
      
      void main() {
        vec2 uv = vTexCoord;
        vec3 col = texture(uDensity, uv).rgb;
        
        // Apply tone mapping to prevent overblown colors
        col = reinhardToneMap(col);
        
        // Apply gamma correction for proper display
        col = gammaCorrect(col);
        
        color = vec4(col, 1.0);
      }
    `,
    attributes: { position: quadVertices },
    elements: quadIndices,
    uniforms: {
      uDensity: (context, props) => props.density,
      // uResolution: (context) => [context.width, context.height]
    }
  });
  
  // Ping-pong state
  let velocityRead = velocityA;
  let velocityWrite = velocityB;
  let densityRead = densityA;
  let densityWrite = densityB;
  
  // Render function
  function render() {
    // Step 1: Advect velocity (read from velocityRead, write to velocityWrite)
    bagl.state({ framebuffer: velocityWrite }, () => {
      bagl.clear({ color: [0, 0, 0, 0] });
      advect({
        velocity: velocityRead,
        source: velocityRead,
        target: velocityWrite
      });
    });
    // Swap velocity buffers
    [velocityRead, velocityWrite] = [velocityWrite, velocityRead];
    
    // Step 2: Advect density (read from densityRead, write to densityWrite)
    bagl.state({ framebuffer: densityWrite }, () => {
      bagl.clear({ color: [0, 0, 0, 0] });
      advect({
        velocity: velocityRead,
        source: densityRead,
        target: densityWrite
      });
    });
    // Swap density buffers
    [densityRead, densityWrite] = [densityWrite, densityRead];
    
    // Step 3: Add forces at mouse position
    if (mouseDown) {
      // Add velocity force
      bagl.state({ framebuffer: velocityWrite }, () => {
        bagl.clear({ color: [0, 0, 0, 0] });
        addVelocity({
          velocity: velocityRead,
          target: velocityWrite
        });
      });
      // Swap velocity buffers
      [velocityRead, velocityWrite] = [velocityWrite, velocityRead];
      
      // Add density
      bagl.state({ framebuffer: densityWrite }, () => {
        bagl.clear({ color: [0, 0, 0, 0] });
        addDensity({
          density: densityRead,
          target: densityWrite
        });
      });
      // Swap density buffers
      [densityRead, densityWrite] = [densityWrite, densityRead];
    }
    
    // Update previous mouse position after processing
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    
    // Step 4: Render to screen
    bagl.clear({ color: [0, 0, 0, 1] });
    display({ density: densityRead });
  }
  
  return { bagl, render };
} 