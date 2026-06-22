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
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);

  const fx = x - x0;
  const fy = y - y0;

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
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
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
