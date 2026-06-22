/**
 * LAS file reader for well log data
 * LAS (Log ASCII Standard) is a standard format for well log data
 */

export interface LASHeader {
  /** Well name */
  well: string;
  /** Field name */
  field: string;
  /** Company */
  company: string;
  /** Date */
  date: string;
  /** Start depth */
  startDepth: number;
  /** Stop depth */
  stopDepth: number;
  /** Step (depth interval) */
  step: number;
  /** Null value */
  nullValue: number;
  /** Other header items */
  [key: string]: string | number;
}

export interface LASCurveInfo {
  /** Curve mnemonic */
  mnemonic: string;
  /** Curve unit */
  unit: string;
  /** Curve API code */
  apiCode?: string;
  /** Curve description */
  description: string;
}

export interface LASData {
  /** Header information */
  header: LASHeader;
  /** Curve information */
  curves: LASCurveInfo[];
  /** Curve data */
  data: Map<string, Float32Array>;
  /** Depth values */
  depth: Float32Array;
}

/**
 * Parse LAS file content
 */
export function parseLAS(content: string): LASData {
  const lines = content.split(/\r?\n/);
  const header: Partial<LASHeader> = {};
  const curves: LASCurveInfo[] = [];
  const dataLines: string[] = [];

  let section = '';
  let dataStarted = false;
  const curveData: Map<string, number[]> = new Map();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;

    // Section header
    if (line.startsWith('~')) {
      section = line.substring(1).toUpperCase();
      dataStarted = false;
      continue;
    }

    // Version section
    if (section === 'V' || section === 'VERSION') {
      // Parse version info
      continue;
    }

    // Well section
    if (section === 'W' || section === 'WELL') {
      const match = line.match(/^(\w+)\.?\s*:\s*(.+)/);
      if (match) {
        const key = match[1].toLowerCase();
        const value = match[2].trim().split(/\s+/)[0];

        switch (key) {
          case 'well':
            header.well = value;
            break;
          case 'fld':
            header.field = value;
            break;
          case 'comp':
            header.company = value;
            break;
          case 'date':
            header.date = value;
            break;
          case 'strt':
            header.startDepth = parseFloat(value);
            break;
          case 'stop':
            header.stopDepth = parseFloat(value);
            break;
          case 'step':
            header.step = parseFloat(value);
            break;
          case 'null':
            header.nullValue = parseFloat(value);
            break;
          default:
            header[key] = value;
        }
      }
    }

    // Curve section
    if (section === 'C' || section === 'CURVE') {
      const match = line.match(/^(\w+)\.?\s*:\s*(.+)/);
      if (match) {
        const mnemonic = match[1].trim();
        const rest = match[2].trim();

        // Parse unit and description
        const unitMatch = rest.match(/^(\S+)\s+(.*)/);
        curves.push({
          mnemonic,
          unit: unitMatch ? unitMatch[1] : '',
          description: unitMatch ? unitMatch[2] : rest,
        });
        curveData.set(mnemonic, []);
      }
    }

    // Data section
    if (section === 'A' || section === 'ASCII') {
      if (!dataStarted) {
        dataStarted = true;
        // Initialize data arrays for each curve
        for (const curve of curves) {
          if (!curveData.has(curve.mnemonic)) {
            curveData.set(curve.mnemonic, []);
          }
        }
      }

      // Parse data values
      const values = line.split(/\s+/).map(v => parseFloat(v));
      if (values.length >= curves.length) {
        for (let j = 0; j < curves.length; j++) {
          const curveName = curves[j].mnemonic;
          const arr = curveData.get(curveName)!;
          arr.push(values[j]);
        }
      }
    }
  }

  // Convert to Float32Arrays
  const data = new Map<string, Float32Array>();
  for (const [key, values] of curveData) {
    data.set(key, new Float32Array(values));
  }

  // Get depth array (first curve is usually depth)
  const depthMnemonic = curves[0]?.mnemonic || 'DEPT';
  const depth = data.get(depthMnemonic) || new Float32Array(0);

  return {
    header: header as LASHeader,
    curves,
    data,
    depth,
  };
}

/**
 * Read LAS file from File object
 */
export async function readLASFromFile(file: File): Promise<LASData> {
  const content = await file.text();
  return parseLAS(content);
}

/**
 * Read LAS file from URL
 */
export async function readLASFromURL(url: string): Promise<LASData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  const content = await response.text();
  return parseLAS(content);
}

/**
 * Get curve data from LAS data
 */
export function getCurve(lasData: LASData, mnemonic: string): Float32Array | undefined {
  return lasData.data.get(mnemonic);
}

/**
 * Get all available curve names
 */
export function getCurveNames(lasData: LASData): string[] {
  return lasData.curves.map(c => c.mnemonic);
}

/**
 * Get depth range
 */
export function getDepthRange(lasData: LASData): [number, number] {
  const depth = lasData.depth;
  if (depth.length === 0) return [0, 0];
  return [depth[0], depth[depth.length - 1]];
}

/**
 * Convert LAS data to well log format for visualization
 */
export function lasToWellLog(
  lasData: LASData,
  curveName: string,
  options: {
    x?: number;
    y?: number;
    startIndex?: number;
    endIndex?: number;
  } = {}
): {
  depths: Float32Array;
  values: Float32Array;
  x: number;
  y: number;
} | null {
  const values = getCurve(lasData, curveName);
  if (!values) return null;

  const depth = lasData.depth;
  const { x = 0, y = 0, startIndex = 0, endIndex = depth.length } = options;

  return {
    depths: depth.slice(startIndex, endIndex),
    values: values.slice(startIndex, endIndex),
    x,
    y,
  };
}
