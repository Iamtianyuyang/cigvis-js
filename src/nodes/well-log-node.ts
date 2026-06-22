/**
 * Well log node creation - ported from cigvis Python library
 * Creates well log visualization (trajectories and curves)
 */

import { WellLogNode, WellLogPoint, Clim, ColormapInput } from '../types';

export interface CreateWellLogOptions {
  /** Well trajectory points */
  trajectory: WellLogPoint[];
  /** Values along the trajectory (e.g., gamma ray, resistivity) */
  values?: Float32Array;
  /** Tube radius for 3D rendering */
  radius?: number;
  /** Colormap for values */
  cmap?: ColormapInput;
  /** Color limits for values */
  clim?: Clim;
  /** Visualization style */
  style?: 'line' | 'tubes';
  /** Fixed color (when not using values) */
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
 * Create well log visualization node
 *
 * @example
 * ```ts
 * // Simple trajectory
 * const node = createWellLog({
 *   trajectory: [
 *     { x: 10, y: 20, z: 0 },
 *     { x: 12, y: 22, z: 50 },
 *     { x: 15, y: 25, z: 100 },
 *   ],
 *   color: 'yellow',
 *   style: 'tubes',
 * });
 *
 * // Trajectory with values
 * const node = createWellLog({
 *   trajectory: wellPositions,
 *   values: gammaRayData,
 *   cmap: 'hot',
 *   clim: [0, 150],
 *   style: 'tubes',
 * });
 * ```
 */
export function createWellLog(options: CreateWellLogOptions): WellLogNode {
  const {
    trajectory,
    values,
    radius = 0.02,
    cmap,
    clim: userClim,
    style = 'tubes',
    opacity = 1.0,
  } = options;

  let finalClim: Clim | undefined;
  let finalCmap: string | undefined;

  if (values) {
    finalClim = userClim || computeClim(values);
    finalCmap = typeof cmap === 'string' ? cmap : cmap?.name;
  }

  return {
    type: 'well-log',
    trajectory,
    values,
    radius,
    cmap: finalCmap,
    clim: finalClim,
    style,
    visible: true,
    opacity,
  };
}

/**
 * Create multiple well log nodes
 */
export function createWellLogs(
  trajectories: WellLogPoint[][],
  options: {
    values?: Float32Array[];
    radius?: number;
    cmap?: ColormapInput;
    clim?: Clim;
    style?: 'line' | 'tubes';
    color?: string;
    opacity?: number;
  } = {}
): WellLogNode[] {
  return trajectories.map((trajectory, i) =>
    createWellLog({
      trajectory,
      values: options.values?.[i],
      radius: options.radius,
      cmap: options.cmap,
      clim: options.clim,
      style: options.style,
      color: options.color,
      opacity: options.opacity,
    })
  );
}

/**
 * Create well log from LAS file data
 */
export function createWellLogFromLAS(
  depths: Float32Array,
  values: Float32Array,
  options: {
    x?: number;
    y?: number;
    radius?: number;
    cmap?: ColormapInput;
    clim?: Clim;
    style?: 'line' | 'tubes';
  } = {}
): WellLogNode {
  const { x = 0, y = 0 } = options;
  const trajectory: WellLogPoint[] = [];

  for (let i = 0; i < depths.length; i++) {
    trajectory.push({ x, y, z: depths[i] });
  }

  return createWellLog({
    trajectory,
    values,
    radius: options.radius,
    cmap: options.cmap,
    clim: options.clim,
    style: options.style,
  });
}
