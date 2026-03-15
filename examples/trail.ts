import { createBagl } from '../src/index';

export function createTrailExample() {
  const bagl = createBagl();
  
  // Mouse tracking
  let mouseX = 0.5;
  let mouseY = 0.5;
  let prevMouseX = 0.5;
  let prevMouseY = 0.5;
  let shouldDrawTrail = false;
  let mouseVelocity = 0.0;
  
  // Movement threshold (in normalized coordinates, 0-1)
  const movementThreshold = 0.0002; // Adjust this to change sensitivity
  const maxVelocity = 0.1; // Maximum velocity for radius scaling
  
  // Framebuffers (created in onAttach)
  let trailA: ReturnType<typeof bagl.framebuffer> | null = null;
  let trailB: ReturnType<typeof bagl.framebuffer> | null = null;
  let trailRead: ReturnType<typeof bagl.framebuffer> | null = null;
  let trailWrite: ReturnType<typeof bagl.framebuffer> | null = null;
  
  bagl.onAttach(() => {
    const canvas = bagl.gl?.canvas;
    if (!canvas) return;
    
    // Create ping-pong framebuffers for the trail
    trailA = bagl.framebuffer({
      color: 1,
      width: canvas.width,
      height: canvas.height
    });
    
    trailB = bagl.framebuffer({
      color: 1,
      width: canvas.width,
      height: canvas.height
    });
    
    trailRead = trailA;
    trailWrite = trailB;
    
    if ('getBoundingClientRect' in canvas) {
      const updateMouse = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        prevMouseX = mouseX;
        prevMouseY = mouseY;
        const newMouseX = (e.clientX - rect.left) / rect.width;
        const newMouseY = 1.0 - (e.clientY - rect.top) / rect.height; // Flip Y
        
        // Calculate movement distance
        const dx = newMouseX - mouseX;
        const dy = newMouseY - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate velocity (distance per frame) and cap at maximum
        mouseVelocity = Math.min(distance, maxVelocity);
        
        // Only draw trail if movement exceeds threshold
        shouldDrawTrail = distance > movementThreshold;
        
        mouseX = newMouseX;
        mouseY = newMouseY;
      };
      
      canvas.addEventListener('mousemove', updateMouse);
      
      // Return cleanup function
      return () => {
        canvas.removeEventListener('mousemove', updateMouse);
      };
    }
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
  
  // Shader to fade the trail and add new mouse position
  const updateTrail = bagl<{ source: any; target: any }>({
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
      uniform sampler2D uSource;
      uniform vec2 uMouse;
      uniform vec2 uPrevMouse;
      uniform vec2 uResolution;
      uniform float uFade;
      uniform float uShouldDrawTrail;
      uniform float uVelocity;
      out vec4 color;
      
      void main() {
        vec2 uv = vTexCoord;
        
        // Sample previous frame and fade it
        vec4 prev = texture(uSource, uv);
        prev.rgb *= uFade;
        prev.a *= uFade;
        
        // Only draw new trail if mouse moved enough
        float totalTrail = 0.0;
        if (uShouldDrawTrail > 0.5) {
          // Calculate mouse position in texture coordinates
          vec2 mouse = uMouse;
          vec2 prevMouse = uPrevMouse;
          
          // Calculate velocity-based radius multiplier (1.0 = base, higher = larger radius)
          // Velocity is normalized, so we scale it and add 1.0 for base size
          float velocityMultiplier = 1.0 + uVelocity * 5.0; // Scale velocity effect
          
          // Draw trail at current mouse position
          vec2 diff = uv - mouse;
          float dist = length(diff);
          
          // Create a smooth circular trail point with velocity-scaled radius
          // Higher velocity = larger radius (divide distance by multiplier)
          float trail = exp(-dist * 20.0 / velocityMultiplier) * 0.8;
          
          // Also draw a line between previous and current mouse position
          vec2 lineDir = normalize(mouse - prevMouse);
          vec2 toPoint = uv - prevMouse;
          float lineDist = length(toPoint - lineDir * dot(toPoint, lineDir));
          float lineLength = length(mouse - prevMouse);
          float lineT = dot(toPoint, lineDir) / max(lineLength, 0.001);
          
          float lineTrail = 0.0;
          if (lineLength > 0.001 && lineT >= 0.0 && lineT <= 1.0) {
            // Apply velocity scaling to line trail as well
            lineTrail = exp(-lineDist * 30.0 / velocityMultiplier) * (1.0 - abs(lineT - 0.5) * 2.0) * 0.6;
          }
          
          // Combine trail effects
          totalTrail = max(trail, lineTrail);
        }
        
        // Add colorful trail based on mouse movement
        vec3 trailColor = vec3(
          0.5 + 0.5 * sin(uMouse.x * 10.0),
          0.5 + 0.5 * sin(uMouse.y * 10.0 + 2.0),
          0.5 + 0.5 * sin((uMouse.x + uMouse.y) * 5.0 + 4.0)
        );
        
        // Combine faded previous frame with new trail
        color = prev + vec4(trailColor * totalTrail, totalTrail);
      }
    `,
    attributes: {
      position: quadVertices
    },
    elements: quadIndices,
    uniforms: {
      uSource: (context, props) => props.source,
      uMouse: () => [mouseX, mouseY],
      uPrevMouse: () => [prevMouseX, prevMouseY],
      // uResolution: (context) => [context.width, context.height],
      uFade: () => 0.99, // Fade rate (0.99 = fade 1% per frame)
      uShouldDrawTrail: () => shouldDrawTrail ? 1.0 : 0.0,
      uVelocity: () => mouseVelocity
    },
    framebuffer: (context, props) => props.target,
    viewport: {
      width: (context) => context.width,
      height: (context) => context.height
    }
  });
  
  // Compositing shader to render trail to canvas with effects
  const compositeTrail = bagl({
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
      uniform sampler2D uTrail;
      uniform vec2 uResolution;
      uniform float uTime;
      out vec4 color;
      
      void main() {
        vec2 uv = vTexCoord;
        
        // Sample the trail texture
        vec4 trail = texture(uTrail, uv);
        
        // Apply a subtle blur effect by sampling nearby pixels
        vec2 pixelSize = 1.0 / uResolution;
        vec4 blur = vec4(0.0);
        float total = 0.0;
        
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            vec2 offset = vec2(float(x), float(y)) * pixelSize * 2.0;
            float weight = 1.0 / (1.0 + float(x*x + y*y));
            blur += texture(uTrail, uv + offset) * weight;
            total += weight;
          }
        }
        blur /= total;
        
        // Mix original with blur for glow effect
        vec4 glow = mix(trail, blur, 0.3);
        
        // Add color shift based on position and time
        vec3 shifted = glow.rgb;
        shifted.r += sin(uv.x * 5.0 + uTime) * 0.1;
        shifted.g += sin(uv.y * 5.0 + uTime + 2.0) * 0.1;
        shifted.b += sin((uv.x + uv.y) * 3.0 + uTime + 4.0) * 0.1;
        
        // Add vignette effect
        vec2 center = vec2(0.5);
        float dist = distance(uv, center);
        float vignette = 1.0 - smoothstep(0.3, 0.8, dist) * 0.3;
        
        // Add scanline effect
        float scanline = sin(uv.y * uResolution.y * 0.5 + uTime * 2.0) * 0.05 + 0.95;
        
        // Combine all effects
        vec3 finalColor = shifted * vignette * scanline;
        
        // Dark background with trail overlay
        vec3 bgColor = vec3(0.05, 0.05, 0.1);
        finalColor = bgColor + finalColor * glow.a;
        
        color = vec4(finalColor, 1.0);
      }
    `,
    attributes: {
      position: quadVertices
    },
    elements: quadIndices,
    uniforms: {
      uTrail: (context) => trailRead?.colorTexture(0)!,
      uResolution: (context) => [context.width, context.height],
      uTime: (context) => context.time
    }
  });
  
  // Render function
  function render() {
    if (!trailRead || !trailWrite) return;
    
    const read = trailRead;
    const write = trailWrite;
    
    // Update trail framebuffer: fade previous frame and add new mouse position
    bagl.state({ framebuffer: write }, () => {
      bagl.clear({ color: [0, 0, 0, 0] }); // Clear with transparent
      updateTrail({ 
        source: read.colorTexture(0)!, 
        target: write 
      });
    });
    
    // Reset trail flag after rendering
    shouldDrawTrail = false;
    
    // Swap buffers for next frame
    [trailRead, trailWrite] = [trailWrite, trailRead];
    
    // Composite trail to canvas with effects
    bagl.clear({ color: [0, 0, 0, 1] });
    compositeTrail();
  }
  
  return { bagl, render };
}
