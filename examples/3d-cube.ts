import { createBagl } from '../src/index';
import * as mat4 from 'gl-mat4';

export function create3DCubeExample() {
  const bagl = createBagl();
  
  // Create vertex buffer for positions
  const positions = bagl.buffer({
    data: new Float32Array([
      // Front face
      -0.5, -0.5,  0.5,
       0.5, -0.5,  0.5,
       0.5,  0.5,  0.5,
      -0.5,  0.5,  0.5,
      
      // Back face
      -0.5, -0.5, -0.5,
      -0.5,  0.5, -0.5,
       0.5,  0.5, -0.5,
       0.5, -0.5, -0.5,
      
      // Top face
      -0.5,  0.5, -0.5,
      -0.5,  0.5,  0.5,
       0.5,  0.5,  0.5,
       0.5,  0.5, -0.5,
      
      // Bottom face
      -0.5, -0.5, -0.5,
       0.5, -0.5, -0.5,
       0.5, -0.5,  0.5,
      -0.5, -0.5,  0.5,
      
      // Right face
       0.5, -0.5, -0.5,
       0.5,  0.5, -0.5,
       0.5,  0.5,  0.5,
       0.5, -0.5,  0.5,
      
      // Left face
      -0.5, -0.5, -0.5,
      -0.5, -0.5,  0.5,
      -0.5,  0.5,  0.5,
      -0.5,  0.5, -0.5,
    ]),
    size: 3 // 3 position components per vertex
  });

  // Create vertex buffer for normals
  const normals = bagl.buffer({
    data: new Float32Array([
      // Front face (normal: 0, 0, 1)
      0.0,  0.0,  1.0, 0.0,  0.0,  1.0, 0.0,  0.0,  1.0, 0.0,  0.0,  1.0,
      
      // Back face (normal: 0, 0, -1)
      0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0, 0.0,  0.0, -1.0,
      
      // Top face (normal: 0, 1, 0)
      0.0,  1.0,  0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  0.0, 0.0,  1.0,  0.0,
      
      // Bottom face (normal: 0, -1, 0)
      0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0, 0.0, -1.0,  0.0,
      
      // Right face (normal: 1, 0, 0)
      1.0,  0.0,  0.0, 1.0,  0.0,  0.0, 1.0,  0.0,  0.0, 1.0,  0.0,  0.0,
      
      // Left face (normal: -1, 0, 0)
     -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0, -1.0,  0.0,  0.0,
    ]),
    size: 3 // 3 normal components per vertex
  });

  // Create index buffer for cube faces
  const indices = bagl.elements({
    data: new Uint16Array([
      // Front face
      0, 1, 2,    0, 2, 3,
      // Back face
      4, 5, 6,    4, 6, 7,
      // Top face
      8, 9, 10,   8, 10, 11,
      // Bottom face
      12, 13, 14, 12, 14, 15,
      // Right face
      16, 17, 18, 16, 18, 19,
      // Left face
      20, 21, 22, 20, 22, 23,
    ])
  });

  // Create draw command for 3D cube with lighting
  const drawCube = bagl({
    vert: `
      #version 300 es
      precision mediump float;
      
      in vec3 position;
      in vec3 normal;
      
      uniform mat4 model;
      uniform mat4 view;
      uniform mat4 projection;
      
      out vec3 vNormal;
      out vec3 vPosition;
      
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
      
      in vec3 vNormal;
      in vec3 vPosition;
      
      out vec4 color;
      
      void main() {
        // Transform normal to world space
        mat3 normalMatrix = mat3(model);
        vec3 worldNormal = normalize(normalMatrix * vNormal);
        
        // Light direction (rotating around the cube)
        vec3 lightDir = normalize(vec3(
          sin(time * 0.5),
          cos(time * 0.3),
          sin(time * 0.7)
        ));
        
        // Ambient light
        float ambient = 0.2;
        
        // Diffuse lighting
        float diffuse = max(dot(worldNormal, lightDir), 0.0);
        
        // Specular lighting (simple)
        vec3 viewDir = normalize(vec3(0.0, 0.0, 3.0) - vPosition);
        vec3 reflectDir = reflect(-lightDir, worldNormal);
        float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
        
        // Combine lighting
        float lighting = ambient + diffuse * 0.8 + specular * 0.3;
        
        // Base color (different for each face based on normal)
        vec3 baseColor = vec3(0.8, 0.6, 0.4); // Warm orange
        
        // Add some variation based on normal
        baseColor += vec3(
          abs(worldNormal.x) * 0.2,
          abs(worldNormal.y) * 0.1,
          abs(worldNormal.z) * 0.3
        );
        
        // Apply lighting
        vec3 finalColor = baseColor * lighting;
        
        color = vec4(finalColor, 1.0);
      }
    `,
    attributes: {
      position: positions,
      normal: normals
    },
    elements: indices,
    uniforms: {
      model: (context, props) => {
        const model = mat4.create();
        mat4.rotateY(model, model, context.time * 0.5);
        mat4.rotateX(model, model, context.time * 0.3);
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
    depth: {
      enable: true,
      func: 'less'
    },
  });

  // Render function
  function render() {
    bagl.clear({ color: [0, 0, 0, 1], depth: 1 });
    drawCube();
  }

  return { bagl, render };
} 