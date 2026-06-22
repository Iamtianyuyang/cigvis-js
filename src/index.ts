/**
 * CIGVis - A tool for visualizing multidimensional geophysical data in the browser
 *
 * Ported from the Python cigvis library: https://github.com/JintaoLee-Roger/cigvis
 *
 * @example
 * ```ts
 * import * as cigvis from 'cigvis';
 *
 * // Read volume data
 * const { data, shape } = await cigvis.io.readVolume('seismic.bin', [192, 200, 240]);
 *
 * // Create slice nodes
 * const nodes = cigvis.createSlices({
 *   data,
 *   shape,
 *   pos: { x: 0, y: 0, z: 239 },
 *   cmap: 'petrel',
 * });
 *
 * // Visualize
 * cigvis.plot3D({
 *   nodes,
 *   container: '#viewer',
 *   volumeShape: shape,
 * });
 * ```
 */

// Core types
export * from './types';

// Configuration
export * from './config';

// Colors
export * from './colors';

// Style/Themes
export * from './style';

// Colormap module
export * from './colormap';

// Node creation functions
export {
  createSlices,
  addMask,
  createOverlay,
  createSurfaces,
  createSurface,
  createWellLog,
  createWellLogs,
  createWellLogFromLAS,
  createBody,
  createBodies,
  createBodyFromThreshold,
  createPointCloud,
  createPoints,
  createRandomPointCloud,
} from './nodes';
export type {
  CreateSliceOptions,
  CreateSurfaceOptions,
  CreateWellLogOptions,
  CreateBodyOptions,
  CreatePointOptions,
  PointNode,
} from './nodes';

// Plot3D function
export { plot3D, createViewer, quickPlot } from './plot3d';
export type { Plot3DOptions } from './plot3d';

// IO utilities
export * as io from './io';

// Math utilities
export * as utils from './utils';

// 1D plotting
export * as plot1d from './plot1d';

// 2D plotting
export * as plot2d from './plot2d';

// Plotly integration
export * as plotly from './plotly';

// Viser integration
export * as viser from './viser';

// Slice viewer
export * as sliceviewer from './sliceviewer';

// Interactive tools
export * as tools from './tools';

// GUI Web Components
export * as gui from './gui';

// Renderer
export { VolumeRenderer } from './renderer/volume-renderer';
export type { RendererOptions } from './renderer/volume-renderer';
export { CameraControls } from './renderer/camera-controls';
export type { CameraControlsOptions } from './renderer/camera-controls';

// Version
export const VERSION = '0.1.0';

/**
 * Default namespace export for convenience
 */
import {
  createSlices as _createSlices,
  addMask as _addMask,
  createOverlay as _createOverlay,
  createSurfaces as _createSurfaces,
  createSurface as _createSurface,
  createWellLog as _createWellLog,
  createWellLogs as _createWellLogs,
  createWellLogFromLAS as _createWellLogFromLAS,
  createBody as _createBody,
  createBodies as _createBodies,
  createBodyFromThreshold as _createBodyFromThreshold,
  createPointCloud as _createPointCloud,
  createPoints as _createPoints,
  createRandomPointCloud as _createRandomPointCloud,
} from './nodes';

import { plot3D as _plot3D, createViewer as _createViewer, quickPlot as _quickPlot } from './plot3d';
import * as _io from './io';
import * as _utils from './utils';
import * as _colormap from './colormap';
import * as _config from './config';
import * as _colors from './colors';
import * as _style from './style';
import * as _plot1d from './plot1d';
import * as _plot2d from './plot2d';
import * as _plotly from './plotly';
import * as _viser from './viser';
import * as _sliceviewer from './sliceviewer';
import * as _tools from './tools';
import * as _gui from './gui';

export const cigvis = {
  // Configuration
  config: _config,

  // Colors
  colors: _colors,

  // Style/Themes
  style: _style,

  // Colormap
  colormap: _colormap,

  // Node creation
  createSlices: _createSlices,
  addMask: _addMask,
  createOverlay: _createOverlay,
  createSurfaces: _createSurfaces,
  createSurface: _createSurface,
  createWellLog: _createWellLog,
  createWellLogs: _createWellLogs,
  createWellLogFromLAS: _createWellLogFromLAS,
  createBody: _createBody,
  createBodies: _createBodies,
  createBodyFromThreshold: _createBodyFromThreshold,
  createPointCloud: _createPointCloud,
  createPoints: _createPoints,
  createRandomPointCloud: _createRandomPointCloud,

  // Visualization
  plot3D: _plot3D,
  createViewer: _createViewer,
  quickPlot: _quickPlot,

  // Sub-modules
  io: _io,
  utils: _utils,
  plot1d: _plot1d,
  plot2d: _plot2d,
  plotly: _plotly,
  viser: _viser,
  sliceviewer: _sliceviewer,
  tools: _tools,
  gui: _gui,

  // Version
  VERSION,
};
