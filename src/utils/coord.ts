/**
 * Coordinate transform utilities for CIGVis
 *
 * Ported from cigvis Python library (cigvis/utils/coord.py)
 * Provides affine transform calculations for coordinate systems.
 *
 * @module utils/coord
 */

// ============================================================================
// Types
// ============================================================================

/** 2D point [x, y] */
export type Point2D = [number, number];

/** 3x3 affine transform matrix (row-major) */
export type TransformMatrix3x3 = [
  number, number, number,
  number, number, number,
  number, number, number,
];

/** Array of 2D points */
export type Point2DArray = Point2D[];

// ============================================================================
// Matrix operations
// ============================================================================

/**
 * Create a 3x3 identity matrix.
 */
function identity3x3(): TransformMatrix3x3 {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

/**
 * Multiply two 3x3 matrices.
 */
function mat3Multiply(a: TransformMatrix3x3, b: TransformMatrix3x3): TransformMatrix3x3 {
  const result: number[] = new Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      result[i * 3 + j] =
        a[i * 3 + 0] * b[0 * 3 + j] +
        a[i * 3 + 1] * b[1 * 3 + j] +
        a[i * 3 + 2] * b[2 * 3 + j];
    }
  }
  return result as TransformMatrix3x3;
}

/**
 * Invert a 3x3 matrix.
 */
function mat3Inverse(m: TransformMatrix3x3): TransformMatrix3x3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);

  if (Math.abs(det) < 1e-10) {
    throw new Error('Matrix is singular (determinant ≈ 0)');
  }

  const invDet = 1 / det;
  return [
    (e * i - f * h) * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,
    (f * g - d * i) * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,
    (d * h - e * g) * invDet,
    (b * g - a * h) * invDet,
    (a * e - b * d) * invDet,
  ];
}

/**
 * Solve linear system Ax = b using Gaussian elimination with partial pivoting.
 * Returns x where A is (m x n) and b is (m x 1).
 */
function lstsqSolve(A: number[][], b: number[]): number[] {
  const m = A.length;
  const n = A[0].length;

  // Build augmented matrix
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < m; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }

    // Swap rows
    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // Eliminate below
    for (let row = col + 1; row < m; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Back substitution (for overdetermined system, use first n rows)
  const x: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = sum / aug[i][i];
  }

  return x;
}

// ============================================================================
// Transform calculation
// ============================================================================

/**
 * Calculate affine transform matrix using least squares (LSTSQ).
 *
 * Given corresponding point sets p1 and p2, computes H such that:
 *   p2 = H · p1
 *
 * @param p1 - Points in coordinate 1, shape (N, 2), N >= 3
 * @param p2 - Points in coordinate 2, shape (N, 2)
 * @returns 3x3 affine transform matrix
 * @throws {Error} If fewer than 3 point pairs provided
 *
 * @example
 * ```ts
 * const H = getTransformMatrix(
 *   [[0, 0], [1, 0], [0, 1]],
 *   [[10, 10], [20, 10], [10, 20]]
 * );
 * ```
 */
export function getTransformMatrix(
  p1: Point2DArray,
  p2: Point2DArray
): TransformMatrix3x3 {
  if (p1.length !== p2.length) {
    throw new Error('p1 and p2 must have the same length');
  }
  const N = p1.length;
  if (N < 3) {
    throw new Error('At least 3 point pairs required');
  }

  // Build system: A · h = b
  // Each point pair gives 2 equations
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < N; i++) {
    const [x1, y1] = p1[i];
    const [x2, y2] = p2[i];

    A.push([x1, y1, 1, 0, 0, 0]);
    b.push(x2);

    A.push([0, 0, 0, x1, y1, 1]);
    b.push(y2);
  }

  // Solve for h = [h11, h12, h13, h21, h22, h23]
  const h = lstsqSolve(A, b);

  // Build 3x3 matrix (affine: last row is [0, 0, 1])
  return [
    h[0], h[1], h[2],
    h[3], h[4], h[5],
    0,    0,    1,
  ];
}

// ============================================================================
// Transform application
// ============================================================================

/**
 * Apply affine transform to points.
 *
 * @param points - Points to transform, shape (N, 2) or single point [x, y]
 * @param matrix - 3x3 affine transform matrix
 * @param inverse - If true, apply the inverse transform
 * @returns Transformed points
 *
 * @example
 * ```ts
 * const H = getTransformMatrix(p1, p2);
 * const transformed = applyTransform([[5, 5]], H);
 * const original = applyTransform(transformed, H, true);
 * ```
 */
export function applyTransform(
  points: Point2D | Point2DArray,
  matrix: TransformMatrix3x3,
  inverse: boolean = false
): Point2DArray {
  const m = inverse ? mat3Inverse(matrix) : matrix;

  // Normalize input to array of points
  const pts: Point2DArray = Array.isArray(points[0])
    ? points as Point2DArray
    : [points as Point2D];

  const result: Point2DArray = [];

  for (const [x, y] of pts) {
    // Apply transform: [x', y', w'] = M · [x, y, 1]
    const xp = m[0] * x + m[1] * y + m[2];
    const yp = m[3] * x + m[4] * y + m[5];
    const wp = m[6] * x + m[7] * y + m[8];

    // Perspective divide
    result.push([xp / wp, yp / wp]);
  }

  return result;
}

/**
 * Create a translation transform matrix.
 *
 * @param tx - Translation in X
 * @param ty - Translation in Y
 * @returns 3x3 transform matrix
 */
export function createTranslation(tx: number, ty: number): TransformMatrix3x3 {
  return [1, 0, tx, 0, 1, ty, 0, 0, 1];
}

/**
 * Create a scale transform matrix.
 *
 * @param sx - Scale in X
 * @param sy - Scale in Y
 * @returns 3x3 transform matrix
 */
export function createScale(sx: number, sy: number): TransformMatrix3x3 {
  return [sx, 0, 0, 0, sy, 0, 0, 0, 1];
}

/**
 * Create a rotation transform matrix.
 *
 * @param angle - Rotation angle in radians
 * @returns 3x3 transform matrix
 */
export function createRotation(angle: number): TransformMatrix3x3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [cos, -sin, 0, sin, cos, 0, 0, 0, 1];
}

/**
 * Compose multiple transforms (applied left to right).
 *
 * @param transforms - Transform matrices to compose
 * @returns Composed transform matrix
 */
export function composeTransforms(...transforms: TransformMatrix3x3[]): TransformMatrix3x3 {
  return transforms.reduce((acc, t) => mat3Multiply(acc, t), identity3x3());
}
