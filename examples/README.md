# Bagl Examples

This directory contains runnable examples demonstrating how to use the Bagl library.

## Running Examples

### Development Mode
```bash
npm run examples
# or
npm run dev
```

This will start a Vite development server and open the examples in your browser at `http://localhost:3000`.

### Build for Production
```bash
npm run build:examples
```

This will build the examples for production in the `dist/` directory.

## Available Examples

1. **Original Example** - Shows the original example with WebGL call logging
2. **Basic Triangle** - Simple static triangle rendering
3. **Animated Triangle** - Triangle with animation using uniforms and render loop

## Adding New Examples

To add a new example:

1. Create a new TypeScript file in the `examples/` directory (e.g., `my-example.ts`)
2. Export a function that creates and returns your example
3. Import and add it to the selector in `main.ts`

Example structure:
```typescript
import { createBagl } from '../src/index';

export function createMyExample() {
  const regl = createBagl();
  
  // Your example code here
  
  return { regl, drawCommand };
}
```

## Project Structure

- `main.ts` - Main entry point that sets up the UI and manages examples
- `index.html` - HTML template for the examples
- `example.ts` - Original example with WebGL call logging
- `basic-triangle.ts` - Simple triangle example
- `animated-triangle.ts` - Animated triangle example
- `README.md` - This file

## Configuration

The examples use Vite for bundling and development. The configuration is in `vite.config.ts` at the project root, which:

- Sets the root directory to `examples/`
- Configures path aliases for easy imports
- Builds output to `dist/` directory 