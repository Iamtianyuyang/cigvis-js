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
  private _reversed: boolean = false;

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
    result._alpha = alpha;
    return result;
  }

  private _alpha: number = 1.0;

  /** Get alpha value */
  get alpha(): number {
    return this._alpha;
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
  // This would modify the alpha channel progressively
  return colormap.withAlpha(alphaMax);
}

/** List available built-in colormap names */
export function listColormaps(): string[] {
  return Object.keys(BUILTIN_COLORMAPS);
}
