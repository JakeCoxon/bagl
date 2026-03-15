import { createBagl } from '../src/index';

export function createFramebufferExample() {
  const bagl = createBagl({
    // disableBatching: true
  });
  
  // Create a framebuffer for render-to-texture
  const fbo = bagl.framebuffer({
    color: 1,
    depth: true,
    width: 800,
    height: 600
  });

  // Create vertex buffer for animated triangles
  const triangleVertices = bagl.buffer({
    data: new Float32Array([
      // Triangle 1
      -0.8, -0.8,
       0.0, -0.8,
      -0.4,  0.2,
      
      // Triangle 2
       0.2, -0.6,
       0.8, -0.6,
       0.5,  0.4,
      
      // Triangle 3
      -0.6,  0.2,
       0.0,  0.2,
      -0.3,  0.8,
      
      // Triangle 4
       0.4,  0.4,
       0.8,  0.4,
       0.6,  0.8
    ]),
    size: 2
  });

  // Create vertex buffer for a full-screen quad
  const quadVertices = bagl.buffer({
    data: new Float32Array([
      -1, -1,  // bottom left
       1, -1,  // bottom right
       1,  1,  // top right
      -1,  1   // top left
    ]),
    size: 2
  });

  // Create index buffer for the quad
  const quadIndices = bagl.elements({
    data: new Uint16Array([0, 1, 2, 0, 2, 3])
  });

  // Draw command for rendering triangles to framebuffer
  const drawTriangles = bagl({
    vert: `
      #version 300 es
      precision mediump float;
      in vec2 position;
      uniform float time;
      void main() {
        vec2 pos = position;
        // Add some animation
        pos.x += sin(time + position.x * 2.0) * 0.05;
        pos.y += cos(time + position.y * 2.0) * 0.05;
        gl_Position = vec4(pos, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;
      uniform float time;
      out vec4 color;
      void main() {
        // Create colorful animated triangles
        vec3 col1 = vec3(0.8 + 0.2 * sin(time), 0.3 + 0.3 * cos(time * 0.7), 0.5 + 0.5 * sin(time * 1.3));
        vec3 col2 = vec3(0.3 + 0.3 * cos(time * 0.5), 0.8 + 0.2 * sin(time * 1.1), 0.4 + 0.4 * sin(time * 0.9));
        vec3 col3 = vec3(0.6 + 0.4 * sin(time * 0.8), 0.2 + 0.2 * cos(time * 1.2), 0.9 + 0.1 * sin(time * 0.6));
        
        // Mix colors based on position
        vec2 uv = gl_FragCoord.xy / vec2(800.0, 600.0);
        vec3 finalColor = mix(col1, col2, uv.x);
        finalColor = mix(finalColor, col3, uv.y);
        
        color = vec4(finalColor, 1.0);
      }
    `,
    attributes: {
      position: triangleVertices
    },
    uniforms: {
      time: (context, props) => context.time
    },
    framebuffer: fbo,
    viewport: {
      width: (context, props) => fbo.width,
      height: (context, props) => fbo.height
    },
    count: 12 // 4 triangles * 3 vertices
  });

  // Draw command for rendering the framebuffer texture to screen with post-processing
  const drawPostProcess = bagl({
    vert: `
      #version 300 es
      precision mediump float;
      in vec2 position;
      out vec2 vTexCoord;
      void main() {
        vTexCoord = position * 0.5 + 0.5; // Convert from [-1,1] to [0,1]
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;
      in vec2 vTexCoord;
      uniform sampler2D uTexture;
      uniform float time;
      uniform vec2 resolution;
      out vec4 color;
      
      void main() {
        vec2 uv = vTexCoord;
        
        // Apply wave distortion
        float wave = sin(uv.x * 10.0 + time * 2.0) * 0.01;
        uv.y += wave;
        
        // Sample the texture
        vec4 texColor = texture(uTexture, uv);
        
        // Apply color grading
        vec3 graded = texColor.rgb;
        graded.r = pow(graded.r, 1.1); // Boost reds
        graded.g = pow(graded.g, 0.9); // Reduce greens
        graded.b = pow(graded.b, 1.2); // Boost blues
        
        // Add vignette effect
        vec2 center = vec2(0.5);
        float dist = distance(uv, center);
        float vignette = 1.0 - smoothstep(0.3, 0.7, dist);
        
        // Add scanlines
        float scanline = sin(uv.y * resolution.y * 0.5 + time * 3.0) * 0.1 + 0.9;
        
        // Combine effects
        vec3 finalColor = graded * vignette * scanline;
        
        color = vec4(finalColor, 1.0);
      }
    `,
    attributes: {
      position: quadVertices
    },
    elements: quadIndices,
    uniforms: {
      uTexture: fbo, // Pass framebuffer directly - texture will be extracted automatically
      time: (context, props) => context.time,
      resolution: (context, props) => [context.width, context.height]
    },
  });

  // Render function
  function render() {
    // First pass: render triangles to framebuffer
    bagl.clear({ color: [0.1, 0.1, 0.1, 1], depth: 1 });
    drawTriangles();
    
    // Second pass: render framebuffer texture to screen with post-processing
    bagl.clear({ color: [0, 0, 0, 1] });
    drawPostProcess();
  }

  return { bagl, render };
} 