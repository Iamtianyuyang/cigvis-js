/**
 * 2D plotting functions for CIGVis
 *
 * Ported from cigvis Python library (cigvis/mpl2dplot.py)
 * Provides 2D data visualization using Canvas API.
 *
 * @module plot2d
 */

// ============================================================================
// Types
// ============================================================================

/** Foreground layer types */
export type ForegroundType = 'image' | 'line' | 'marker' | 'annotate';

/** Image foreground options */
export interface ImageForeground {
  type: 'image';
  data: Float32Array;
  width: number;
  height: number;
  cmap?: string;
  clim?: [number, number];
  alpha?: number;
  interpolation?: 'nearest' | 'bicubic';
}

/** Line foreground options */
export interface LineForeground {
  type: 'line';
  x: Float32Array;
  y: Float32Array;
  color?: string;
  alpha?: number;
  lineWidth?: number;
  label?: string;
  marker?: string;
  lineStyle?: string;
  markerSize?: number;
}

/** Marker foreground options */
export interface MarkerForeground {
  type: 'marker';
  x: Float32Array;
  y: Float32Array;
  size?: number;
  color?: string | Float32Array;
  marker?: string;
  cmap?: string;
  vmin?: number;
  vmax?: number;
  alpha?: number;
}

/** Annotation foreground options */
export interface AnnotateForeground {
  type: 'annotate';
  x: Float32Array;
  y: Float32Array;
  text: string[];
  offsetX?: number;
  offsetY?: number;
}

/** Combined foreground options */
export type Foreground = ImageForeground | LineForeground | MarkerForeground | AnnotateForeground;

/** 2D plot options */
export interface Plot2DOptions {
  /** Background image data [height, width] */
  image: Float32Array;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** Foreground layers */
  foreground?: Foreground[];
  /** Colormap for background */
  cmap?: string;
  /** Color limits [vmin, vmax] */
  clim?: [number, number];
  /** Interpolation method */
  interpolation?: 'nearest' | 'bicubic';

  /** Canvas width */
  canvasWidth?: number;
  /** Canvas height */
  canvasHeight?: number;
  /** Title */
  title?: string;
  /** X axis label */
  xlabel?: string;
  /** Y axis label */
  ylabel?: string;

  /** Aspect ratio: 'equal', 'auto', or number */
  aspect?: 'equal' | 'auto' | number;
  /** Hide axes */
  axisOff?: boolean;
  /** X axis sampling [start, step] */
  xsample?: [number, number];
  /** Y axis sampling [start, step] */
  ysample?: [number, number];

  /** Show colorbar with this label */
  colorbar?: string;
  /** Discrete colorbar */
  discrete?: boolean;
  /** Tick labels for discrete colorbar */
  tickLabels?: string[];

  /** Show legend */
  showLegend?: boolean;

  /** Background color */
  backgroundColor?: string;
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Create a canvas element.
 */
function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Get 2D context with default settings.
 */
function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  return ctx;
}

/**
 * Apply colormap to data and return ImageData.
 */
function applyColormapToData(
  data: Float32Array,
  width: number,
  height: number,
  cmap: string,
  clim: [number, number]
): ImageData {
  // Built-in colormaps (simplified)
  const colormaps: Record<string, (t: number) => [number, number, number]> = {
    gray: (t) => [t * 255, t * 255, t * 255],
    jet: (t) => {
      const r = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 3)));
      const g = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 2)));
      const b = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 1)));
      return [r * 255, g * 255, b * 255];
    },
    hot: (t) => {
      const r = Math.min(1, t * 3);
      const g = Math.min(1, Math.max(0, t * 3 - 1));
      const b = Math.min(1, Math.max(0, t * 3 - 2));
      return [r * 255, g * 255, b * 255];
    },
    viridis: (t) => {
      const r = Math.min(1, Math.max(0, 0.267 + t * (0.004 + t * (0.322 + t * (-0.635 + t * 0.374)))));
      const g = Math.min(1, Math.max(0, 0.004 + t * (0.538 + t * (0.745 + t * (-1.225 + t * 0.567)))));
      const b = Math.min(1, Math.max(0, 0.329 + t * (1.378 + t * (-2.067 + t * (1.308 + t * (-0.398))))));
      return [r * 255, g * 255, b * 255];
    },
  };

  const cmapFn = colormaps[cmap] || colormaps.gray;
  const imageData = new ImageData(width, height);
  const [vmin, vmax] = clim;
  const range = vmax - vmin || 1;

  for (let i = 0; i < width * height; i++) {
    let t = (data[i] - vmin) / range;
    t = Math.max(0, Math.min(1, t));

    const [r, g, b] = cmapFn(t);
    imageData.data[i * 4] = r;
    imageData.data[i * 4 + 1] = g;
    imageData.data[i * 4 + 2] = b;
    imageData.data[i * 4 + 3] = 255;
  }

  return imageData;
}

// ============================================================================
// Main plot function
// ============================================================================

/**
 * Plot a 2D image with optional foreground layers.
 *
 * @param options - Plot options
 * @returns Canvas element
 *
 * @example
 * ```ts
 * const canvas = plot2D({
 *   image: sliceData,
 *   width: 200,
 *   height: 192,
 *   cmap: 'gray',
 *   clim: [-1, 1],
 *   title: 'Inline Slice',
 * });
 * document.body.appendChild(canvas);
 * ```
 */
export function plot2D(options: Plot2DOptions): HTMLCanvasElement {
  const {
    image,
    width,
    height,
    foreground = [],
    cmap = 'gray',
    clim,
    interpolation = 'nearest',
    canvasWidth = 800,
    canvasHeight = 600,
    title,
    xlabel,
    ylabel,
    aspect = 'equal',
    axisOff = false,
    xsample,
    ysample,
    colorbar,
    discrete = false,
    tickLabels,
    showLegend = false,
    backgroundColor = '#ffffff',
  } = options;

  // Calculate plot dimensions
  const margin = { top: 50, right: colorbar ? 100 : 30, bottom: 50, left: 60 };
  const plotWidth = canvasWidth - margin.left - margin.right;
  const plotHeight = canvasHeight - margin.top - margin.bottom;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = getContext(canvas);

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Calculate aspect ratio
  let scaleX = plotWidth / width;
  let scaleY = plotHeight / height;

  if (aspect === 'equal') {
    const scale = Math.min(scaleX, scaleY);
    scaleX = scale;
    scaleY = scale;
  } else if (typeof aspect === 'number') {
    scaleY = scaleX * aspect;
  }

  const drawWidth = width * scaleX;
  const drawHeight = height * scaleY;
  const offsetX = margin.left + (plotWidth - drawWidth) / 2;
  const offsetY = margin.top + (plotHeight - drawHeight) / 2;

  // Apply colormap to background image
  const finalClim: [number, number] = clim || [
    Math.min(...image),
    Math.max(...image),
  ];

  const imageData = applyColormapToData(image, width, height, cmap, finalClim);

  // Create temporary canvas for image
  const tempCanvas = createCanvas(width, height);
  const tempCtx = getContext(tempCanvas);
  tempCtx.putImageData(imageData, 0, 0);

  // Draw background image
  if (interpolation === 'nearest') {
    ctx.imageSmoothingEnabled = false;
  } else {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  ctx.drawImage(tempCanvas, offsetX, offsetY, drawWidth, drawHeight);

  // Draw foreground layers
  for (const layer of foreground) {
    switch (layer.type) {
      case 'image':
        drawImageForeground(ctx, layer, offsetX, offsetY, scaleX, scaleY);
        break;
      case 'line':
        drawLineForeground(ctx, layer, offsetX, offsetY, scaleX, scaleY);
        break;
      case 'marker':
        drawMarkerForeground(ctx, layer, offsetX, offsetY, scaleX, scaleY);
        break;
      case 'annotate':
        drawAnnotateForeground(ctx, layer, offsetX, offsetY, scaleX, scaleY);
        break;
    }
  }

  // Draw axes
  if (!axisOff) {
    drawAxes(ctx, width, height, offsetX, offsetY, drawWidth, drawHeight, xsample, ysample);
  }

  // Draw title
  if (title) {
    ctx.fillStyle = '#000000';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvasWidth / 2, 25);
  }

  // Draw axis labels
  if (xlabel && !axisOff) {
    ctx.fillStyle = '#000000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(xlabel, canvasWidth / 2, canvasHeight - 10);
  }

  if (ylabel && !axisOff) {
    ctx.fillStyle = '#000000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(15, canvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(ylabel, 0, 0);
    ctx.restore();
  }

  // Draw colorbar
  if (colorbar !== undefined) {
    drawColorbar(ctx, cmap, finalClim, canvasWidth - margin.right + 10, margin.top, 20, drawHeight, colorbar, discrete, tickLabels);
  }

  // Draw legend
  if (showLegend) {
    drawLegend(ctx, foreground, canvasWidth - margin.right - 100, margin.top + 10);
  }

  return canvas;
}

// ============================================================================
// Drawing helpers
// ============================================================================

function drawImageForeground(
  ctx: CanvasRenderingContext2D,
  layer: ImageForeground,
  offsetX: number,
  offsetY: number,
  scaleX: number,
  scaleY: number
): void {
  const clim = layer.clim || [Math.min(...layer.data), Math.max(...layer.data)];
  const imageData = applyColormapToData(layer.data, layer.width, layer.height, layer.cmap || 'gray', clim);

  const tempCanvas = createCanvas(layer.width, layer.height);
  const tempCtx = getContext(tempCanvas);
  tempCtx.putImageData(imageData, 0, 0);

  ctx.globalAlpha = layer.alpha ?? 1;
  ctx.drawImage(tempCanvas, offsetX, offsetY, layer.width * scaleX, layer.height * scaleY);
  ctx.globalAlpha = 1;
}

function drawLineForeground(
  ctx: CanvasRenderingContext2D,
  layer: LineForeground,
  offsetX: number,
  offsetY: number,
  scaleX: number,
  scaleY: number
): void {
  ctx.beginPath();
  ctx.strokeStyle = layer.color || '#000000';
  ctx.lineWidth = layer.lineWidth || 1;
  ctx.globalAlpha = layer.alpha ?? 1;

  if (layer.lineStyle === 'dashed') {
    ctx.setLineDash([5, 5]);
  } else if (layer.lineStyle === 'dotted') {
    ctx.setLineDash([2, 2]);
  }

  for (let i = 0; i < layer.x.length; i++) {
    const x = offsetX + layer.x[i] * scaleX;
    const y = offsetY + layer.y[i] * scaleY;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawMarkerForeground(
  ctx: CanvasRenderingContext2D,
  layer: MarkerForeground,
  offsetX: number,
  offsetY: number,
  scaleX: number,
  scaleY: number
): void {
  const size = layer.size || 5;
  ctx.globalAlpha = layer.alpha ?? 1;

  for (let i = 0; i < layer.x.length; i++) {
    const x = offsetX + layer.x[i] * scaleX;
    const y = offsetY + layer.y[i] * scaleY;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);

    if (typeof layer.color === 'string') {
      ctx.fillStyle = layer.color;
    } else if (layer.color instanceof Float32Array) {
      // Use colormap
      const t = layer.color[i];
      ctx.fillStyle = `rgb(${t * 255}, ${t * 255}, ${t * 255})`;
    } else {
      ctx.fillStyle = '#000000';
    }

    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawAnnotateForeground(
  ctx: CanvasRenderingContext2D,
  layer: AnnotateForeground,
  offsetX: number,
  offsetY: number,
  scaleX: number,
  scaleY: number
): void {
  ctx.fillStyle = '#000000';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';

  const ox = layer.offsetX || 5;
  const oy = layer.offsetY || 5;

  for (let i = 0; i < layer.x.length; i++) {
    const x = offsetX + layer.x[i] * scaleX + ox;
    const y = offsetY + layer.y[i] * scaleY + oy;
    ctx.fillText(layer.text[i], x, y);
  }
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  dataWidth: number,
  dataHeight: number,
  offsetX: number,
  offsetY: number,
  drawWidth: number,
  drawHeight: number,
  xsample?: [number, number],
  ysample?: [number, number]
): void {
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;

  // X axis
  ctx.beginPath();
  ctx.moveTo(offsetX, offsetY + drawHeight);
  ctx.lineTo(offsetX + drawWidth, offsetY + drawHeight);
  ctx.stroke();

  // Y axis
  ctx.beginPath();
  ctx.moveTo(offsetX, offsetY);
  ctx.lineTo(offsetX, offsetY + drawHeight);
  ctx.stroke();

  // X ticks
  const xStep = xsample ? xsample[1] : 1;
  const xStart = xsample ? xsample[0] : 0;
  const numXTicks = Math.min(10, dataWidth);
  const xTickStep = dataWidth / numXTicks;

  ctx.fillStyle = '#000000';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';

  for (let i = 0; i <= numXTicks; i++) {
    const x = offsetX + i * xTickStep * scaleX(dataWidth, drawWidth);
    const value = xStart + i * xTickStep * xStep;

    ctx.beginPath();
    ctx.moveTo(x, offsetY + drawHeight);
    ctx.lineTo(x, offsetY + drawHeight + 5);
    ctx.stroke();

    ctx.fillText(value.toFixed(1), x, offsetY + drawHeight + 15);
  }

  // Y ticks
  const yStep = ysample ? ysample[1] : 1;
  const yStart = ysample ? ysample[0] : 0;
  const numYTicks = Math.min(10, dataHeight);
  const yTickStep = dataHeight / numYTicks;

  ctx.textAlign = 'right';

  for (let i = 0; i <= numYTicks; i++) {
    const y = offsetY + i * yTickStep * scaleY(dataHeight, drawHeight);
    const value = yStart + i * yTickStep * yStep;

    ctx.beginPath();
    ctx.moveTo(offsetX, y);
    ctx.lineTo(offsetX - 5, y);
    ctx.stroke();

    ctx.fillText(value.toFixed(1), offsetX - 8, y + 3);
  }
}

function scaleX(dataWidth: number, drawWidth: number): number {
  return drawWidth / dataWidth;
}

function scaleY(dataHeight: number, drawHeight: number): number {
  return drawHeight / dataHeight;
}

function drawColorbar(
  ctx: CanvasRenderingContext2D,
  cmap: string,
  clim: [number, number],
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  discrete: boolean,
  tickLabels?: string[]
): void {
  // Draw gradient
  const steps = 100;
  const stepHeight = height / steps;

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r = Math.round(t * 255);
    const g = Math.round(t * 255);
    const b = Math.round(t * 255);

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y + i * stepHeight, width, stepHeight + 1);
  }

  // Draw border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  // Draw ticks
  const numTicks = 5;
  ctx.fillStyle = '#000000';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';

  for (let i = 0; i <= numTicks; i++) {
    const t = i / numTicks;
    const value = clim[0] + t * (clim[1] - clim[0]);
    const yPos = y + t * height;

    ctx.beginPath();
    ctx.moveTo(x + width, yPos);
    ctx.lineTo(x + width + 3, yPos);
    ctx.stroke();

    ctx.fillText(value.toFixed(2), x + width + 5, yPos + 3);
  }

  // Draw label
  if (label) {
    ctx.save();
    ctx.translate(x + width + 40, y + height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  foreground: Foreground[],
  x: number,
  y: number
): void {
  const lineLayers = foreground.filter(f => f.type === 'line' && f.label) as LineForeground[];

  if (lineLayers.length === 0) return;

  // Draw legend background
  const legendHeight = lineLayers.length * 20 + 10;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillRect(x, y, 100, legendHeight);
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(x, y, 100, legendHeight);

  // Draw legend items
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';

  for (let i = 0; i < lineLayers.length; i++) {
    const layer = lineLayers[i];
    const itemY = y + 15 + i * 20;

    // Draw line sample
    ctx.beginPath();
    ctx.strokeStyle = layer.color || '#000000';
    ctx.lineWidth = layer.lineWidth || 1;
    ctx.moveTo(x + 5, itemY);
    ctx.lineTo(x + 25, itemY);
    ctx.stroke();

    // Draw label
    ctx.fillStyle = '#000000';
    ctx.fillText(layer.label || '', x + 30, itemY + 3);
  }
}

// ============================================================================
// Helper functions (ported from mpl2dplot.py)
// ============================================================================

/**
 * Create foreground image arguments.
 * Ported from cigvis Python: fg_image_args
 */
export function fgImageArgs(
  data: Float32Array,
  width: number,
  height: number,
  options: {
    cmap?: string;
    clim?: [number, number];
    alpha?: number;
    interpolation?: 'nearest' | 'bicubic';
    showColorbar?: boolean;
  } = {}
): ImageForeground {
  const {
    cmap = 'jet',
    clim,
    alpha = 1.0,
    interpolation = 'bicubic',
  } = options;

  // Compute clim if not provided
  const finalClim: [number, number] = clim || (() => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    return [min, max] as [number, number];
  })();

  return {
    type: 'image',
    data,
    width,
    height,
    cmap,
    clim: finalClim,
    alpha,
    interpolation,
  };
}

/**
 * Create line arguments.
 * Ported from cigvis Python: line_args
 */
export function lineArgs(
  x: Float32Array,
  y: Float32Array,
  options: {
    color?: string;
    alpha?: number;
    lineWidth?: number;
    label?: string;
    marker?: string;
    lineStyle?: string;
    markerSize?: number;
  } = {}
): LineForeground {
  const {
    color = '#1f77b4',
    alpha = 1.0,
    lineWidth = 1,
    label = '',
    marker = '',
    lineStyle = 'solid',
    markerSize = 6,
  } = options;

  return {
    type: 'line',
    x,
    y,
    color,
    alpha,
    lineWidth,
    label,
    marker,
    lineStyle,
    markerSize,
  };
}

/**
 * Create marker arguments.
 * Ported from cigvis Python: marker_args
 */
export function markerArgs(
  x: Float32Array,
  y: Float32Array,
  options: {
    size?: number;
    color?: string | Float32Array;
    marker?: string;
    cmap?: string;
    vmin?: number;
    vmax?: number;
    alpha?: number;
  } = {}
): MarkerForeground {
  const {
    size = 20,
    color = '#1f77b4',
    marker = 'o',
    cmap = 'jet',
    alpha = 1.0,
  } = options;

  return {
    type: 'marker',
    x,
    y,
    size,
    color,
    marker,
    cmap,
    alpha,
  };
}

/**
 * Create annotate arguments.
 * Ported from cigvis Python: annotate_args
 */
export function annotateArgs(
  x: Float32Array,
  y: Float32Array,
  text: string[],
  options: {
    offsetX?: number;
    offsetY?: number;
  } = {}
): AnnotateForeground {
  const { offsetX = 1, offsetY = 1 } = options;

  return {
    type: 'annotate',
    x,
    y,
    text,
    offsetX,
    offsetY,
  };
}

/**
 * Check if data is discrete (few unique values).
 * Ported from cigvis Python: _check_is_disceret
 */
export function isDiscrete(data: Float32Array, threshold: number = 20): boolean {
  const sampleSize = Math.max(1, Math.floor(data.length * 0.01));
  const step = Math.max(1, Math.floor(data.length / sampleSize));

  const unique = new Set<number>();
  for (let i = 0; i < data.length; i += step) {
    unique.add(data[i]);
    if (unique.size > threshold) return false;
  }

  return true;
}

/**
 * Create discrete colorbar data.
 * Ported from cigvis Python: discrete_cbar
 */
export function discreteColorbar(
  data: Float32Array,
  cmap: string,
  clim: [number, number],
  options: {
    tickLabels?: string[];
    removeTransparent?: boolean;
  } = {}
): { values: number[]; ticks: number[]; tickLabels: string[] } {
  const { tickLabels, removeTransparent = true } = options;

  if (!isDiscrete(data)) {
    throw new Error('Data is not discrete. Use discrete=false or provide discrete data.');
  }

  const uniqueValues = Array.from(new Set(data)).sort((a, b) => a - b);
  const ticks = uniqueValues.map((_, i) => i);

  return {
    values: uniqueValues,
    ticks,
    tickLabels: tickLabels || uniqueValues.map(v => v.toString()),
  };
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a 2D plotting agent for programmatic access.
 */
export function createPlot2DAgent() {
  return {
    plot2D,
    fgImageArgs,
    lineArgs,
    markerArgs,
    annotateArgs,
    isDiscrete,
    discreteColorbar,
  };
}
