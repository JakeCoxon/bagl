import { createBagl, type FramebufferHandle } from "../src/index";
import * as mat4 from "gl-mat4";

export function create3DSpinningTorusExample() {
  const bagl = createBagl();

  const radialSegments = 48;
  const tubularSegments = 32;
  const majorRadius = 0.9;
  const minorRadius = 0.32;

  const vertexCount = radialSegments * tubularSegments;
  const positionsData = new Float32Array(vertexCount * 3);
  const normalsData = new Float32Array(vertexCount * 3);
  const indicesData = new Uint16Array(radialSegments * tubularSegments * 6);

  let vertexOffset = 0;
  for (let i = 0; i < radialSegments; i++) {
    const u = (i / radialSegments) * Math.PI * 2.0;
    const cu = Math.cos(u);
    const su = Math.sin(u);

    for (let j = 0; j < tubularSegments; j++) {
      const v = (j / tubularSegments) * Math.PI * 2.0;
      const cv = Math.cos(v);
      const sv = Math.sin(v);

      const ring = majorRadius + minorRadius * cv;
      const x = ring * cu;
      const y = ring * su;
      const z = minorRadius * sv;

      positionsData[vertexOffset * 3] = x;
      positionsData[vertexOffset * 3 + 1] = y;
      positionsData[vertexOffset * 3 + 2] = z;

      normalsData[vertexOffset * 3] = cu * cv;
      normalsData[vertexOffset * 3 + 1] = su * cv;
      normalsData[vertexOffset * 3 + 2] = sv;

      vertexOffset++;
    }
  }

  let indexOffset = 0;
  for (let i = 0; i < radialSegments; i++) {
    for (let j = 0; j < tubularSegments; j++) {
      const iNext = (i + 1) % radialSegments;
      const jNext = (j + 1) % tubularSegments;

      const a = i * tubularSegments + j;
      const b = iNext * tubularSegments + j;
      const c = iNext * tubularSegments + jNext;
      const d = i * tubularSegments + jNext;

      indicesData[indexOffset++] = a;
      indicesData[indexOffset++] = b;
      indicesData[indexOffset++] = d;

      indicesData[indexOffset++] = b;
      indicesData[indexOffset++] = c;
      indicesData[indexOffset++] = d;
    }
  }

  const positions = bagl.buffer({
    data: positionsData,
    size: 3,
  });

  const normals = bagl.buffer({
    data: normalsData,
    size: 3,
  });

  const indices = bagl.elements({
    data: indicesData,
  });

  const asciiChars = "-=+*#%@MW8B$";
  const atlasCols = 16;
  const atlasRows = Math.ceil(asciiChars.length / atlasCols);
  const glyphSize = 64;
  const atlasPixelRatio = Math.max(
    1,
    Math.min((window.devicePixelRatio || 1) * 2, 4),
  );
  const atlasLogicalWidth = atlasCols * glyphSize;
  const atlasLogicalHeight = atlasRows * glyphSize;
  const atlasCanvas = document.createElement("canvas");
  atlasCanvas.width = Math.floor(atlasLogicalWidth * atlasPixelRatio);
  atlasCanvas.height = Math.floor(atlasLogicalHeight * atlasPixelRatio);
  const atlasCtx = atlasCanvas.getContext("2d");
  if (!atlasCtx) throw new Error("torus-3d: failed to create 2d context");
  atlasCtx.setTransform(atlasPixelRatio, 0, 0, atlasPixelRatio, 0, 0);
  atlasCtx.imageSmoothingEnabled = true;

  atlasCtx.fillStyle = "#000";
  atlasCtx.fillRect(0, 0, atlasLogicalWidth, atlasLogicalHeight);
  atlasCtx.fillStyle = "#fff";
  atlasCtx.strokeStyle = "#fff";
  atlasCtx.lineWidth = Math.max(1, glyphSize * 0.06);
  atlasCtx.font = `700 ${Math.floor(glyphSize * 0.8)}px monospace`;
  atlasCtx.textAlign = "center";
  atlasCtx.textBaseline = "middle";
  for (let i = 0; i < asciiChars.length; i++) {
    const col = i % atlasCols;
    const row = Math.floor(i / atlasCols);
    const x = col * glyphSize + glyphSize * 0.5;
    const y = row * glyphSize + glyphSize * 0.58;
    atlasCtx.fillText(asciiChars[i], x, y);
  }

  const asciiAtlas = bagl.texture({
    data: atlasCanvas,
    format: "rgba",
    min: "linear",
    mag: "linear",
    wrapS: "clamp",
    wrapT: "clamp",
    flipY: true,
  });

  const postQuad = bagl.buffer({
    data: new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    size: 2,
  });

  let sceneFBO: FramebufferHandle | null = null;
  let paused = false;
  let asciiEnabled = true;
  let animationTime = 0;

  function ensureSceneFBO(width: number, height: number) {
    if (!sceneFBO) {
      sceneFBO = bagl.framebuffer({
        width,
        height,
        depth: true,
      });
      return;
    }

    if (sceneFBO.width !== width || sceneFBO.height !== height) {
      sceneFBO.resize(width, height);
    }
  }

  let cleanupControls: (() => void) | null = null;
  bagl.onAttach(() => {
    const controls = document.getElementById("controls");
    if (!controls) return;

    const pauseButtonId = "torus-pause-btn";
    const asciiButtonId = "torus-ascii-btn";
    const oldPauseButton = document.getElementById(pauseButtonId);
    const oldAsciiButton = document.getElementById(asciiButtonId);
    if (oldPauseButton) oldPauseButton.remove();
    if (oldAsciiButton) oldAsciiButton.remove();

    const pauseButton = document.createElement("button");
    pauseButton.id = pauseButtonId;
    pauseButton.textContent = "Pause Torus";
    pauseButton.addEventListener("click", () => {
      paused = !paused;
      pauseButton.textContent = paused ? "Resume Torus" : "Pause Torus";
    });
    controls.appendChild(pauseButton);

    const asciiButton = document.createElement("button");
    asciiButton.id = asciiButtonId;
    asciiButton.textContent = "ASCII: On";
    asciiButton.style.marginLeft = "8px";
    asciiButton.addEventListener("click", () => {
      asciiEnabled = !asciiEnabled;
      asciiButton.textContent = asciiEnabled ? "ASCII: On" : "ASCII: Off";
    });
    controls.appendChild(asciiButton);

    cleanupControls = () => {
      pauseButton.remove();
      asciiButton.remove();
      cleanupControls = null;
    };

    return () => {
      if (cleanupControls) cleanupControls();
    };
  });

  function getModelMatrix() {
    const model = mat4.create();
    mat4.rotateY(model, model, animationTime * 0.75);
    mat4.rotateX(model, model, animationTime * 0.35);
    return model;
  }

  function getViewMatrix() {
    const view = mat4.create();
    mat4.translate(view, view, [0, 0, -3.6]);
    return view;
  }

  function getProjectionMatrix(context: { width: number; height: number }) {
    const projection = mat4.create();
    mat4.perspective(
      projection,
      Math.PI / 3.2,
      context.width / context.height,
      0.1,
      30.0,
    );
    return projection;
  }

  const drawTorus = bagl({
    vert: `
      #version 300 es
      precision highp float;

      in vec3 position;
      in vec3 normal;

      uniform mat4 model;
      uniform mat4 view;
      uniform mat4 projection;

      out vec3 vWorldPos;
      out vec3 vWorldNormal;

      void main() {
        vec4 world = model * vec4(position, 1.0);
        vWorldPos = world.xyz;
        vWorldNormal = normalize(mat3(model) * normal);
        gl_Position = projection * view * world;
      }
    `,
    frag: `
      #version 300 es
      precision highp float;

      in vec3 vWorldPos;
      in vec3 vWorldNormal;
      uniform float uTime;

      out vec4 color;

      vec3 palette(float t) {
        return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t));
      }

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 lightDir = normalize(vec3(0.55, 0.9, 0.7));
        vec3 viewPos = vec3(0.0, 0.0, 3.6);
        vec3 viewDir = normalize(viewPos - vWorldPos);

        float diff = max(dot(N, lightDir), 0.0);
        float wrapDiffuse = max((dot(N, lightDir) + 0.35) / 1.35, 0.0);
        float hemi = mix(0.72, 1.06, N.y * 0.5 + 0.5);

        vec3 halfway = normalize(lightDir + viewDir);
        float spec = pow(max(dot(N, halfway), 0.0), 48.0);
        float ndv = clamp(dot(N, viewDir), 0.0, 1.0);
        float glancing = pow(1.0 - ndv, 2.6);
        float edgeMask = smoothstep(0.18, 0.92, glancing);

        float warpA = sin(vWorldPos.x * 5.5 + uTime * 2.3);
        float warpB = cos(vWorldPos.y * 6.2 - uTime * 1.9);
        float warpC = sin(vWorldPos.z * 9.3 + uTime * 2.8);
        float swirl = dot(N, normalize(vec3(0.8, 0.2, -0.6)));
        float phase = 0.5 + 0.5 * (0.42 * warpA + 0.33 * warpB + 0.25 * warpC + 0.6 * swirl);
        vec3 calmBase = vec3(0.23, 0.44, 0.78)*0.1 + vec3(0.09, 0.05, 0.12) * N.y;
        vec3 psychBase = palette(phase + uTime * 0.08);
        psychBase *= 1.25 + 0.35 * sin(12.0 * phase + uTime * 2.2);
        // calmBase = vec3(0, 0, 0);
        vec3 base = mix(calmBase, psychBase, edgeMask);

        vec3 lit = base * (0.34 + 0.62 * diff + 0.52 * wrapDiffuse) * hemi;
        vec3 finalColor = lit + vec3(1.0, 0.9, 1.0) * spec * 0.35;
        color = vec4(finalColor, 1.0);
      }
    `,
    attributes: {
      position: positions,
      normal: normals,
    },
    elements: indices,
    framebuffer: () => (asciiEnabled ? sceneFBO : null),
    uniforms: {
      model: () => getModelMatrix(),
      view: () => getViewMatrix(),
      projection: (context) => getProjectionMatrix(context),
      uTime: () => animationTime,
    },
    depth: {
      enable: true,
      func: "less",
    },
  });

  const drawBackground = bagl({
    vert: `
      #version 300 es
      precision highp float;

      in vec2 position;
      out vec2 vUv;

      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision highp float;

      in vec2 vUv;
      out vec4 color;

      uniform mat4 uModel;
      uniform mat4 uView;
      uniform mat4 uProjection;

      void main() {
        vec2 ndc = vUv * 2.0 - 1.0;
        float tanHalfFovX = 1.0 / uProjection[0][0];
        float tanHalfFovY = 1.0 / uProjection[1][1];
        vec3 rayView = normalize(vec3(ndc.x * tanHalfFovX, ndc.y * tanHalfFovY, -1.0));
        vec3 rayWorld = normalize(transpose(mat3(uView)) * rayView);
        vec3 rayTorus = normalize(transpose(mat3(uModel)) * rayWorld);

        float horizon = rayTorus.y * 0.5 + 0.5;
        float swirl = atan(rayTorus.z, rayTorus.x);
        float stripes = 0.5 + 0.5 * sin(swirl * 4.0 + rayTorus.y * 5.5);
        float halo = pow(max(0.0, 1.0 - abs(rayTorus.y)), 2.2);

        vec3 c0 = vec3(0.04, 0.06, 0.14);
        vec3 c1 = vec3(0.10, 0.22, 0.42);
        vec3 c2 = vec3(0.36, 0.18, 0.58);

        vec3 grad = mix(c0, c1, smoothstep(0.02, 0.98, horizon));
        grad = mix(grad, c2, stripes * 0.55 + halo * 0.2);
        grad *= 0.82 + 0.18 * smoothstep(1.0, 0.0, abs(rayTorus.y));

        color = vec4(grad, 1.0);
      }
    `,
    attributes: {
      position: postQuad,
    },
    count: 6,
    primitive: "triangles",
    framebuffer: () => (asciiEnabled ? sceneFBO : null),
    uniforms: {
      uModel: () => getModelMatrix(),
      uView: () => getViewMatrix(),
      uProjection: (context) => getProjectionMatrix(context),
    },
    depth: {
      enable: false,
    },
  });

  const drawAsciiPost = bagl({
    vert: `
      #version 300 es
      precision highp float;

      in vec2 position;
      out vec2 vUv;

      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `,
    frag: `
      #version 300 es
      precision highp float;

      in vec2 vUv;
      out vec4 color;

      uniform sampler2D uScene;
      uniform sampler2D uAsciiAtlas;
      uniform vec2 uResolution;
      uniform vec2 uCellSize;
      uniform vec2 uAtlasGrid;
      uniform float uCharCount;

      float luma(vec3 c) {
        return dot(c, vec3(0.2126, 0.7152, 0.0722));
      }

      void main() {
        vec2 frag = gl_FragCoord.xy;
        vec2 cell = floor(frag / uCellSize);
        vec2 local = fract(frag / uCellSize);

        vec2 sceneUV = ((cell + 0.5) * uCellSize) / uResolution;
        vec3 sceneColor = texture(uScene, sceneUV).rgb;

        float lum = clamp(luma(sceneColor), 0.0, 1.0);
        float index = floor((1.0 - lum) * (uCharCount - 1.0) + 0.5);
        float col = mod(index, uAtlasGrid.x);
        float row = floor(index / uAtlasGrid.x);

        vec2 atlasUV = (vec2(col, row) + local) / uAtlasGrid;
        float glyph = texture(uAsciiAtlas, atlasUV).r;

        vec3 asciiColor = sceneColor * (0.2 + glyph * 1.05);
        color = vec4(asciiColor, 1.0);
      }
    `,
    attributes: {
      position: postQuad,
    },
    count: 6,
    primitive: "triangles",
    uniforms: {
      uScene: () => sceneFBO!,
      uAsciiAtlas: () => asciiAtlas,
      uResolution: (context) => [context.width, context.height],
      uCellSize: () => [12 / 2, 18 / 2],
      uAtlasGrid: () => [atlasCols, atlasRows],
      uCharCount: () => asciiChars.length,
    },
    depth: {
      enable: false,
    },
  });

  function render() {
    if (!paused) animationTime += bagl.context.deltaTime;
    if (asciiEnabled) {
      ensureSceneFBO(bagl.context.width, bagl.context.height);
      if (!sceneFBO) return;

      bagl.clear({
        framebuffer: sceneFBO,
        color: [0.04, 0.045, 0.07, 1],
        depth: 1,
      });
      drawBackground();
      drawTorus();
      bagl.clear({ color: [0, 0, 0, 1] });
      drawAsciiPost();
      return;
    }

    bagl.clear({ color: [0.04, 0.045, 0.07, 1], depth: 1 });
    drawBackground();
    drawTorus();
  }

  return { bagl, render };
}
