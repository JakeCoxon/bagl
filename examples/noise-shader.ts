import { createBagl } from '../src/index';
import { Pane } from 'tweakpane';

export function createNoiseShaderExample() {
  const bagl = createBagl();

  const params = {
    uParticlePower: 4.0,
    uParticleIntensity: 3.5,
    uWarpStrength: 0.2,
    uNoiseScale: 3.0,
    uTimeScale: 0.5,
    uGlowIntensity: 0.5,
    uCircleRadius: 0.3,
  };

  const pane = (new Pane()) as any;
  const particleFolder = pane.addFolder({ title: 'Particles' });
  particleFolder.addBinding(params, 'uParticlePower', { min: 1, max: 8, step: 0.1 });
  particleFolder.addBinding(params, 'uParticleIntensity', { min: 0, max: 10, step: 0.1 });
  
  const warpFolder = pane.addFolder({ title: 'Domain Warp' });
  warpFolder.addBinding(params, 'uWarpStrength', { min: 0, max: 1, step: 0.01 });
  warpFolder.addBinding(params, 'uNoiseScale', { min: 1, max: 10, step: 0.1 });
  warpFolder.addBinding(params, 'uTimeScale', { min: 0, max: 2, step: 0.1 });
  
  const shapeFolder = pane.addFolder({ title: 'Shape' });
  shapeFolder.addBinding(params, 'uCircleRadius', { min: 0.1, max: 0.8, step: 0.01 });
  shapeFolder.addBinding(params, 'uGlowIntensity', { min: 0, max: 1, step: 0.01 });

  // Fullscreen quad positions (two triangles)
  const positions = bagl.buffer({
    data: new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]),
    size: 2,
  });

  const drawNoise = bagl({
    vert: `#version 300 es
    in vec2 position;
    out vec2 vUv;

    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
    `,

    frag: `#version 300 es
    precision highp float;

    in vec2 vUv;
    out vec4 color;

    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uParticlePower;
    uniform float uParticleIntensity;
    uniform float uWarpStrength;
    uniform float uNoiseScale;
    uniform float uTimeScale;
    uniform float uGlowIntensity;
    uniform float uCircleRadius;

    // 1. Basic Hash/Random Function
    float random(in vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    // 2. 2D Noise Function (Value Noise)
    float noise(in vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);

        // Cubic Hermite Curve for smooth interpolation
        vec2 u = f * f * (3.0 - 2.0 * f);

        return mix( mix( random( i + vec2(0.0,0.0) ),
                         random( i + vec2(1.0,0.0) ), u.x),
                   mix( random( i + vec2(0.0,1.0) ),
                         random( i + vec2(1.0,1.0) ), u.x), u.y);
    }

    // 3. Fractal Brownian Motion (FBM)
    // This stacks noise layers to create complexity
    #define OCTAVES 5
    float fbm(in vec2 st) {
        float value = 0.0;
        float amplitude = .5;
        float frequency = 0.;
        
        for (int i = 0; i < OCTAVES; i++) {
            value += amplitude * noise(st);
            st *= 2.0;
            amplitude *= 0.7;
        }
        return value * 0.8;
    }

    // 4. The Domain Warping Pattern
    // Returns a vec2 to distort the coordinate space
    float pattern(in vec2 p, out vec2 q, out vec2 r, float time) {

        vec2 motion;
        motion.x = fbm(p + vec2(0.0, 0.0) + 0.1 * time);
        motion.y = fbm(p + vec2(5.2, 1.3) + 0.1 * time);

        // First layer of warp
        q.x = fbm(p + vec2(0.0, 0.0));
        q.y = fbm(p + vec2(5.2, 1.3));

        // Second layer of warp (fed by the first)
        // We add time here to make the flow move
        r.x = fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.4 * motion.x);
        r.y = fbm(p + 4.0 * q + vec2(8.3, 2.8) + 0.4 * motion.y);

        // Final density map
        return fbm(p + 4.0 * r);
    }

    // 5. Signed Distance Function (Simple Circle)
    float sdCircle(vec2 p, float r) {
        return length(p) - r;
    }

    void main() {
        // Normalized pixel coordinates (from 0 to 1)
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        // Correct aspect ratio so the circle isn't an oval
        vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;

        float time = uTime * uTimeScale;

        // --- DOMAIN WARPING SETUP ---
        vec2 q, r;
        // We scale p * uNoiseScale to make the noise more granular (particle-like)
        float warpVal = pattern(p * uNoiseScale, q, r, time);

        // --- GHOSTLY SDF SHAPE ---
        // We distort the position 'p' by the warp value 'r' before feeding it to the SDF
        // This makes the circle look like it's melting or evaporating
        vec2 distortedP = p + (r * uWarpStrength); 
        float sphereDist = sdCircle(distortedP, uCircleRadius);

        // --- VISUALIZATION ---
        
        // Create the "Particle" effect
        // We take the warp value and raise it to a high power.
        // This isolates only the brightest peaks of the noise, looking like specks.
        float particles = pow(warpVal, uParticlePower) * uParticleIntensity; 
        
        // Mask the particles so they generally stay inside the SDF shape
        // We use smoothstep for a soft, ethereal edge fade
        float mask = 1.0 - smoothstep(0.0, 0.2, sphereDist);
        
        // Combine particles with the mask
        float ghostAlpha = particles * mask;

        // --- COLORING ---
        // A ghostly palette: Dark Blue -> Cyan -> White
        vec3 col = vec3(0.0);
        
        // Base gradient based on the warp distortion 'q'
        vec3 palette = mix(vec3(0.1, 0.0, 0.2), vec3(0.0, 0.8, 0.9), clamp(length(q), 0.0, 1.0));
        
        // Add the brightness
        col = palette * ghostAlpha;
        
        // Add a subtle glow around the SDF edge
        float glow = exp(-10.0 * abs(sphereDist));
        col += vec3(0.2, 0.6, 1.0) * glow * uGlowIntensity;

        color = vec4(col, 1.0);
    }
    `,

    attributes: {
      position: positions,
    },

    count: 6,

    uniforms: {
      uTime: (ctx: any) => ctx.time,
      uResolution: (ctx: any) => [ctx.width, ctx.height],
      uParticlePower: () => params.uParticlePower,
      uParticleIntensity: () => params.uParticleIntensity,
      uWarpStrength: () => params.uWarpStrength,
      uNoiseScale: () => params.uNoiseScale,
      uTimeScale: () => params.uTimeScale,
      uGlowIntensity: () => params.uGlowIntensity,
      uCircleRadius: () => params.uCircleRadius,
    },

    depth: {
      enable: false,
    },
  });

  function render(props: any = {}) {
    bagl.clear({ color: [0, 0, 0, 1], depth: 1 });
    drawNoise(props);
  }

  return { bagl, render };
}
