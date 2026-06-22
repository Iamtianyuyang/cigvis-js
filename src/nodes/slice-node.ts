/**
 * Slice node creation - ported from cigvis Python library
 * Creates 2D slices from 3D volume data
 */

import { SliceNode, OverlayNode, Clim, ColormapInput } from '../types';

export interface CreateSliceOptions {
  /** Volume data as Float32Array with shape [ni, nx, nt] */
  data: Float32Array;
  /** Volume shape [ni, nx, nt] */
  shape: [number, number, number];
  /** Slice positions: can be a single number or array of numbers for each axis */
  pos?: number | number[] | { x?: number | number[]; y?: number | number[]; z?: number | number[] };
  /** Color limits [vmin, vmax]. If null, auto-computed from data */
  clim?: Clim | null;
  /** Colormap name or object */
  cmap?: ColormapInput;
  /** Interpolation method */
  interpolation?: 'nearest' | 'linear';
  /** NaN color */
  nancolor?: string;
  /** Whether to show intersection lines */
  intersectionLines?: boolean;
  /** Intersection line color */
  lineColor?: string;
  /** Intersection line width */
  lineWidth?: number;
}

/**
 * Compute min/max of Float32Array
 */
function computeClim(data: Float32Array): Clim {
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
 * Extract a 2D slice from a 3D volume
 */
function extractSlice(
  data: Float32Array,
  shape: [number, number, number],
  axis: 'x' | 'y' | 'z',
  pos: number
): { data: Float32Array; shape: [number, number] } {
  const [ni, nx, nt] = shape;

  switch (axis) {
    case 'x': {
      // Inline slice: shape becomes [nx, nt]
      const slice = new Float32Array(nx * nt);
      for (let y = 0; y < nx; y++) {
        for (let z = 0; z < nt; z++) {
          slice[y * nt + z] = data[pos * nx * nt + y * nt + z];
        }
      }
      return { data: slice, shape: [nx, nt] };
    }
    case 'y': {
      // Crossline slice: shape becomes [ni, nt]
      const slice = new Float32Array(ni * nt);
      for (let x = 0; x < ni; x++) {
        for (let z = 0; z < nt; z++) {
          slice[x * nt + z] = data[x * nx * nt + pos * nt + z];
        }
      }
      return { data: slice, shape: [ni, nt] };
    }
    case 'z': {
      // Time/depth slice: shape becomes [ni, nx]
      const slice = new Float32Array(ni * nx);
      for (let x = 0; x < ni; x++) {
        for (let y = 0; y < nx; y++) {
          slice[x * nx + y] = data[x * nx * nt + y * nt + pos];
        }
      }
      return { data: slice, shape: [ni, nx] };
    }
  }
}

/**
 * Create slice visualization nodes from 3D volume data
 *
 * @example
 * ```ts
 * // Single slice
 * const nodes = createSlices({
 *   data: volumeData,
 *   shape: [192, 200, 240],
 *   pos: { z: 239 },
 *   cmap: 'petrel',
 *   clim: [-1, 1],
 * });
 *
 * // Multiple slices
 * const nodes = createSlices({
 *   data: volumeData,
 *   shape: [192, 200, 240],
 *   pos: { x: 0, y: 0, z: 239 },
 *   cmap: 'gray',
 * });
 * ```
 */
export function createSlices(options: CreateSliceOptions): SliceNode[] {
  const {
    data,
    shape,
    pos,
    clim: userClim,
    cmap = 'petrel',
    interpolation = 'linear',
  } = options;

  const nodes: SliceNode[] = [];
  const clim = userClim || computeClim(data);

  // Parse positions
  const positions: { axis: 'x' | 'y' | 'z'; pos: number }[] = [];

  if (pos === undefined || pos === null) {
    // Default: center of each axis
    positions.push(
      { axis: 'x', pos: Math.floor(shape[0] / 2) },
      { axis: 'y', pos: Math.floor(shape[1] / 2) },
      { axis: 'z', pos: Math.floor(shape[2] / 2) },
    );
  } else if (typeof pos === 'number') {
    // Single position on z axis
    positions.push({ axis: 'z', pos });
  } else if (Array.isArray(pos)) {
    // Array of positions on z axis
    for (const p of pos) {
      positions.push({ axis: 'z', pos: p });
    }
  } else {
    // Object with axis-specific positions
    if (pos.x !== undefined) {
      const xs = Array.isArray(pos.x) ? pos.x : [pos.x];
      for (const p of xs) positions.push({ axis: 'x', pos: p });
    }
    if (pos.y !== undefined) {
      const ys = Array.isArray(pos.y) ? pos.y : [pos.y];
      for (const p of ys) positions.push({ axis: 'y', pos: p });
    }
    if (pos.z !== undefined) {
      const zs = Array.isArray(pos.z) ? pos.z : [pos.z];
      for (const p of zs) positions.push({ axis: 'z', pos: p });
    }
  }

  // Create slice nodes
  for (const { axis, pos: slicePos } of positions) {
    const { data: sliceData, shape: sliceShape } = extractSlice(data, shape, axis, slicePos);

    nodes.push({
      type: 'slice',
      axis,
      pos: slicePos,
      data: sliceData,
      shape: sliceShape,
      cmap: typeof cmap === 'string' ? cmap : cmap.name,
      clim,
      interpolation,
      visible: true,
      opacity: 1.0,
    });
  }

  return nodes;
}

/**
 * Add mask overlay to existing slice nodes
 *
 * @example
 * ```ts
 * const nodes = createSlices({ data: volume, shape: [192, 200, 240] });
 * const maskedNodes = addMask(nodes, maskData, { cmap: 'jet', clim: [0, 1] });
 * ```
 */
export function addMask(
  sliceNodes: SliceNode[],
  maskData: Float32Array,
  options: {
    cmap?: ColormapInput;
    clim?: Clim;
    opacity?: number;
  } = {}
): OverlayNode[] {
  const {
    cmap = 'jet',
    clim = computeClim(maskData),
    opacity = 1.0,
  } = options;

  return sliceNodes.map(node => ({
    type: 'overlay' as const,
    sliceNode: node,
    maskData,
    cmap: typeof cmap === 'string' ? cmap : cmap.name,
    clim,
    visible: true,
    opacity,
  }));
}

/**
 * Create overlay visualization nodes
 */
export function createOverlay(
  data: Float32Array,
  shape: [number, number, number],
  options: {
    pos?: number | { z?: number };
    cmap?: ColormapInput;
    clim?: Clim;
    opacity?: number;
  } = {}
): OverlayNode[] {
  const sliceNodes = createSlices({
    data,
    shape,
    pos: options.pos,
    cmap: 'gray',
    clim: options.clim || computeClim(data),
  });

  return addMask(sliceNodes, data, {
    cmap: options.cmap,
    clim: options.clim,
    opacity: options.opacity,
  });
}
