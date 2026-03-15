// import { attachToCanvas, setupContextLossHandling } from './example';
import { type Bagl } from '../src/types';
import { mapGlArgs } from '../src/gl-constants';
import { exampleRegistry, type ExampleInstance } from './registry';

const options = exampleRegistry.map(e => ({ value: e.id, text: e.title }));

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
let currentExample: ExampleInstance | null = null;
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

  const entry = exampleRegistry.find(e => e.id === exampleType);
  if (!entry) return;

  currentExample = entry.create();
  currentBagl = currentExample.bagl;
  currentBagl.attach(gl);

  if (entry.animated) {
    currentBagl.frame(() => {
      currentExample!.render();
      updateContextInfo();
    });
  } else {
    currentExample!.render();
    updateContextInfo();
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