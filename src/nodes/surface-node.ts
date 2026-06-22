/**
 * Surface node creation - ported from cigvis Python library
 * Creates surface visualization from 2D height maps
 */

import { SurfaceNode, Clim, ColormapInput } from '../types';

export interface CreateSurfaceOptions {
  /** Array of surface height maps, each as Float32Array with shape [ni, nx] */
  surfaces: Float32Array[];
  /** Shape of each surface [ni, nx] */
  shape: [number, number];
  /** Value type: 'depth' for height maps, 'amp' for amplitude coloring */
  valueType?: 'depth' | 'amp';
  /** Volume data for amplitude coloring */
  volume?: Float32Array;
  /** Volume shape [ni, nx, nt] */
  volumeShape?: [number, number, number];
  /** Color limits for amplitude */
  clim?: Clim;
  /** Colormap for amplitude coloring */
  cmap?: ColormapInput;
  /** Fixed color (when not using amplitude) */
  color?: string;
  /** Opacity */
  opacity?: number;
}

/**
 * Extract amplitude values from volume at surface positions
 */
function extractAmplitudeAtSurface(
  volume: Float32Array,
  volumeShape: [number, number, number],
  surface: Float32Array,
  surfaceShape: [number, number]
): Float32Array {
  const [ni, nx, nt] = volumeShape;
  const [si, sx] = surfaceShape;
  const result = new Float32Array(si * sx);

  for (let i = 0; i < si; i++) {
    for (let j = 0; j < sx; j++) {
      const depth = Math.round(surface[i * sx + j]);
      const clampedDepth = Math.max(0, Math.min(nt - 1, depth));
      result[i * sx + j] = volume[i * nx * nt + j * nt + clampedDepth];
    }
  }

  return result;
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
 * Create surface visualization nodes
 *
 * @example
 * ```ts
 * // Surface with depth coloring
 * const nodes = createSurfaces({
 *   surfaces: [surfaceData1, surfaceData2],
 *   shape: [192, 200],
 * });
 *
 * // Surface with amplitude coloring
 * const nodes = createSurfaces({
 *   surfaces: [surfaceData],
 *   shape: [192, 200],
 *   valueType: 'amp',
 *   volume: volumeData,
 *   volumeShape: [192, 200, 240],
 *   cmap: 'seismic',
 * });
 * ```
 */
export function createSurfaces(options: CreateSurfaceOptions): SurfaceNode[] {
  const {
    surfaces,
    shape,
    valueType = 'depth',
    volume,
    volumeShape,
    clim: userClim,
    cmap,
    color,
    opacity = 1.0,
  } = options;

  const nodes: SurfaceNode[] = [];

  for (const surface of surfaces) {
    let valueData: Float32Array | undefined;
    let finalClim: Clim | undefined;
    let finalCmap: string | undefined;

    if (valueType === 'amp' && volume && volumeShape) {
      // Extract amplitude at surface positions
      valueData = extractAmplitudeAtSurface(volume, volumeShape, surface, shape);
      finalClim = userClim || computeClim(valueData);
      finalCmap = typeof cmap === 'string' ? cmap : cmap?.name;
    }

    nodes.push({
      type: 'surface',
      heightMap: surface,
      shape,
      color,
      opacity,
      valueData,
      cmap: finalCmap,
      clim: finalClim,
      visible: true,
    });
  }

  return nodes;
}

/**
 * Create a single surface node
 */
export function createSurface(
  surface: Float32Array,
  shape: [number, number],
  options: {
    volume?: Float32Array;
    volumeShape?: [number, number, number];
    cmap?: ColormapInput;
    clim?: Clim;
    color?: string;
    opacity?: number;
  } = {}
): SurfaceNode {
  const nodes = createSurfaces({
    surfaces: [surface],
    shape,
    valueType: options.volume ? 'amp' : 'depth',
    volume: options.volume,
    volumeShape: options.volumeShape,
    cmap: options.cmap,
    clim: options.clim,
    color: options.color,
    opacity: options.opacity,
  });

  return nodes[0];
}
