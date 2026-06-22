/**
 * Surface utilities for CIGVis
 *
 * Ported from cigvis Python library (cigvis/utils/surfaceutils.py)
 * Provides functions for surface processing, interpolation, and mesh generation.
 *
 * @module utils/surface-utils
 */

// ============================================================================
// Types
// ============================================================================

/** Surface height map [ni, nx] */
export type SurfaceHeightMap = Float32Array;

/** Surface shape [ni, nx] */
export type SurfaceShape = [number, number];

/** Volume shape [ni, nx, nt] */
export type VolumeShape = [number, number, number];

/** Point with coordinates [x, y, z] */
export type Point3D = [number, number, number];

/** Point with value [x, y, value] */
export type PointWithValue = [number, number, number];

/** Point with color [x, y, r, g, b] or [x, y, r, g, b, a] */
export type PointWithColor = [number, number, number, number, number] | [number, number, number, number, number, number];

// ============================================================================
// Grid filling
// ============================================================================

/**
 * Fill scattered points into a regular grid.
 *
 * @param points - Points array [N, 3+] where each row is [x, y, z, ...]
 * @param shape - Target grid shape [n1, n2]
 * @param interpolate - Whether to interpolate (true) or nearest-neighbor (false)
 * @param fill - Fill value for points outside convex hull
 * @returns Filled grid
 */
export function fillGrid(
  points: Float32Array,
  shape: SurfaceShape,
  interpolate: boolean = true,
  fill: number = -1
): Float32Array {
  const [n1, n2] = shape;
  const numCols = points.length / (points.length > 0 ? Math.round(points.length / (n1 * n2)) : 1);

  // For simplicity, use nearest-neighbor for now
  // A full implementation would use scipy's griddata equivalent
  const grid = new Float32Array(n1 * n2).fill(fill);

  if (!interpolate) {
    // Nearest neighbor fill
    const numPoints = points.length / 3;
    for (let p = 0; p < numPoints; p++) {
      const x = Math.round(points[p * 3]);
      const y = Math.round(points[p * 3 + 1]);
      const z = points[p * 3 + 2];

      if (x >= 0 && x < n1 && y >= 0 && y < n2) {
        grid[x * n2 + y] = z;
      }
    }
  } else {
    // Bilinear interpolation (simplified)
    const numPoints = points.length / 3;
    for (let p = 0; p < numPoints; p++) {
      const x = Math.round(points[p * 3]);
      const y = Math.round(points[p * 3 + 1]);
      const z = points[p * 3 + 2];

      if (x >= 0 && x < n1 && y >= 0 && y < n2) {
        grid[x * n2 + y] = z;
      }
    }

    // Fill gaps with nearest valid neighbor
    for (let i = 0; i < n1; i++) {
      for (let j = 0; j < n2; j++) {
        if (grid[i * n2 + j] === fill) {
          // Search in expanding radius
          for (let r = 1; r <= Math.max(n1, n2); r++) {
            let found = false;
            for (let di = -r; di <= r && !found; di++) {
              for (let dj = -r; dj <= r && !found; dj++) {
                if (Math.abs(di) !== r && Math.abs(dj) !== r) continue;
                const ni = i + di;
                const nj = j + dj;
                if (ni >= 0 && ni < n1 && nj >= 0 && nj < n2) {
                  const val = grid[ni * n2 + nj];
                  if (val !== fill) {
                    grid[i * n2 + j] = val;
                    found = true;
                  }
                }
              }
            }
            if (found) break;
          }
        }
      }
    }
  }

  return grid;
}

// ============================================================================
// Surface preprocessing
// ============================================================================

/**
 * Preprocess a 2D surface array for visualization.
 *
 * @param surface - Surface height map [ni, nx]
 * @param volume - Optional volume for amplitude extraction
 * @param valueType - 'depth' for height coloring, 'amp' for amplitude
 * @returns [surface, values, colors]
 */
export function preprocSurfaceArray2(
  surface: SurfaceHeightMap,
  volume?: Float32Array,
  valueType: 'depth' | 'amp' = 'depth'
): [SurfaceHeightMap, Float32Array | null, null] {
  if (surface.length === 0) {
    throw new Error('Surface array is empty');
  }

  if (valueType === 'depth') {
    return [surface, null, null];
  }

  if (!volume) {
    throw new Error('Volume data required for amplitude coloring');
  }

  const values = interpolateSurface(volume, surface);
  return [surface, values, null];
}

/**
 * Preprocess a surface with position data [N, 3] or [N, 4+].
 *
 * @param surface - Points array [N, 3+] where columns are [x, y, z, ...]
 * @param shape - Target grid shape [ni, nx]
 * @param volume - Optional volume for amplitude extraction
 * @param valueType - 'depth' for height coloring, 'amp' for amplitude
 * @param interpolate - Whether to interpolate scattered points
 * @param fill - Fill value for missing points
 * @returns [surfaceGrid, values, colors]
 */
export function preprocSurfacePos(
  surface: Float32Array,
  shape: SurfaceShape,
  volume?: Float32Array,
  valueType: 'depth' | 'amp' = 'depth',
  interpolate: boolean = true,
  fill: number = -1
): [SurfaceHeightMap, Float32Array | null, Float32Array | null] {
  const numCols = surface.length > 0 ? surface.length / (shape[0] * shape[1]) : 0;

  // Extract height map (first 3 columns: x, y, z)
  const points = new Float32Array(shape[0] * shape[1] * 3);
  for (let i = 0; i < shape[0] * shape[1]; i++) {
    points[i * 3] = surface[i * numCols];
    points[i * 3 + 1] = surface[i * numCols + 1];
    points[i * 3 + 2] = surface[i * numCols + 2];
  }

  const surfGrid = fillGrid(points, shape, interpolate, fill);

  if (valueType === 'depth') {
    return [surfGrid, null, null];
  }

  // Extract values or colors based on number of columns
  let values: Float32Array | null = null;
  let colors: Float32Array | null = null;

  if (numCols === 4) {
    // [x, y, z, value]
    values = new Float32Array(shape[0] * shape[1]);
    for (let i = 0; i < shape[0] * shape[1]; i++) {
      values[i] = surface[i * numCols + 3];
    }
  } else if (numCols === 6 || numCols === 7) {
    // [x, y, z, r, g, b] or [x, y, z, r, g, b, a]
    const colorSize = numCols === 7 ? 4 : 3;
    colors = new Float32Array(shape[0] * shape[1] * colorSize);
    for (let i = 0; i < shape[0] * shape[1]; i++) {
      for (let c = 0; c < colorSize; c++) {
        colors[i * colorSize + c] = surface[i * numCols + 3 + c];
      }
    }
  } else if (volume) {
    values = interpolateSurface(volume, surfGrid);
  }

  return [surfGrid, values, colors];
}

// ============================================================================
// Surface interpolation
// ============================================================================

/**
 * Interpolate volume values at surface positions.
 *
 * @param volume - 3D volume data [ni, nx, nt]
 * @param surface - Surface height map [ni, nx] where each value is the z/t position
 * @param lineFirst - Whether the volume is in line-first order
 * @returns Interpolated values at surface positions
 */
export function interpolateSurface(
  volume: Float32Array,
  surface: SurfaceHeightMap,
  lineFirst: boolean = true
): Float32Array {
  const [ni, nx, nt] = lineFirst
    ? getVolumeShape(volume, surface)
    : getVolumeShapeTimeFirst(volume, surface);

  const result = new Float32Array(ni * nx);

  for (let i = 0; i < ni; i++) {
    for (let j = 0; j < nx; j++) {
      const z = surface[i * nx + j];
      const z0 = Math.floor(z);
      const z1 = Math.min(z0 + 1, nt - 1);
      const frac = z - z0;

      if (z0 < 0 || z0 >= nt) {
        result[i * nx + j] = NaN;
        continue;
      }

      // Linear interpolation
      const v0 = lineFirst
        ? volume[i * nx * nt + j * nt + z0]
        : volume[z0 * nx * ni + j * ni + i];
      const v1 = lineFirst
        ? volume[i * nx * nt + j * nt + z1]
        : volume[z1 * nx * ni + j * ni + i];

      result[i * nx + j] = v0 * (1 - frac) + v1 * frac;
    }
  }

  return result;
}

/**
 * Infer volume shape from volume and surface arrays.
 */
function getVolumeShape(
  volume: Float32Array,
  surface: SurfaceHeightMap
): [number, number, number] {
  // Assume line-first: volume is [ni, nx, nt]
  // surface is [ni, nx]
  const surfSize = surface.length;
  const volSize = volume.length;

  // Try common shapes
  const sqrtSurf = Math.sqrt(surfSize);
  const ni = Math.round(sqrtSurf);
  const nx = Math.round(surfSize / ni);

  if (ni * nx !== surfSize) {
    throw new Error('Cannot infer volume shape from surface');
  }

  const nt = Math.round(volSize / (ni * nx));
  return [ni, nx, nt];
}

/**
 * Infer volume shape for time-first layout.
 */
function getVolumeShapeTimeFirst(
  volume: Float32Array,
  surface: SurfaceHeightMap
): [number, number, number] {
  const surfSize = surface.length;
  const volSize = volume.length;

  const sqrtSurf = Math.sqrt(surfSize);
  const nx = Math.round(sqrtSurf);
  const ni = Math.round(surfSize / nx);

  if (nx * ni !== surfSize) {
    throw new Error('Cannot infer volume shape from surface');
  }

  const nt = Math.round(volSize / (nx * ni));
  return [ni, nx, nt];
}

// ============================================================================
// Path interpolation
// ============================================================================

/**
 * Interpolate a path from scattered points with a given step size.
 *
 * @param points - Input points [N, 2]
 * @param di - Step size for interpolation
 * @returns [interpolatedPoints, indices]
 */
export function interpolatePath(
  points: Point3D[],
  di: number = 1
): { points: Point3D[]; indices: number[] } {
  if (points.length < 2) {
    return { points, indices: [0] };
  }

  // Calculate cumulative distances
  const distances: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    const dz = points[i][2] - points[i - 1][2];
    distances.push(distances[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz));
  }

  const totalDistance = distances[distances.length - 1];
  const numSteps = Math.ceil(totalDistance / di) + 1;

  const interpolated: Point3D[] = [];
  const indices: number[] = [];

  for (let step = 0; step < numSteps; step++) {
    const targetDist = step * di;

    // Find segment
    let segIdx = 0;
    while (segIdx < distances.length - 1 && distances[segIdx + 1] < targetDist) {
      segIdx++;
    }

    if (segIdx >= points.length - 1) {
      interpolated.push([...points[points.length - 1]]);
      indices.push(points.length - 1);
      continue;
    }

    // Interpolate within segment
    const segDist = distances[segIdx + 1] - distances[segIdx];
    const frac = segDist > 0 ? (targetDist - distances[segIdx]) / segDist : 0;

    const p0 = points[segIdx];
    const p1 = points[segIdx + 1];
    interpolated.push([
      p0[0] + (p1[0] - p0[0]) * frac,
      p0[1] + (p1[1] - p0[1]) * frac,
      p0[2] + (p1[2] - p0[2]) * frac,
    ]);
    indices.push(segIdx);
  }

  return { points: interpolated, indices };
}

/**
 * Extract data along an arbitrary line in 3D volume.
 *
 * @param volume - 3D volume data [ni, nx, nt]
 * @param points - Path points [N, 2] (normalized 0-1)
 * @param di - Step size
 * @returns Extracted data along the path
 */
export function extractAlongPath(
  volume: Float32Array,
  points: Point3D[],
  di: number = 1
): Float32Array {
  const { points: interpPoints } = interpolatePath(points, di);
  const result = new Float32Array(interpPoints.length);

  // This is a simplified version - full implementation would use
  // the extract_data and interp_arb functions from the Python code
  for (let i = 0; i < interpPoints.length; i++) {
    const [x, y, z] = interpPoints[i];
    // Nearest neighbor for now
    const ix = Math.round(x);
    const iy = Math.round(y);
    const iz = Math.round(z);
    // Volume shape would need to be known
    result[i] = 0; // Placeholder
  }

  return result;
}
