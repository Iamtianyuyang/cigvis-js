/**
 * Theme and style utilities for CIGVis
 *
 * Ported from cigvis Python library (cigvis/mplstyle.py)
 * Provides theme management for canvas-based visualizations.
 *
 * @module style
 */

// ============================================================================
// Types
// ============================================================================

/** Font configuration */
export interface FontConfig {
  /** Font family */
  family: string;
  /** Font weight */
  weight?: number;
  /** Font stretch */
  stretch?: string;
  /** Font size */
  size?: number;
}

/** Theme configuration */
export interface ThemeConfig {
  /** Font family */
  fontFamily?: string;
  /** Show minor ticks */
  showMinorTicks?: boolean;
  /** Minor tick size */
  minorTickSize?: number;
  /** Major tick size */
  majorTickSize?: number;
  /** Grid enabled */
  showGrid?: boolean;
  /** Grid line style */
  gridLineStyle?: string;
  /** Grid line width */
  gridLineWidth?: number;
  /** Grid alpha */
  gridAlpha?: number;
  /** Background color */
  backgroundColor?: string;
  /** Color cycle */
  colorCycle?: string[];
}

/** Style context */
export interface StyleContext {
  /** Apply theme to canvas context */
  apply(ctx: CanvasRenderingContext2D): void;
  /** Restore previous state */
  restore(): void;
}

// ============================================================================
// Built-in themes
// ============================================================================

/** Spectrum theme - with grid and light background */
export const SPECTRUM_THEME: ThemeConfig = {
  fontFamily: 'Arial, SimHei, sans-serif',
  showMinorTicks: true,
  minorTickSize: 4,
  majorTickSize: 6,
  showGrid: true,
  gridLineStyle: '--',
  gridLineWidth: 0.8,
  gridAlpha: 0.8,
  backgroundColor: '#f2f2f2',
  colorCycle: [
    '#da7b36', '#3ec8b2', '#0b565a', '#aebf4f',
    '#ef3c29', '#fbcf48', '#f7f5c4', '#21d1cb', '#016d66',
  ],
};

/** Image theme - minimal styling for image display */
export const IMAGE_THEME: ThemeConfig = {
  fontFamily: 'Arial, SimHei, sans-serif',
  showMinorTicks: true,
  minorTickSize: 4,
  majorTickSize: 6,
  showGrid: false,
  backgroundColor: '#ffffff',
  colorCycle: [
    '#da7b36', '#3ec8b2', '#0b565a', '#aebf4f',
    '#ef3c29', '#fbcf48', '#f7f5c4', '#21d1cb', '#016d66',
  ],
};

/** Default theme */
export const DEFAULT_THEME: ThemeConfig = {
  fontFamily: 'sans-serif',
  showMinorTicks: false,
  showGrid: false,
  backgroundColor: '#ffffff',
  colorCycle: [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
    '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  ],
};

/** All built-in themes */
export const THEMES: Record<string, ThemeConfig> = {
  spectrum: SPECTRUM_THEME,
  imshow: IMAGE_THEME,
  default: DEFAULT_THEME,
};

// ============================================================================
// Font presets
// ============================================================================

/** Font presets for common font configurations */
export const FONT_PRESETS: Record<string, FontConfig> = {
  helveticaneuecondensedbold: {
    family: 'Helvetica Neue',
    weight: 700,
    stretch: 'condensed',
  },
  helveticaneuecondensedblack: {
    family: 'Helvetica Neue',
    weight: 900,
    stretch: 'condensed',
  },
  hncb: {
    family: 'Helvetica Neue',
    weight: 700,
    stretch: 'condensed',
  },
};

// ============================================================================
// Theme loading
// ============================================================================

/**
 * Load a theme and create a style context.
 *
 * @param themeName - Theme name or custom ThemeConfig
 * @returns StyleContext
 *
 * @example
 * ```ts
 * const ctx = loadTheme('spectrum');
 * ctx.apply(canvas.getContext('2d'));
 * // ... draw ...
 * ctx.restore();
 * ```
 */
export function loadTheme(themeName: string | ThemeConfig): StyleContext {
  const theme = typeof themeName === 'string'
    ? THEMES[themeName] || DEFAULT_THEME
    : themeName;

  let currentCtx: CanvasRenderingContext2D | null = null;

  return {
    apply(ctx: CanvasRenderingContext2D) {
      // Use native save/restore stack — saves ALL context state
      ctx.save();
      currentCtx = ctx;

      // Apply theme
      if (theme.fontFamily) {
        ctx.font = `12px ${theme.fontFamily}`;
      }
    },

    restore() {
      if (!currentCtx) return;
      // Native restore() recovers ALL saved state (font, strokeStyle, fillStyle,
      // lineWidth, globalAlpha, lineCap, transform, clip, etc.)
      currentCtx.restore();
      currentCtx = null;
    },
  };
}

/**
 * Get a color from the theme's color cycle.
 *
 * @param theme - Theme configuration
 * @param index - Color index
 * @returns Hex color string
 */
export function getThemeColor(theme: ThemeConfig, index: number): string {
  const cycle = theme.colorCycle || DEFAULT_THEME.colorCycle!;
  return cycle[index % cycle.length];
}

/**
 * Apply grid settings to a canvas context.
 *
 * @param ctx - Canvas 2D context
 * @param theme - Theme configuration
 * @param width - Canvas width
 * @param height - Canvas height
 */
export function applyGrid(
  ctx: CanvasRenderingContext2D,
  theme: ThemeConfig,
  width: number,
  height: number
): void {
  if (!theme.showGrid) return;

  ctx.save();
  ctx.strokeStyle = `rgba(0, 0, 0, ${theme.gridAlpha || 0.3})`;
  ctx.lineWidth = theme.gridLineWidth || 0.5;

  if (theme.gridLineStyle === '--') {
    ctx.setLineDash([5, 5]);
  } else if (theme.gridLineStyle === ':') {
    ctx.setLineDash([2, 2]);
  }

  // Draw vertical grid lines
  const numLines = 10;
  const stepX = width / numLines;
  const stepY = height / numLines;

  for (let i = 1; i < numLines; i++) {
    ctx.beginPath();
    ctx.moveTo(i * stepX, 0);
    ctx.lineTo(i * stepX, height);
    ctx.stroke();
  }

  // Draw horizontal grid lines
  for (let i = 1; i < numLines; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * stepY);
    ctx.lineTo(width, i * stepY);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Apply tick marks to axes.
 *
 * @param ctx - Canvas 2D context
 * @param theme - Theme configuration
 * @param x - X position
 * @param y - Y position
 * @param width - Width
 * @param height - Height
 */
export function applyTicks(
  ctx: CanvasRenderingContext2D,
  theme: ThemeConfig,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const majorSize = theme.majorTickSize || 6;
  const minorSize = theme.minorTickSize || 4;

  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;

  // Major ticks
  const numMajor = 5;
  const stepX = width / numMajor;
  const stepY = height / numMajor;

  for (let i = 0; i <= numMajor; i++) {
    // X axis ticks
    ctx.beginPath();
    ctx.moveTo(x + i * stepX, y + height);
    ctx.lineTo(x + i * stepX, y + height + majorSize);
    ctx.stroke();

    // Y axis ticks
    ctx.beginPath();
    ctx.moveTo(x, y + i * stepY);
    ctx.lineTo(x - majorSize, y + i * stepY);
    ctx.stroke();
  }

  // Minor ticks
  if (theme.showMinorTicks) {
    const numMinor = numMajor * 4;
    const minorStepX = width / numMinor;
    const minorStepY = height / numMinor;

    ctx.lineWidth = 0.5;

    for (let i = 0; i <= numMinor; i++) {
      if (i % 4 === 0) continue; // Skip major tick positions

      // X axis minor ticks
      ctx.beginPath();
      ctx.moveTo(x + i * minorStepX, y + height);
      ctx.lineTo(x + i * minorStepX, y + height + minorSize);
      ctx.stroke();

      // Y axis minor ticks
      ctx.beginPath();
      ctx.moveTo(x, y + i * minorStepY);
      ctx.lineTo(x - minorSize, y + i * minorStepY);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Parse a font preset string.
 *
 * @param name - Preset name
 * @returns FontConfig or undefined
 */
export function getFontPreset(name: string): FontConfig | undefined {
  return FONT_PRESETS[name.toLowerCase()];
}

/**
 * Create a custom theme.
 *
 * @param base - Base theme name or config
 * @param overrides - Partial overrides
 * @returns New ThemeConfig
 */
export function createTheme(
  base: string | ThemeConfig,
  overrides: Partial<ThemeConfig>
): ThemeConfig {
  const baseTheme = typeof base === 'string'
    ? THEMES[base] || DEFAULT_THEME
    : base;

  return { ...baseTheme, ...overrides };
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a style agent for programmatic access.
 */
export function createStyleAgent() {
  return {
    THEMES,
    FONT_PRESETS,
    loadTheme,
    getThemeColor,
    applyGrid,
    applyTicks,
    getFontPreset,
    createTheme,
  };
}
