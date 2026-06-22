/**
 * IO module for CIGVis
 * Provides functions for reading various data formats
 */

export {
  readBinaryFromBuffer,
  readBinaryFromFile,
  readBinaryFromURL,
  readVolume,
  writeBinary,
  downloadBinary,
} from './binary';
export type { DataType, ReadBinaryOptions } from './binary';

export {
  parseLAS,
  readLASFromFile,
  readLASFromURL,
  getCurve,
  getCurveNames,
  getDepthRange,
  lasToWellLog,
} from './las';
export type { LASHeader, LASCurveInfo, LASData } from './las';
