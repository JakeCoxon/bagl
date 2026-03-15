import { createBagl } from '../src/index';

export function createTrailNormalExample() {
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
  
  // Shader to fade the trail and add new mouse position with normal map
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
        vec3 newNormal = vec3(0.0, 0.0, 1.0); // Default normal (pointing up)
        
        if (uShouldDrawTrail > 0.5) {
          // Calculate mouse position in texture coordinates
          vec2 mouse = uMouse;
          vec2 prevMouse = uPrevMouse;
          
          // Calculate movement direction
          vec2 moveDir = mouse - prevMouse;
          float moveLength = length(moveDir);
          
          // Calculate velocity-based radius multiplier (capped to prevent large rings)
          float velocityMultiplier = 1.0 + uVelocity * 2.0; // Reduced from 5.0 to 2.0
          velocityMultiplier = min(velocityMultiplier, 1.3); // Cap at 1.3 to prevent huge rings
          
          // Draw trail at current mouse position
          vec2 diff = uv - mouse;
          float dist = length(diff);
          float trail = exp(-dist * 20.0 / velocityMultiplier) * 0.8;
          
          totalTrail = trail;
          
          // Generate normal map based on movement direction
          if (moveLength > 0.001 && trail > 0.01) {
            // Create a rounded, spherical normal at mouse point
            // Use smooth falloff for more rounded appearance
            // Scale the smoothstep range with velocity to match trail size
            float normalRadius = 0.3 * velocityMultiplier;
            float smoothDist = smoothstep(0.0, normalRadius, dist);
            float roundedFalloff = 1.0 - smoothDist;
            
            // Create a more rounded gradient that points outward
            // The gradient strength decreases smoothly with distance
            vec2 dir = normalize(diff);
            float strength = roundedFalloff * roundedFalloff; // Quadratic falloff for smoother curve
            vec2 gradient = dir * strength;
            
            // Add a slight Z component based on distance for more rounded 3D effect
            float zHeight = roundedFalloff * roundedFalloff * 0.3;
            
            // Create normal: X and Y from rounded gradient, Z from height
            vec3 normal = normalize(vec3(gradient, zHeight));
            newNormal = normal * 0.5 + 0.5; // Convert from -1..1 to 0..1
          } else {
            // Default normal if no trail
            newNormal = vec3(0.5, 0.5, 1.0);
          }
        }
        
        // Blend with previous normal map based on trail intensity
        vec3 prevNormal = prev.rgb * 2.0 - 1.0; // Convert from 0..1 to -1..1
        vec3 blendedNormal = normalize(mix(prevNormal, newNormal * 2.0 - 1.0, totalTrail));
        blendedNormal = blendedNormal * 0.5 + 0.5; // Convert back to 0..1
        
        // Store normal in RGB, intensity in alpha
        color = vec4(blendedNormal, prev.a + totalTrail);
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
  
  // Compositing shader to render trail to canvas using normal map for lighting
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
      uniform vec2 uMouse;
      out vec4 color;
      
      void main() {
        vec2 uv = vTexCoord;
        
        // Sample the normal map from trail texture
        vec4 trail = texture(uTrail, uv);
        
        // Convert normal from 0..1 range back to -1..1
        vec3 normal = trail.rgb * 2.0 - 1.0;
        normal = normalize(normal);
        
        float intensity = trail.a;
        
        // Animated light direction (orbiting around)
        vec3 lightDir = normalize(vec3(
          cos(uTime * 0.5) * 0.7,
          sin(uTime * 0.5) * 0.7,
          0.5
        ));
        
        // Also add a light that follows the mouse
        vec2 mouseDir = uv - uMouse;
        vec3 mouseLightDir = normalize(vec3(mouseDir * 2.0 - 1.0, 0.3));
        
        // Combine both lights
        vec3 combinedLightDir = normalize(lightDir + mouseLightDir * 0.5);
        
        // Calculate lighting using normal map
        float NdotL = max(dot(normal, combinedLightDir), 0.0);
        
        // Add specular highlight
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        vec3 reflectDir = reflect(-combinedLightDir, normal);
        float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        
        // Base color based on normal direction (for colorful effect)
        vec3 baseColor = vec3(
          0.5 + 0.5 * normal.x,
          0.5 + 0.5 * normal.y,
          0.5 + 0.5 * normal.z
        );
        
        // Apply lighting
        vec3 litColor = baseColor * (0.3 + NdotL * 0.7) + specular * 0.5;
        
        // Add rim lighting (edges glow)
        float rim = 1.0 - max(dot(normal, viewDir), 0.0);
        rim = pow(rim, 2.0);
        litColor += rim * vec3(0.3, 0.5, 1.0) * 0.3;
        
        // Add subtle color variation based on position
        litColor.r += sin(uv.x * 3.0 + uTime) * 0.1;
        litColor.g += sin(uv.y * 3.0 + uTime + 2.0) * 0.1;
        litColor.b += sin((uv.x + uv.y) * 2.0 + uTime + 4.0) * 0.1;
        
        // Vignette effect
        vec2 center = vec2(0.5);
        float dist = distance(uv, center);
        float vignette = 1.0 - smoothstep(0.3, 0.8, dist) * 0.2;
        
        // Apply intensity and vignette
        vec3 finalColor = litColor * intensity * vignette;
        
        // Dark background with trail overlay
        vec3 bgColor = vec3(0.05, 0.05, 0.1);
        finalColor = bgColor + finalColor;
        
        color = vec4(finalColor, 1.0);
      }
    `,
    attributes: {
      position: quadVertices
    },
    elements: quadIndices,
    uniforms: {
      uTrail: (context) => trailRead?.colorTexture(0)!,
      // uResolution: (context) => [context.width, context.height],
      uTime: (context) => context.time,
      uMouse: () => [mouseX, mouseY]
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
