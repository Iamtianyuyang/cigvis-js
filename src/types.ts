/**
 * Core type definitions for CIGVis
 */

/** RGBA color as [r, g, b, a] with values in [0, 1] */
export type RGBA = [number, number, number, number];

/** RGB color as [r, g, b] with values in [0, 1] */
export type RGB = [number, number, number];

/** Color string (hex, rgb, named color) */
export type ColorString = string;

/** Colormap name or custom colormap */
export type ColormapInput = string | Colormap;

/** [min, max] value range */
export type Clim = [number, number];

/** 3D volume data - Float32Array with shape info */
export interface VolumeData {
  data: Float32Array;
  shape: [number, number, number]; // [ni, nx, nt]
}

/** 2D slice data */
export interface SliceData {
  data: Float32Array;
  shape: [number, number];
}

/** Surface data - 2D height map */
export interface SurfaceData {
  data: Float32Array;
  shape: [number, number]; // [ni, nx]
}

/** Well log trajectory point */
export interface WellLogPoint {
  x: number;
  y: number;
  z: number;
}

/** Well log data */
export interface WellLogData {
  positions: WellLogPoint[];
  values?: Float32Array;
  radius?: number;
}

/** Point cloud data */
export interface PointCloudData {
  positions: Float32Array; // flat [x,y,z,x,y,z,...]
  colors?: Float32Array;   // flat [r,g,b,a,...]
  values?: Float32Array;
}

/** Colormap definition */
export interface Colormap {
  name: string;
  colors: RGB[] | RGBA[];
  type: 'listed' | 'segmented';
}

/** Node types for visualization */
export type NodeType =
  | 'slice'
  | 'overlay'
  | 'surface'
  | 'body'
  | 'well-log'
  | 'point-cloud'
  | 'splat'
  | 'fault-skin'
  | 'arbitrary-line'
  | 'colorbar'
  | 'axis';

/** Base visualization node */
export interface VisNode {
  type: NodeType;
  visible: boolean;
  opacity: number;
}

/** Slice node */
export interface SliceNode extends VisNode {
  type: 'slice';
  axis: 'x' | 'y' | 'z';
  pos: number;
  data: Float32Array;
  shape: [number, number];
  cmap: string;
  clim: Clim;
  interpolation: 'nearest' | 'linear';
}

/** Overlay node (mask on top of slice) */
export interface OverlayNode extends VisNode {
  type: 'overlay';
  sliceNode: SliceNode;
  maskData: Float32Array;
  cmap: string;
  clim: Clim;
}

/** Surface node */
export interface SurfaceNode extends VisNode {
  type: 'surface';
  heightMap: Float32Array;
  shape: [number, number];
  color?: string;
  opacity: number;
  valueData?: Float32Array;
  cmap?: string;
  clim?: Clim;
}

/** Body node (isosurface) */
export interface BodyNode extends VisNode {
  type: 'body';
  volume: VolumeData;
  isoValue: number;
  color?: string;
  cmap?: string;
  clim?: Clim;
}

/** Well log node */
export interface WellLogNode extends VisNode {
  type: 'well-log';
  trajectory: WellLogPoint[];
  values?: Float32Array;
  radius?: number;
  cmap?: string;
  clim?: Clim;
  style: 'line' | 'tubes';
}

/** Plot3D view configuration */
export interface Plot3DView {
  size?: [number, number];
  grid?: [number, number];
  share?: boolean;
  bgColor?: string;
  axis?: boolean;
}

/** Plot3D save configuration */
export interface Plot3DSave {
  name: string;
  size?: [number, number];
}

/** Plot3D colorbar configuration */
export interface Plot3DColorbar {
  position?: 'top' | 'bottom' | 'left' | 'right';
  label?: string;
}

/** Plot3D configuration */
export interface Plot3DConfig {
  nodes: VisNode[];
  view?: Plot3DView;
  save?: Plot3DSave;
  colorbar?: Plot3DColorbar;
}
