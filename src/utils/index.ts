/**
 * Utility functions for CIGVis
 *
 * @module utils
 */

// Math utilities
export {
  minMax,
  normalize,
  clamp,
  lerp,
  bilinearInterpolate,
  trilinearInterpolate,
  resample2D,
  statistics,
  linspace,
  meshgrid,
} from './math';

// Coordinate transforms
export {
  getTransformMatrix,
  applyTransform,
  createTranslation,
  createScale,
  createRotation,
  composeTransforms,
} from './coord';
export type { Point2D, TransformMatrix3x3, Point2DArray } from './coord';

// Mask utilities
export {
  surfToMask,
  surfToBinaryMask,
  mergeMasks,
} from './mask-utils';
export type { SurfaceArray, SurfacePoints, VolumeShape } from './mask-utils';

// Surface utilities
export {
  fillGrid,
  preprocSurfaceArray2,
  preprocSurfacePos,
  interpolateSurface,
  interpolatePath,
  extractAlongPath,
} from './surface-utils';
export type {
  SurfaceHeightMap,
  SurfaceShape,
  Point3D,
  PointWithValue,
  PointWithColor,
} from './surface-utils';
