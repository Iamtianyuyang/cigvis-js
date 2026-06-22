/**
 * Binary data reading utilities
 * Reads raw binary files (common geophysical data format)
 */

export type DataType = 'float32' | 'float64' | 'int32' | 'int16' | 'uint8' | 'uint16';

export interface ReadBinaryOptions {
  /** Data type */
  dtype?: DataType;
  /** Byte order */
  endian?: 'little' | 'big';
  /** Offset in bytes to start reading */
  offset?: number;
  /** Number of elements to read (default: all) */
  count?: number;
}

/**
 * Map data type string to TypedArray constructor
 */
function getTypedArrayConstructor(dtype: DataType): typeof Float32Array | typeof Float64Array | typeof Int32Array | typeof Int16Array | typeof Uint8Array | typeof Uint16Array {
  switch (dtype) {
    case 'float32': return Float32Array;
    case 'float64': return Float64Array;
    case 'int32': return Int32Array;
    case 'int16': return Int16Array;
    case 'uint8': return Uint8Array;
    case 'uint16': return Uint16Array;
    default: throw new Error(`Unknown data type: ${dtype}`);
  }
}

/**
 * Get byte size for data type
 */
function getByteSize(dtype: DataType): number {
  switch (dtype) {
    case 'float32': return 4;
    case 'float64': return 8;
    case 'int32': return 4;
    case 'int16': return 2;
    case 'uint8': return 1;
    case 'uint16': return 2;
    default: throw new Error(`Unknown data type: ${dtype}`);
  }
}

/**
 * Read binary data from ArrayBuffer
 */
export function readBinaryFromBuffer(
  buffer: ArrayBuffer,
  options: ReadBinaryOptions = {}
): Float32Array | Float64Array | Int32Array | Int16Array | Uint8Array | Uint16Array {
  const {
    dtype = 'float32',
    endian = 'little',
    offset = 0,
    count,
  } = options;

  const TypedArray = getTypedArrayConstructor(dtype);
  const byteSize = getByteSize(dtype);
  const elementCount = count ?? Math.floor((buffer.byteLength - offset) / byteSize);

  // Check endianness
  const needsSwap = endian === 'big' && !isBigEndian();

  if (needsSwap && byteSize > 1) {
    // Need to swap bytes
    const raw = new Uint8Array(buffer, offset, elementCount * byteSize);
    const swapped = new Uint8Array(raw.length);

    for (let i = 0; i < elementCount; i++) {
      for (let j = 0; j < byteSize; j++) {
        swapped[i * byteSize + j] = raw[i * byteSize + (byteSize - 1 - j)];
      }
    }

    return new TypedArray(swapped.buffer);
  }

  return new TypedArray(buffer, offset, elementCount);
}

/**
 * Read binary data from File or Blob
 */
export async function readBinaryFromFile(
  file: File | Blob,
  options: ReadBinaryOptions = {}
): Promise<Float32Array | Float64Array | Int32Array | Int16Array | Uint8Array | Uint16Array> {
  const buffer = await file.arrayBuffer();
  return readBinaryFromBuffer(buffer, options);
}

/**
 * Read binary data from URL
 */
export async function readBinaryFromURL(
  url: string,
  options: ReadBinaryOptions = {}
): Promise<Float32Array | Float64Array | Int32Array | Int16Array | Uint8Array | Uint16Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return readBinaryFromBuffer(buffer, options);
}

/**
 * Read volume data from binary file
 */
export async function readVolume(
  source: string | File | Blob,
  shape: [number, number, number],
  options: ReadBinaryOptions = {}
): Promise<{ data: Float32Array; shape: [number, number, number] }> {
  const dtype = options.dtype || 'float32';
  const expectedSize = shape[0] * shape[1] * shape[2] * getByteSize(dtype);

  let data: Float32Array | Float64Array | Int32Array | Int16Array | Uint8Array | Uint16Array;

  if (typeof source === 'string') {
    data = await readBinaryFromURL(source, { ...options, count: shape[0] * shape[1] * shape[2] });
  } else {
    data = await readBinaryFromFile(source, { ...options, count: shape[0] * shape[1] * shape[2] });
  }

  // Convert to Float32 if needed
  const float32Data = data instanceof Float32Array
    ? data
    : new Float32Array(data.map(v => Number(v)));

  return { data: float32Data, shape };
}

/**
 * Check if system is big endian
 */
function isBigEndian(): boolean {
  const buffer = new ArrayBuffer(2);
  new Uint8Array(buffer)[0] = 0x01;
  new Uint16Array(buffer)[0] = 0x0100;
  return new Uint8Array(buffer)[0] === 0x01;
}

/**
 * Write binary data to ArrayBuffer
 */
export function writeBinary(
  data: Float32Array | Float64Array | Int32Array | Int16Array | Uint8Array | Uint16Array,
  options: {
    endian?: 'little' | 'big';
  } = {}
): ArrayBuffer {
  const { endian = 'little' } = options;
  const srcBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  // Create a copy with a proper ArrayBuffer
  const buffer = new ArrayBuffer(srcBuffer.byteLength);
  const view = new Uint8Array(buffer);
  view.set(new Uint8Array(srcBuffer));

  if (endian === 'big' && !isBigEndian()) {
    const bytes = new Uint8Array(buffer);
    const byteSize = data.BYTES_PER_ELEMENT;

    for (let i = 0; i < data.length; i++) {
      const start = i * byteSize;
      for (let j = 0; j < byteSize / 2; j++) {
        const tmp = bytes[start + j];
        bytes[start + j] = bytes[start + byteSize - 1 - j];
        bytes[start + byteSize - 1 - j] = tmp;
      }
    }
  }

  return buffer;
}

/**
 * Download binary data as file
 */
export function downloadBinary(
  data: Float32Array | Float64Array | Int32Array,
  filename: string,
  options: { endian?: 'little' | 'big' } = {}
): void {
  const buffer = writeBinary(data, options);
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
