/**
 * Default color schemes for CIGVis
 *
 * Ported from cigvis Python library (cigvis/colors.py)
 * Provides curated color palettes for geophysical data visualization.
 *
 * @module colors
 */

// ============================================================================
// Types
// ============================================================================

/** A color palette is an array of hex color strings */
export type ColorPalette = string[];

/** A collection of palettes grouped by size */
export type PaletteCollection = ColorPalette[];

/** Color palette with metadata */
export interface NamedPalette {
  /** Palette name */
  name: string;
  /** Number of colors */
  size: number;
  /** Index within the size group */
  index: number;
  /** The color values */
  colors: ColorPalette;
}

// ============================================================================
// 2-color palettes
// ============================================================================

/**
 * Palettes with 2 colors.
 * Use for binary classifications, positive/negative, etc.
 */
export const c2: PaletteCollection = [
  ['#62B197', '#E18E6D'],
  ['#B8DDBC', '#F0A780'],
  ['#97C8AF', '#96B6D8'],
  ['#8FC9E2', '#ECC97F'],
  ['#D6AFB9', '#7E9BB7'],
  ['#F89FA8', '#F9E9A4'],
  ['#EE8883', '#8DB7DB'],
];

// ============================================================================
// 3-color palettes
// ============================================================================

/**
 * Palettes with 3 colors.
 * Use for ternary classifications, RGB-like overlays, etc.
 */
export const c3: PaletteCollection = [
  ['#9392BE', '#D0E7ED', '#D5E4A8'],
  ['#F1C89A', '#E79397', '#A797DA'],
  ['#E1C855', '#E07B54', '#51B1B7'],  // Recommended for lines
  ['#A5C496', '#C7988C', '#8891DB'],
  ['#0E986F', '#796CAD', '#D65813'],
  ['#A9CA70', '#C5D6F0', '#F18C54'],
  ['#377EB9', '#4DAE48', '#974F9F'],
];

// ============================================================================
// 4-color palettes
// ============================================================================

/**
 * Palettes with 4 colors.
 */
export const c4: PaletteCollection = [
  ['#9BC985', '#F7D58B', '#B595BF', '#797BB7'],
  ['#F50804', '#9925E1', '#BDBDBD', '#000000'],
  ['#42B796', '#4394C4', '#EDBA42', '#D7D7D7'],
];

// ============================================================================
// 5-color palettes
// ============================================================================

/**
 * Palettes with 5 colors.
 */
export const c5: PaletteCollection = [
  ['#C6B3D3', '#ED9F9B', '#80BA8A', '#9CD1C8', '#6BB7CA'],
  ['#9DD0C7', '#9180AC', '#D9BDD8', '#E58579', '#8AB1D2'],
  ['#EEC79F', '#F1DFA4', '#74B69F', '#A6CDE4', '#E2C8D8'],
  ['#CC88B0', '#998DB7', '#DBE0ED', '#87B5B2', '#F4CEB4'],
  ['#F1DBE7', '#E0F1F7', '#DBD8E9', '#DEECD9', '#D0D2D4'],  // Light colors for edge fills
  ['#2878b5', '#9ac9db', '#f8ac8c', '#c82423', '#ff8884'],    // Recommended for lines
];

// ============================================================================
// 6-color palettes
// ============================================================================

/**
 * Palettes with 6 colors.
 */
export const c6: PaletteCollection = [
  ['#979AAA', '#D4AE9D', '#6FA9B5', '#3F4B69', '#985B54', '#208974'],
];

// ============================================================================
// 7-color palettes
// ============================================================================

/**
 * Palettes with 7 colors.
 */
export const c7: PaletteCollection = [
  ['#818181', '#295522', '#66B543', '#E07E35', '#F2CCA0', '#A9C4E6', '#D1392B'],
  ['#8ECFC9', '#FFBE7A', '#FA7F6F', '#82B0D2', '#BEB8DC', '#E7DAD2', '#999999'],
  ['#F27970', '#BB9727', '#54B345', '#32B897', '#05B9E2', '#8983BF', '#C76DA2'],
];

// ============================================================================
// 8-color palettes
// ============================================================================

/**
 * Palettes with 8 colors.
 */
export const c8: PaletteCollection = [
  ['#A1A9D0', '#F0988C', '#B883D4', '#9E9E9E', '#CFEAF1', '#C4A5DE', '#F6CAE5', '#96CCCB'],
];

// ============================================================================
// All palettes indexed by size
// ============================================================================

/** All palettes grouped by color count */
export const palettesBySize: Record<number, PaletteCollection> = {
  2: c2,
  3: c3,
  4: c4,
  5: c5,
  6: c6,
  7: c7,
  8: c8,
};

// ============================================================================
// Lookup functions
// ============================================================================

/**
 * Get a palette by size and index.
 *
 * @param size - Number of colors (2-8)
 * @param index - Palette index within the size group (0-based)
 * @returns The color palette
 * @throws {Error} If size or index is out of range
 *
 * @example
 * ```ts
 * const palette = getPalette(3, 2); // ['#E1C855', '#E07B54', '#51B1B7']
 * ```
 */
export function getPalette(size: number, index: number = 0): ColorPalette {
  const collection = palettesBySize[size];
  if (!collection) {
    throw new Error(`No palettes for size ${size}. Available sizes: ${Object.keys(palettesBySize).join(', ')}`);
  }
  if (index < 0 || index >= collection.length) {
    throw new Error(`Index ${index} out of range for size-${size} palettes (0-${collection.length - 1})`);
  }
  return collection[index];
}

/**
 * Get all palettes for a given size.
 *
 * @param size - Number of colors (2-8)
 * @returns Array of palettes
 */
export function getPalettesBySize(size: number): PaletteCollection {
  const collection = palettesBySize[size];
  if (!collection) {
    throw new Error(`No palettes for size ${size}. Available sizes: ${Object.keys(palettesBySize).join(', ')}`);
  }
  return collection;
}

/**
 * List all available palette sizes.
 *
 * @returns Array of available sizes
 */
export function listSizes(): number[] {
  return Object.keys(palettesBySize).map(Number).sort((a, b) => a - b);
}

/**
 * Get a named palette with metadata.
 *
 * @param size - Number of colors
 * @param index - Palette index
 * @returns Named palette object
 */
export function getNamedPalette(size: number, index: number = 0): NamedPalette {
  return {
    name: `c${size}[${index}]`,
    size,
    index,
    colors: getPalette(size, index),
  };
}

/**
 * Get all palettes as a flat array of named palettes.
 *
 * @returns All palettes with metadata
 */
export function listAllPalettes(): NamedPalette[] {
  const result: NamedPalette[] = [];
  for (const size of listSizes()) {
    const collection = palettesBySize[size];
    for (let i = 0; i < collection.length; i++) {
      result.push({
        name: `c${size}[${i}]`,
        size,
        index: i,
        colors: collection[i],
      });
    }
  }
  return result;
}

// ============================================================================
// Color conversion utilities
// ============================================================================

/**
 * Parse a hex color string to RGB values.
 *
 * @param hex - Hex color string (e.g., '#FF0000' or '#ff0000')
 * @returns [r, g, b] with values 0-255
 * @throws {Error} If hex is not a valid color string
 *
 * @example
 * ```ts
 * const [r, g, b] = hexToRgb('#FF0000'); // [255, 0, 0]
 * ```
 */
export function hexToRgb(hex: string): [number, number, number] {
  const match = hex.match(/^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
  if (!match) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [
    parseInt(match[1], 16),
    parseInt(match[2], 16),
    parseInt(match[3], 16),
  ];
}

/**
 * Convert RGB values to hex string.
 *
 * @param r - Red (0-255)
 * @param g - Green (0-255)
 * @param b - Blue (0-255)
 * @returns Hex color string (e.g., '#FF0000')
 *
 * @example
 * ```ts
 * const hex = rgbToHex(255, 0, 0); // '#FF0000'
 * ```
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`.toUpperCase();
}

/**
 * Parse a hex color to normalized RGB [0, 1].
 *
 * @param hex - Hex color string
 * @returns [r, g, b] with values 0-1
 */
export function hexToNormalized(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  return [r / 255, g / 255, b / 255];
}

/**
 * Convert normalized RGB [0, 1] to hex string.
 *
 * @param r - Red (0-1)
 * @param g - Green (0-1)
 * @param b - Blue (0-1)
 * @returns Hex color string
 */
export function normalizedToHex(r: number, g: number, b: number): string {
  return rgbToHex(r * 255, g * 255, b * 255);
}

/**
 * Convert a palette to normalized RGB arrays.
 *
 * @param palette - Array of hex color strings
 * @returns Array of [r, g, b] with values 0-1
 */
export function paletteToNormalized(palette: ColorPalette): Array<[number, number, number]> {
  return palette.map(hex => hexToNormalized(hex));
}

// ============================================================================
// Visualization (ported from colors.py view_colors)
// ============================================================================

/**
 * Visualize a color palette with multiple chart types.
 * Ported from cigvis Python: view_colors
 *
 * @param colors - Array of hex color strings
 * @returns Canvas element with visualization
 *
 * @example
 * ```ts
 * const canvas = viewColors(['#9392BE', '#D0E7ED', '#D5E4A8']);
 * document.body.appendChild(canvas);
 * ```
 */
export function viewColors(colors: string[]): HTMLCanvasElement {
  const n = colors.length;
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 500;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 800, 500);

  const cellW = 250;
  const cellH = 150;
  const gap = 20;

  // 1. Color Blocks
  const blockX = 20;
  const blockY = 20;
  ctx.fillStyle = '#000000';
  ctx.font = '12px sans-serif';
  ctx.fillText('Color Blocks', blockX, blockY);

  const blockW = cellW / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(blockX + i * blockW, blockY + 10, blockW, 40);
    ctx.fillStyle = '#000000';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(colors[i], blockX + i * blockW + blockW / 2, blockY + 60);
  }

  // 2. Line Plot
  const lineX = 20 + cellW + gap;
  const lineY = 20;
  ctx.fillStyle = '#000000';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Line Plot', lineX, lineY);

  for (let i = 0; i < n; i++) {
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < 10; x++) {
      const px = lineX + x * (cellW / 10);
      const py = lineY + 20 + (x + i) * 10;
      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // 3. Bar Plot
  const barX = 20;
  const barY = 20 + cellH + gap;
  ctx.fillStyle = '#000000';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Bar Plot', barX, barY);

  const barW = cellW / n;
  const maxBarH = 80;
  for (let i = 0; i < n; i++) {
    const barH = (i + 1) * (maxBarH / n);
    ctx.fillStyle = colors[i];
    ctx.fillRect(barX + i * barW, barY + 20 + maxBarH - barH, barW - 2, barH);
    ctx.fillStyle = '#000000';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${i + 1}`, barX + i * barW + barW / 2, barY + 20 + maxBarH + 12);
  }

  // 4. Scatter Plot
  const scatterX = 20 + cellW + gap;
  const scatterY = 20 + cellH + gap;
  ctx.fillStyle = '#000000';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Scatter Plot', scatterX, scatterY);

  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i];
    for (let x = 0; x < 10; x++) {
      const px = scatterX + x * (cellW / 10);
      const py = scatterY + 20 + (x + i) * 8;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. Pie Chart
  const pieX = 20 + (cellW + gap) / 2;
  const pieY = 20 + (cellH + gap) * 2 + 40;
  const pieR = 50;
  ctx.fillStyle = '#000000';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Pie Chart', pieX, pieY - pieR - 10);

  let startAngle = 0;
  const sliceAngle = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(pieX, pieY);
    ctx.arc(pieX, pieY, pieR, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();
    startAngle += sliceAngle;
  }

  // 6. Histogram
  const histX = 20 + cellW + gap + (cellW + gap) / 2;
  const histY = 20 + (cellH + gap) * 2 + 40;
  ctx.fillStyle = '#000000';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Histogram', histX, histY - 30);

  const histW = cellW / n;
  const maxHistH = 80;
  for (let i = 0; i < n; i++) {
    const histH = (i + 1) * (maxHistH / n);
    ctx.fillStyle = colors[i];
    ctx.fillRect(histX - cellW / 2 + i * histW, histY + maxHistH - histH, histW - 2, histH);
  }

  return canvas;
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a colors agent for programmatic access.
 * Provides a stable API surface for AI agents and automation.
 */
export function createColorsAgent() {
  return {
    c2, c3, c4, c5, c6, c7, c8,
    palettesBySize,
    getPalette,
    getPalettesBySize,
    listSizes,
    getNamedPalette,
    listAllPalettes,
    hexToRgb,
    rgbToHex,
    hexToNormalized,
    normalizedToHex,
    paletteToNormalized,
    viewColors,
  };
}
