/**
 * Mesh generation utilities for CIGVis
 * Ported from cigvis Python library (cigvis/meshs/)
 *
 * Provides functions to generate 3D meshes for visualization.
 *
 * @module meshs
 */

// ============================================================================
// Types
// ============================================================================

/** Vertices as Float32Array [x,y,z, x,y,z, ...] */
export type Vertices = Float32Array;

/** Faces as Uint32Array [i0,i1,i2, i0,i1,i2, ...] */
export type Faces = Uint32Array;

/** Mesh result: vertices and faces */
export interface Mesh {
  vertices: Vertices;
  faces: Faces;
}

// ============================================================================
// Merge meshes
// ============================================================================

/**
 * Merge multiple meshes into one.
 * Ported from cigvis Python: merge_meshs
 *
 * @param meshes - Array of meshes to merge
 * @returns Merged mesh
 *
 * @example
 * ```ts
 * const merged = mergeMeshs([mesh1, mesh2, mesh3]);
 * ```
 */
export function mergeMeshs(meshes: Mesh[]): Mesh {
  if (meshes.length === 0) {
    return { vertices: new Float32Array(0), faces: new Uint32Array(0) };
  }

  if (meshes.length === 1) {
    return meshes[0];
  }

  // Calculate total sizes
  let totalVertices = 0;
  let totalFaces = 0;

  for (const mesh of meshes) {
    totalVertices += mesh.vertices.length / 3;
    totalFaces += mesh.faces.length / 3;
  }

  // Merge
  const vertices = new Float32Array(totalVertices * 3);
  const faces = new Uint32Array(totalFaces * 3);

  let vertexOffset = 0;
  let faceOffset = 0;
  let vertexCount = 0;

  for (const mesh of meshes) {
    // Copy vertices
    vertices.set(mesh.vertices, vertexOffset);
    vertexOffset += mesh.vertices.length;

    // Copy faces with offset
    for (let i = 0; i < mesh.faces.length; i++) {
      faces[faceOffset + i] = mesh.faces[i] + vertexCount;
    }
    faceOffset += mesh.faces.length;
    vertexCount += mesh.vertices.length / 3;
  }

  return { vertices, faces };
}

// ============================================================================
// Surface to mesh
// ============================================================================

/**
 * Convert a 2D surface height map to a 3D triangle mesh.
 * Ported from cigvis Python: surface2mesh
 *
 * @param surface - Height map as Float32Array [n1, n2]
 * @param shape - Surface shape [n1, n2]
 * @param options - Optional parameters
 * @returns Mesh with vertices and faces
 *
 * @example
 * ```ts
 * const mesh = surface2mesh(heightData, [64, 64]);
 * ```
 */
export function surface2mesh(
  surface: Float32Array,
  shape: [number, number],
  options: {
    mask?: Uint8Array;
    maskType?: 'e' | 'i';
    antiRot?: boolean;
    step1?: number;
    step2?: number;
  } = {}
): Mesh {
  const {
    mask = null,
    maskType = 'e',
    antiRot = true,
    step1 = 1,
    step2 = 1,
  } = options;

  const [n1, n2] = shape;
  const n1g = Math.ceil(n1 / step1);
  const n2g = Math.ceil(n2 / step2);

  // Create grid indices
  const grid = new Int32Array(n1g * n2g);
  let vertexCount = 0;

  if (mask === null) {
    for (let i = 0; i < n1g * n2g; i++) {
      grid[i] = i;
    }
    vertexCount = n1g * n2g;
  } else {
    const invertedMask = maskType === 'e';
    for (let i = 0; i < n1g * n2g; i++) {
      const shouldInclude = invertedMask ? !mask[i] : mask[i];
      grid[i] = shouldInclude ? vertexCount++ : -1;
    }
  }

  // Generate vertices
  const vertices = new Float32Array(vertexCount * 3);
  let vIdx = 0;

  for (let i = 0; i < n1g; i++) {
    for (let j = 0; j < n2g; j++) {
      const gi = i * step1;
      const gj = j * step2;
      const gridIdx = i * n2g + j;

      if (grid[gridIdx] >= 0) {
        vertices[vIdx * 3] = gi;
        vertices[vIdx * 3 + 1] = gj;
        vertices[vIdx * 3 + 2] = surface[gi * n2 + gj];
        vIdx++;
      }
    }
  }

  // Generate faces
  const facesList: number[] = [];

  for (let i = 0; i < n1g - 1; i++) {
    for (let j = 0; j < n2g - 1; j++) {
      const g00 = grid[i * n2g + j];
      const g10 = grid[(i + 1) * n2g + j];
      const g11 = grid[(i + 1) * n2g + j + 1];
      const g01 = grid[i * n2g + j + 1];

      // Skip if any vertex is masked
      if (g00 < 0 || g10 < 0 || g11 < 0 || g01 < 0) continue;

      // Two triangles per quad
      if (antiRot) {
        facesList.push(g00, g11, g10);
        facesList.push(g00, g01, g11);
      } else {
        facesList.push(g00, g10, g11);
        facesList.push(g00, g11, g01);
      }
    }
  }

  const faces = new Uint32Array(facesList);

  return { vertices, faces };
}

// ============================================================================
// Arbitrary line to mesh
// ============================================================================

/**
 * Convert an arbitrary line path to a 3D mesh (surface parallel to z-axis).
 * Ported from cigvis Python: arbline2mesh
 *
 * @param points - Path points as Float32Array [x,y, x,y, ...]
 * @param n3 - Number of points in z-axis
 * @param options - Optional parameters
 * @returns Mesh with vertices and faces
 *
 * @example
 * ```ts
 * const mesh = arbline2mesh(pathPoints, 100);
 * ```
 */
export function arbline2mesh(
  points: Float32Array,
  n3: number,
  options: {
    antiRot?: boolean;
    vstep?: number;
  } = {}
): Mesh {
  const { antiRot = true, vstep = 1 } = options;

  const N = points.length / 2;
  const n3Actual = Math.ceil(n3 / vstep);

  // Generate vertices
  const vertices = new Float32Array(N * n3Actual * 3);

  for (let i = 0; i < N; i++) {
    const px = points[i * 2];
    const py = points[i * 2 + 1];

    for (let k = 0; k < n3Actual; k++) {
      const z = k * vstep;
      const idx = (i * n3Actual + k) * 3;
      vertices[idx] = px;
      vertices[idx + 1] = py;
      vertices[idx + 2] = z;
    }
  }

  // Generate faces
  const facesList: number[] = [];

  for (let i = 0; i < N - 1; i++) {
    for (let k = 0; k < n3Actual - 1; k++) {
      const g00 = i * n3Actual + k;
      const g10 = (i + 1) * n3Actual + k;
      const g11 = (i + 1) * n3Actual + k + 1;
      const g01 = i * n3Actual + k + 1;

      if (antiRot) {
        facesList.push(g00, g11, g10);
        facesList.push(g00, g01, g11);
      } else {
        facesList.push(g00, g10, g11);
        facesList.push(g00, g11, g01);
      }
    }
  }

  const faces = new Uint32Array(facesList);

  return { vertices, faces };
}

// ============================================================================
// Points to quad mesh
// ============================================================================

/**
 * Convert 3D points to separate axis-aligned quad meshes.
 * Ported from cigvis Python: points2quad
 *
 * @param points - Point positions as Float32Array [x,y,z, x,y,z, ...]
 * @param options - Optional parameters
 * @returns Mesh with vertices and faces
 *
 * @example
 * ```ts
 * const mesh = points2quad(pointPositions, { size: 1.0 });
 * ```
 */
export function points2quad(
  points: Float32Array,
  options: {
    radius?: number;
    size?: number | [number, number];
  } = {}
): Mesh {
  const { radius, size: sizeOpt } = options;

  let hx: number, hy: number;

  if (sizeOpt !== undefined && radius !== undefined) {
    throw new Error('Pass either size or radius, not both');
  }

  if (sizeOpt === undefined) {
    const s = radius !== undefined ? radius * 2 : 1.0;
    hx = hy = s / 2;
  } else if (typeof sizeOpt === 'number') {
    hx = hy = sizeOpt / 2;
  } else {
    hx = sizeOpt[0] / 2;
    hy = sizeOpt[1] / 2;
  }

  const N = points.length / 3;

  // Generate vertices (4 per point)
  const vertices = new Float32Array(N * 4 * 3);
  const offsets = [
    [-hx, -hy, 0],
    [hx, -hy, 0],
    [hx, hy, 0],
    [-hx, hy, 0],
  ];

  for (let i = 0; i < N; i++) {
    const px = points[i * 3];
    const py = points[i * 3 + 1];
    const pz = points[i * 3 + 2];

    for (let j = 0; j < 4; j++) {
      const idx = (i * 4 + j) * 3;
      vertices[idx] = px + offsets[j][0];
      vertices[idx + 1] = py + offsets[j][1];
      vertices[idx + 2] = pz + offsets[j][2];
    }
  }

  // Generate faces (2 triangles per quad)
  const faces = new Uint32Array(N * 2 * 3);

  for (let i = 0; i < N; i++) {
    const base = i * 4;
    const faceIdx = i * 6;

    // Triangle 1
    faces[faceIdx] = base;
    faces[faceIdx + 1] = base + 1;
    faces[faceIdx + 2] = base + 2;

    // Triangle 2
    faces[faceIdx + 3] = base;
    faces[faceIdx + 4] = base + 2;
    faces[faceIdx + 5] = base + 3;
  }

  return { vertices, faces };
}

// ============================================================================
// Cube points
// ============================================================================

/**
 * Convert 3D points to cube meshes.
 * Ported from cigvis Python: cube_points
 *
 * @param points - Point positions as Float32Array [x,y,z, x,y,z, ...]
 * @param radius - Cube half-size
 * @returns Mesh with vertices and faces
 *
 * @example
 * ```ts
 * const mesh = cubePoints(pointPositions, 0.5);
 * ```
 */
export function cubePoints(points: Float32Array, radius: number): Mesh {
  const N = points.length / 3;

  // 8 vertices per cube
  const vertices = new Float32Array(N * 8 * 3);
  const offsets = [
    [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
    [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
  ];

  for (let i = 0; i < N; i++) {
    const px = points[i * 3];
    const py = points[i * 3 + 1];
    const pz = points[i * 3 + 2];

    for (let j = 0; j < 8; j++) {
      const idx = (i * 8 + j) * 3;
      vertices[idx] = px + offsets[j][0] * radius;
      vertices[idx + 1] = py + offsets[j][1] * radius;
      vertices[idx + 2] = pz + offsets[j][2] * radius;
    }
  }

  // 12 triangles per cube (6 faces, 2 triangles each)
  const faceIndices = [
    [0, 3, 2], [0, 1, 3], [0, 6, 2], [0, 4, 6],
    [0, 5, 1], [0, 4, 5], [4, 7, 6], [4, 5, 7],
    [2, 7, 3], [2, 6, 7], [1, 7, 3], [1, 5, 7],
  ];

  const faces = new Uint32Array(N * 12 * 3);

  for (let i = 0; i < N; i++) {
    const base = i * 8;
    const faceIdx = i * 36;

    for (let f = 0; f < 12; f++) {
      faces[faceIdx + f * 3] = base + faceIndices[f][0];
      faces[faceIdx + f * 3 + 1] = base + faceIndices[f][1];
      faces[faceIdx + f * 3 + 2] = base + faceIndices[f][2];
    }
  }

  return { vertices, faces };
}

// ============================================================================
// Regular polygon points
// ============================================================================

/**
 * Convert 3D points to regular polygon meshes.
 * Ported from cigvis Python: regular_poly_points
 *
 * @param points - Point positions as Float32Array [x,y,z, x,y,z, ...]
 * @param radius - Polygon radius
 * @param polyPoints - Number of polygon vertices
 * @returns Mesh with vertices and faces
 */
export function regularPolyPoints(
  points: Float32Array,
  radius: number,
  polyPoints: number
): Mesh {
  const N = points.length / 3;
  const vertsPerPoint = polyPoints + 1; // center + poly vertices

  // Generate vertices
  const vertices = new Float32Array(N * vertsPerPoint * 3);

  for (let i = 0; i < N; i++) {
    const px = points[i * 3];
    const py = points[i * 3 + 1];
    const pz = points[i * 3 + 2];

    // Center vertex
    vertices[i * vertsPerPoint * 3] = px;
    vertices[i * vertsPerPoint * 3 + 1] = py;
    vertices[i * vertsPerPoint * 3 + 2] = pz;

    // Polygon vertices
    for (let j = 0; j < polyPoints; j++) {
      const angle = (j / polyPoints) * Math.PI * 2;
      const idx = (i * vertsPerPoint + j + 1) * 3;
      vertices[idx] = px + Math.cos(angle) * radius;
      vertices[idx + 1] = py + Math.sin(angle) * radius;
      vertices[idx + 2] = pz;
    }
  }

  // Generate faces
  const faces = new Uint32Array(N * polyPoints * 3);

  for (let i = 0; i < N; i++) {
    const base = i * vertsPerPoint;
    const faceIdx = i * polyPoints * 3;

    for (let j = 0; j < polyPoints; j++) {
      const next = (j + 1) % polyPoints;
      faces[faceIdx + j * 3] = base; // center
      faces[faceIdx + j * 3 + 1] = base + j + 1;
      faces[faceIdx + j * 3 + 2] = base + next + 1;
    }
  }

  return { vertices, faces };
}

// ============================================================================
// Trajectory mesh (tube)
// ============================================================================

/**
 * Generate a tube mesh along a trajectory.
 * Ported from cigvis Python: trajectory_mesh
 *
 * @param points - Trajectory points as Float32Array [x,y,z, x,y,z, ...]
 * @param radius - Tube radius
 * @param tubePoints - Number of points around the tube circumference
 * @returns Mesh with vertices and faces
 */
export function trajectoryMesh(
  points: Float32Array,
  radius: number,
  tubePoints: number = 8
): Mesh {
  const N = points.length / 3;

  if (N < 2) {
    return { vertices: new Float32Array(0), faces: new Uint32Array(0) };
  }

  // Generate vertices
  const vertices = new Float32Array(N * tubePoints * 3);

  for (let i = 0; i < N; i++) {
    const px = points[i * 3];
    const py = points[i * 3 + 1];
    const pz = points[i * 3 + 2];

    // Calculate tangent
    let tx: number, ty: number, tz: number;
    if (i === 0) {
      tx = points[3] - px;
      ty = points[4] - py;
      tz = points[5] - pz;
    } else if (i === N - 1) {
      tx = px - points[(N - 2) * 3];
      ty = py - points[(N - 2) * 3 + 1];
      tz = pz - points[(N - 2) * 3 + 2];
    } else {
      tx = points[(i + 1) * 3] - points[(i - 1) * 3];
      ty = points[(i + 1) * 3 + 1] - points[(i - 1) * 3 + 1];
      tz = points[(i + 1) * 3 + 2] - points[(i - 1) * 3 + 2];
    }

    // Normalize tangent
    const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
    if (tLen > 0) {
      tx /= tLen;
      ty /= tLen;
      tz /= tLen;
    }

    // Calculate normal (perpendicular to tangent)
    let nx: number, ny: number, nz: number;
    if (Math.abs(tx) < 0.9) {
      nx = 0; ny = -tz; nz = ty;
    } else {
      nx = -ty; ny = 0; nz = tx;
    }
    const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (nLen > 0) {
      nx /= nLen;
      ny /= nLen;
      nz /= nLen;
    }

    // Calculate binormal
    const bx = ty * nz - tz * ny;
    const by = tz * nx - tx * nz;
    const bz = tx * ny - ty * nx;

    // Generate tube vertices
    for (let j = 0; j < tubePoints; j++) {
      const angle = (j / tubePoints) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const idx = (i * tubePoints + j) * 3;
      vertices[idx] = px + (nx * cos + bx * sin) * radius;
      vertices[idx + 1] = py + (ny * cos + by * sin) * radius;
      vertices[idx + 2] = pz + (nz * cos + bz * sin) * radius;
    }
  }

  // Generate faces
  const facesList: number[] = [];

  for (let i = 0; i < N - 1; i++) {
    for (let j = 0; j < tubePoints; j++) {
      const next = (j + 1) % tubePoints;

      const v00 = i * tubePoints + j;
      const v10 = (i + 1) * tubePoints + j;
      const v11 = (i + 1) * tubePoints + next;
      const v01 = i * tubePoints + next;

      facesList.push(v00, v10, v11);
      facesList.push(v00, v11, v01);
    }
  }

  const faces = new Uint32Array(facesList);

  return { vertices, faces };
}

// ============================================================================
// North pointer mesh
// ============================================================================

/** North pointer result */
export interface NorthPointerMesh {
  vertices: Float32Array;
  faces: Uint32Array;
  faceColors: Float32Array;
  textPosition: [number, number, number];
}

/**
 * Generate a north pointer mesh for orientation display.
 * Ported from cigvis Python: north_pointer_mesh
 *
 * @param direction - North direction [x, y]
 * @param scale - Scale factor
 * @param style - Pointer style: 'default' or 'petrel'
 * @returns NorthPointerMesh
 *
 * @example
 * ```ts
 * const pointer = northPointerMesh([0, 1], 2, 'default');
 * ```
 */
export function northPointerMesh(
  direction: [number, number],
  scale: number = 2,
  style: 'default' | 'petrel' = 'default'
): NorthPointerMesh {
  if (style === 'petrel') {
    return petrelNorthPointer(direction, scale);
  }
  return defaultNorthPointer(direction, scale);
}

/**
 * Default north pointer style.
 */
function defaultNorthPointer(
  direction: [number, number],
  scale: number
): NorthPointerMesh {
  // Diamond shape with center
  const vertices = new Float32Array([
    0, 3, 0,    // 0: top
    2, 0, 0,    // 1: right
    0, -3, 0,   // 2: bottom
    -2, 0, 0,   // 3: left
    0.5, 0.5, 0,  // 4: inner top-right
    0.5, -0.5, 0, // 5: inner bottom-right
    -0.5, -0.5, 0, // 6: inner bottom-left
    -0.5, 0.5, 0,  // 7: inner top-left
    0, 0, 0.5,   // 8: front
    0, 0, -0.5,  // 9: back
  ]);

  const faces = new Uint32Array([
    0, 7, 8,
    0, 7, 9,
    1, 4, 8,
    2, 5, 8,
    3, 6, 8,
    1, 4, 9,
    2, 5, 9,
    3, 6, 9,
    0, 8, 4,
    1, 8, 5,
    2, 8, 6,
    3, 8, 7,
    0, 9, 4,
    1, 9, 5,
    2, 9, 6,
    3, 9, 7,
  ]);

  // Face colors: red top, gray sides, black bottom
  const faceColors = new Float32Array(faces.length);
  for (let i = 0; i < 2; i++) {
    faceColors[i * 3] = 1; faceColors[i * 3 + 1] = 0; faceColors[i * 3 + 2] = 0;
  }
  for (let i = 2; i < 8; i++) {
    faceColors[i * 3] = 0.8; faceColors[i * 3 + 1] = 0.8; faceColors[i * 3 + 2] = 0.8;
  }
  for (let i = 8; i < 16; i++) {
    faceColors[i * 3] = 0; faceColors[i * 3 + 1] = 0; faceColors[i * 3 + 2] = 0;
  }

  // Scale
  for (let i = 0; i < vertices.length; i++) {
    vertices[i] = vertices[i] / 8 * scale;
  }

  // Rotate to match direction
  const angle = Math.atan2(direction[0], direction[1]);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  for (let i = 0; i < vertices.length / 3; i++) {
    const x = vertices[i * 3];
    const y = vertices[i * 3 + 1];
    vertices[i * 3] = x * cos - y * sin;
    vertices[i * 3 + 1] = x * sin + y * cos;
  }

  const textPosition: [number, number, number] = [0, 4 * scale / 8, 0];
  const tx = textPosition[0];
  const ty = textPosition[1];
  textPosition[0] = tx * cos - ty * sin;
  textPosition[1] = tx * sin + ty * cos;

  return { vertices, faces, faceColors, textPosition };
}

/**
 * Petrel-style north pointer.
 */
function petrelNorthPointer(
  direction: [number, number],
  scale: number
): NorthPointerMesh {
  // Arrow shape
  const v1 = [
    [0, 0, 0], [1, 0, 0], [0, 2, 0], [1, 2, 0],
    [-0.5, 2, 0], [1.5, 2, 0], [0.5, 3, 0],
  ];

  const v2 = v1.map(([x, y, z]) => [x, y, z + 0.25]);
  const v3 = v2.map(([x, y, z]) => [x, y, z + 0.25]);

  const allVerts = [...v1, ...v2, ...v3];
  const vertices = new Float32Array(allVerts.flat());

  const faces = new Uint32Array([
    0, 1, 2, 1, 3, 2, 4, 5, 6,
    0, 7, 8, 8, 1, 0,
    0, 7, 9, 9, 2, 0,
    1, 8, 10, 10, 3, 1,
    4, 11, 9, 9, 2, 4,
    3, 10, 12, 12, 5, 3,
    4, 11, 13, 13, 6, 4,
    6, 13, 12, 12, 5, 6,
    7, 14, 15, 15, 8, 7,
    7, 14, 16, 16, 9, 7,
    8, 15, 17, 17, 10, 8,
    11, 18, 16, 16, 9, 11,
    10, 17, 19, 19, 12, 10,
    11, 18, 20, 20, 13, 11,
    13, 20, 19, 19, 12, 13,
    14, 15, 16, 15, 17, 16, 18, 19, 20,
  ]);

  // Face colors: green body, red arrow
  const faceColors = new Float32Array(faces.length);
  const c1: [number, number, number] = [0.361, 0.788, 0.231];
  const c2: [number, number, number] = [0.733, 0.153, 0.102];

  for (let i = 0; i < 17; i++) {
    faceColors[i * 3] = c1[0];
    faceColors[i * 3 + 1] = c1[1];
    faceColors[i * 3 + 2] = c1[2];
  }
  for (let i = 17; i < 34; i++) {
    faceColors[i * 3] = c2[0];
    faceColors[i * 3 + 1] = c2[1];
    faceColors[i * 3 + 2] = c2[2];
  }

  // Scale
  for (let i = 0; i < vertices.length; i++) {
    vertices[i] = vertices[i] / 8 * scale;
  }

  // Rotate to match direction
  const angle = Math.atan2(direction[0], direction[1]);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  for (let i = 0; i < vertices.length / 3; i++) {
    const x = vertices[i * 3];
    const y = vertices[i * 3 + 1];
    vertices[i * 3] = x * cos - y * sin;
    vertices[i * 3 + 1] = x * sin + y * cos;
  }

  const textPosition: [number, number, number] = [0.5 * scale / 8, 4 * scale / 8, 0.5 * scale / 8];
  const tx = textPosition[0];
  const ty = textPosition[1];
  textPosition[0] = tx * cos - ty * sin;
  textPosition[1] = tx * sin + ty * cos;

  return { vertices, faces, faceColors, textPosition };
}

// ============================================================================
// Curves mesh (well log curves)
// ============================================================================

/**
 * Generate tube mesh for well log curves.
 * Ported from cigvis Python: curves_mesh
 *
 * @param points - Curve points [N, 3]
 * @param radius - Tube radius
 * @param tubePoints - Points around tube circumference
 * @returns Mesh
 */
export function curvesMesh(
  points: Float32Array,
  radius: number,
  tubePoints: number = 8
): Mesh {
  // Reuse trajectory mesh implementation
  return trajectoryMesh(points, radius, tubePoints);
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a meshs agent for programmatic access.
 */
export function createMeshsAgent() {
  return {
    mergeMeshs,
    surface2mesh,
    arbline2mesh,
    points2quad,
    cubePoints,
    regularPolyPoints,
    trajectoryMesh,
    northPointerMesh,
    curvesMesh,
  };
}
