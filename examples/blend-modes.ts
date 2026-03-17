import { createBagl } from '../src/index';
import type { BlendEquation, BlendFunc } from '../src/types';

type BlendPreset = {
  name: string;
  func: [BlendFunc, BlendFunc];
  equation: BlendEquation;
};

type ViewportRect = [number, number, number, number];

type DrawTileProps = {
  viewport: ViewportRect;
  scissor: ViewportRect;
  tint: [number, number, number];
  opacity: number;
  center: [number, number];
  scale: [number, number];
  rotation: number;
  texOffset: [number, number];
  blendEnable: boolean;
  blendFunc: [BlendFunc, BlendFunc];
  blendEquation: BlendEquation;
};

const BLEND_PRESETS: BlendPreset[] = [
  { name: 'Normal', func: ['src-alpha', 'one-minus-src-alpha'], equation: 'add' },
  { name: 'Additive', func: ['one', 'one'], equation: 'add' },
  { name: 'Multiply', func: ['dst-color', 'zero'], equation: 'add' },
  { name: 'Screen', func: ['one', 'one-minus-src-color'], equation: 'add' },
  { name: 'Subtract', func: ['one', 'one'], equation: 'subtract' },
  { name: 'Min', func: ['one', 'one'], equation: 'min' },
  { name: 'Max', func: ['one', 'one'], equation: 'max' },
];

function createOverlapTexture(size = 192): Uint8Array {
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const u = x / (size - 1);
      const v = y / (size - 1);

      const checker = ((x >> 4) + (y >> 4)) & 1;
      const diag = Math.sin((u + v) * 20.0) * 0.5 + 0.5;
      const rings = Math.sin(Math.hypot(u - 0.5, v - 0.5) * 34.0) * 0.5 + 0.5;

      const r = 0.2 + 0.7 * (0.55 * u + 0.45 * diag);
      const g = 0.18 + 0.75 * (0.55 * v + 0.45 * rings);
      const b = checker ? 0.75 : 0.22;
      const a = 0.35 + 0.6 * (0.65 * diag + 0.35 * (1.0 - checker));

      data[i] = Math.floor(Math.min(1.0, r) * 255);
      data[i + 1] = Math.floor(Math.min(1.0, g) * 255);
      data[i + 2] = Math.floor(Math.min(1.0, b) * 255);
      data[i + 3] = Math.floor(Math.min(1.0, a) * 255);
    }
  }

  return data;
}

function upsertLegend(presets: BlendPreset[]): (() => void) | null {
  const controls = document.getElementById('controls');
  if (!controls) return null;

  const legendId = 'blend-modes-legend';
  const existing = document.getElementById(legendId);
  if (existing) existing.remove();

  const legend = document.createElement('div');
  legend.id = legendId;
  legend.style.marginTop = '8px';
  legend.style.fontFamily = 'monospace';
  legend.style.fontSize = '12px';
  legend.style.lineHeight = '1.5';
  legend.style.opacity = '0.9';
  legend.textContent = presets.map((preset, index) => `${index + 1}. ${preset.name}`).join('   ');
  controls.appendChild(legend);

  return () => legend.remove();
}

export function createBlendModesExample() {
  const bagl = createBagl();

  const texture = bagl.texture({
    data: createOverlapTexture(),
    width: 192,
    height: 192,
    format: 'rgba',
    wrapS: 'repeat',
    wrapT: 'repeat',
    min: 'linear',
    mag: 'linear',
  });

  const quad = bagl.buffer({
    data: new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1,
    ]),
    size: 2,
  });

  const drawTileBackground = bagl<{
    viewport: ViewportRect;
    scissor: ViewportRect;
    color: [number, number, number];
  }>({
    vert: `#version 300 es
    in vec2 position;
    out vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }`,
    frag: `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 outColor;
    uniform vec3 uColor;
    void main() {
      float grid = step(0.96, fract(vUv.x * 8.0)) + step(0.96, fract(vUv.y * 8.0));
      vec3 col = uColor + vec3(grid * 0.05);
      outColor = vec4(col, 1.0);
    }`,
    attributes: { position: quad },
    uniforms: { uColor: (_context, props) => props.color },
    count: 6,
    primitive: 'triangles',
    depth: { enable: false },
    blend: { enable: false },
    scissor: (_context, props) => ({
      enable: true,
      box: props.scissor,
    }),
    viewport: (_context, props) => ({
      x: props.viewport[0],
      y: props.viewport[1],
      width: props.viewport[2],
      height: props.viewport[3],
    }),
  });

  const drawShape = bagl<DrawTileProps>({
    vert: `#version 300 es
    in vec2 position;
    out vec2 vUv;
    out vec2 vLocal;

    uniform vec2 uCenter;
    uniform vec2 uScale;
    uniform float uRotation;

    void main() {
      float c = cos(uRotation);
      float s = sin(uRotation);
      mat2 rot = mat2(c, -s, s, c);
      vec2 world = rot * (position * uScale) + uCenter;
      vUv = position * 0.5 + 0.5;
      vLocal = position;
      gl_Position = vec4(world, 0.0, 1.0);
    }`,
    frag: `#version 300 es
    precision highp float;
    in vec2 vUv;
    in vec2 vLocal;
    out vec4 outColor;

    uniform sampler2D uTexture;
    uniform vec3 uTint;
    uniform float uOpacity;
    uniform vec2 uTexOffset;

    void main() {
      vec2 uv = fract(vUv * 2.2 + uTexOffset);
      vec4 texel = texture(uTexture, uv);

      float circle = smoothstep(1.02, 0.92, length(vLocal));
      float diamond = smoothstep(1.05, 0.88, abs(vLocal.x) + abs(vLocal.y));
      float mask = max(circle, diamond * 0.85);

      vec3 color = texel.rgb * uTint;
      float alpha = texel.a * uOpacity * mask;
      outColor = vec4(color, alpha);
    }`,
    attributes: { position: quad },
    uniforms: {
      uTexture: () => texture,
      uTint: (_context, props) => props.tint,
      uOpacity: (_context, props) => props.opacity,
      uCenter: (_context, props) => props.center,
      uScale: (_context, props) => props.scale,
      uRotation: (_context, props) => props.rotation,
      uTexOffset: (_context, props) => props.texOffset,
    },
    count: 6,
    primitive: 'triangles',
    depth: { enable: false },
    blend: (_context, props) => ({
      enable: props.blendEnable,
      func: props.blendFunc,
      equation: props.blendEquation,
    }),
    scissor: (_context, props) => ({
      enable: true,
      box: props.scissor,
    }),
    viewport: (_context, props) => ({
      x: props.viewport[0],
      y: props.viewport[1],
      width: props.viewport[2],
      height: props.viewport[3],
    }),
  });

  let cleanupLegend: (() => void) | null = null;

  bagl.onAttach(() => {
    cleanupLegend = upsertLegend(BLEND_PRESETS);
    return () => {
      if (cleanupLegend) {
        cleanupLegend();
        cleanupLegend = null;
      }
    };
  });

  function render() {
    const { width, height, time } = bagl.context;
    const cols = 3;
    const rows = Math.ceil(BLEND_PRESETS.length / cols);
    const tilePad = 14;
    const tileW = Math.max(1, Math.floor((width - tilePad * (cols + 1)) / cols));
    const tileH = Math.max(1, Math.floor((height - tilePad * (rows + 1)) / rows));

    bagl.clear({ color: [0.03, 0.035, 0.05, 1] });

    for (let i = 0; i < BLEND_PRESETS.length; i++) {
      const preset = BLEND_PRESETS[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = tilePad + col * (tileW + tilePad);
      const topY = tilePad + row * (tileH + tilePad);
      const y = height - topY - tileH;
      const viewport: ViewportRect = [x, y, tileW, tileH];
      const scissor: ViewportRect = [x, y, tileW, tileH];

      drawTileBackground({
        viewport,
        scissor,
        color: [0.1, 0.11, 0.14],
      });

      drawShape({
        viewport,
        scissor,
        tint: [1.0, 0.57, 0.26],
        opacity: 0.92,
        center: [-0.22, -0.03],
        scale: [0.58, 0.58],
        rotation: -0.2,
        texOffset: [0.0, 0.0],
        blendEnable: false,
        blendFunc: ['one', 'zero'],
        blendEquation: 'add',
      });

      const wobbleX = Math.sin(time * 0.9 + i * 0.7) * 0.12;
      const wobbleY = Math.cos(time * 1.15 + i * 0.53) * 0.08;
      drawShape({
        viewport,
        scissor,
        tint: [0.28, 0.82, 1.0],
        opacity: 0.88,
        center: [0.2 + wobbleX, 0.08 + wobbleY],
        scale: [0.56, 0.56],
        rotation: 0.35 + 0.08 * Math.sin(time + i),
        texOffset: [0.15, 0.31],
        blendEnable: true,
        blendFunc: preset.func,
        blendEquation: preset.equation,
      });
    }
  }

  return { bagl, render };
}
