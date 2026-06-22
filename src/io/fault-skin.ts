/**
 * Fault skin file reader for CIGVis
 *
 * Ported from cigvis Python library (cigvis/io/fault_skin.py)
 * Reads fault skin data from binary files.
 *
 * Supports three formats:
 * - Classic fault skin: 9 floats + 4 ints per cell
 * - 12-number fault skin: 12 floats + 12 ints per cell
 * - .cig format: control points + cells
 *
 * @module io/fault-skin
 */

// ============================================================================
// Types
// ============================================================================

/** Fault skin vertex data */
export interface FaultSkinVertex {
  /** X coordinate (inline) */
  x: number;
  /** Y coordinate (crossline) */
  y: number;
  /** Z coordinate (time/depth) */
  z: number;
  /** Fault likelihood */
  likelihood: number;
  /** Strike angle */
  strike: number;
  /** Dip angle */
  dip: number;
  /** Slip vector [dx, dy, dz] (classic format) */
  slip?: [number, number, number];
}

/** Fault skin data */
export interface FaultSkinData {
  /** Vertex positions [N, 3] */
  vertices: Float32Array;
  /** Face indices [M, 3] */
  faces: Uint32Array;
  /** Vertex values (likelihood, strike, dip, etc.) */
  values: Float32Array | null;
  /** Number of cells */
  numCells: number;
}

/** Skin file format */
export type SkinFormat = 'classic' | '12number' | 'cig';

/** Endianness */
export type Endianness = 'big' | 'little';

/** Value type to extract */
export type ValueType = 'x' | 'y' | 'z' | 'iline' | 'xline' | 'time' | 'likelihood' | 'strike' | 'dip' | 'phi' | 'theta' | 'vector';

// ============================================================================
// Constants
// ============================================================================

/** Value type to column index mapping */
const VALUE_TYPE_INDEX: Record<string, number | [number, number]> = {
  x: 2,
  iline: 2,
  y: 1,
  xline: 1,
  z: 0,
  time: 0,
  likelihood: 3,
  strike: 4,
  phi: 4,
  dip: 5,
  theta: 5,
  vector: [6, 9],
};

// ============================================================================
// File reading
// ============================================================================

/**
 * Read a single fault skin file.
 *
 * @param buffer - ArrayBuffer containing the skin data
 * @param endian - Endianness of the data
 * @param valuesType - Type of values to extract
 * @returns Fault skin data
 */
export function readFaultSkin(
  buffer: ArrayBuffer,
  endian: Endianness = 'big',
  valuesType?: ValueType
): FaultSkinData {
  const view = new DataView(buffer);
  const isSwap = endian === 'big';

  // Read header
  let ncells: number;
  let offset = 0;

  // Try to detect format
  const firstInt = isSwap ? view.getInt32(0, false) : view.getInt32(0, true);
  const totalInts = buffer.byteLength / 4;

  let format: SkinFormat;
  let midData: Float32Array;
  let tailData: Int32Array;

  if (firstInt * 24 + 4 === totalInts) {
    // 12-number format
    format = '12number';
    ncells = firstInt;
    offset = 4;

    const midSize = ncells * 12;
    const midBuffer = new Float32Array(buffer, offset * 4, midSize);
    midData = isSwap ? swapFloat32(midBuffer) : midBuffer;
    offset += midSize;

    const tailSize = ncells * 12;
    const tailBuffer = new Int32Array(buffer, offset * 4, tailSize);
    tailData = isSwap ? swapInt32(tailBuffer) : tailBuffer;
  } else if (firstInt * 13 + 4 === totalInts) {
    // Classic format
    format = 'classic';
    ncells = firstInt;
    offset = 4;

    const midSize = ncells * 9;
    const midBuffer = new Float32Array(buffer, offset * 4, midSize);
    midData = isSwap ? swapFloat32(midBuffer) : midBuffer;
    offset += midSize;

    const tailSize = ncells * 4;
    const tailBuffer = new Int32Array(buffer, offset * 4, tailSize);
    tailData = isSwap ? swapInt32(tailBuffer) : tailBuffer;
  } else {
    // Try .cig format
    const secondInt = isSwap ? view.getInt32(4, false) : view.getInt32(4, true);
    if (2 + firstInt * 6 + secondInt * 10 === totalInts) {
      format = 'cig';
      const nctrl = firstInt;
      ncells = secondInt;
      offset = 2 + nctrl * 6;

      const midSize = ncells * 6;
      const midBuffer = new Float32Array(buffer, offset * 4, midSize);
      midData = isSwap ? swapFloat32(midBuffer) : midBuffer;
      offset += midSize;

      const tailSize = ncells * 4;
      const tailBuffer = new Int32Array(buffer, offset * 4, tailSize);
      tailData = isSwap ? swapInt32(tailBuffer) : tailBuffer;
    } else {
      throw new Error('Unknown fault skin format');
    }
  }

  // Extract vertices (z, y, x -> x, y, z)
  const vertices = new Float32Array(ncells * 3);
  const values = valuesType ? new Float32Array(ncells) : null;

  for (let i = 0; i < ncells; i++) {
    vertices[i * 3] = midData[i * (format === 'cig' ? 6 : (format === '12number' ? 12 : 9)) + 2]; // x
    vertices[i * 3 + 1] = midData[i * (format === 'cig' ? 6 : (format === '12number' ? 12 : 9)) + 1]; // y
    vertices[i * 3 + 2] = midData[i * (format === 'cig' ? 6 : (format === '12number' ? 12 : 9)) + 0]; // z

    if (values && valuesType) {
      const idx = VALUE_TYPE_INDEX[valuesType];
      if (typeof idx === 'number') {
        values[i] = midData[i * (format === 'cig' ? 6 : (format === '12number' ? 12 : 9)) + idx];
      }
    }
  }

  // Generate faces from connectivity
  const faces = generateFaces(tailData, ncells, format);

  return {
    vertices,
    faces,
    values,
    numCells: ncells,
  };
}

/**
 * Generate face indices from tail connectivity data.
 */
function generateFaces(
  tail: Int32Array,
  ncells: number,
  format: SkinFormat
): Uint32Array {
  const faces: number[] = [];

  if (format === 'classic' || format === 'cig') {
    // 4-neighbor format: [above, below, left, right]
    for (let i = 0; i < ncells; i++) {
      const below = tail[i * 4 + 1];
      const right = tail[i * 4 + 3];

      if (below >= 0 && below < ncells) {
        faces.push(i, below, right >= 0 && right < ncells ? right : i);
      }
      if (right >= 0 && right < ncells) {
        faces.push(i, right, below >= 0 && below < ncells ? below : i);
      }
    }
  } else {
    // 12-neighbor format
    for (let i = 0; i < ncells; i++) {
      const below = tail[i * 12 + 4]; // i2b
      const right = tail[i * 12 + 10]; // i2r

      if (below >= 0 && below < ncells) {
        faces.push(i, below, right >= 0 && right < ncells ? right : i);
      }
      if (right >= 0 && right < ncells) {
        faces.push(i, right, below >= 0 && below < ncells ? below : i);
      }
    }
  }

  return new Uint32Array(faces);
}

/**
 * Swap bytes for big-endian Float32Array.
 */
function swapFloat32(arr: Float32Array): Float32Array {
  const result = new Float32Array(arr.length);
  const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  for (let i = 0; i < arr.length; i++) {
    result[i] = view.getFloat32(i * 4, false); // big-endian
  }
  return result;
}

/**
 * Swap bytes for big-endian Int32Array.
 */
function swapInt32(arr: Int32Array): Int32Array {
  const result = new Int32Array(arr.length);
  const view = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  for (let i = 0; i < arr.length; i++) {
    result[i] = view.getInt32(i * 4, false); // big-endian
  }
  return result;
}

/**
 * Merge multiple fault skins into one.
 *
 * @param skins - Array of fault skin data
 * @returns Merged fault skin
 */
export function mergeFaultSkins(skins: FaultSkinData[]): FaultSkinData {
  if (skins.length === 0) {
    return {
      vertices: new Float32Array(0),
      faces: new Uint32Array(0),
      values: null,
      numCells: 0,
    };
  }

  if (skins.length === 1) {
    return skins[0];
  }

  // Calculate total sizes
  let totalVertices = 0;
  let totalFaces = 0;
  let hasValues = false;

  for (const skin of skins) {
    totalVertices += skin.vertices.length / 3;
    totalFaces += skin.faces.length / 3;
    if (skin.values) hasValues = true;
  }

  // Merge
  const vertices = new Float32Array(totalVertices * 3);
  const faces = new Uint32Array(totalFaces * 3);
  const values = hasValues ? new Float32Array(totalVertices) : null;

  let vertexOffset = 0;
  let faceOffset = 0;
  let vertexCount = 0;

  for (const skin of skins) {
    // Copy vertices
    vertices.set(skin.vertices, vertexOffset);
    vertexOffset += skin.vertices.length;

    // Copy faces with offset
    for (let i = 0; i < skin.faces.length; i++) {
      faces[faceOffset + i] = skin.faces[i] + vertexCount;
    }
    faceOffset += skin.faces.length;

    // Copy values
    if (values && skin.values) {
      values.set(skin.values, vertexCount);
    }

    vertexCount += skin.vertices.length / 3;
  }

  return {
    vertices,
    faces,
    values,
    numCells: totalVertices,
  };
}

/**
 * Read fault skin from a File object.
 *
 * @param file - File object
 * @param endian - Endianness
 * @param valuesType - Type of values to extract
 * @returns Promise<FaultSkinData>
 */
export async function readFaultSkinFromFile(
  file: File,
  endian: Endianness = 'big',
  valuesType?: ValueType
): Promise<FaultSkinData> {
  const buffer = await file.arrayBuffer();
  return readFaultSkin(buffer, endian, valuesType);
}

/**
 * Read fault skin from a URL.
 *
 * @param url - URL to fetch
 * @param endian - Endianness
 * @param valuesType - Type of values to extract
 * @returns Promise<FaultSkinData>
 */
export async function readFaultSkinFromURL(
  url: string,
  endian: Endianness = 'big',
  valuesType?: ValueType
): Promise<FaultSkinData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return readFaultSkin(buffer, endian, valuesType);
}
