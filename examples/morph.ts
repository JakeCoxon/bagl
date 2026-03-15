import { createBagl } from '../src/index';

export function createMorphExample() {
  const bagl = createBagl();
  
  // Mouse tracking
  let mouseX = 0.5;
  let mouseY = 0.5;
  
  bagl.onAttach(() => {
    const canvas = bagl.gl?.canvas;
    if (canvas && 'getBoundingClientRect' in canvas) {
      const updateMouse = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) / rect.width;
        mouseY = 1.0 - (e.clientY - rect.top) / rect.height; // Flip Y
      };
      
      canvas.addEventListener('mousemove', updateMouse);
      
      // Return cleanup function
      return () => {
        canvas.removeEventListener('mousemove', updateMouse);
      };
    }
  });
  
  // Full-screen quad
  const quad = bagl.buffer({
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

  // Perlin noise gradient shader
  const drawGradient = bagl({
    vert: `
      #version 300 es
      precision mediump float;
      in vec2 position;
      out vec2 vUv;
      
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;
      
      in vec2 vUv;
      out vec4 color;
      
      uniform float time;
      uniform vec2 mouse;
      uniform vec2 resolution;
      
      // Hash function for pseudo-random values
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      // 2D Perlin noise
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f); // Smooth interpolation
        
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      
      // Fractal Brownian Motion (fBm) - multiple octaves of noise
      float fbm(vec2 p, int octaves) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        for (int i = 0; i < octaves; i++) {
          value += amplitude * noise(p * frequency);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        
        return value;
      }
      
      // Cosine palette - creates smooth color gradients with different hues
      vec3 cosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
        return a + b * cos(6.28318 * (c * t + d));
      }
      
      void main() {
        vec2 uv = vUv;
        vec2 aspect = vec2(resolution.x / resolution.y, 1.0);
        vec2 coord = uv * aspect;
        
        // Mouse influence - distance from mouse
        vec2 mouseCoord = mouse * aspect;
        float dist = distance(coord, mouseCoord);
        float mouseInfluence = 1.0 - smoothstep(0.0, 0.5, dist);
        
        // Morph the domain (coordinates) when mouse is close
        vec2 morphedCoord = coord;
        
        if (mouseInfluence > 0.0) {
          // Minimal rotation - just a subtle amount
          float angle = mouseInfluence * 0.3;
          float scale = 1.0 + mouseInfluence * 0.4;
          
          // Create rotation matrix
          float cosAngle = cos(angle);
          float sinAngle = sin(angle);
          mat2 rot = mat2(cosAngle, -sinAngle, sinAngle, cosAngle);
          
          // Warp coordinates: slight rotation and scale relative to mouse position
          vec2 relativeCoord = coord - mouseCoord;
          vec2 warpedCoord = rot * relativeCoord * scale + mouseCoord;
          
          // Add domain distortion using noise
          vec2 noiseOffset = vec2(
            fbm(warpedCoord * 2.0 + vec2(time * 0.1, time * 0.15), 3),
            fbm(warpedCoord * 2.0 - vec2(time * 0.12, time * 0.08), 3)
          ) * mouseInfluence * 0.4;
          
          // Mix between original and warped domain
          morphedCoord = mix(coord, warpedCoord + noiseOffset, mouseInfluence);
        }
        
        // Sample noise with morphed coordinates
        float n1 = fbm(morphedCoord * 2.0 + vec2(0.0 * 0.1, 0.0 * 0.15), 4);
        float n2 = fbm(morphedCoord * 3.0 - vec2(0.0 * 0.1, 0.0 * 0.15), 4);
        float n3 = fbm(morphedCoord * 1.5 + vec2(0.0 * 0.1, 0.0 * 0.15), 3);
        float noiseValue = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
        
        // Remap noise value for better contrast distribution
        noiseValue = smoothstep(0.0, 1.0, noiseValue);
        noiseValue = pow(noiseValue, 0.8); // Slight curve for more mid-tone detail
        
        // Use cosine palette with high contrast and vibrant hues
        // Parameters: offset, amplitude, frequency, phase (hue shift)
        vec3 a = vec3(0.3, 0.2, 0.4);      // Offset - darker base for contrast
        vec3 b = vec3(0.7, 0.8, 0.9);     // Amplitude - higher for more vibrant colors
        vec3 c = vec3(1.0, 1.0, 1.0);     // Frequency
        vec3 d = vec3(0.0, 0.25, 0.5);    // Phase shift - creates purple/blue/cyan gradient
        
        vec3 finalColor = cosinePalette(noiseValue, a, b, c, d);
        
        // Strong contrast enhancement
        finalColor = pow(finalColor, vec3(0.75));
        
        // Additional contrast boost
        finalColor = (finalColor - 0.1) / 0.9; // Stretch contrast
        finalColor = clamp(finalColor, 0.0, 1.0);
        
        color = vec4(finalColor, 1.0);
      }
    `,
    attributes: {
      position: quad
    },
    elements: quadIndices,
    uniforms: {
      time: (context) => context.time,
      mouse: (context) => [mouseX, mouseY],
      resolution: (context) => [context.width, context.height]
    }
  });

  // Render function
  function render() {
    bagl.clear({ color: [0.05, 0.05, 0.1, 1] });
    drawGradient();
  }

  return { bagl, render };
} 