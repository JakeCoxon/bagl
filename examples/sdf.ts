import { createBagl, type FramebufferHandle } from '../src/index';
import { Pane } from 'tweakpane';

import rectsUrl from './rects.png';
import isoUrl from './iso.png';
import iphoneUrl from './iphone.avif';

export function createSdfExample() {
  const bagl = createBagl();

  const params = {
    u_radius: 50,
    u_bevel: 20,
    u_lightDir: {x: 0.4, y: 0.5, z: 1},
    u_color: {r: 255, g: 204, b: 153},
    u_normal: false,
    u_type: 1,
    u_shape: 0,
    u_squircleN: 2,
    u_sampleOffset: 0.07,
    u_sigma: 5,
    u_blurRadius: 10,
  };

  const pane = (new Pane()) as any;
  pane.addBinding(params, 'u_radius');
  pane.addBinding(params, 'u_bevel');
  pane.addBinding(params, 'u_lightDir');
  pane.addBinding(params, 'u_color');
  pane.addBinding(params, 'u_normal');
  pane.addBinding(params, 'u_type', { step: 1, min: 0, max: 2 });
  pane.addBinding(params, 'u_shape', { step: 1, min: 0, max: 2 });
  pane.addBinding(params, 'u_squircleN', { step: 0.1, min: 2, max: 10 });
  pane.addBinding(params, 'u_sampleOffset');
  pane.addBinding(params, 'u_sigma');
  pane.addBinding(params, 'u_blurRadius');

  const vertices = bagl.buffer({
    data: new Float32Array([
      -0.5, -0.5,  // bottom left  
       0.5, -0.5,  // bottom right
       0.0,  0.5   // top
    ]),
    size: 2 // 2 components per vertex (x, y)
  });

  const background = bagl.texture({
    data: Object.assign(new Image(), { 
      src: iphoneUrl,
    }),
    // data: (() => {
    //   const data = new Uint8Array(32 * 32 * 4);
    //   for (let i = 0; i < 32 * 32; i++) {
    //     data[i * 4] = 255;
    //     data[i * 4 + 1] = 0;
    //     data[i * 4 + 2] = 0;
    //     data[i * 4 + 3] = 255;
    //   }
    //   return data;
    // })(),
    flipY: true,
    format: 'rgba',
  });

  const canvas = bagl.texture({
    data: (() => {
      const data = new Uint8Array(32 * 32 * 4);
      for (let i = 0; i < 32 * 32; i++) {
        data[i * 4] = 255;
        data[i * 4 + 1] = 200;
        data[i * 4 + 2] = 255;
        data[i * 4 + 3] = 255;
      }
      return data;
    })(),
    format: 'rgba',
    internalFormat: 'rgba8',
    width: 32,
    height: 32,
  });

  let canvasOverlayFbo: FramebufferHandle | null = null;

  const quad = {
    attributes: {
      // two triangles that cover clip-space
      position: bagl.buffer({
        data: new Float32Array([
          -1, -1,   1, -1,   1,  1,
          -1, -1,   1,  1,  -1,  1,
        ]),
        size: 2 // 2 components per vertex (x, y)
      }),
    },
    count: 6,
  };

  let mouseX = 0;
  let mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
  });

  const drawRoundedRect = bagl({
    ...quad,

    uniforms: {
      // u_res    : ({width:w, height:h}) => [w, h],
      u_center : ({width:w, height:h}) => [w * mouseX, h * (1 - mouseY)],
      u_res    : ({width:w, height:h}) => [w, h],
      u_halfSize: [200, 100],      // half-width / half-height  (px)
      u_radius : () => params.u_radius,               // corner radius             (px)
      u_bevel  : () => params.u_bevel,                // bevel width               (px)
      u_lightDir: () => [params.u_lightDir.x, params.u_lightDir.y, params.u_lightDir.z], // light pointing toward +Z
      u_color  : () => [params.u_color.r / 255, params.u_color.g / 255, params.u_color.b / 255],  // base albedo
      u_normal : () => params.u_normal,
      u_type   : () => params.u_type,
      u_shape  : () => params.u_shape,
      u_squircleN: () => params.u_squircleN,
      u_background: () => canvas,
      u_overlay: () => canvasOverlayFbo!,
      u_sampleOffset: () => params.u_sampleOffset,
    },
  

    vert: `#version 300 es
    in  vec2 position;
    out vec2 v_uv;
    void main() {
      v_uv = position * 0.5 + 0.5;      // not strictly needed, but handy
      gl_Position = vec4(position, 0.0, 1.0);
    }`,

    frag: `#version 300 es
    precision highp float;
    in  vec2 v_uv;
    out vec4 outColor;

    // ---------- uniforms ------------
    // uniform vec2  u_res;
    uniform vec2  u_center;
    uniform vec2  u_halfSize;
    uniform float u_radius;
    uniform float u_squircleN;
    uniform float u_bevel;
    uniform vec3  u_lightDir;
    uniform vec3  u_color;
    uniform bool  u_normal;
    uniform float   u_type;
    uniform float   u_shape;
    uniform sampler2D u_background;
    uniform sampler2D u_overlay;
    uniform float u_sampleOffset;
    uniform vec2 u_res;

    // ---------- SDF for rounded rectangle (pixel units) ------------------------
    float sdRoundRect(vec2 p, vec2 b, float r) {
      // p: point in *rectangle-centered* space
      // b: half-size BEFORE radius is applied
      vec2 d = abs(p) - (b - vec2(r));
      return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
    }

    float sdCircle(vec2 p, float r) {
      return length(p) - r;
    }
    
    vec3 sdSquircle(vec2 p, float r, float n) {
      p = p / r;
      vec2 gs = sign(p);
      vec2 ps = abs(p);
      float gm = pow(ps.x, n) + pow(ps.y, n);
      float gd = pow(gm, 1.0 / n) - r;
      vec2  g = gs * pow(ps, vec2(n - 1.0)) * pow(gm, 1.0 / n - 1.0);
      p = abs(p); if (p.y > p.x) p = p.yx;
      n = 2.0 / n;
      float s = 1.0;
      float d = 1e20;
      const int num = 12;
      vec2 oq = vec2(1.0, 0.0);
      for (int i = 1; i < num; i++) {
          float h = float(i)/float(num-1);
          vec2 q = vec2(pow(cos(h * 3.1415927 / 4.0), n),
                        pow(sin(h * 3.1415927 / 4.0), n));
          vec2  pa = p - oq;
          vec2  ba = q - oq;
          vec2  z = pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          float d2 = dot(z, z);
          if (d2 < d) {
              d = d2;
              s = pa.x * ba.y - pa.y * ba.x;
          }
          oq = q;
      }
      return vec3(sqrt(d) * sign(s) * r, g);
    }

    void main() {
      u_overlay;
      // Convert fragment coordinate -> rectangle centered space (px)
      vec2 p = gl_FragCoord.xy - u_center;

      // Signed distance to the shape (pixels; inside = negative)
      float d = 0.0;
      if (int(u_shape) == 0) {
        d = sdRoundRect(p, u_halfSize, u_radius);
      } else if (int(u_shape) == 1) {
        d = sdCircle(p, u_radius);
      } else if (int(u_shape) == 2) {
        d = sdSquircle(p, u_radius, u_squircleN).x;
      }

      float h = 0.0;
      // Height field: smooth bevel of width u_bevel
      if (int(u_type) == 0) {
        h = smoothstep(-u_bevel, 0.0, -d);
      } else if (int(u_type) == 1) {
        float t = 1.0 - clamp(-d / u_bevel, 0.0, 1.0);      // 0 outside … 1 on the top
        h = sqrt(1.0 - t * t);      // quarter-circle
      } else if (int(u_type) == 2) {
        float t = clamp(-d / u_bevel, 0.0, 1.0);      // 0 outside … 1 on the top
        h = 1.0 - sqrt(1.0 - t * t);      // quarter-circle
      }

      // TODO:
      // Support squircle normal
      // float n = 4.0;                 // 4 ⇒ classic squircle; 2 ⇒ circle
      // float h = 1.0 - pow(1.0 - pow(t, n), 1.0 / n);


      // float h = max(0.0, 1.0 - sqrt(1.0 - (d / u_bevel) * (d / u_bevel)));
      // // h(d) = clamp(½ – d / w , 0, 1)	
      // float h = clamp(0.5 - d / u_bevel, 0.0, 1.0);

      // Screen-space gradient of height = ∂h/∂x, ∂h/∂y
      vec2  grad = vec2(dFdx(h), dFdy(h));

      // Tangent-space normal from gradient
      vec3  N = normalize(vec3(-grad, 0.1));

      // Simple Lambert lighting
      float diff = max(dot(N, normalize(u_lightDir)), 0.0);

      // Final colour & soft alpha from height
      float dark = 0.5;
      vec3  base = u_color * (dark + (1.0 - dark) * diff);
      float alpha = smoothstep(0.0, 1.0, h);   // 0 outside, 1 on top
      base;

      if (u_normal) {
        outColor = vec4(N * 0.5 + 0.5, 1.0);
      } else {
        vec2 samplepos = gl_FragCoord.xy / u_res;
        samplepos -= N.xy * u_sampleOffset;
        vec3 color = texture(u_background, samplepos).rgb;
        vec3 overlay = texture(u_overlay, samplepos).rgb;
        if (d < 0.0 ) {
          color = overlay;
          
          if (d > -1.0   ) {
            color += diff * 0.5;
             
          } else {    
            // color += 0.09f;
          }
        }
        outColor = vec4(color, 1.0);
        // outColor = vec4(base, 1.0);
      }
      // outColor.rgb += N * 0.5 + 0.5;
    }`,

    blend: {
      enable: true,
      // func: {

      //   srcRGB : 'src alpha',
      //   dstRGB : 'one minus src alpha',
      //   srcAlpha: 'one',
      //   dstAlpha: 'one minus src alpha',
      // },
    },

  });

  const drawImage = bagl<{
    texture: 'texture', 
    x: number, 
    y: number, 
    width: number, 
    height: number,
  }>({
    vert: `
      #version 300 es
      precision mediump float;
      in vec2 position;
      out vec2 v_uv;
      uniform vec2 u_size;
      uniform vec2 u_center;
      uniform vec2 u_res;
      void main() {
        u_res;
        vec2 pos = position * u_size / u_res + u_center / u_res;
        gl_Position = vec4(pos, 0.0, 1.0);
        v_uv = (position * 0.5 + 0.5);
      }`, 
    frag: `
      #version 300 es
      precision mediump float;
      uniform sampler2D u_texture;
      in vec2 v_uv;
      out vec4 outColor;
      void main() {
        outColor = texture(u_texture, v_uv);
      }`,
    attributes: {
      position: bagl.buffer({
        data: new Float32Array([
          -1, -1,   1, -1,   1,  1,
          -1, -1,   1,  1,  -1,  1,
        ]),
        size: 2 // 2 components per vertex (x, y)
      }),
    },
    cull: {
      enable: false,
    },
    depth: {
      enable: false,
    },
    uniforms: {
      u_res: (c, p) => [c.width, c.height],
      u_size: (c, p) => [p.width, p.height],
      u_center: (c, p) => [p.x, p.y],
      u_texture: (c, p) => p.texture
    },
    count: 6
  });

  const drawImageEffect = bagl<{
    texture: 'texture', 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    framebuffer: 'framebuffer',
  }>({
    vert: `
      #version 300 es
      precision mediump float;
      in vec2 position;
      out vec2 v_uv;
      uniform vec2 u_size;
      uniform vec2 u_center;
      uniform vec2 u_res;
      void main() {
        u_res;
        vec2 pos = position * u_size / u_res + u_center / u_res;
        gl_Position = vec4(pos, 0.0, 1.0);
        v_uv = (position * 0.5 + 0.5);
      }`, 
    frag: `
      #version 300 es
      precision mediump float;
      uniform sampler2D u_texture;
      uniform vec3 u_color;
      in vec2 v_uv;
      uniform vec2 u_res;
      uniform float u_radius;
      uniform float u_sigma;
      out vec4 outColor;

      vec4 blur(vec2 uv) {
        int radius = int(u_radius);
        float pi = 3.1415926;
        float sigma = u_sigma;
        
        vec4 gaussSum = vec4(0.);
        
        for(int x = -radius; x <= radius; x++){
            for(int y = -radius; y <= radius; y++){
                vec2 newUV = uv + (vec2(x,y) / u_res.xy);
                vec4 newTexCol = texture(u_texture, newUV);
                gaussSum += texture(u_texture, newUV) * (exp(-(pow(float(x), 2.) + pow(float(y), 2.)) / (2. * pow(sigma, 2.))) / (2. * pi * pow(sigma, 2.)));
            }   
        }
        return gaussSum;
      }

    const float RAD_SCALE = 1.0; // Smaller = nicer blur, larger = faster
    const float GOLDEN_ANGLE = 2.39996323;

vec3 srgb2lin(vec3 c) { return c*c; }
vec3 lin2srgb(vec3 c) { return sqrt(c); }

float remap( float a, float b, float t )
{
    return clamp( (t-a)/(b-a), 0.0, 1.0);
}
    vec3 Bokeh_tuxedo(sampler2D tex, vec2 uv, float blursiz)
    {
        vec3 color = texture(tex, uv).rgb;
      float tot = 1.0;
      float radius = RAD_SCALE;
      for (float ang = 0.0; radius<blursiz; ang += GOLDEN_ANGLE)
      {
        vec2 tc = uv + vec2(cos(ang), sin(ang)) / u_res.xy * radius;
        vec3 sampleColor = srgb2lin(texture(tex, tc, -10.0).rgb);
        //float m = smoothstep(radius-0.5, radius+0.5, blursiz); //note: from org
            float m = remap(radius-0.5, radius+0.5, blursiz);
        color += mix(color/tot, sampleColor, m);
        tot += 1.0;
            radius += RAD_SCALE/radius; //TODO: what function fits this recursive series?
      }
      return color / tot;
    }

      vec3 reinhardTonemap(vec3 color) {
        return color / (1.0 + color);
      }
      
      void main() { u_color; u_radius; u_sigma;
        vec3 color = vec3(0.0, 0.0, 0.0);

        float dx = 0.004;
        // color.r = texture(u_texture, v_uv - vec2(dx, 0.0)).r;
        // color.g = texture(u_texture, v_uv - vec2(0.0, dx)).g;
        // color.b = texture(u_texture, v_uv - vec2(dx, dx)).b;
        // color = blur(v_uv).rgb;
        color = Bokeh_tuxedo(u_texture, v_uv, u_radius);
        
        // color = mix(color, u_color, 0.2);
        // color = pow(color, vec3(1.0 / 2.2));
        // color *= 10.5;
        // color -= 0.5;
        // color = reinhardTonemap(color);
        // color = pow(color, vec3(1.0 / 2.2));

        color = lin2srgb(color);

        outColor = vec4(color, 1.0);
      }`,
    attributes: {
      position: bagl.buffer({
        data: new Float32Array([
          -1, -1,   1, -1,   1,  1,
          -1, -1,   1,  1,  -1,  1,
        ]),
        size: 2 // 2 components per vertex (x, y)
      }),
    },
    framebuffer: (c, p) => p.framebuffer,
    cull: {
      enable: false,
    },
    depth: {
      enable: false,
    },
    uniforms: {
      u_res: (c, p) => [c.width, c.height],
      u_size: (c, p) => [p.width, p.height],
      u_center: (c, p) => [p.x, p.y],
      u_texture: (c, p) => p.texture,
      u_color: (c, p) => [params.u_color.r / 255, params.u_color.g / 255, params.u_color.b / 255],
      u_radius: () => params.u_blurRadius,
      u_sigma: () => params.u_sigma,
    },
    count: 6
  });


  // // Create draw command
  // const drawTriangle = bagl({
  //   vert: `
  //     #version 300 es
  //     precision mediump float;
  //     in vec2 position;
  //     uniform vec2 resolution;
  //     void main() {
  //       gl_Position = vec4(position, 0.0, 1.0);
  //     }
  //   `,
  //   frag: `
  //     #version 300 es
  //     precision mediump float;
  //     uniform vec2 resolution;
  //     out vec4 color;
  //     void main() {
  //       // Use resolution to create a gradient based on screen position
  //       vec2 uv = gl_FragCoord.xy / resolution;
  //       color = vec4(0.2 + uv.x * 0.3, 0.6 + uv.y * 0.2, 1.0, 1.0);
  //     }
  //   `,
  //   attributes: {
  //     position: vertices
  //   },
  //   uniforms: {
  //     resolution: (context, props) => [context.width, context.height]
  //   },
  //   count: 3
  // }); 

  // Render function
  function render() {
    bagl.clear({color: [0,0,0,0]});
    const gl = bagl.gl
    if (!gl) return;
    const { width, height } = gl.canvas;

    drawImage({ 
      texture: background,
      x: 0,
      y: 0,
      width,
      height: width * background.height / background.width,
    });

    canvas({ 
      copyFromBuffer: true,
      width: width,
      height: height,
    });

    drawImage({
      texture: canvas,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });

    if (!canvasOverlayFbo) {
      canvasOverlayFbo = bagl.framebuffer({
        width: width,
        height: height,
      });
    }

    drawImageEffect({
      framebuffer: canvasOverlayFbo,
      texture: canvas,
      x: 0,
      y: 0,
      width: width,
      height: height,
    });

    drawImage({
      texture: canvasOverlayFbo,
      x: 0,
      y: 0,
      width: width,
      height: height,
    });

    drawRoundedRect();
  }

  return { bagl, render };
}  