/**
 * Additional node creation functions for CIGVis
 * Ported from cigvis Python library (vispyplot.py)
 *
 * @module nodes/extra-nodes
 */

import { ColormapInput, Clim } from '../types';
import { createColormap, getColorsFromCmap } from '../colormap';

// ============================================================================
// Types
// ============================================================================

/** Colorbar node */
export interface ColorbarNode {
  type: 'colorbar';
  cmap: string;
  clim: Clim;
  label: string;
  position: 'right' | 'left' | 'top' | 'bottom';
  width: number;
  height: number;
  visible: boolean;
}

/** Axis node */
export interface AxisNode {
  type: 'axis';
  shape: [number, number, number];
  mode: 'box' | 'cross';
  labels: [string, string, string];
  intervals: [number, number, number];
  starts: [number, number, number];
  tickNums: number;
  visible: boolean;
}

/** Line log node */
export interface LineLogNode {
  type: 'line-log';
  positions: Float32Array;
  values: Float32Array | null;
  cmap: string;
  clim: Clim;
  width: number;
  visible: boolean;
  opacity: number;
}

/** Fault skin node */
export interface FaultSkinNode {
  type: 'fault-skin';
  vertices: Float32Array;
  faces: Uint32Array;
  values: Float32Array | null;
  cmap: string;
  clim: Clim;
  color: string;
  visible: boolean;
  opacity: number;
}

/** Arbitrary line node */
export interface ArbitraryLineNode {
  type: 'arbitrary-line';
  path: Float32Array;
  data: Float32Array;
  dataShape: [number, number];
  cmap: string;
  clim: Clim;
  visible: boolean;
}

// ============================================================================
// Create colorbar
// ============================================================================

/**
 * Create a colorbar node.
 * Ported from cigvis Python: create_colorbar
 *
 * @param cmap - Colormap name
 * @param clim - Color limits [vmin, vmax]
 * @param options - Optional parameters
 * @returns ColorbarNode
 *
 * @example
 * ```ts
 * const cbar = createColorbar('petrel', [-1, 1], { label: 'Amplitude' });
 * ```
 */
export function createColorbar(
  cmap: string | ColormapImpl,
  clim: Clim,
  options: {
    label?: string;
    position?: 'right' | 'left' | 'top' | 'bottom';
    width?: number;
    height?: number;
  } = {}
): ColorbarNode {
  const {
    label = '',
    position = 'right',
    width = 20,
    height = 200,
  } = options;

  const cmapName = typeof cmap === 'string' ? cmap : cmap.name;

  return {
    type: 'colorbar',
    cmap: cmapName,
    clim,
    label,
    position,
    width,
    height,
    visible: true,
  };
}

/**
 * Create a colorbar from existing visualization nodes.
 * Ported from cigvis Python: create_colorbar_from_nodes
 *
 * @param nodes - Array of visualization nodes
 * @param options - Optional parameters
 * @returns ColorbarNode
 */
export function createColorbarFromNodes(
  nodes: any[],
  options: {
    label?: string;
    select?: 'auto' | 'mask' | 'surface' | 'slices' | 'logs';
    idx?: number;
  } = {}
): ColorbarNode {
  const { label = '', select = 'auto', idx = 0 } = options;

  // Find colormap and clim from nodes
  let cmap: string = 'petrel';
  let clim: Clim = [0, 1];

  if (select === 'auto' || select === 'slices') {
    // Look for slice nodes
    for (const node of nodes) {
      if (node.type === 'slice' && node.cmap) {
        cmap = node.cmap;
        clim = node.clim;
        break;
      }
    }
  }

  return createColorbar(cmap, clim, { label });
}

// ============================================================================
// Create axis
// ============================================================================

/**
 * Create a 3D axis node with labels and ticks.
 * Ported from cigvis Python: create_axis
 *
 * @param shape - Volume shape [ni, nx, nt]
 * @param options - Optional parameters
 * @returns AxisNode
 *
 * @example
 * ```ts
 * const axis = createAxis([192, 200, 240], {
 *   labels: ['Inline', 'Xline', 'Time'],
 *   intervals: [10, 10, 100],
 * });
 * ```
 */
export function createAxis(
  shape: [number, number, number],
  options: {
    mode?: 'box' | 'cross';
    labels?: [string, string, string];
    intervals?: [number, number, number];
    starts?: [number, number, number];
    tickNums?: number;
  } = {}
): AxisNode {
  const {
    mode = 'box',
    labels = ['Inline', 'Xline', 'Time'],
    intervals = [1, 1, 1],
    starts = [0, 0, 0],
    tickNums = 7,
  } = options;

  return {
    type: 'axis',
    shape,
    mode,
    labels,
    intervals,
    starts,
    tickNums,
    visible: true,
  };
}

// ============================================================================
// Create line logs
// ============================================================================

/**
 * Create line log visualization nodes.
 * Ported from cigvis Python: create_line_logs
 *
 * @param logs - Array of log data arrays
 * @param options - Optional parameters
 * @returns Array of LineLogNode
 *
 * @example
 * ```ts
 * const nodes = createLineLogs([logData1, logData2], {
 *   cmap: 'jet',
 *   width: 6,
 * });
 * ```
 */
export function createLineLogs(
  logs: Float32Array[],
  options: {
    valueType?: 'depth' | 'amp';
    cmap?: string;
    clim?: Clim;
    width?: number;
  } = {}
): LineLogNode[] {
  const {
    valueType = 'depth',
    cmap = 'jet',
    clim: userClim,
    width = 6.0,
  } = options;

  const nodes: LineLogNode[] = [];

  // Compute clim if not provided
  let clim: Clim;
  if (userClim) {
    clim = userClim;
  } else {
    let min = Infinity;
    let max = -Infinity;
    for (const log of logs) {
      for (let i = 0; i < log.length; i++) {
        if (log[i] < min) min = log[i];
        if (log[i] > max) max = log[i];
      }
    }
    clim = [min, max];
  }

  for (const log of logs) {
    // Each log is [x,y,z, value?] per row
    const nCols = log.length > 0 ? 3 : 0; // Assume 3 columns for now
    const nRows = log.length / nCols;

    const positions = new Float32Array(nRows * 3);
    let values: Float32Array | null = null;

    if (nCols >= 4) {
      values = new Float32Array(nRows);
    }

    for (let i = 0; i < nRows; i++) {
      positions[i * 3] = log[i * nCols];
      positions[i * 3 + 1] = log[i * nCols + 1];
      positions[i * 3 + 2] = log[i * nCols + 2];

      if (values && nCols >= 4) {
        values[i] = log[i * nCols + 3];
      }
    }

    nodes.push({
      type: 'line-log',
      positions,
      values,
      cmap,
      clim,
      width,
      visible: true,
      opacity: 1.0,
    });
  }

  return nodes;
}

// ============================================================================
// Create fault skin
// ============================================================================

/**
 * Create fault skin visualization node.
 * Ported from cigvis Python: create_fault_skin
 *
 * @param vertices - Vertex positions [N, 3]
 * @param faces - Face indices [M, 3]
 * @param options - Optional parameters
 * @returns FaultSkinNode
 *
 * @example
 * ```ts
 * const node = createFaultSkin(vertices, faces, {
 *   values: likelihoodData,
 *   cmap: 'jet',
 * });
 * ```
 */
export function createFaultSkin(
  vertices: Float32Array,
  faces: Uint32Array,
  options: {
    values?: Float32Array;
    cmap?: string;
    clim?: Clim;
    color?: string;
    opacity?: number;
  } = {}
): FaultSkinNode {
  const {
    values = null,
    cmap = 'jet',
    clim,
    color = '#ffff00',
    opacity = 0.8,
  } = options;

  // Compute clim from values if not provided
  let finalClim: Clim;
  if (clim) {
    finalClim = clim;
  } else if (values) {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < values.length; i++) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }
    finalClim = [min, max];
  } else {
    finalClim = [0, 1];
  }

  return {
    type: 'fault-skin',
    vertices,
    faces,
    values,
    cmap,
    clim: finalClim,
    color,
    visible: true,
    opacity,
  };
}

// ============================================================================
// Create arbitrary line
// ============================================================================

/**
 * Create arbitrary line visualization node.
 * Ported from cigvis Python: create_arbitrary_line
 *
 * @param path - Path points [N, 2]
 * @param data - Extracted data along path
 * @param dataShape - Shape of extracted data [nPoints, nSamples]
 * @param options - Optional parameters
 * @returns ArbitraryLineNode
 *
 * @example
 * ```ts
 * const node = createArbitraryLine(path, extractedData, [100, 240], {
 *   cmap: 'gray',
 * });
 * ```
 */
export function createArbitraryLine(
  path: Float32Array,
  data: Float32Array,
  dataShape: [number, number],
  options: {
    cmap?: string;
    clim?: Clim;
  } = {}
): ArbitraryLineNode {
  const {
    cmap = 'gray',
    clim,
  } = options;

  // Compute clim if not provided
  let finalClim: Clim;
  if (clim) {
    finalClim = clim;
  } else {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    finalClim = [min, max];
  }

  return {
    type: 'arbitrary-line',
    path,
    data,
    dataShape,
    cmap,
    clim: finalClim,
    visible: true,
  };
}

// ============================================================================
// Update surface colors from slice nodes
// ============================================================================

/**
 * Update surface colors based on slice node data.
 * Ported from cigvis Python: set_surface_color_by_slices_nodes
 *
 * @param surfaceNodes - Surface nodes to update
 * @param volumes - Volume data arrays
 * @returns Updated surface nodes
 */
export function setSurfaceColorBySliceNodes(
  surfaceNodes: any[],
  volumes: Float32Array[]
): any[] {
  // This is a placeholder implementation
  // In Python, this updates surface vertex colors based on slice data
  return surfaceNodes;
}

// ============================================================================
// Import ColormapImpl type (used in function signatures)
// ============================================================================

import { ColormapImpl } from '../colormap';

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create an extra nodes agent for programmatic access.
 */
export function createExtraNodesAgent() {
  return {
    createColorbar,
    createColorbarFromNodes,
    createAxis,
    createLineLogs,
    createFaultSkin,
    createArbitraryLine,
    setSurfaceColorBySliceNodes,
  };
}
