// import { attachToCanvas, setupContextLossHandling } from './example';
import { createBasicTriangleExample } from './basic-triangle';
import { createAnimatedTriangleExample } from './animated-triangle';
import { create3DCubeExample } from './3d-cube';
import { createFramebufferExample } from './framebuffer';
import { createParticleExample } from './particles';
import { createSdfExample } from './sdf';
import { createLinesExample } from './lines';
import { createDepthExample } from './depth';
import { type Bagl } from '../src/types';
import { mapGlArgs } from '../src/gl-constants';
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

// Create the layout structure
const sidebar = document.createElement('div');
sidebar.id = 'sidebar';

const sidebarHeader = document.createElement('div');
sidebarHeader.id = 'sidebar-header';
const sidebarTitle = document.createElement('h1');
sidebarTitle.textContent = 'Bagl Examples';
const sidebarSubtitle = document.createElement('p');
sidebarSubtitle.textContent = 'WebGL Graphics Library';
sidebarHeader.appendChild(sidebarTitle);
sidebarHeader.appendChild(sidebarSubtitle);

const sidebarNav = document.createElement('nav');
sidebarNav.id = 'sidebar-nav';

sidebar.appendChild(sidebarHeader);
sidebar.appendChild(sidebarNav);

const content = document.createElement('div');
content.id = 'content';

const contentHeader = document.createElement('div');
contentHeader.id = 'content-header';
const contentTitle = document.createElement('h2');
contentTitle.id = 'content-title';
contentTitle.textContent = 'Basic Triangle';
contentHeader.appendChild(contentTitle);

const canvasContainer = document.createElement('div');
canvasContainer.id = 'canvas-container';

// Create a canvas element
const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
canvasContainer.appendChild(canvas);

const controls = document.createElement('div');
controls.id = 'controls';

content.appendChild(contentHeader);
content.appendChild(canvasContainer);
content.appendChild(controls);

document.body.appendChild(sidebar);
document.body.appendChild(content);

const proxy = createGLProxy();
proxy.enable = true;
const gl = proxy.wrap(canvas.getContext('webgl2', { preserveDrawingBuffer: true })!);
let onCompleteRender: (() => void) | null = null;

// Set up context loss handling
// setupContextLossHandling(canvas);

// Attach the bagl instance to the canvas
// attachToCanvas(canvas);

// Create context info display
const contextInfo = document.createElement('div');
contextInfo.id = 'context-info';
contextInfo.textContent = 'Context: Not attached';
contentHeader.appendChild(contextInfo);

const options = [
  { value: 'basic', text: 'Basic Triangle' },
  { value: 'animated', text: 'Animated Triangle' },
  { value: '3d-cube', text: '3D Rotating Cube' },
  { value: 'framebuffer', text: 'Framebuffer Example' },
  { value: 'particles', text: 'Particle System' },
  { value: 'sdf', text: 'SDF Example' },
  { value: 'lines', text: 'Lines Example' },
  { value: 'depth', text: 'Depth Example' },
  { value: 'scifi', text: 'Sci-Fi Example' },
  { value: 'fluid', text: 'Fluid Example' },
  { value: 'morph', text: 'Morph Example' },
  { value: 'trail', text: 'Trail Example' },
  { value: 'trail-normal', text: 'Trail Normal Example' },
  { value: 'warp-grid', text: 'Warp Grid Example' },
  { value: 'lissajous', text: 'Lissajous Figure Example' },
  { value: 'point-cloud', text: 'Point Cloud Example' },
  { value: 'point-cloud-edge', text: 'Point Cloud Edge Example' },
  { value: 'chladni', text: 'Chladni Patterns Example' },
  { value: 'cell-120', text: 'Cell 120 Example' },
  { value: 'domain-warp', text: 'Domain Warp Example' },
  { value: 'smooth-voronoi', text: 'Smooth Voronoi Example' },
  { value: 'repeating-pattern', text: 'Repeating Pattern Example' },
  { value: 'overlapping-texture', text: 'Overlapping Texture Example' },
  { value: 'voronoi-organic', text: 'Voronoi Organic Example' },
  { value: 'crystalline-pattern', text: 'Crystalline Pattern Example' },
  { value: 'collage', text: 'Organic Collage Example' },
  { value: 'overlap', text: 'Overlapping Row Example' },
  { value: 'domain-warped-worley', text: 'Domain Warped Worley Noise' },
  { value: 'noise-shader', text: 'Noise Shader (Ghostly Particles)' },
  { value: 'sdf-kaleido-lines', text: 'SDF Kaleido Lines' },
  { value: 'warped-kaleido-sdf', text: 'Warped Kaleido SDF' },
];

// Create navigation items
let currentActiveNavItem: HTMLElement | null = null;
options.forEach(option => {
  const navItem = document.createElement('a');
  navItem.className = 'nav-item';
  navItem.textContent = option.text;
  navItem.dataset.value = option.value;
  navItem.addEventListener('click', () => {
    if (currentActiveNavItem) {
      currentActiveNavItem.classList.remove('active');
    }
    navItem.classList.add('active');
    currentActiveNavItem = navItem;
    runExample(option.value);
    contentTitle.textContent = option.text;
    
    const newURL = `${window.location.origin}${window.location.pathname}#${option.value}`;
    history.replaceState({ example: option.value }, '', newURL);
  });
  sidebarNav.appendChild(navItem);
});

const button = document.createElement('button');
button.textContent = 'Snapshot GL Calls';
button.addEventListener('click', () => {
  snapshotGlCalls(proxy!);
});
controls.appendChild(button);

// Example management
let currentExample: any = null;
let currentBagl: Bagl = null!;

function updateContextInfo() {
  if (onCompleteRender) {
    onCompleteRender();
    onCompleteRender = null;
  }
  if (currentBagl && currentBagl.attached) {
    const ctx = currentBagl.context;
    contextInfo.textContent = `Context: time=${ctx.time.toFixed(2)}s, ticks=${ctx.ticks}, size=${ctx.width}x${ctx.height}, dt=${ctx.deltaTime.toFixed(3)}s`;
  } else {
    contextInfo.textContent = 'Context: Not attached';
  }
}

function createGLProxy() {
  const calls: Array<{ name: string; args: any[] }> = [];
  let nextId = 1
  const mapping = new WeakMap<any, number>()

  const mapIndexes = (args: any[]) => {
    return args.map(arg => {
      if (arg instanceof WebGLBuffer 
        || arg instanceof WebGLTexture 
        || arg instanceof WebGLFramebuffer 
        || arg instanceof WebGLVertexArrayObject 
        || arg instanceof WebGLProgram 
        || arg instanceof WebGLRenderbuffer
        || arg instanceof WebGLUniformLocation
      ) {
        if (!mapping.has(arg)) mapping.set(arg, nextId++);
        return `[${arg.constructor.name} ${mapping.get(arg)}]`;
      }
      if (
        arg instanceof Float32Array
        || arg instanceof Uint16Array
        || arg instanceof Uint32Array
        || arg instanceof Int16Array
        || arg instanceof Int32Array
        || arg instanceof Uint8Array
        || arg instanceof Int8Array) {
          if (!mapping.has(arg)) mapping.set(arg, nextId++);
          return `[${arg.constructor.name} ${mapping.get(arg)} (size: ${arg.length})]`;
        }
      return arg;
    });
  }

  function wrap(gl: WebGL2RenderingContext) {
    return new Proxy(gl, {
      get(target, prop, receiver) {
        const orig = target[prop as keyof WebGL2RenderingContext];

        // If it's a function, wrap it to log calls
        if (typeof orig === 'function') {
          return function (...args: any[]) {
            if (glProxy.enable) {
              const mappedArgs = mapIndexes(mapGlArgs(prop.toString(), args))
              calls.push({ name: prop.toString(), args: mappedArgs });
            }
            return (orig as Function).apply(target, args);
          };
        }
        // For non-function properties (including getters), access on the original target
        return orig
      }
    });
  }

  const glProxy = { wrap, enable: false, calls };
  return glProxy;
}

let debugDiv: HTMLDivElement | null = null
let initialCalls: Array<{ name: string; args: any[] }> = [];
onCompleteRender = () => {
  initialCalls = [...proxy.calls];
  proxy.calls.length = 0;
}
function snapshotGlCalls(proxy: ReturnType<typeof createGLProxy>) {
  proxy.enable = true;
  proxy.calls.length = 0;

  onCompleteRender = () => {
    proxy.enable = false;
    const stringify = (call: any) => `${call.name} ${call.args.map((arg: any) => JSON.stringify(arg)).join(', ')}`
    
    debugDiv!.innerHTML = `${initialCalls.map(stringify).join('\n')}\n----\n${proxy.calls.map(stringify).join('\n')}`;
  };

  if (!debugDiv) {
    debugDiv = document.createElement('div');
    debugDiv.id = 'debug-div';
    content.appendChild(debugDiv);
  }
}

function runExample(exampleType: string) {
  // Clean up previous example
  if (currentBagl) {
    currentBagl.destroy();
  }
  
  // Clear the canvas
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  switch (exampleType) {
      
    case 'basic':
      currentExample = createBasicTriangleExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      currentExample.render();
      updateContextInfo();
      break;
      
    case 'animated':
      currentExample = createAnimatedTriangleExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;
      
    case '3d-cube':
      currentExample = create3DCubeExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;
      
    case 'framebuffer':
      currentExample = createFramebufferExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;
      
    case 'particles':
      currentExample = createParticleExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'sdf':
      currentExample = createSdfExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);

      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'lines':
      currentExample = createLinesExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);

      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'depth':
      currentExample = createDepthExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);

      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'scifi':
      currentExample = createScifiExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);

      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'fluid':
      currentExample = createFluidExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);

      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'morph':
      currentExample = createMorphExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);

      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'trail':
      currentExample = createTrailExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);

      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'trail-normal':
      currentExample = createTrailNormalExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);

      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'warp-grid':
      currentExample = createWarpedGridExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'lissajous':
      currentExample = createLissajousFigureExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'point-cloud':
      currentExample = createSDFPointCloudExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'point-cloud-edge':
      currentExample = createSDEdgePointCloudExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'chladni':
      currentExample = createChladniPatternsExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'cell-120':
      currentExample = createCell120Example();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'domain-warp':
      currentExample = createDomainWarpExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'smooth-voronoi':
      currentExample = createSmoothVoronoiExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'repeating-pattern':
      currentExample = createRepeatingPatternExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'overlapping-texture':
      currentExample = createOverlappingTextureExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'voronoi-organic':
      currentExample = createVoronoiOrganicExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'crystalline-pattern':
      currentExample = createCrystallinePatternExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'collage':
      currentExample = createOrganicCollageExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;

    case 'overlap':
      currentExample = createOverlappingRowExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;
      
    case 'domain-warped-worley':
      currentExample = createDomainWarpedWorleyExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;
      
    case 'noise-shader':
      currentExample = createNoiseShaderExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;
      
    case 'sdf-kaleido-lines':
      currentExample = createSdfKaleidoLinesExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;
      
    case 'warped-kaleido-sdf':
      currentExample = createWarpedKaleidoSdfExample();
      currentBagl = currentExample.bagl;
      currentBagl.attach(gl);
      
      // Set up render loop
      currentBagl.frame(() => {
        currentExample.render();
        updateContextInfo();
      });
      break;
  }
}

function getInitialExample(): string {
  const hash = window.location.hash.slice(1);
  const validExamples = options.map(opt => opt.value);
  return validExamples.includes(hash) ? hash : 'basic';
}

// Initialize with the example from URL path
const initialExample = getInitialExample();
const initialNavItem = Array.from(sidebarNav.querySelectorAll('.nav-item')).find(
  item => (item as HTMLElement).dataset.value === initialExample
) as HTMLElement;

if (initialNavItem) {
  initialNavItem.classList.add('active');
  currentActiveNavItem = initialNavItem;
  const initialOption = options.find(opt => opt.value === initialExample);
  if (initialOption) {
    contentTitle.textContent = initialOption.text;
  }
}

runExample(initialExample); 