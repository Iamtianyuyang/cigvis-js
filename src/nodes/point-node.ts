/**
 * Point cloud node creation - ported from cigvis Python library
 * Creates point cloud visualization
 */

import { PointCloudData, Clim, ColormapInput } from '../types';

export interface PointNode {
  type: 'point-cloud';
  positions: Float32Array;
  colors?: Float32Array;
  values?: Float32Array;
  cmap?: string;
  clim?: Clim;
  pointSize?: number;
  visible: boolean;
  opacity: number;
}

export interface CreatePointOptions {
  /** Point positions as flat array [x,y,z,x,y,z,...] */
  positions: Float32Array;
  /** Point colors as flat array [r,g,b,a,...] (values 0-1) */
  colors?: Float32Array;
  /** Values for colormap coloring */
  values?: Float32Array;
  /** Number of points (auto-computed from positions.length / 3) */
  count?: number;
  /** Colormap for values */
  cmap?: ColormapInput;
  /** Color limits */
  clim?: Clim;
  /** Point size */
  pointSize?: number;
  /** Fixed color */
  color?: string;
  /** Opacity */
  opacity?: number;
}

/**
 * Compute min/max of Float32Array
 */
function computeClim(data: Float32Array): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (!isNaN(v) && isFinite(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return [min, max];
}

/**
 * Create point cloud visualization node
 *
 * @example
 * ```ts
 * // Simple point cloud
 * const node = createPointCloud({
 *   positions: new Float32Array([x1,y1,z1, x2,y2,z2, ...]),
 *   color: 'red',
 *   pointSize: 2,
 * });
 *
 * // Point cloud with value coloring
 * const node = createPointCloud({
 *   positions: pointPositions,
 *   values: pointValues,
 *   cmap: 'rainbow',
 *   clim: [0, 100],
 * });
 * ```
 */
export function createPointCloud(options: CreatePointOptions): PointNode {
  const {
    positions,
    colors,
    values,
    cmap,
    clim: userClim,
    pointSize = 1.0,
    opacity = 1.0,
  } = options;

  let finalClim: Clim | undefined;
  let finalCmap: string | undefined;
  let finalColors: Float32Array | undefined;

  if (values) {
    finalClim = userClim || computeClim(values);
    finalCmap = typeof cmap === 'string' ? cmap : cmap?.name;

    // Generate colors from values using colormap
    if (finalCmap) {
      const colormap = createColormap(finalCmap);
      const count = positions.length / 3;
      finalColors = new Float32Array(count * 4);

      for (let i = 0; i < count; i++) {
        let t = (values[i] - finalClim[0]) / (finalClim[1] - finalClim[0]);
        t = Math.max(0, Math.min(1, t));
        const [r, g, b] = colormap.at(t);
        finalColors[i * 4] = r;
        finalColors[i * 4 + 1] = g;
        finalColors[i * 4 + 2] = b;
        finalColors[i * 4 + 3] = opacity;
      }
    }
  } else if (colors) {
    finalColors = colors;
  }

  return {
    type: 'point-cloud',
    positions,
    colors: finalColors,
    values,
    cmap: finalCmap,
    clim: finalClim,
    pointSize,
    visible: true,
    opacity,
  };
}

/**
 * Create points from arrays of x, y, z coordinates
 */
export function createPoints(
  x: Float32Array,
  y: Float32Array,
  z: Float32Array,
  options: {
    values?: Float32Array;
    cmap?: ColormapInput;
    clim?: Clim;
    pointSize?: number;
    color?: string;
    opacity?: number;
  } = {}
): PointNode {
  const count = x.length;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = x[i];
    positions[i * 3 + 1] = y[i];
    positions[i * 3 + 2] = z[i];
  }

  return createPointCloud({
    positions,
    values: options.values,
    cmap: options.cmap,
    clim: options.clim,
    pointSize: options.pointSize,
    color: options.color,
    opacity: options.opacity,
  });
}

/**
 * Create random point cloud for testing
 */
export function createRandomPointCloud(
  count: number = 1000,
  range: number = 10,
  seed: number = 42
): PointNode {
  // Simple seeded random
  let s = seed;
  const random = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const positions = new Float32Array(count * 3);
  const values = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - 0.5) * range;
    positions[i * 3 + 1] = (random() - 0.5) * range;
    positions[i * 3 + 2] = (random() - 0.5) * range;
    values[i] = Math.sqrt(
      positions[i * 3] ** 2 +
      positions[i * 3 + 1] ** 2 +
      positions[i * 3 + 2] ** 2
    );
  }

  return createPointCloud({
    positions,
    values,
    cmap: 'rainbow',
    pointSize: 2,
  });
}

// Import colormap function
import { createColormap as _createColormap } from '../colormap';
function createColormap(name: string) {
  return _createColormap(name);
}
