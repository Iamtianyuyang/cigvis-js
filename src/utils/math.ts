/**
 * Math utilities for CIGVis
 */

/**
 * Compute min/max of a numeric array
 */
export function minMax(data: Float32Array | number[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (!isNaN(v) && isFinite(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  return [min, max];
}

/**
 * Normalize values to [0, 1] range
 */
export function normalize(
  data: Float32Array,
  min?: number,
  max?: number
): Float32Array {
  const [dataMin, dataMax] = min !== undefined && max !== undefined
    ? [min, max]
    : minMax(data);

  const range = dataMax - dataMin;
  if (range === 0) return new Float32Array(data.length);

  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = (data[i] - dataMin) / range;
  }

  return result;
}

/**
 * Clamp values to [min, max] range
 */
export function clamp(
  data: Float32Array,
  min: number,
  max: number
): Float32Array {
  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = Math.max(min, Math.min(max, data[i]));
  }
  return result;
}

/**
 * Clamp a single value to [min, max] range
 */
export function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Bilinear interpolation on a 2D grid
 */
export function bilinearInterpolate(
  data: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  // Clamp to valid range
  const cx = Math.max(0, Math.min(width - 1, x));
  const cy = Math.max(0, Math.min(height - 1, y));

  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);

  const fx = cx - x0;
  const fy = cy - y0;

  const v00 = data[y0 * width + x0];
  const v10 = data[y0 * width + x1];
  const v01 = data[y1 * width + x0];
  const v11 = data[y1 * width + x1];

  return lerp(
    lerp(v00, v10, fx),
    lerp(v01, v11, fx),
    fy
  );
}

/**
 * Trilinear interpolation on a 3D grid
 */
export function trilinearInterpolate(
  data: Float32Array,
  nx: number,
  ny: number,
  nz: number,
  x: number,
  y: number,
  z: number
): number {
  // Clamp to valid range
  const cx = Math.max(0, Math.min(nx - 1, x));
  const cy = Math.max(0, Math.min(ny - 1, y));
  const cz = Math.max(0, Math.min(nz - 1, z));

  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const z0 = Math.floor(cz);
  const x1 = Math.min(x0 + 1, nx - 1);
  const y1 = Math.min(y0 + 1, ny - 1);
  const z1 = Math.min(z0 + 1, nz - 1);

  const fx = x - x0;
  const fy = y - y0;
  const fz = z - z0;

  const idx = (ix: number, iy: number, iz: number) =>
    ix * ny * nz + iy * nz + iz;

  const v000 = data[idx(x0, y0, z0)];
  const v100 = data[idx(x1, y0, z0)];
  const v010 = data[idx(x0, y1, z0)];
  const v110 = data[idx(x1, y1, z0)];
  const v001 = data[idx(x0, y0, z1)];
  const v101 = data[idx(x1, y0, z1)];
  const v011 = data[idx(x0, y1, z1)];
  const v111 = data[idx(x1, y1, z1)];

  return lerp(
    lerp(
      lerp(v000, v100, fx),
      lerp(v010, v110, fx),
      fy
    ),
    lerp(
      lerp(v001, v101, fx),
      lerp(v011, v111, fx),
      fy
    ),
    fz
  );
}

/**
 * Resample 2D data to new dimensions
 */
export function resample2D(
  data: Float32Array,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): Float32Array {
  const result = new Float32Array(dstWidth * dstHeight);
  const scaleX = srcWidth / dstWidth;
  const scaleY = srcHeight / dstHeight;

  for (let y = 0; y < dstHeight; y++) {
    for (let x = 0; x < dstWidth; x++) {
      const srcX = x * scaleX;
      const srcY = y * scaleY;
      result[y * dstWidth + x] = bilinearInterpolate(
        data, srcWidth, srcHeight, srcX, srcY
      );
    }
  }

  return result;
}

/**
 * Compute statistics for a data array
 */
export function statistics(data: Float32Array): {
  min: number;
  max: number;
  mean: number;
  std: number;
  median: number;
  count: number;
} {
  const [min, max] = minMax(data);

  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    if (!isNaN(data[i]) && isFinite(data[i])) {
      sum += data[i];
      count++;
    }
  }

  const mean = count > 0 ? sum / count : 0;

  let sumSq = 0;
  for (let i = 0; i < data.length; i++) {
    if (!isNaN(data[i]) && isFinite(data[i])) {
      sumSq += (data[i] - mean) ** 2;
    }
  }

  const std = count > 1 ? Math.sqrt(sumSq / (count - 1)) : 0;

  // Compute median
  const sorted = Float32Array.from(data).filter(v => !isNaN(v) && isFinite(v)).sort();
  const median = sorted.length > 0
    ? sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
    : 0;

  return { min, max, mean, std, median, count };
}

/**
 * Create a linspace array
 */
export function linspace(start: number, stop: number, num: number): Float32Array {
  const result = new Float32Array(num);
  const step = (stop - start) / (num - 1);
  for (let i = 0; i < num; i++) {
    result[i] = start + i * step;
  }
  return result;
}

/**
 * Create a meshgrid
 */
export function meshgrid(
  x: Float32Array,
  y: Float32Array
): { x: Float32Array; y: Float32Array } {
  const nx = x.length;
  const ny = y.length;
  const xGrid = new Float32Array(nx * ny);
  const yGrid = new Float32Array(nx * ny);

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      xGrid[j * nx + i] = x[i];
      yGrid[j * nx + i] = y[j];
    }
  }

  return { x: xGrid, y: yGrid };
}

// ============================================================================
// Additional utils functions ported from cigvis Python
// ============================================================================

/**
 * Compute minimum value ignoring NaN.
 * Ported from cigvis Python: nmin
 *
 * @param data - Input array
 * @returns Minimum value (ignoring NaN)
 *
 * @example
 * ```ts
 * const min = nmin(new Float32Array([1, NaN, 2, 3])); // 1
 * ```
 */
export function nmin(data: Float32Array | number[]): number {
  let min = Infinity;
  for (let i = 0; i < data.length; i++) {
    if (!isNaN(data[i]) && data[i] < min) {
      min = data[i];
    }
  }
  return min === Infinity ? NaN : min;
}

/**
 * Compute maximum value ignoring NaN.
 * Ported from cigvis Python: nmax
 *
 * @param data - Input array
 * @returns Maximum value (ignoring NaN)
 *
 * @example
 * ```ts
 * const max = nmax(new Float32Array([1, NaN, 2, 3])); // 3
 * ```
 */
export function nmax(data: Float32Array | number[]): number {
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (!isNaN(data[i]) && data[i] > max) {
      max = data[i];
    }
  }
  return max === -Infinity ? NaN : max;
}

/**
 * Automatically compute color limits from data.
 * Ported from cigvis Python: auto_clim
 *
 * @param data - Input data array
 * @param scale - Scale factor (default: 1)
 * @returns [vmin, vmax] color limits
 *
 * @example
 * ```ts
 * const clim = autoClim(volumeData); // [-0.5, 0.5]
 * const clim2 = autoClim(volumeData, 2); // [-1.0, 1.0]
 * ```
 */
export function autoClim(data: Float32Array, scale: number = 1): [number, number] {
  const vmin = nmin(data);
  const vmax = nmax(data);

  const v1 = formatValue(vmin);
  const v2 = formatValue(vmax);

  if (v1 === v2) {
    return [v1 - 0.1, v1 + 0.2];
  }

  if (v1 * v2 < 0) {
    const ratio = Math.abs(v1) / Math.abs(v2);
    if (ratio < 0.05 || ratio > 20) {
      return [v1 * scale, v2 * scale];
    } else {
      const v = Math.min(Math.abs(v1), Math.abs(v2)) * scale;
      return [-v, v];
    }
  }

  return [v1 * scale, v2 * scale];
}

/**
 * Format a value for display (round to 2 significant figures).
 */
function formatValue(v: number): number {
  if (Math.abs(v) > 1) {
    return Math.round(v * 100) / 100;
  } else {
    return parseFloat(v.toPrecision(2));
  }
}

/**
 * Check if data is a TypedArray.
 *
 * @param data - Data to check
 * @returns Whether data is a TypedArray
 */
export function isTypedArray(data: any): boolean {
  return ArrayBuffer.isView(data) && !(data instanceof DataView);
}

/**
 * Get volume shape and RGB type.
 * Ported from cigvis Python: get_shape
 *
 * @param volume - Volume data
 * @param shape - Volume shape (3D or 4D)
 * @param lineFirst - Whether first dimension is inline
 * @returns [shape, rgbType]
 *
 * @example
 * ```ts
 * const { shape, rgbType } = getShape(volumeData, [64, 64, 64], true);
 * ```
 */
export function getShape(
  volume: Float32Array,
  shape: number[],
  lineFirst: boolean = true
): { shape: [number, number, number]; rgbType: number } {
  let rgbType = 0;
  let resultShape: [number, number, number];

  // Check if 4D (RGB volume)
  if (shape.length === 4) {
    const dim3 = shape[3];
    const dim0 = shape[0];
    if (dim3 === 3 || dim3 === 4) {
      // RGB at end: [ni, nx, nt, 3]
      resultShape = [shape[0], shape[1], shape[2]];
      rgbType = 1;
    } else if (dim0 === 3 || dim0 === 4) {
      // RGB at start: [3, ni, nx, nt]
      resultShape = [shape[1], shape[2], shape[3]];
      rgbType = 2;
    } else {
      resultShape = [shape[0], shape[1], shape[2]];
    }
  } else if (shape.length === 3) {
    resultShape = [shape[0], shape[1], shape[2]];
  } else {
    throw new Error(`Shape must be 3D or 4D, got ${shape.length}D`);
  }

  if (!lineFirst) {
    resultShape = [resultShape[2], resultShape[1], resultShape[0]];
  }

  return { shape: resultShape, rgbType };
}

/**
 * Check memory-mapped array mode (warning if not read-only).
 * Ported from cigvis Python: check_mmap
 *
 * @param data - Data array (no-op in JS, just validation)
 */
export function checkMmap(data: any): void {
  // In JavaScript, there's no direct equivalent of numpy memmap
  // This is a no-op but we validate the data exists
  if (data === null || data === undefined) {
    throw new Error('Data cannot be null or undefined');
  }
}

/**
 * Create a deprecation warning.
 * Ported from cigvis Python: deprecated
 *
 * @param message - Deprecation message
 * @param replacement - Replacement function name
 * @returns Decorator function (for compatibility, just logs warning)
 */
export function deprecated(message: string, replacement?: string): void {
  const fullMessage = replacement
    ? `${message} Use ${replacement} instead.`
    : message;
  console.warn(`[cigvis] Deprecation warning: ${fullMessage}`);
}

/**
 * Sample data for efficient min/max computation on large arrays.
 * Ported from cigvis Python: _sampled_minmax
 *
 * @param data - Input data
 * @param maxSamples - Maximum number of samples
 * @returns [min, max]
 */
export function sampledMinMax(
  data: Float32Array,
  maxSamples: number = 65536
): [number, number] {
  if (data.length <= maxSamples) {
    return [nmin(data), nmax(data)];
  }

  // Sample from beginning, middle, and end
  const chunkSize = Math.floor(maxSamples / 3);
  const samples: number[] = [];

  // Beginning
  for (let i = 0; i < chunkSize && i < data.length; i++) {
    if (!isNaN(data[i])) samples.push(data[i]);
  }

  // Middle
  const midStart = Math.floor(data.length / 2) - Math.floor(chunkSize / 2);
  for (let i = midStart; i < midStart + chunkSize && i < data.length; i++) {
    if (i >= 0 && !isNaN(data[i])) samples.push(data[i]);
  }

  // End
  const endStart = data.length - chunkSize;
  for (let i = endStart; i < data.length; i++) {
    if (i >= 0 && !isNaN(data[i])) samples.push(data[i]);
  }

  if (samples.length === 0) return [NaN, NaN];

  let min = Infinity;
  let max = -Infinity;
  for (const v of samples) {
    if (v < min) min = v;
    if (v > max) max = v;
  }

  return [min, max];
}

/**
 * Inverse linear interpolation.
 *
 * @param a - Start value
 * @param b - End value
 * @param v - Value to interpolate
 * @returns Interpolation factor [0, 1]
 */
export function inverseLerp(a: number, b: number, v: number): number {
  if (a === b) return 0;
  return (v - a) / (b - a);
}

/**
 * Remap a value from one range to another.
 *
 * @param value - Value to remap
 * @param fromMin - Source range min
 * @param fromMax - Source range max
 * @param toMin - Target range min
 * @param toMax - Target range max
 * @returns Remapped value
 */
export function remap(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number
): number {
  const t = inverseLerp(fromMin, fromMax, value);
  return lerp(toMin, toMax, t);
}

/**
 * Check if a value is within a range.
 *
 * @param value - Value to check
 * @param min - Range min
 * @param max - Range max
 * @returns Whether value is in range
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Smooth step interpolation (Hermite interpolation).
 *
 * @param edge0 - Lower edge
 * @param edge1 - Upper edge
 * @param x - Input value
 * @returns Smoothly interpolated value [0, 1]
 */
export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clampValue((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Generate a range of numbers.
 *
 * @param start - Start value
 * @param end - End value
 * @param step - Step size
 * @returns Array of numbers
 */
export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
}
