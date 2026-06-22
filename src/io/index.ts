/**
 * IO module for CIGVis
 * Provides functions for reading various data formats
 *
 * @module io
 */

// Binary data
export {
  readBinaryFromBuffer,
  readBinaryFromFile,
  readBinaryFromURL,
  readVolume,
  writeBinary,
  downloadBinary,
} from './binary';
export type { DataType, ReadBinaryOptions } from './binary';

// LAS well log
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

// Horizon files
export {
  convertHoriz,
  readHorizFromFile,
  readHorizFromURL,
} from './horiz';
export type { HorizConvertOptions } from './horiz';

// Fault skin
export {
  readFaultSkin,
  readFaultSkinFromFile,
  readFaultSkinFromURL,
  mergeFaultSkins,
} from './fault-skin';
export type {
  FaultSkinVertex,
  FaultSkinData,
  SkinFormat,
  Endianness,
  ValueType,
} from './fault-skin';

// VDS (Volume Data Store)
export {
  VDSReader,
  createVDSFromArray,
  downloadVDS,
  isVDSFile,
  readVDSHeader,
} from './vds';
export type {
  VDSHeader,
  VDSReaderOptions,
  CreateVDSOptions,
} from './vds';
