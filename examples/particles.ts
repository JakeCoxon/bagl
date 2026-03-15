import { createBagl } from '../src/index';

export function createParticleExample() {
  const bagl = createBagl({
    disableBatching: true
  });
  
  // Particle system parameters
  const PARTICLE_COUNT = 1000;
  const MAX_PARTICLES = 2000;
  
  // Create particle data buffers
  const positions = bagl.buffer({
    data: new Float32Array(MAX_PARTICLES * 2), // x, y for each particle
    size: 2,
    usage: 'dynamic'
  });

  const velocities = bagl.buffer({
    data: new Float32Array(MAX_PARTICLES * 2), // vx, vy for each particle
    size: 2,
    usage: 'dynamic'
  });

  const lifetimes = bagl.buffer({
    data: new Float32Array(MAX_PARTICLES), // lifetime for each particle
    size: 1,
    usage: 'dynamic'
  });

  const colors = bagl.buffer({
    data: new Float32Array(MAX_PARTICLES * 3), // r, g, b for each particle
    size: 3,
    usage: 'dynamic'
  });

  // Create framebuffer for particle rendering
  const particleFBO = bagl.framebuffer({
    width: 800,
    height: 600,
    internalFormat: 'rgba16f', // 16-bit floating point for high dynamic range
    type: 'float'
  });

  // Create a full-screen quad for post-processing
  const screenQuad = bagl.buffer({
    data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    size: 2
  });

  // Reusable arrays for particle data
  const posData = new Float32Array(MAX_PARTICLES * 2);
  const velData = new Float32Array(MAX_PARTICLES * 2);
  const lifeData = new Float32Array(MAX_PARTICLES);
  const colData = new Float32Array(MAX_PARTICLES * 3);
  const originalColData = new Float32Array(MAX_PARTICLES * 3); // Store original colors

  // Mouse tracking
  let mousePos: [number, number] = [0.5, 0.5];

  // Helper function to generate colorful particle colors
  function generateParticleColor(): [number, number, number] {
    const colorScheme = Math.floor(Math.random() * 4);
    switch (colorScheme) {
      case 0: // Warm (red/orange/yellow)
        return [
          0.8 + Math.random() * 0.2,     // Red
          0.3 + Math.random() * 0.4,     // Green
          0.1 + Math.random() * 0.2      // Blue
        ];
      case 1: // Cool (blue/cyan/purple)
        return [
          0.1 + Math.random() * 0.3,     // Red
          0.4 + Math.random() * 0.4,     // Green
          0.8 + Math.random() * 0.2      // Blue
        ];
      case 2: // Green/teal
        return [
          0.1 + Math.random() * 0.2,     // Red
          0.7 + Math.random() * 0.3,     // Green
          0.6 + Math.random() * 0.3      // Blue
        ];
      case 3: // Pink/magenta
        return [
          0.8 + Math.random() * 0.2,     // Red
          0.2 + Math.random() * 0.3,     // Green
          0.7 + Math.random() * 0.3      // Blue
        ];
      default:
        return [1, 1, 1];
    }
  }

  // Initialize particles
  function initParticles() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      // Random positions in a circle
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.3;
      posData[i * 2] = Math.cos(angle) * radius;
      posData[i * 2 + 1] = Math.sin(angle) * radius;

      // Random velocities
      velData[i * 2] = (Math.random() - 0.5) * 0.01;
      velData[i * 2 + 1] = (Math.random() - 0.5) * 0.01;

      // Random lifetimes
      lifeData[i] = Math.random() * 5.0 + 1.0;

      // More colorful particles - use different color schemes
      const [r, g, b] = generateParticleColor();
      colData[i * 3] = r;
      colData[i * 3 + 1] = g;
      colData[i * 3 + 2] = b;
      originalColData[i * 3] = r;
      originalColData[i * 3 + 1] = g;
      originalColData[i * 3 + 2] = b;
    }

    positions.subdata(posData);
    velocities.subdata(velData);
    lifetimes.subdata(lifeData);
    colors.subdata(colData);
  }

  // Update particles (CPU-based for simplicity)
  function updateParticles(context: any, mousePos: [number, number] = [0, 0]) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      // Get current particle data from our reusable arrays
      const px = posData[i * 2];
      const py = posData[i * 2 + 1];
      const vx = velData[i * 2];
      const vy = velData[i * 2 + 1];
      let life = lifeData[i];

      // Update lifetime
      life -= context.deltaTime;

      // Reset particle if dead
      if (life <= 0) {
        // Reset to center with random velocity
        posData[i * 2] = (Math.random() - 0.5) * 0.1;
        posData[i * 2 + 1] = (Math.random() - 0.5) * 0.1;
        velData[i * 2] = (Math.random() - 0.5) * 0.02;
        velData[i * 2 + 1] = (Math.random() - 0.5) * 0.02;
        lifeData[i] = Math.random() * 5.0 + 1.0;
        
        // Random colorful color
        const [r, g, b] = generateParticleColor();
        colData[i * 3] = r;
        colData[i * 3 + 1] = g;
        colData[i * 3 + 2] = b;
        originalColData[i * 3] = r;
        originalColData[i * 3 + 1] = g;
        originalColData[i * 3 + 2] = b;
      } else {
        // Update position
        let newPx = px + vx;
        let newPy = py + vy;

        // Mouse attraction
        const mouseX = mousePos[0] * 2 - 1; // Convert to [-1, 1]
        const mouseY = -(mousePos[1] * 2 - 1); // Convert to [-1, 1] and flip Y
        
        const dx = mouseX - newPx;
        const dy = mouseY - newPy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0.01 && dist < 0.5) {
          const force = 0.0001 / (dist * dist);
          velData[i * 2] = vx + dx * force;
          velData[i * 2 + 1] = vy + dy * force;
        } else {
          velData[i * 2] = vx;
          velData[i * 2 + 1] = vy;
        }

        // Add some damping
        velData[i * 2] *= 0.99;
        velData[i * 2 + 1] *= 0.99;

        // Keep particles in bounds
        if (Math.abs(newPx) > 1.5) {
          newPx = Math.sign(newPx) * 1.5;
          velData[i * 2] *= -0.5;
        }
        if (Math.abs(newPy) > 1.5) {
          newPy = Math.sign(newPy) * 1.5;
          velData[i * 2 + 1] *= -0.5;
        }

        posData[i * 2] = newPx;
        posData[i * 2 + 1] = newPy;
        lifeData[i] = life;
        
        // Fade color based on lifetime but keep it vibrant
        const fade = Math.max(0.3, life / 5.0); // Don't fade below 30% brightness
        // Store the original colors and apply fade properly
        const originalR = originalColData[i * 3];
        const originalG = originalColData[i * 3 + 1];
        const originalB = originalColData[i * 3 + 2];
        colData[i * 3] = originalR * fade;
        colData[i * 3 + 1] = originalG * fade;
        colData[i * 3 + 2] = originalB * fade;
      }
    }

    // Update GPU buffers with the modified data
    positions.subdata(posData);
    velocities.subdata(velData);
    lifetimes.subdata(lifeData);
    colors.subdata(colData);
  }

  // Create particle draw command
  const drawParticles = bagl({
    vert: `
      #version 300 es
      precision mediump float;
      
      in vec2 position;
      in vec2 velocity;
      in float lifetime;
      in vec3 color;
      
      uniform float time;
      uniform vec2 resolution;
      
      out vec3 vColor;
      out float vLifetime;
      
      void main() {
        // Calculate particle size based on lifetime and velocity
        float size = 0.01 + 0.02 * (1.0 - lifetime / 5.0);
        size += length(velocity) * 100.0; // Size based on speed
        
        // Calculate final position
        vec2 pos = position;
        
        // Add some wave motion
        pos.x += sin(time * 2.0 + position.x * 10.0) * 0.01;
        pos.y += cos(time * 1.5 + position.y * 10.0) * 0.01;
        
        gl_Position = vec4(pos, 0.0, 1.0);
        gl_PointSize = size * resolution.y; // Scale with screen height
        
        vColor = color;
        vLifetime = lifetime;
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;
      
      in vec3 vColor;
      in float vLifetime;
      
      out vec4 color;
      
      void main() {
        // Create a circular particle
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        
        if (dist > 0.5) {
          discard; // Outside circle
        }
        
        // Soft edge with more intensity for additive blending
        float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
        
        // Fade based on lifetime
        alpha *= smoothstep(0.0, 0.2, vLifetime) * smoothstep(5.0, 0.0, vLifetime);
        
        // Add glow effect for additive blending
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        glow *= 0.8;
        
        // Calculate final color with glow - no tonemapping here
        vec3 finalColor = vColor * (alpha + glow);
        
        // For additive blending, we output the color directly (no alpha)
        color = vec4(finalColor, 1.0);
      }
    `,
    framebuffer: (c, p) => p.framebuffer as any,
    attributes: {
      position: positions,
      velocity: velocities,
      lifetime: lifetimes,
      color: colors
    },
    uniforms: {
      time: (context, props) => context.time,
      resolution: (context, props) => [context.width, context.height]
    },
    blend: {
      enable: true,
      func: ['one', 'one']
    },
    count: PARTICLE_COUNT,
    primitive: 'points'
  });

  // Post-processing command with tonemapping
  const postProcess = bagl({
    vert: `
      #version 300 es
      precision mediump float;
      
      in vec2 position;
      out vec2 vTexCoord;
      
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
        vTexCoord = position * 0.5 + 0.5;
      }
    `,
    frag: `
      #version 300 es
      precision mediump float;
      
      in vec2 vTexCoord;
      out vec4 color;
      
      uniform sampler2D particleTexture;
      uniform float exposure;
      
      // Reinhard tonemapping function
      vec3 reinhardTonemap(vec3 color) {
        return color / (1.0 + color);
      }
      
      // ACES tonemapping (more aggressive)
      vec3 acesTonemap(vec3 color) {
        const float a = 2.51;
        const float b = 0.03;
        const float c = 2.43;
        const float d = 0.59;
        const float e = 0.14;
        return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
      }
      
      void main() {
        // Sample the particle texture (additive blended result)
        vec3 particleColor = texture(particleTexture, vTexCoord).rgb;
        
        // Apply exposure
        particleColor *= exposure;
        
        // Apply Reinhard tonemapping to the final composited result
        vec3 finalColor = acesTonemap(particleColor);
        
        // Add some gamma correction for better display
        finalColor = pow(finalColor, vec3(1.0 / 2.2));
        
        color = vec4(finalColor, 1.0);
      }
    `,
    attributes: {
      position: screenQuad
    },
    uniforms: {
      particleTexture: (context, props) => particleFBO,
      exposure: (context, props) => 0.3
    },
    count: 4,
    primitive: 'triangle-strip'
  });

  // Initialize particles
  initParticles();

  bagl.onAttach((gl) => {
    const canvas = gl.canvas as HTMLCanvasElement;
    if (!canvas) throw new Error('bagl: canvas not found');

    const mouseListener = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mousePos = [x, y];
    };
    canvas.addEventListener('mousemove', mouseListener);
    
    // Return cleanup function
    return () => {
      canvas.removeEventListener('mousemove', mouseListener);
    };
  });

  function render() {
    updateParticles(bagl.context, mousePos);
    
    // Pass 1: Render particles to framebuffer with additive blending
    bagl.clear({ framebuffer: particleFBO, color: [0, 0, 0, 1] });
    drawParticles({ framebuffer: particleFBO });
    
    // Pass 2: Post-process with tonemapping
    bagl.clear({ color: [0.05, 0.05, 0.1, 1] }); // Dark background
    postProcess();
  }

  return { 
    bagl, 
    render
  };
} 