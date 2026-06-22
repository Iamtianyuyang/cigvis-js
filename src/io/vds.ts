/**
 * VDS (Volume Data Store) reader for CIGVis
 *
 * Ported from cigvis Python library (cigvis/io/vds.py)
 * VDS is a format used in the oil and gas industry for storing large seismic volumes.
 *
 * Note: Full VDS support requires OpenVDS WebAssembly library.
 * This implementation provides a simplified reader for basic VDS files.
 *
 * @module io/vds
 */

// ============================================================================
// Types
// ============================================================================

/** VDS file header */
export interface VDSHeader {
  /** File signature */
  signature: string;
  /** Format version */
  version: number;
  /** Volume dimensions [ni, nx, nt] */
  shape: [number, number, number];
  /** Data type */
  dtype: 'float32' | 'float64' | 'int16' | 'int32';
  /** Brick size */
  brickSize: number;
  /** Value range [min, max] */
  valueRange: [number, number];
  /** Axis labels */
  axisLabels: [string, string, string];
  /** Axis units */
  axisUnits: [string, string, string];
}

/** VDS reader options */
export interface VDSReaderOptions {
  /** Enable memory-mapped reading */
  memoryMapped?: boolean;
  /** Cache size in MB */
  cacheSize?: number;
}

/** VDS creation options */
export interface CreateVDSOptions {
  /** Color limits [vmin, vmax] */
  clim?: [number, number];
  /** Brick size (32, 64, 128, 256, 512, 1024, 2048) */
  brickSize?: number;
  /** Axis labels */
  axisLabels?: [string, string, string];
  /** Axis units */
  axisUnits?: [string, string, string];
}

// ============================================================================
// VDS Reader
// ============================================================================

/**
 * VDS file reader that mimics numpy array style access.
 * Ported from cigvis Python: VDSReader
 *
 * Note: This is a simplified implementation. Full VDS support requires
 * the OpenVDS WebAssembly library.
 *
 * @example
 * ```ts
 * const vds = new VDSReader('seismic.vds');
 * console.log(vds.shape); // [601, 203, 400]
 *
 * // Read a slice
 * const slice = await vds.readSlice('x', 100);
 *
 * // Read a sub-volume
 * const sub = await vds.readVolume([20, 100, 0], [100, 200, 400]);
 *
 * vds.close();
 * ```
 */
export class VDSReader {
  private _shape: [number, number, number];
  private _dtype: string;
  private _valueRange: [number, number];
  private _header: VDSHeader;
  private _data: Float32Array | null = null;
  private _url: string;

  /**
   * Create a VDS reader.
   *
   * @param source - URL or File object
   * @param options - Reader options
   */
  constructor(source: string | File, options: VDSReaderOptions = {}) {
    this._url = typeof source === 'string' ? source : '';
    this._shape = [0, 0, 0];
    this._dtype = 'float32';
    this._valueRange = [0, 1];
    this._header = {
      signature: 'VDS',
      version: 1,
      shape: [0, 0, 0],
      dtype: 'float32',
      brickSize: 64,
      valueRange: [0, 1],
      axisLabels: ['Inline', 'Crossline', 'Time'],
      axisUnits: ['m', 'm', 'ms'],
    };
  }

  /**
   * Initialize the reader by loading the VDS file.
   * Must be called before accessing data.
   */
  async init(): Promise<void> {
    if (!this._url) {
      throw new Error('VDSReader.init() requires a URL source');
    }

    try {
      const response = await fetch(this._url);
      if (!response.ok) {
        throw new Error(`Failed to fetch VDS file: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      this._parseHeader(buffer);

      // For simplified implementation, read entire volume into memory
      // Full implementation would use chunked/bricked reading
      this._data = new Float32Array(buffer, this._header.brickSize);
    } catch (error) {
      throw new Error(`Failed to initialize VDS reader: ${error}`);
    }
  }

  /**
   * Parse VDS file header.
   */
  private _parseHeader(buffer: ArrayBuffer): void {
    const view = new DataView(buffer);

    // Read signature (3 bytes)
    const signature = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2));
    if (signature !== 'VDS') {
      throw new Error('Invalid VDS file: missing VDS signature');
    }

    // Read version
    this._header.version = view.getUint32(4, true);

    // Read dimensions
    this._header.shape = [
      view.getUint32(8, true),
      view.getUint32(12, true),
      view.getUint32(16, true),
    ];
    this._shape = this._header.shape;

    // Read value range
    this._header.valueRange = [
      view.getFloat32(20, true),
      view.getFloat32(24, true),
    ];
    this._valueRange = this._header.valueRange;

    // Read brick size
    this._header.brickSize = view.getUint32(28, true);
  }

  /**
   * Get volume shape.
   */
  get shape(): [number, number, number] {
    return [...this._shape];
  }

  /**
   * Get data type.
   */
  get dtype(): string {
    return this._dtype;
  }

  /**
   * Get header information.
   */
  get header(): VDSHeader {
    return { ...this._header };
  }

  /**
   * Get minimum value.
   */
  min(): number {
    return this._valueRange[0];
  }

  /**
   * Get maximum value.
   */
  max(): number {
    return this._valueRange[1];
  }

  /**
   * Read a 2D slice from the volume.
   *
   * @param axis - Slice axis ('x', 'y', or 'z')
   * @param pos - Slice position
   * @returns Promise<Float32Array> slice data
   */
  async readSlice(axis: 'x' | 'y' | 'z', pos: number): Promise<Float32Array> {
    if (!this._data) {
      await this.init();
    }

    const [ni, nx, nt] = this._shape;

    switch (axis) {
      case 'x': {
        const slice = new Float32Array(nx * nt);
        for (let y = 0; y < nx; y++) {
          for (let z = 0; z < nt; z++) {
            slice[y * nt + z] = this._data![pos * nx * nt + y * nt + z];
          }
        }
        return slice;
      }
      case 'y': {
        const slice = new Float32Array(ni * nt);
        for (let x = 0; x < ni; x++) {
          for (let z = 0; z < nt; z++) {
            slice[x * nt + z] = this._data![x * nx * nt + pos * nt + z];
          }
        }
        return slice;
      }
      case 'z': {
        const slice = new Float32Array(ni * nx);
        for (let x = 0; x < ni; x++) {
          for (let y = 0; y < nx; y++) {
            slice[x * nx + y] = this._data![x * nx * nt + y * nt + pos];
          }
        }
        return slice;
      }
      default:
        throw new Error(`Invalid axis: ${axis}`);
    }
  }

  /**
   * Read a sub-volume.
   *
   * @param start - Start indices [i, x, t]
   * @param end - End indices [i, x, t]
   * @returns Promise<Float32Array> sub-volume data
   */
  async readVolume(
    start: [number, number, number],
    end: [number, number, number]
  ): Promise<Float32Array> {
    if (!this._data) {
      await this.init();
    }

    const [ni, nx, nt] = this._shape;
    const [si, sx, st] = start;
    const [ei, ex, et] = end;

    // Validate bounds
    if (si < 0 || ei > ni || sx < 0 || ex > nx || st < 0 || et > nt) {
      throw new Error('Sub-volume exceeds volume bounds');
    }

    const sizeI = ei - si;
    const sizeX = ex - sx;
    const sizeT = et - st;
    const result = new Float32Array(sizeI * sizeX * sizeT);

    let idx = 0;
    for (let i = si; i < ei; i++) {
      for (let x = sx; x < ex; x++) {
        for (let t = st; t < et; t++) {
          result[idx++] = this._data![i * nx * nt + x * nt + t];
        }
      }
    }

    return result;
  }

  /**
   * Read the entire volume.
   *
   * @returns Promise<Float32Array> volume data
   */
  async readAll(): Promise<Float32Array> {
    if (!this._data) {
      await this.init();
    }
    return this._data!;
  }

  /**
   * Close the reader and release resources.
   */
  close(): void {
    this._data = null;
  }

  /**
   * Convert to Float32Array (reads entire volume).
   */
  async toFloat32Array(): Promise<Float32Array> {
    return this.readAll();
  }
}

// ============================================================================
// Create VDS from array
// ============================================================================

/**
 * Create a VDS file from a Float32Array.
 * Ported from cigvis Python: create_vds_from_array
 *
 * Note: This creates a simplified binary format.
 * Full VDS creation requires the OpenVDS library.
 *
 * @param data - Volume data
 * @param shape - Volume shape [ni, nx, nt]
 * @param options - Creation options
 * @returns ArrayBuffer containing VDS data
 *
 * @example
 * ```ts
 * const vdsBuffer = createVDSFromArray(volumeData, [192, 200, 240], {
 *   clim: [-1, 1],
 *   brickSize: 64,
 * });
 * ```
 */
export function createVDSFromArray(
  data: Float32Array,
  shape: [number, number, number],
  options: CreateVDSOptions = {}
): ArrayBuffer {
  const {
    clim,
    brickSize = 64,
    axisLabels = ['Inline', 'Crossline', 'Time'],
    axisUnits = ['m', 'm', 'ms'],
  } = options;

  const [ni, nx, nt] = shape;

  // Calculate value range
  let vmin = Infinity;
  let vmax = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < vmin) vmin = data[i];
    if (data[i] > vmax) vmax = data[i];
  }

  const finalClim: [number, number] = clim || [vmin, vmax];

  // Create header
  const headerSize = 32;
  const dataSize = data.length * 4; // float32
  const totalSize = headerSize + dataSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // Write signature
  view.setUint8(0, 0x56); // V
  view.setUint8(1, 0x44); // D
  view.setUint8(2, 0x53); // S

  // Write version
  view.setUint32(4, 1, true);

  // Write dimensions
  view.setUint32(8, ni, true);
  view.setUint32(12, nx, true);
  view.setUint32(16, nt, true);

  // Write value range
  view.setFloat32(20, finalClim[0], true);
  view.setFloat32(24, finalClim[1], true);

  // Write brick size
  view.setUint32(28, brickSize, true);

  // Write data
  const floatView = new Float32Array(buffer, headerSize);
  floatView.set(data);

  return buffer;
}

/**
 * Download VDS data as a file.
 *
 * @param data - Volume data
 * @param shape - Volume shape
 * @param filename - Output filename
 * @param options - Creation options
 */
export function downloadVDS(
  data: Float32Array,
  shape: [number, number, number],
  filename: string = 'volume.vds',
  options: CreateVDSOptions = {}
): void {
  const buffer = createVDSFromArray(data, shape, options);
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Check if a file is a VDS file by reading its signature.
 *
 * @param file - File to check
 * @returns Promise<boolean>
 */
export async function isVDSFile(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 3).arrayBuffer();
  const view = new Uint8Array(buffer);
  return view[0] === 0x56 && view[1] === 0x44 && view[2] === 0x53;
}

/**
 * Read VDS header from a file.
 *
 * @param file - VDS file
 * @returns Promise<VDSHeader>
 */
export async function readVDSHeader(file: File): Promise<VDSHeader> {
  const buffer = await file.slice(0, 32).arrayBuffer();
  const view = new DataView(buffer);

  return {
    signature: String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2)),
    version: view.getUint32(4, true),
    shape: [
      view.getUint32(8, true),
      view.getUint32(12, true),
      view.getUint32(16, true),
    ],
    dtype: 'float32',
    brickSize: view.getUint32(28, true),
    valueRange: [
      view.getFloat32(20, true),
      view.getFloat32(24, true),
    ],
    axisLabels: ['Inline', 'Crossline', 'Time'],
    axisUnits: ['m', 'm', 'ms'],
  };
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a VDS agent for programmatic access.
 */
export function createVDSAgent() {
  return {
    VDSReader,
    createVDSFromArray,
    downloadVDS,
    isVDSFile,
    readVDSHeader,
  };
}
