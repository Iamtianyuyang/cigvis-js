/**
 * Horizon file reader for CIGVis
 *
 * Ported from cigvis Python library (cigvis/io/horiz.py)
 * Reads horizon data from tab-separated text files.
 *
 * @module io/horiz
 */

// ============================================================================
// Types
// ============================================================================

/** Horizon conversion options */
export interface HorizConvertOptions {
  /** Horizon text data (tab-separated) */
  data: string;
  /** Number of inline samples */
  ni: number;
  /** Number of crossline samples */
  nx: number;
  /** Time/depth sampling interval */
  dt: number;
  /** Inline start index */
  istart: number;
  /** Crossline start index */
  xstart: number;
  /** Time/depth start value */
  tstart?: number;
}

// ============================================================================
// Parsing
// ============================================================================

/**
 * Parse a horizon text line into [inline, crossline, time] values.
 *
 * @param line - Tab-separated line
 * @returns Parsed values or null if invalid
 */
function parseHorizLine(line: string): [number, number, number] | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('\t');
  if (parts.length < 3) return null;

  const values = parts.slice(1).map(Number);
  if (values.some(isNaN)) return null;

  return [values[0], values[1], values[2]];
}

/**
 * Convert horizon text data to a 2D grid.
 *
 * @param options - Conversion options
 * @returns Float32Array grid of shape [ni, nx]
 *
 * @example
 * ```ts
 * const grid = convertHoriz({
 *   data: "1\t100\t200\t500\n2\t101\t201\t510\n...",
 *   ni: 192,
 *   nx: 200,
 *   dt: 4,
 *   istart: 0,
 *   xstart: 0,
 * });
 * ```
 */
export function convertHoriz(options: HorizConvertOptions): Float32Array {
  const {
    data,
    ni,
    nx,
    dt,
    istart,
    xstart,
    tstart = 0,
  } = options;

  // Parse lines
  const lines = data.split('\n');
  const parsed: Array<[number, number, number]> = [];

  for (const line of lines) {
    const result = parseHorizLine(line);
    if (result) {
      parsed.push(result);
    }
  }

  // Sort by inline, then crossline
  parsed.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return a[1] - b[1];
  });

  // Create grid
  const grid = new Float32Array(ni * nx).fill(-1);

  for (const [iline, xline, time] of parsed) {
    const x = Math.round(iline) - istart;
    const y = Math.round(xline) - xstart;
    const z = (time - tstart) / dt;

    if (x >= 0 && x < ni && y >= 0 && y < nx) {
      grid[x * nx + y] = z;
    }
  }

  return grid;
}

/**
 * Read horizon data from a File object.
 *
 * @param file - File object
 * @param options - Conversion options (without data)
 * @returns Promise<Float32Array> grid
 */
export async function readHorizFromFile(
  file: File,
  options: Omit<HorizConvertOptions, 'data'>
): Promise<Float32Array> {
  const data = await file.text();
  return convertHoriz({ ...options, data });
}

/**
 * Read horizon data from a URL.
 *
 * @param url - URL to fetch
 * @param options - Conversion options (without data)
 * @returns Promise<Float32Array> grid
 */
export async function readHorizFromURL(
  url: string,
  options: Omit<HorizConvertOptions, 'data'>
): Promise<Float32Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  const data = await response.text();
  return convertHoriz({ ...options, data });
}
