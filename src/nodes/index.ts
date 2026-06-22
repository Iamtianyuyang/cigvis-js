/**
 * Node creation module for CIGVis
 * Provides functions to create visualization nodes
 */

export { createSlices, addMask, createOverlay } from './slice-node';
export type { CreateSliceOptions } from './slice-node';

export { createSurfaces, createSurface } from './surface-node';
export type { CreateSurfaceOptions } from './surface-node';

export { createWellLog, createWellLogs, createWellLogFromLAS } from './well-log-node';
export type { CreateWellLogOptions } from './well-log-node';

export { createBody, createBodies, createBodyFromThreshold } from './body-node';
export type { CreateBodyOptions } from './body-node';

export { createPointCloud, createPoints, createRandomPointCloud } from './point-node';
export type { CreatePointOptions, PointNode } from './point-node';

export {
  createColorbar,
  createColorbarFromNodes,
  createAxis,
  createLineLogs,
  createFaultSkin,
  createArbitraryLine,
  setSurfaceColorBySliceNodes,
} from './extra-nodes';
export type {
  ColorbarNode,
  AxisNode,
  LineLogNode,
  FaultSkinNode,
  ArbitraryLineNode,
} from './extra-nodes';
