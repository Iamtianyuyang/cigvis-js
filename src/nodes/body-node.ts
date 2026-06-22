/**
 * Body (isosurface) node creation - ported from cigvis Python library
 * Creates isosurface visualization from 3D volume data
 */

import { BodyNode, VolumeData, Clim, ColormapInput } from '../types';

export interface CreateBodyOptions {
  /** Volume data */
  data: Float32Array;
  /** Volume shape [ni, nx, nt] */
  shape: [number, number, number];
  /** Isovalue for surface extraction */
  isoValue?: number;
  /** Color limits for value coloring */
  clim?: Clim;
  /** Colormap for value coloring */
  cmap?: ColormapInput;
  /** Fixed color (when not using colormap) */
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
 * Find the mean value in the data
 */
function computeMean(data: Float32Array): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    if (!isNaN(data[i]) && isFinite(data[i])) {
      sum += data[i];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

/**
 * Create body (isosurface) visualization node
 *
 * @example
 * ```ts
 * // Single isosurface
 * const node = createBody({
 *   data: volumeData,
 *   shape: [192, 200, 240],
 *   isoValue: 0.5,
 *   color: 'green',
 * });
 *
 * // Isosurface with value coloring
 * const node = createBody({
 *   data: volumeData,
 *   shape: [192, 200, 240],
 *   isoValue: 0.0,
 *   cmap: 'seismic',
 *   clim: [-1, 1],
 * });
 * ```
 */
export function createBody(options: CreateBodyOptions): BodyNode {
  const {
    data,
    shape,
    isoValue = computeMean(data),
    clim: userClim,
    cmap,
    color = '#00ff00',
    opacity = 1.0,
  } = options;

  const finalClim = userClim || computeClim(data);
  const finalCmap = typeof cmap === 'string' ? cmap : cmap?.name;

  return {
    type: 'body',
    volume: { data, shape },
    isoValue,
    color,
    cmap: finalCmap,
    clim: finalClim,
    visible: true,
    opacity,
  };
}

/**
 * Create multiple body nodes at different isovalues
 */
export function createBodies(
  data: Float32Array,
  shape: [number, number, number],
  isoValues: number[],
  options: {
    cmap?: ColormapInput;
    clim?: Clim;
    color?: string;
    opacity?: number;
  } = {}
): BodyNode[] {
  return isoValues.map(isoValue =>
    createBody({
      data,
      shape,
      isoValue,
      cmap: options.cmap,
      clim: options.clim,
      color: options.color,
      opacity: options.opacity,
    })
  );
}

/**
 * Create body from threshold
 * Extract isosurface at a specific percentile of the data
 */
export function createBodyFromThreshold(
  data: Float32Array,
  shape: [number, number, number],
  percentile: number = 50,
  options: {
    cmap?: ColormapInput;
    clim?: Clim;
    color?: string;
    opacity?: number;
  } = {}
): BodyNode {
  // Sort a copy to find percentile
  const sorted = Float32Array.from(data).sort();
  const idx = Math.floor((percentile / 100) * sorted.length);
  const isoValue = sorted[idx];

  return createBody({
    data,
    shape,
    isoValue,
    cmap: options.cmap,
    clim: options.clim,
    color: options.color,
    opacity: options.opacity,
  });
}
