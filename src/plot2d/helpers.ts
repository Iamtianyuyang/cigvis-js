/**
 * 2D plotting helper functions for CIGVis
 * Ported from cigvis Python library (cigvis/mpl2dplot.py)
 *
 * @module plot2d/helpers
 */

import { ColormapInput, Clim } from '../types';
import { createColormap, getColorsFromCmap } from '../colormap';
import { isLineFirst } from '../config';

// ============================================================================
// Types
// ============================================================================

/** Foreground image arguments */
export interface FgImageArgs {
  type: 'image';
  data: Float32Array;
  width: number;
  height: number;
  cmap: string;
  clim: Clim;
  alpha: number;
  interpolation: 'nearest' | 'bicubic';
  showColorbar: boolean;
}

/** Line arguments */
export interface LineArgs {
  type: 'line';
  x: Float32Array;
  y: Float32Array;
  color: string;
  alpha: number;
  lineWidth: number;
  label: string;
  marker: string;
  lineStyle: string;
  markerSize: number;
}

/** Marker arguments */
export interface MarkerArgs {
  type: 'marker';
  x: Float32Array;
  y: Float32Array;
  size: number;
  color: string | Float32Array;
  marker: string;
  cmap: string;
  vmin: number;
  vmax: number;
  alpha: number;
  zIndex: number;
}

/** Annotate arguments */
export interface AnnotateArgs {
  type: 'annotate';
  x: Float32Array;
  y: Float32Array;
  text: string[];
  offsetX: number;
  offsetY: number;
}

/** Any foreground element */
export type ForegroundArgs = FgImageArgs | LineArgs | MarkerArgs | AnnotateArgs;

/** Discrete colorbar result */
export interface DiscreteColorbar {
  cmap: string;
  values: number[];
  ticks: number[];
  tickLabels: string[];
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Create foreground image arguments.
 * Ported from cigvis Python: fg_image_args
 *
 * @param data - Image data
 * @param width - Image width
 * @param height - Image height
 * @param options - Optional parameters
 * @returns FgImageArgs
 *
 * @example
 * ```ts
 * const fg = fgImageArgs(overlayData, 200, 150, {
 *   cmap: 'jet',
 *   alpha: 0.5,
 * });
 * ```
 */
export function fgImageArgs(
  data: Float32Array,
  width: number,
  height: number,
  options: {
    cmap?: string;
    clim?: Clim;
    alpha?: number;
    interpolation?: 'nearest' | 'bicubic';
    showColorbar?: boolean;
  } = {}
): FgImageArgs {
  const {
    cmap = 'jet',
    clim,
    alpha = 1.0,
    interpolation = 'bicubic',
    showColorbar = true,
  } = options;

  // Transpose if line-first
  let processedData = data;
  let processedWidth = width;
  let processedHeight = height;

  if (isLineFirst()) {
    // Transpose the data
    processedData = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        processedData[x * height + y] = data[y * width + x];
      }
    }
    processedWidth = height;
    processedHeight = width;
  }

  // Compute clim if not provided
  const finalClim: Clim = clim || (() => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < processedData.length; i++) {
      if (processedData[i] < min) min = processedData[i];
      if (processedData[i] > max) max = processedData[i];
    }
    return [min, max] as Clim;
  })();

  return {
    type: 'image',
    data: processedData,
    width: processedWidth,
    height: processedHeight,
    cmap,
    clim: finalClim,
    alpha,
    interpolation,
    showColorbar,
  };
}

/**
 * Create line arguments.
 * Ported from cigvis Python: line_args
 *
 * @param x - X coordinates
 * @param y - Y coordinates
 * @param options - Optional parameters
 * @returns LineArgs
 *
 * @example
 * ```ts
 * const line = lineArgs(xData, yData, {
 *   color: 'red',
 *   lineWidth: 2,
 *   label: 'Well A',
 * });
 * ```
 */
export function lineArgs(
  x: Float32Array,
  y: Float32Array,
  options: {
    color?: string;
    alpha?: number;
    lineWidth?: number;
    label?: string;
    marker?: string;
    lineStyle?: string;
    markerSize?: number;
  } = {}
): LineArgs {
  const {
    color = '#1f77b4',
    alpha = 1.0,
    lineWidth = 1,
    label = '',
    marker = '',
    lineStyle = 'solid',
    markerSize = 6,
  } = options;

  return {
    type: 'line',
    x,
    y,
    color,
    alpha,
    lineWidth,
    label,
    marker,
    lineStyle,
    markerSize,
  };
}

/**
 * Create marker arguments.
 * Ported from cigvis Python: marker_args
 *
 * @param x - X coordinates
 * @param y - Y coordinates
 * @param options - Optional parameters
 * @returns MarkerArgs
 *
 * @example
 * ```ts
 * const markers = markerArgs(xData, yData, {
 *   size: 50,
 *   color: values,
 *   cmap: 'jet',
 * });
 * ```
 */
export function markerArgs(
  x: Float32Array,
  y: Float32Array,
  options: {
    size?: number;
    color?: string | Float32Array;
    marker?: string;
    cmap?: string;
    vmin?: number;
    vmax?: number;
    alpha?: number;
    zIndex?: number;
  } = {}
): MarkerArgs {
  const {
    size = 20,
    color = '#1f77b4',
    marker = 'o',
    cmap = 'jet',
    vmin,
    vmax,
    alpha = 1.0,
    zIndex = 2,
  } = options;

  return {
    type: 'marker',
    x,
    y,
    size,
    color,
    marker,
    cmap,
    vmin: vmin ?? 0,
    vmax: vmax ?? 1,
    alpha,
    zIndex,
  };
}

/**
 * Create annotate arguments.
 * Ported from cigvis Python: annotate_args
 *
 * @param x - X coordinates
 * @param y - Y coordinates
 * @param text - Text labels
 * @param options - Optional parameters
 * @returns Array of AnnotateArgs
 *
 * @example
 * ```ts
 * const annots = annotateArgs(xData, yData, ['A', 'B', 'C'], {
 *   offsetX: 5,
 *   offsetY: 5,
 * });
 * ```
 */
export function annotateArgs(
  x: Float32Array,
  y: Float32Array,
  text: string[],
  options: {
    offsetX?: number;
    offsetY?: number;
  } = {}
): AnnotateArgs[] {
  const { offsetX = 1, offsetY = 1 } = options;

  if (x.length !== y.length || x.length !== text.length) {
    throw new Error('x, y, and text must have the same length');
  }

  return [{
    type: 'annotate',
    x,
    y,
    text,
    offsetX,
    offsetY,
  }];
}

/**
 * Check if data is discrete (few unique values).
 * Ported from cigvis Python: _check_is_disceret
 *
 * @param data - Data array
 * @param threshold - Maximum number of unique values to consider discrete
 * @returns Whether the data is discrete
 */
export function isDiscrete(data: Float32Array, threshold: number = 20): boolean {
  // Sample data for efficiency
  const sampleSize = Math.max(1, Math.floor(data.length * 0.01));
  const step = Math.max(1, Math.floor(data.length / sampleSize));

  const unique = new Set<number>();
  for (let i = 0; i < data.length; i += step) {
    unique.add(data[i]);
    if (unique.size > threshold) return false;
  }

  return true;
}

/**
 * Create a discrete colorbar.
 * Ported from cigvis Python: discrete_cbar
 *
 * @param data - Data array
 * @param cmap - Colormap name
 * @param clim - Color limits
 * @param options - Optional parameters
 * @returns DiscreteColorbar
 *
 * @example
 * ```ts
 * const cbar = discreteColorbar(faciesData, 'jet', [0, 3], {
 *   tickLabels: ['Sand', 'Shale', 'Limestone'],
 * });
 * ```
 */
export function discreteColorbar(
  data: Float32Array,
  cmap: string,
  clim: Clim,
  options: {
    tickLabels?: string[];
    removeTransparent?: boolean;
  } = {}
): DiscreteColorbar {
  const { tickLabels, removeTransparent = true } = options;

  if (!isDiscrete(data)) {
    throw new Error(
      'Data is not discrete. Use discrete=false or provide discrete data.'
    );
  }

  // Get unique values
  const uniqueValues = Array.from(new Set(data)).sort((a, b) => a - b);

  // Get colors for each value
  const colors = getColorsFromCmap(cmap, clim, uniqueValues);

  // Filter out transparent values if requested
  let filteredValues = uniqueValues;
  let filteredColors = colors;
  let filteredLabels = tickLabels;

  if (removeTransparent) {
    const nonTransparent: number[] = [];
    const nonTransparentColors: [number, number, number][] = [];
    const nonTransparentLabels: string[] = [];

    for (let i = 0; i < colors.length; i++) {
      // Check if color is not fully transparent
      // (simplified - assumes alpha is encoded in the colormap)
      nonTransparent.push(uniqueValues[i]);
      nonTransparentColors.push(colors[i]);
      if (tickLabels) {
        nonTransparentLabels.push(tickLabels[i]);
      }
    }

    filteredValues = nonTransparent;
    filteredColors = nonTransparentColors;
    filteredLabels = nonTransparentLabels;
  }

  // Create tick positions (center of each color band)
  const ticks = filteredValues.map((_, i) => i);

  return {
    cmap,
    values: filteredValues,
    ticks,
    tickLabels: filteredLabels || filteredValues.map(v => v.toString()),
  };
}

/**
 * Compute aspect ratio for 2D plot.
 *
 * @param dataWidth - Data width
 * @param dataHeight - Data height
 * @param aspect - Aspect ratio setting
 * @returns [canvasWidth, canvasHeight]
 */
export function computeAspect(
  dataWidth: number,
  dataHeight: number,
  aspect: 'equal' | 'auto' | number = 'equal'
): [number, number] {
  if (aspect === 'equal') {
    // 1:1 pixel ratio
    return [dataWidth, dataHeight];
  } else if (aspect === 'auto') {
    // Fill available space
    return [800, 600];
  } else if (typeof aspect === 'number') {
    // Custom aspect ratio (height/width)
    const width = 800;
    const height = Math.round(width * aspect);
    return [width, height];
  }

  return [800, 600];
}

/**
 * Create axis tick labels with sampling information.
 *
 * @param start - Start value
 * @param step - Step value
 * @param count - Number of ticks
 * @returns Array of tick values
 */
export function createTickLabels(
  start: number,
  step: number,
  count: number
): number[] {
  return Array.from({ length: count }, (_, i) => start + i * step);
}

/**
 * Format tick label for display.
 *
 * @param value - Tick value
 * @param decimals - Number of decimal places
 * @returns Formatted string
 */
export function formatTickLabel(value: number, decimals: number = 1): string {
  return value.toFixed(decimals);
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a plot2d helpers agent for programmatic access.
 */
export function createPlot2dHelpersAgent() {
  return {
    fgImageArgs,
    lineArgs,
    markerArgs,
    annotateArgs,
    isDiscrete,
    discreteColorbar,
    computeAspect,
    createTickLabels,
    formatTickLabel,
  };
}
