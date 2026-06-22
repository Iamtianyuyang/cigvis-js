/**
 * Mask utilities for CIGVis
 *
 * Ported from cigvis Python library (cigvis/utils/maskutils.py)
 * Provides functions to convert surfaces to volume masks.
 *
 * @module utils/mask-utils
 */

// ============================================================================
// Types
// ============================================================================

/** Surface as a 2D height map [ni, nx] where each value is the z position */
export type SurfaceArray = Float32Array;

/** Surface as point list [N, 3] where each row is [x, y, z] */
export type SurfacePoints = Float32Array;

/** Volume shape [ni, nx, nt] */
export type VolumeShape = [number, number, number];

// ============================================================================
// Surface to mask
// ============================================================================

/**
 * Convert surface(s) to a volume mask.
 *
 * Each surface defines a horizon in the volume. The mask assigns integer
 * values (1, 2, 3, ...) to each surface, with optional width.
 *
 * @param surfaces - Array of surfaces (each as height map or point list)
 * @param shape - Volume shape [ni, nx, nt]
 * @param width - Width of the mask line (default: 1)
 * @returns Float32Array mask volume
 *
 * @example
 * ```ts
 * // Single surface as height map
 * const mask = surfToMask([surfaceData], [192, 200, 240]);
 *
 * // Multiple surfaces with width
 * const mask = surfToMask([surf1, surf2], [192, 200, 240], 3);
 * ```
 */
export function surfToMask(
  surfaces: Array<SurfaceArray | SurfacePoints>,
  shape: VolumeShape,
  width: number = 1
): Float32Array {
  const [ni, nx, nt] = shape;
  const volume = new Float32Array(ni * nx * nt);

  for (let s = 0; s < surfaces.length; s++) {
    const surf = surfaces[s];
    const number = s + 1;

    if (surf.length === ni * nx) {
      // Height map format: surf[i, j] = z position
      fillHeightMap(volume, surf, shape, number, width);
    } else if (surf.length > 0 && surf.length % 3 === 0) {
      // Point list format: [x, y, z, x, y, z, ...]
      fillPointList(volume, surf, shape, number, width);
    } else {
      throw new Error(`Surface ${s}: unsupported format (length=${surf.length})`);
    }
  }

  return volume;
}

/**
 * Fill volume mask from a height map surface.
 */
function fillHeightMap(
  volume: Float32Array,
  surf: SurfaceArray,
  shape: VolumeShape,
  number: number,
  width: number
): void {
  const [ni, nx, nt] = shape;

  for (let i = 0; i < ni; i++) {
    for (let j = 0; j < nx; j++) {
      const z = Math.round(surf[i * nx + j]);
      if (z < 0 || z >= nt) continue;

      for (let w = 0; w < width; w++) {
        const offset = Math.floor(-width / 2 + w);
        const zPos = z + offset;
        if (zPos >= 0 && zPos < nt) {
          volume[i * nx * nt + j * nt + zPos] = number;
        }
      }
    }
  }
}

/**
 * Fill volume mask from a point list surface.
 */
function fillPointList(
  volume: Float32Array,
  surf: SurfacePoints,
  shape: VolumeShape,
  number: number,
  width: number
): void {
  const [ni, nx, nt] = shape;
  const numPoints = surf.length / 3;

  for (let p = 0; p < numPoints; p++) {
    const x = Math.round(surf[p * 3]);
    const y = Math.round(surf[p * 3 + 1]);
    const z = Math.round(surf[p * 3 + 2]);

    if (x < 0 || x >= ni || y < 0 || y >= nx || z < 0 || z >= nt) continue;

    for (let w = 0; w < width; w++) {
      const offset = Math.floor(-width / 2 + w);
      const zPos = z + offset;
      if (zPos >= 0 && zPos < nt) {
        volume[x * nx * nt + y * nt + zPos] = number;
      }
    }
  }
}

/**
 * Create a binary mask from a surface.
 *
 * @param surface - Surface height map [ni, nx]
 * @param shape - Volume shape [ni, nx, nt]
 * @param width - Width of the mask line
 * @returns Binary mask (0 or 1)
 */
export function surfToBinaryMask(
  surface: SurfaceArray,
  shape: VolumeShape,
  width: number = 1
): Uint8Array {
  const [ni, nx, nt] = shape;
  const mask = new Uint8Array(ni * nx * nt);

  for (let i = 0; i < ni; i++) {
    for (let j = 0; j < nx; j++) {
      const z = Math.round(surface[i * nx + j]);
      if (z < 0 || z >= nt) continue;

      for (let w = 0; w < width; w++) {
        const offset = Math.floor(-width / 2 + w);
        const zPos = z + offset;
        if (zPos >= 0 && zPos < nt) {
          mask[i * nx * nt + j * nt + zPos] = 1;
        }
      }
    }
  }

  return mask;
}

/**
 * Merge multiple masks into a single mask with priority.
 * Later masks overwrite earlier ones where they overlap.
 *
 * @param masks - Array of masks to merge
 * @param shape - Volume shape
 * @returns Merged mask
 */
export function mergeMasks(
  masks: Float32Array[],
  shape: VolumeShape
): Float32Array {
  const [ni, nx, nt] = shape;
  const result = new Float32Array(ni * nx * nt);

  for (const mask of masks) {
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] !== 0) {
        result[i] = mask[i];
      }
    }
  }

  return result;
}
