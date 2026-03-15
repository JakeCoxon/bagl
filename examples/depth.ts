import { Pane } from 'tweakpane';
import { createBagl, type FramebufferHandle } from '../src/index';
import * as mat4 from 'gl-mat4';

export function createDepthExample() {
  const bagl = createBagl();

  // Parameters for the sphere SDF and rendering
  const params = {
    u_radius: 100,
    u_center: { x: 0.5, y: 0.5 },
    u_lightDir: { x: 0.5, y: 0.7, z: 1.0 },
    u_ambient: 0.2,
    u_diffuse: 0.8,
    u_specular: 0.3,
    u_shininess: 32.0,
    u_normalStrength: 1.0,
    u_depthOffset: 0.05,
    u_showDepth: false,
    u_showNormalMap: false,
  };

  // Create UI controls
  const pane = (new Pane()) as any;
  pane.addBinding(params, 'u_radius', { min: 10, max: 200, step: 1 });
  pane.addBinding(params, 'u_center', { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } });
  pane.addBinding(params, 'u_lightDir', { x: { min: -1, max: 1 }, y: { min: -1, max: 1 }, z: { min: 0, max: 2 } });
  pane.addBinding(params, 'u_ambient', { min: 0, max: 1, step: 0.01 });
  pane.addBinding(params, 'u_diffuse', { min: 0, max: 2, step: 0.01 });
  pane.addBinding(params, 'u_specular', { min: 0, max: 1, step: 0.01 });
  pane.addBinding(params, 'u_shininess', { min: 1, max: 128, step: 1 });
  pane.addBinding(params, 'u_normalStrength', { min: 0, max: 2, step: 0.01 });
  pane.addBinding(params, 'u_depthOffset', { min: 0, max: 0.2, step: 0.001 });
  pane.addBinding(params, 'u_showDepth');
  pane.addBinding(params, 'u_showNormalMap');

  // Create a full-screen quad for rendering
  const quad = {
    attributes: {
      position: bagl.buffer({
        data: new Float32Array([
          -1, -1,   1, -1,   1,  1,
          -1, -1,   1,  1,  -1,  1,
        ]),
        size: 2
      }),
    },
    count: 6,
  };

  // Create framebuffers for normal map, depth map, and depth offset
  let mapsFBO: FramebufferHandle | null = null;
  let depthOffsetFBO: FramebufferHandle | null = null;
  
  // For now, we'll use the normal map for both and add a debug option to show depth

  // Mouse tracking for interactive lighting
  let mouseX = 0.5;
  let mouseY = 0.5;
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
  });

      // Shader for generating normal map and depth map from sphere SDF
    const generateMaps = bagl({
      ...quad,
      depth: {
        enable: true,
        func: 'less', // Only render fragments closer to camera
        mask: true, // Write to depth buffer
      },
      uniforms: {
        u_resolution: ({ width, height }) => [width, height],
        u_radius: () => params.u_radius,
        u_center: () => [params.u_center.x, params.u_center.y],
        u_normalStrength: () => params.u_normalStrength,
      },
    vert: `#version 300 es
    in vec2 position;
    out vec2 v_uv;
    void main() {
      v_uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }`,
    frag: `#version 300 es
    precision highp float;
    
    in vec2 v_uv;
    layout(location = 0) out vec4 outNormalMap;
    layout(location = 1) out vec4 outDepthMap;
    
    uniform vec2 u_resolution;
    uniform float u_radius;
    uniform vec2 u_center;
    uniform float u_normalStrength;
    
    // 3D Sphere SDF - treat the 2D coordinates as a projection of a 3D sphere
    float sphereSDF(vec2 p, vec2 center, float radius) {
      return length(p - center) - radius;
    }
    
    // Calculate proper 3D sphere normal
    vec3 calculateSphereNormal(vec2 p, vec2 center, float radius) {
      float dist = length(p - center);
      
      // If we're inside the sphere, calculate the 3D normal
      if (dist < radius) {
        // Convert 2D screen position to 3D sphere surface
        vec2 offset = (p - center) / radius;
        float z = sqrt(1.0 - dot(offset, offset));
        vec3 sphereNormal = normalize(vec3(offset, z));
        return sphereNormal;
      } else {
        // Outside the sphere, return a flat normal
        return vec3(0.0, 0.0, 1.0);
      }
    }
    
    void main() {
      vec2 p = v_uv * u_resolution;
      vec2 center = u_center * u_resolution;
      
      // Calculate distance to sphere
      float dist = sphereSDF(p, center, u_radius);
      
      // Calculate depth (distance from camera to sphere surface)
      float depth = 0.0;
      if (dist < 0.0) {
        // Inside sphere - calculate actual depth to surface
        vec2 offset = (p - center) / u_radius;
        depth = sqrt(1.0 - dot(offset, offset));
        depth = 1.0 - depth;
      } else {
        // Outside sphere - use a far depth value
        depth = 1.0;
      }

      
      // Set fragment depth for depth testing
      gl_FragDepth = depth;
      
      // Calculate proper 3D sphere normal
      vec3 normal = calculateSphereNormal(p, center, u_radius);
      
      // Apply normal strength (only to XY components)
      normal = normalize(vec3(normal.xy * u_normalStrength, normal.z));
      
      // Output normal map (encode normals in RGB)
      outNormalMap = vec4(normal * 0.5 + 0.5, 1.0);
      
      // Output depth map (single channel)
      outDepthMap = vec4(depth, depth, depth, 1.0);
    }`,
    framebuffer: (c, p) => mapsFBO!,
  });

  // Shader for adding depth offset to the depth map
  const addDepthOffset = bagl({
    ...quad,
    uniforms: {
      u_depthMap: () => mapsFBO?.colorTexture(1)!,
      u_depthOffset: () => params.u_depthOffset,
    },
    vert: `#version 300 es
    in vec2 position;
    out vec2 v_uv;
    void main() {
      v_uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }`,
    frag: `#version 300 es
    precision highp float;
    
    in vec2 v_uv;
    out vec4 outColor;
    
    uniform sampler2D u_depthMap;
    uniform float u_depthOffset;
    
    void main() {
      // Sample current depth
      float currentDepth = texture(u_depthMap, v_uv).r;
      
      // Add small offset to depth
      float newDepth = min(1.0, currentDepth + u_depthOffset);
      
      // Output updated depth map
      outColor = vec4(newDepth, newDepth, newDepth, 1.0);
    }`,
    framebuffer: (c, p) => depthOffsetFBO!,
    depth: {
      enable: false
    }
  });

  // Shader for rendering the final scene with lighting
  const renderScene = bagl({
    ...quad,
    uniforms: {
      u_resolution: ({ width, height }) => [width, height],
      u_radius: () => params.u_radius,
      u_center: () => [params.u_center.x, params.u_center.y],
      u_lightDir: () => [params.u_lightDir.x, params.u_lightDir.y, params.u_lightDir.z],
      u_ambient: () => params.u_ambient,
      u_diffuse: () => params.u_diffuse,
      u_specular: () => params.u_specular,
      u_shininess: () => params.u_shininess,
      u_showDepth: () => params.u_showDepth,
      u_showNormalMap: () => params.u_showNormalMap,
      u_normalMap: () => mapsFBO?.colorTexture(0)!,
      u_depthMap: () => mapsFBO?.colorTexture(1)!,
      u_mouse: () => [mouseX, mouseY],
    },
    vert: `#version 300 es
    in vec2 position;
    out vec2 v_uv;
    void main() {
      v_uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }`,
    frag: `#version 300 es
    precision highp float;
    
    in vec2 v_uv;
    out vec4 outColor;
    
    uniform vec2 u_resolution;
    uniform float u_radius;
    uniform vec2 u_center;
    uniform vec3 u_lightDir;
    uniform float u_ambient;
    uniform float u_diffuse;
    uniform float u_specular;
    uniform float u_shininess;
    uniform bool u_showDepth;
    uniform bool u_showNormalMap;
    uniform sampler2D u_normalMap;
    uniform sampler2D u_depthMap;
    uniform vec2 u_mouse;
    
    // 3D Sphere SDF - same as in normal map generation
    float sphereSDF(vec2 p, vec2 center, float radius) {
      return length(p - center) - radius;
    }
    
    // Calculate proper 3D sphere normal (same as in normal map)
    vec3 calculateSphereNormal(vec2 p, vec2 center, float radius) {
      float dist = length(p - center);
      
      if (dist < radius) {
        vec2 offset = (p - center) / radius;
        float z = sqrt(1.0 - dot(offset, offset));
        vec3 sphereNormal = normalize(vec3(offset, z));
        return sphereNormal;
      } else {
        return vec3(0.0, 0.0, 1.0);
      }
    }
    
    void main() { u_lightDir; u_resolution; u_radius; u_center;
      vec2 p = v_uv * u_resolution;
      vec2 center = u_center * u_resolution;
      
      // Sample normal from normal map
      vec3 normal = texture(u_normalMap, v_uv).rgb * 2.0 - 1.0;
      
      // Interactive light direction based on mouse
      vec3 lightDir = normalize(vec3(u_mouse.x * 2.0 - 1.0, -(u_mouse.y * 2.0 - 1.0), 1.0));
      
      // View direction (assuming camera at infinity looking down -Z)
      vec3 viewDir = vec3(0.0, 0.0, 1.0);
      
      // Lighting calculations
      float diffuse = max(dot(normal, lightDir), 0.0);
      vec3 reflectDir = reflect(-lightDir, normal);
      float specular = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
      
      // Combine lighting
      float lighting = u_ambient + u_diffuse * diffuse + u_specular * specular;
      
      // Base color (sphere color)
      vec3 baseColor = vec3(0.7, 0.8, 1.0); // Light blue
      
      // Final color
      vec3 finalColor = baseColor * lighting;
      
      // Debug modes
      if (u_showNormalMap) {
        finalColor = normal * 0.5 + 0.5;
      } else if (u_showDepth) {
        // Calculate depth directly from the sphere SDF
        float depth = texture(u_depthMap, v_uv).r;
        finalColor = vec3(depth);
      }
      
      outColor = vec4(finalColor, 1.0);
    }`,
  });

  // Shader for copying the offset depth map back to mapsFBO's second color attachment
  const copyDepthToMapsFBO = bagl({
    ...quad,
    uniforms: {
      u_depthMap: () => depthOffsetFBO!.colorTexture(0)!,
      // u_texture: () => mapsFBO?.colorTexture(0) as any,
    },
    vert: `#version 300 es
    in vec2 position;
    out vec2 v_uv;
    void main() {
      v_uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }`,
    frag: `#version 300 es
    precision highp float;
    in vec2 v_uv;
    layout(location = 0) out vec4 outColor0;
    layout(location = 1) out vec4 outColor1;
    uniform sampler2D u_depthMap;
    void main() { u_texture;
      float d = texture(u_depthMap, v_uv).r;
      outColor0 = vec4(0.0); // Don't modify the normal map
      outColor1 = vec4(d, d, d, 1.0); // Write to the depth map
      gl_FragDepth = d;
    }`,
    framebuffer: (c, p) => mapsFBO!,
    depth: {
      enable: true,
      func: 'always',
    }
  });

  function render() {
    bagl.clear({ color: [0.1, 0.1, 0.15, 1] });
    
    const gl = bagl.gl;
    if (!gl) return;
    const { width, height } = gl.canvas;

    // Create or update framebuffers if needed
    if (!mapsFBO || mapsFBO.width !== width || mapsFBO.height !== height) {
      mapsFBO = bagl.framebuffer({
        width: width,
        height: height,
        color: 2, // Two color attachments: normal map and depth map
        depth: true, // Enable depth buffer for depth testing
        internalFormat: 'rgba16f',
        type: 'float',
      });
      bagl.clear({ framebuffer: mapsFBO, depth: 1.0 });
    }
    if (!depthOffsetFBO || depthOffsetFBO.width !== width || depthOffsetFBO.height !== height) {
      depthOffsetFBO = bagl.framebuffer({
        width: width,
        height: height,
        color: 2,
        internalFormat: 'rgba16f',
        type: 'float',
      });
      bagl.clear({ framebuffer: depthOffsetFBO, color: [1, 1, 1, 1] });
    }

    // Generate normal and depth maps
    generateMaps();
    
    // Add depth offset (write to depthOffsetFBO)
    addDepthOffset();
    
    // Copy the offset depth map back to mapsFBO's second color attachment
    copyDepthToMapsFBO();
    
    // Render final scene
    renderScene();
  }

  return { bagl, render };
} 