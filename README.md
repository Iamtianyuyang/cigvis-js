# CIGVis.js

A JavaScript/TypeScript library for visualizing multidimensional geophysical data in the browser. Ported from the Python [cigvis](https://github.com/JintaoLee-Roger/cigvis) library.

## Features

- **3D Volume Visualization**: Interactive 3D rendering of seismic volumes with slices along any axis
- **Surface Visualization**: Display horizon surfaces with depth or amplitude coloring
- **Well Log Visualization**: Render well trajectories and log curves in 3D
- **Body/Isovolume**: Extract and display isosurfaces from 3D data
- **Point Cloud**: Visualize point clouds with value-based coloring
- **Rich Colormaps**: Built-in geophysical colormaps (Petrel, seismic, etc.)
- **Pure Browser**: Runs entirely in the browser using Three.js/WebGL - no server required

## Installation

```bash
npm install cigvis
```

Or with yarn:

```bash
yarn add cigvis
```

## Quick Start

```typescript
import * as cigvis from 'cigvis';

// Read binary volume data
const { data, shape } = await cigvis.io.readVolume('seismic.bin', [192, 200, 240]);

// Create visualization nodes
const nodes = cigvis.createSlices({
  data,
  shape,
  pos: { x: 0, y: 0, z: 239 },
  cmap: 'petrel',
  clim: [-1, 1],
});

// Render in 3D
cigvis.plot3D({
  nodes,
  container: '#viewer',
  volumeShape: shape,
});
```

## API Reference

### Node Creation

#### `createSlices(options)`
Create 2D slice visualization nodes from 3D volume data.

```typescript
const nodes = cigvis.createSlices({
  data: volumeData,      // Float32Array
  shape: [192, 200, 240], // [ni, nx, nt]
  pos: { x: 0, y: 0, z: 239 },
  cmap: 'petrel',
  clim: [-1, 1],
});
```

#### `createSurfaces(options)`
Create surface visualization nodes.

```typescript
const nodes = cigvis.createSurfaces({
  surfaces: [surfaceData1, surfaceData2],
  shape: [192, 200],
  valueType: 'amp',      // or 'depth'
  volume: volumeData,    // for amplitude coloring
  volumeShape: [192, 200, 240],
  cmap: 'seismic',
});
```

#### `createWellLog(options)`
Create well log visualization node.

```typescript
const node = cigvis.createWellLog({
  trajectory: [
    { x: 10, y: 20, z: 0 },
    { x: 12, y: 22, z: 50 },
  ],
  values: gammaRayData,
  cmap: 'hot',
  style: 'tubes',
});
```

#### `createBody(options)`
Create isosurface visualization node.

```typescript
const node = cigvis.createBody({
  data: volumeData,
  shape: [192, 200, 240],
  isoValue: 0.5,
  cmap: 'seismic',
});
```

#### `createPointCloud(options)`
Create point cloud visualization node.

```typescript
const node = cigvis.createPointCloud({
  positions: pointPositions, // Float32Array [x,y,z,...]
  values: pointValues,
  cmap: 'rainbow',
  pointSize: 2,
});
```

### Visualization

#### `plot3D(options)`
Render 3D visualization.

```typescript
const renderer = cigvis.plot3D({
  nodes: [...sliceNodes, ...surfaceNodes],
  container: '#viewer',
  volumeShape: [192, 200, 240],
  view: {
    size: [800, 600],
    bgColor: '#1a1a2e',
    axis: true,
  },
});
```

#### `quickPlot(data, shape, options)`
Quick 3D visualization with default settings.

```typescript
const renderer = cigvis.quickPlot(volumeData, [192, 200, 240], {
  cmap: 'petrel',
  container: '#viewer',
});
```

### IO Utilities

```typescript
// Read binary volume
const { data, shape } = await cigvis.io.readVolume('data.bin', [192, 200, 240]);

// Read LAS well log
const lasData = await cigvis.io.readLASFromURL('well.las');
const gammaRay = cigvis.io.getCurve(lasData, 'GR');

// Read binary data
const data = await cigvis.io.readBinaryFromURL('data.bin', { dtype: 'float32' });
```

### Colormaps

```typescript
// List available colormaps
const cmaps = cigvis.colormap.listColormaps();
// ['parula', 'petrel', 'seismic', 'gray', 'rainbow', 'hot', 'cool', 'viridis']

// Create colormap
const cmap = cigvis.colormap.createColormap('petrel');

// Apply colormap to data
const image = cigvis.colormap.applyColormap(data, width, height, 'petrel', [-1, 1]);

// Reverse colormap
const reversed = cigvis.colormap.createColormap('petrel_r');
```

### Utilities

```typescript
// Compute statistics
const stats = cigvis.utils.statistics(data);
// { min, max, mean, std, median, count }

// Normalize data
const normalized = cigvis.utils.normalize(data);

// Interpolation
const value = cigvis.utils.bilinearInterpolate(data, width, height, x, y);
const value3d = cigvis.utils.trilinearInterpolate(data, nx, ny, nz, x, y, z);
```

## Examples

### Basic Volume Slicing

```typescript
import * as cigvis from 'cigvis';

// Load data
const response = await fetch('seismic.bin');
const buffer = await response.arrayBuffer();
const data = new Float32Array(buffer);
const shape = [192, 200, 240];

// Create slices at different positions
const nodes = cigvis.createSlices({
  data,
  shape,
  pos: {
    x: Math.floor(shape[0] / 2),
    y: Math.floor(shape[1] / 2),
    z: Math.floor(shape[2] / 2),
  },
  cmap: 'petrel',
  clim: [-1, 1],
});

// Render
cigvis.plot3D({
  nodes,
  container: '#viewer',
  volumeShape: shape,
});
```

### Volume with Surfaces

```typescript
import * as cigvis from 'cigvis';

// Load volume and surface data
const { data: volume, shape } = await cigvis.io.readVolume('seismic.bin', [192, 200, 240]);
const { data: horizon } = await cigvis.io.readVolume('horizon.bin', [192, 200]);

// Create slice and surface nodes
const sliceNodes = cigvis.createSlices({
  data: volume,
  shape,
  pos: { z: 0 },
  cmap: 'gray',
});

const surfaceNodes = cigvis.createSurfaces({
  surfaces: [horizon],
  shape: [192, 200],
  valueType: 'amp',
  volume,
  volumeShape: shape,
  cmap: 'seismic',
});

// Render
cigvis.plot3D({
  nodes: [...sliceNodes, ...surfaceNodes],
  container: '#viewer',
  volumeShape: shape,
});
```

### Well Log Visualization

```typescript
import * as cigvis from 'cigvis';

// Read LAS file
const lasData = await cigvis.io.readLASFromURL('well.las');
const gammaRay = cigvis.io.getCurve(lasData, 'GR');
const depth = lasData.depth;

// Create well log node
const wellNode = cigvis.createWellLogFromLAS(depth, gammaRay, {
  x: 50,
  y: 50,
  cmap: 'hot',
  clim: [0, 150],
  style: 'tubes',
});

// Visualize with volume
cigvis.plot3D({
  nodes: [wellNode],
  container: '#viewer',
});
```

## Browser Support

CIGVis.js supports all modern browsers with WebGL support:
- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

## License

MIT License - see [LICENSE](LICENSE) file

## Credits

This library is a JavaScript port of the Python [cigvis](https://github.com/JintaoLee-Roger/cigvis) library developed by the [Computational Interpretation Group (CIG)](https://cig.ustc.edu.cn/main.htm) at the University of Science and Technology of China.

Original paper:
> **CIGVis: An open-source Python tool for the real-time interactive visualization of multidimensional geophysical data**
> Jintao Li, Yunzhi Shi, Xinming Wu
> Paper: https://library.seg.org/doi/abs/10.1190/geo2024-0041.1

## Related Projects

- [cigvis](https://github.com/JintaoLee-Roger/cigvis) - Original Python library
- [vispy](https://github.com/vispy/vispy) - 3D visualization library used by cigvis Python
- [Three.js](https://threejs.org/) - 3D library used by cigvis.js
