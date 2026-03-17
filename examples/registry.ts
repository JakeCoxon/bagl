import type { Bagl } from '../src/types';
import { createBasicTriangleExample } from './basic-triangle';
import { createCommandInnerStateExample } from './command-inner-state';
import { createAnimatedTriangleExample } from './animated-triangle';
import { create3DCubeExample } from './3d-cube';
import { createFramebufferExample } from './framebuffer';
import { createParticleExample } from './particles';
import { createSdfExample } from './sdf';
import { createLinesExample } from './lines';
import { createDepthExample } from './depth';
import { createScifiExample } from './scifi';
import { createFluidExample } from './fluid';
import { createMorphExample } from './morph';
import { createTrailExample } from './trail';
import { createTrailNormalExample } from './trail-normal';
import { createWarpedGridExample } from './warped-grid';
import { createLissajousFigureExample } from './lissajous';
import { createSDFPointCloudExample } from './point-cloud';
import { createSDEdgePointCloudExample } from './point-cloud-edge';
import { createChladniPatternsExample } from './chladni';
import { createCell120Example } from './cell-120';
import { createDomainWarpExample } from './domain-warp';
import { createSmoothVoronoiExample } from './smooth-voronoi';
import { createRepeatingPatternExample } from './repeating-pattern';
import { createOverlappingTextureExample } from './overlapping-texture';
import { createVoronoiOrganicExample } from './voronoi-organic';
import { createCrystallinePatternExample } from './crystalline-pattern';
import { createOrganicCollageExample } from './collage';
import { createOverlappingRowExample } from './overlap';
import { createDomainWarpedWorleyExample } from './domain-warped-worley';
import { createNoiseShaderExample } from './noise-shader';
import { createSdfKaleidoLinesExample } from './sdf-kaleido-lines';
import { createWarpedKaleidoSdfExample } from './warped-kaleido-sdf';
import { createBlendModesExample } from './blend-modes';
import { create3DSpinningTorusExample } from './torus-3d';

export interface ExampleInstance {
  bagl: Bagl;
  render: () => void;
}

export interface ExampleEntry {
  id: string;
  title: string;
  create: () => ExampleInstance;
  animated: boolean;
}

export const exampleRegistry: ExampleEntry[] = [
  { id: 'basic', title: 'Basic Triangle', create: createBasicTriangleExample, animated: false },
  { id: 'command-inner-state', title: 'Command Inner State', create: createCommandInnerStateExample, animated: false },
  { id: 'animated', title: 'Animated Triangle', create: createAnimatedTriangleExample, animated: true },
  { id: '3d-cube', title: '3D Rotating Cube', create: create3DCubeExample, animated: true },
  { id: '3d-torus', title: '3D Spinning Shaded Torus', create: create3DSpinningTorusExample, animated: true },
  { id: 'framebuffer', title: 'Framebuffer Example', create: createFramebufferExample, animated: true },
  { id: 'particles', title: 'Particle System', create: createParticleExample, animated: true },
  { id: 'sdf', title: 'SDF Example', create: createSdfExample, animated: true },
  { id: 'lines', title: 'Lines Example', create: createLinesExample, animated: true },
  { id: 'depth', title: 'Depth Example', create: createDepthExample, animated: true },
  { id: 'scifi', title: 'Sci-Fi Example', create: createScifiExample, animated: true },
  { id: 'fluid', title: 'Fluid Example', create: createFluidExample, animated: true },
  { id: 'morph', title: 'Morph Example', create: createMorphExample, animated: true },
  { id: 'trail', title: 'Trail Example', create: createTrailExample, animated: true },
  { id: 'trail-normal', title: 'Trail Normal Example', create: createTrailNormalExample, animated: true },
  { id: 'warp-grid', title: 'Warp Grid Example', create: createWarpedGridExample, animated: true },
  { id: 'lissajous', title: 'Lissajous Figure Example', create: createLissajousFigureExample, animated: true },
  { id: 'point-cloud', title: 'Point Cloud Example', create: createSDFPointCloudExample, animated: true },
  { id: 'point-cloud-edge', title: 'Point Cloud Edge Example', create: createSDEdgePointCloudExample, animated: true },
  { id: 'chladni', title: 'Chladni Patterns Example', create: createChladniPatternsExample, animated: true },
  { id: 'cell-120', title: 'Cell 120 Example', create: createCell120Example, animated: true },
  { id: 'domain-warp', title: 'Domain Warp Example', create: createDomainWarpExample, animated: true },
  { id: 'smooth-voronoi', title: 'Smooth Voronoi Example', create: createSmoothVoronoiExample, animated: true },
  { id: 'repeating-pattern', title: 'Repeating Pattern Example', create: createRepeatingPatternExample, animated: true },
  { id: 'overlapping-texture', title: 'Overlapping Texture Example', create: createOverlappingTextureExample, animated: true },
  { id: 'voronoi-organic', title: 'Voronoi Organic Example', create: createVoronoiOrganicExample, animated: true },
  { id: 'crystalline-pattern', title: 'Crystalline Pattern Example', create: createCrystallinePatternExample, animated: true },
  { id: 'collage', title: 'Organic Collage Example', create: createOrganicCollageExample, animated: true },
  { id: 'overlap', title: 'Overlapping Row Example', create: createOverlappingRowExample, animated: true },
  { id: 'domain-warped-worley', title: 'Domain Warped Worley Noise', create: createDomainWarpedWorleyExample, animated: true },
  { id: 'noise-shader', title: 'Noise Shader (Ghostly Particles)', create: createNoiseShaderExample, animated: true },
  { id: 'sdf-kaleido-lines', title: 'SDF Kaleido Lines', create: createSdfKaleidoLinesExample, animated: true },
  { id: 'warped-kaleido-sdf', title: 'Warped Kaleido SDF', create: createWarpedKaleidoSdfExample, animated: true },
  { id: 'blend-modes', title: 'Blend Modes Presets', create: createBlendModesExample, animated: true },
];
