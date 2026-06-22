/**
 * Colormap system for CIGVis
 * Ported from cigvis Python library
 */

import { RGB, RGBA, Colormap, Clim } from '../types';
import { BUILTIN_COLORMAPS } from './builtin-cmaps';

/**
 * Colormap class - maps scalar values to colors
 */
export class ColormapImpl implements Colormap {
  public readonly name: string;
  public readonly colors: RGB[];
  public readonly type: 'listed' | 'segmented';
  public alpha: number = 1.0;
  public alphaExceptMin: boolean = false;
  public alphaExceptMax: boolean = false;
  public alphaExceptValues: { clim: Clim; values: number[] } | null = null;
  public alphaExceptTop: { clim: Clim; segm: number } | null = null;
  public alphaExceptBottom: { clim: Clim; segm: number } | null = null;
  public alphaExceptRanges: { clim: Clim; ranges: [number, number][] } | null = null;
  public rampBlow: number = 0;
  public rampUp: number = 1;
  public rampAlphaMin: number = 0;
  public rampAlphaMax: number = 1;

  constructor(name: string, colors: RGB[], type: 'listed' | 'segmented' = 'listed') {
    this.name = name;
    this.colors = colors;
    this.type = type;
  }

  /** Number of color entries */
  get length(): number {
    return this.colors.length;
  }

  /**
   * Map a normalized value [0, 1] to an RGB color
   */
  at(t: number): RGB {
    const idx = Math.min(Math.floor(t * this.colors.length), this.colors.length - 1);
    const i = Math.max(0, idx);
    return this.colors[i];
  }

  /**
   * Map a normalized value [0, 1] to an RGBA color
   */
  atRGBA(t: number, alpha: number = 1.0): RGBA {
    const [r, g, b] = this.at(t);
    return [r, g, b, alpha];
  }

  /**
   * Create a reversed copy of this colormap
   */
  reversed(): ColormapImpl {
    const newColors = [...this.colors].reverse();
    const newName = this.name.endsWith('_r') ? this.name : `${this.name}_r`;
    return new ColormapImpl(newName, newColors, this.type);
  }

  /**
   * Create a copy with modified alpha
   */
  withAlpha(alpha: number): ColormapImpl {
    const newColors = this.colors.map(([r, g, b]) => [r, g, b] as RGB);
    const result = new ColormapImpl(this.name, newColors, this.type);
    result.alpha = alpha;
    return result;
  }

  /**
   * Sample colormap at multiple positions
   */
  sample(n: number): RGB[] {
    return Array.from({ length: n }, (_, i) => this.at(i / (n - 1)));
  }

  /**
   * Convert to Float32Array for WebGL
   */
  toFloat32Array(): Float32Array {
    const arr = new Float32Array(this.colors.length * 3);
    for (let i = 0; i < this.colors.length; i++) {
      arr[i * 3] = this.colors[i][0];
      arr[i * 3 + 1] = this.colors[i][1];
      arr[i * 3 + 2] = this.colors[i][2];
    }
    return arr;
  }

  /**
   * Convert to CSS gradient string
   */
  toCSSGradient(direction: string = 'to right'): string {
    const stops = this.colors.map(([r, g, b], i) => {
      const pct = (i / (this.colors.length - 1)) * 100;
      return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}) ${pct.toFixed(1)}%`;
    });
    return `linear-gradient(${direction}, ${stops.join(', ')})`;
  }
}

/**
 * Create a colormap from a name or custom colors
 */
export function createColormap(input: string | Colormap | number[][]): ColormapImpl {
  if (input instanceof ColormapImpl) {
    return input;
  }

  if (typeof input === 'string') {
    const name = input.toLowerCase().replace(/[-\s]/g, '_');
    const reverse = name.endsWith('_r');
    const baseName = reverse ? name.slice(0, -2) : name;

    const builtin = BUILTIN_COLORMAPS[baseName] || BUILTIN_COLORMAPS[name];
    if (builtin) {
      const colors = builtin.map(([r, g, b]) => [r, g, b] as RGB);
      const cmap = new ColormapImpl(baseName, colors);
      return reverse ? cmap.reversed() : cmap;
    }

    throw new Error(`Unknown colormap: ${input}`);
  }

  if (Array.isArray(input)) {
    const colors = input.map(([r, g, b]) => [r, g, b] as RGB);
    return new ColormapImpl('custom', colors);
  }

  throw new Error(`Invalid colormap input: ${input}`);
}

/**
 * Apply colormap to a 2D array of values
 * Returns an RGBA image as Uint8Array
 */
export function applyColormap(
  data: Float32Array,
  width: number,
  height: number,
  cmap: string | ColormapImpl,
  clim: Clim,
  alpha: number = 1.0
): Uint8Array {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const [vmin, vmax] = clim;
  const range = vmax - vmin;
  const result = new Uint8Array(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    let t = (data[i] - vmin) / range;
    t = Math.max(0, Math.min(1, t));

    const [r, g, b] = colormap.at(t);
    result[i * 4] = Math.round(r * 255);
    result[i * 4 + 1] = Math.round(g * 255);
    result[i * 4 + 2] = Math.round(b * 255);
    result[i * 4 + 3] = Math.round(alpha * 255);
  }

  return result;
}

/**
 * Blend two RGBA images together (alpha compositing)
 */
export function blendImages(
  bg: Uint8Array,
  fg: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const result = new Uint8Array(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const bgA = bg[i * 4 + 3] / 255;
    const fgA = fg[i * 4 + 3] / 255;

    const outA = fgA + bgA * (1 - fgA);
    const safeA = Math.max(outA, 1e-10);

    result[i * 4] = Math.round((fg[i * 4] * fgA + bg[i * 4] * bgA * (1 - fgA)) / safeA);
    result[i * 4 + 1] = Math.round((fg[i * 4 + 1] * fgA + bg[i * 4 + 1] * bgA * (1 - fgA)) / safeA);
    result[i * 4 + 2] = Math.round((fg[i * 4 + 2] * fgA + bg[i * 4 + 2] * bgA * (1 - fgA)) / safeA);
    result[i * 4 + 3] = Math.round(outA * 255);
  }

  return result;
}

/**
 * Set alpha on a colormap
 */
export function setAlpha(cmap: string | ColormapImpl, alpha: number): ColormapImpl {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  return colormap.withAlpha(alpha);
}

/**
 * Create a ramped alpha colormap
 */
export function rampAlpha(
  cmap: string | ColormapImpl,
  alphaMin: number = 0,
  alphaMax: number = 1,
  blow: number = 0,
  up: number = 1
): ColormapImpl {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const result = colormap.withAlpha(alphaMax);
  result.rampBlow = blow;
  result.rampUp = up;
  result.rampAlphaMin = alphaMin;
  result.rampAlphaMax = alphaMax;
  return result;
}

/** List available built-in colormap names */
export function listColormaps(): string[] {
  return Object.keys(BUILTIN_COLORMAPS);
}

// ============================================================================
// Additional colormap functions ported from Python cigvis
// ============================================================================

/**
 * Composite multiple arrays with alpha blending into RGBA image.
 * Ported from cigvis Python: arrs_to_image
 */
export function arrsToImage(
  arrays: Float32Array[],
  cmaps: (string | ColormapImpl)[],
  clims: Clim[],
  asUint8: boolean = false,
  nancolor?: RGB
): Float32Array | Uint8Array {
  if (arrays.length !== cmaps.length || arrays.length !== clims.length) {
    throw new Error('arrays, cmaps, and clims must have the same length');
  }

  const firstArr = arrays[0];
  const size = firstArr.length;
  let out = new Float32Array(size * 4);

  // Process first array
  const cmap0 = typeof cmaps[0] === 'string' ? createColormap(cmaps[0]) : cmaps[0];
  const [vmin0, vmax0] = clims[0];
  const range0 = vmax0 - vmin0 || 1;

  for (let i = 0; i < size; i++) {
    if (isNaN(arrays[0][i])) {
      if (nancolor) {
        out[i * 4] = nancolor[0];
        out[i * 4 + 1] = nancolor[1];
        out[i * 4 + 2] = nancolor[2];
        out[i * 4 + 3] = 0;
      } else {
        out[i * 4 + 3] = 0;
      }
      continue;
    }
    let t = (arrays[0][i] - vmin0) / range0;
    t = Math.max(0, Math.min(1, t));
    const [r, g, b] = cmap0.at(t);
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 1;
  }

  // Blend remaining arrays
  for (let a = 1; a < arrays.length; a++) {
    const rawCmapA = cmaps[a];
    const cmapA = typeof rawCmapA === 'string' ? createColormap(rawCmapA) : rawCmapA;
    const [vminA, vmaxA] = clims[a];
    const rangeA = vmaxA - vminA || 1;

    for (let i = 0; i < size; i++) {
      if (isNaN(arrays[a][i])) continue;

      let t = (arrays[a][i] - vminA) / rangeA;
      t = Math.max(0, Math.min(1, t));
      const [r, g, b] = cmapA.at(t);

      const bgR = out[i * 4];
      const bgG = out[i * 4 + 1];
      const bgB = out[i * 4 + 2];
      const bgA = out[i * 4 + 3];
      const fgA = 1;

      const outA = fgA + bgA * (1 - fgA);
      const safeA = Math.max(outA, 1e-10);

      out[i * 4] = (r * fgA + bgR * bgA * (1 - fgA)) / safeA;
      out[i * 4 + 1] = (g * fgA + bgG * bgA * (1 - fgA)) / safeA;
      out[i * 4 + 2] = (b * fgA + bgB * bgA * (1 - fgA)) / safeA;
      out[i * 4 + 3] = outA;
    }
  }

  if (asUint8) {
    const result = new Uint8Array(size * 4);
    for (let i = 0; i < size * 4; i++) {
      result[i] = Math.round(out[i] * 255);
    }
    return result;
  }

  return out;
}

/**
 * Quick cmap modification by name, alpha and exception mode.
 * Ported from cigvis Python: fast_set_cmap
 */
export function fastSetCmap(
  cmap: string | ColormapImpl,
  alpha: number,
  excpt: 'min' | 'max' | 'ramp' | null = null
): ColormapImpl {
  if (excpt === 'min') {
    return setAlphaExceptMin(cmap, alpha);
  } else if (excpt === 'max') {
    return setAlphaExceptMax(cmap, alpha);
  } else if (excpt === 'ramp') {
    return ramp(cmap, 0, 1, 0, alpha);
  } else {
    return setAlpha(cmap, alpha);
  }
}

/**
 * Generate N distinct RGBA colors for sparse line-style colormaps.
 * Ported from cigvis Python: distinct_colors
 */
export function distinctColors(n: number, seed: number = 0): RGBA[] {
  if (n < 0) throw new Error('n must be non-negative');
  if (n === 0) return [];

  let s = seed;
  const random = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const colors: RGBA[] = [];
  const dist = (c1: RGBA, c2: RGBA) =>
    Math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2);

  let attempts = 0;
  const maxAttempts = Math.max(1000, n * 200);

  while (colors.length < n && attempts < maxAttempts) {
    attempts++;
    const color: RGBA = [random(), random(), random(), 1.0];
    if (colors.every(c => dist(color, c) > 0.3)) {
      colors.push(color);
    }
  }

  while (colors.length < n) {
    colors.push([random(), random(), random(), 1.0]);
  }

  return colors;
}

/**
 * Convert a colormap into sparse opaque lines on a transparent background.
 * Ported from cigvis Python: line_cmap
 */
export function lineCmap(
  cmap: string | ColormapImpl | null = null,
  nLines: number = 20,
  samples: number = 256,
  seed: number = 0
): ColormapImpl {
  if (nLines <= 0) throw new Error('nLines must be positive');
  if (samples <= 0) throw new Error('samples must be positive');
  if (nLines > samples) throw new Error('nLines must be <= samples');

  const colors: RGBA[] = new Array(samples).fill(null).map(() => [0, 0, 0, 0]);
  const idx = Array.from({ length: nLines }, (_, i) =>
    Math.round((i / (nLines - 1)) * (samples - 1))
  );

  let discrete: RGBA[];
  let name: string;

  if (cmap === null) {
    discrete = distinctColors(nLines, seed);
    name = 'line_cmap';
  } else {
    const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
    discrete = Array.from({ length: nLines }, (_, i) => {
      const t = i / nLines;
      const [r, g, b] = colormap.at(t);
      return [r, g, b, 1.0] as RGBA;
    });
    name = `${colormap.name}_line`;
  }

  for (let i = 0; i < nLines; i++) {
    colors[idx[i]] = discrete[i];
  }

  return new ColormapImpl(name, colors.map(([r, g, b]) => [r, g, b] as RGB));
}

/**
 * Parse a color string to RGB values.
 */
function parseColor(color: string): RGB {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
      ];
    }
  }

  const namedColors: Record<string, RGB> = {
    red: [1, 0, 0],
    green: [0, 1, 0],
    blue: [0, 0, 1],
    white: [1, 1, 1],
    black: [0, 0, 0],
    yellow: [1, 1, 0],
    cyan: [0, 1, 1],
    magenta: [1, 0, 1],
  };

  return namedColors[color.toLowerCase()] || [0, 0, 0];
}

/**
 * Create a discrete colormap from values and colors.
 * Ported from cigvis Python: custom_disc_cmap
 */
export function customDiscCmap(
  values: number[],
  colors: string[]
): ColormapImpl {
  if (values.length !== colors.length) {
    throw new Error('values and colors must have the same length');
  }

  const sorted = values.map((v, i) => ({ value: v, color: colors[i] }))
    .sort((a, b) => a.value - b.value);

  const sortedValues = sorted.map(s => s.value);
  const sortedColors = sorted.map(s => parseColor(s.color));

  const bounds: number[] = [sortedValues[0]];
  for (let i = 0; i < sortedValues.length - 1; i++) {
    bounds.push((sortedValues[i] + sortedValues[i + 1]) / 2);
  }
  bounds.push(sortedValues[sortedValues.length - 1]);

  const samples = 256;
  const resultColors: RGB[] = [];
  const range = bounds[bounds.length - 1] - bounds[0];

  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    const value = bounds[0] + t * range;

    let segIdx = 0;
    for (let j = 0; j < bounds.length - 1; j++) {
      if (value >= bounds[j] && value <= bounds[j + 1]) {
        segIdx = j;
        break;
      }
      if (value > bounds[j + 1]) {
        segIdx = j + 1;
      }
    }

    segIdx = Math.min(segIdx, sortedColors.length - 1);
    resultColors.push(sortedColors[segIdx]);
  }

  return new ColormapImpl('custom_disc', resultColors);
}

/**
 * Get colors from a colormap at specific values.
 * Ported from cigvis Python: get_colors_from_cmap
 */
export function getColorsFromCmap(
  cmap: string | ColormapImpl,
  clim: Clim,
  values: number[]
): RGB[] {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const [vmin, vmax] = clim;
  const range = vmax - vmin || 1;

  return values.map(v => {
    const t = (v - vmin) / range;
    return colormap.at(Math.max(0, Math.min(1, t)));
  });
}

/**
 * Create a discrete colormap from an existing colormap.
 * Ported from cigvis Python: discrete_cmap
 */
export function discreteCmap(
  cmap: string | ColormapImpl,
  clim: Clim,
  values: number[]
): ColormapImpl {
  const colors = getColorsFromCmap(cmap, clim, values);
  const hexColors = colors.map(([r, g, b]) =>
    `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`
  );
  return customDiscCmap(values, hexColors);
}

/**
 * Create a colormap with linearly ramped alpha.
 * Ported from cigvis Python: ramp
 */
export function ramp(
  cmap: string | ColormapImpl,
  blow: number = 0,
  up: number = 1,
  alphaMin: number = 0,
  alphaMax: number = 1
): ColormapImpl {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const n = colormap.length;
  const colors: RGB[] = [];

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    colors.push(colormap.at(t));
  }

  const result = new ColormapImpl(colormap.name, colors);
  result.rampBlow = blow;
  result.rampUp = up;
  result.rampAlphaMin = alphaMin;
  result.rampAlphaMax = alphaMax;
  return result;
}

/**
 * Set the color at the maximum value position.
 * Ported from cigvis Python: set_up_as
 */
export function setUpAs(cmap: string | ColormapImpl, color: string): ColormapImpl {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const colors = [...colormap.colors];
  colors[colors.length - 1] = parseColor(color);
  return new ColormapImpl(colormap.name, colors);
}

/**
 * Set the color at the minimum value position.
 * Ported from cigvis Python: set_down_as
 */
export function setDownAs(cmap: string | ColormapImpl, color: string): ColormapImpl {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const colors = [...colormap.colors];
  colors[0] = parseColor(color);
  return new ColormapImpl(colormap.name, colors);
}

/**
 * Set alpha with minimum value transparent.
 * Ported from cigvis Python: set_alpha_except_min
 */
export function setAlphaExceptMin(cmap: string | ColormapImpl, alpha: number): ColormapImpl {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const result = colormap.withAlpha(alpha);
  result.alphaExceptMin = true;
  return result;
}

/**
 * Set alpha with maximum value transparent.
 * Ported from cigvis Python: set_alpha_except_max
 */
export function setAlphaExceptMax(cmap: string | ColormapImpl, alpha: number): ColormapImpl {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const result = colormap.withAlpha(alpha);
  result.alphaExceptMax = true;
  return result;
}

/**
 * Set alpha with specific values transparent.
 * Ported from cigvis Python: set_alpha_except_values
 */
export function setAlphaExceptValues(
  cmap: string | ColormapImpl,
  alpha: number,
  clim: Clim,
  values: number[]
): ColormapImpl {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const result = colormap.withAlpha(alpha);
  result.alphaExceptValues = { clim, values };
  return result;
}

/**
 * Set alpha with top range transparent.
 * Ported from cigvis Python: set_alpha_except_top
 */
export function setAlphaExceptTop(
  cmap: string | ColormapImpl,
  alpha: number,
  clim: Clim,
  segm: number
): ColormapImpl {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const result = colormap.withAlpha(alpha);
  result.alphaExceptTop = { clim, segm };
  return result;
}

/**
 * Set alpha with bottom range transparent.
 * Ported from cigvis Python: set_alpha_except_bottom
 */
export function setAlphaExceptBottom(
  cmap: string | ColormapImpl,
  alpha: number,
  clim: Clim,
  segm: number
): ColormapImpl {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const result = colormap.withAlpha(alpha);
  result.alphaExceptBottom = { clim, segm };
  return result;
}

/**
 * Set alpha with multiple ranges transparent.
 * Ported from cigvis Python: set_alpha_except_ranges
 */
export function setAlphaExceptRanges(
  cmap: string | ColormapImpl,
  alpha: number,
  clim: Clim,
  ranges: [number, number][]
): ColormapImpl {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const result = colormap.withAlpha(alpha);
  result.alphaExceptRanges = { clim, ranges };
  return result;
}

/**
 * Convert colormap to Plotly-compatible format.
 * Ported from cigvis Python: cmap_to_plotly
 */
export function cmapToPlotly(cmap: string | ColormapImpl): [number, string][] {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const result: [number, string][] = [];

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const [r, g, b] = colormap.at(t);
    const color = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    result.push([t, color]);
  }

  return result;
}

/**
 * Convert colormap to array of RGBA values.
 */
export function cmapToRGBA(cmap: string | ColormapImpl, alpha: number = 1): RGBA[] {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  return colormap.colors.map(([r, g, b]) => [r, g, b, alpha]);
}

/**
 * Convert colormap to Float32Array for WebGL.
 */
export function cmapToFloat32Array(cmap: string | ColormapImpl, alpha: number = 1): Float32Array {
  const colormap = typeof cmap === 'string' ? createColormap(cmap) : cmap;
  const n = colormap.colors.length;
  const arr = new Float32Array(n * 4);

  for (let i = 0; i < n; i++) {
    arr[i * 4] = colormap.colors[i][0];
    arr[i * 4 + 1] = colormap.colors[i][1];
    arr[i * 4 + 2] = colormap.colors[i][2];
    arr[i * 4 + 3] = alpha;
  }

  return arr;
}
