/**
 * 1D plotting functions for CIGVis
 *
 * Ported from cigvis Python library (cigvis/mpl1dplot.py)
 * Provides 1D data visualization using Canvas API.
 *
 * @module plot1d
 */

// ============================================================================
// Types
// ============================================================================

/** Plot orientation */
export type Orientation = 'v' | 'h';

/** 1D plot options */
export interface Plot1DOptions {
  /** Data to plot */
  data: Float32Array;
  /** Sampling interval */
  dt?: number;
  /** Begin sampling value */
  beg?: number;
  /** Orientation: 'v' for vertical, 'h' for horizontal */
  orient?: Orientation;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Title */
  title?: string;
  /** Sampling axis label */
  axisLabel?: string;
  /** Value axis label */
  valueLabel?: string;
  /** Fill threshold above (0-1) */
  fillUp?: number;
  /** Fill threshold below (0-1) */
  fillDown?: number;
  /** Fill color */
  fillColor?: string;
  /** Line color */
  color?: string;
  /** Line width */
  lineWidth?: number;
  /** Background color */
  backgroundColor?: string;
}

/** Multi-trace plot options */
export interface PlotMultiTracesOptions {
  /** Data matrix [h, nTraces] */
  data: Float32Array;
  /** Number of traces */
  nTraces: number;
  /** Number of samples per trace */
  nSamples: number;
  /** Sampling interval */
  dt?: number;
  /** Begin sampling value */
  beg?: number;
  /** Trace spacing (0-1, 1 = no overlap) */
  inter?: number;
  /** Line color */
  color?: string;
  /** Fill threshold above */
  fillUp?: number;
  /** Fill threshold below */
  fillDown?: number;
  /** Fill color */
  fillColor?: string;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** X axis label */
  xlabel?: string;
  /** Y axis label */
  ylabel?: string;
  /** Line width */
  lineWidth?: number;
}

/** Fill plot options */
export interface PlotWithFillOptions {
  /** Y values */
  y: Float32Array;
  /** X values (optional, defaults to indices) */
  x?: Float32Array;
  /** Second Y boundary (number, 'min', 'max', or array) */
  y2?: number | 'min' | 'max' | Float32Array;
  /** Values for coloring (array, 'y', or 'x') */
  v?: Float32Array | 'y' | 'x';
  /** Colormap name */
  cmap?: string;
  /** Orientation */
  orient?: Orientation;
  /** X axis label */
  xlabel?: string;
  /** Y axis label */
  ylabel?: string;
  /** Title */
  title?: string;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
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
 * Map data to pixel coordinates.
 */
function mapToPixels(
  data: Float32Array,
  min: number,
  max: number,
  pixelMin: number,
  pixelMax: number
): Float32Array {
  const result = new Float32Array(data.length);
  const range = max - min || 1;
  const pixelRange = pixelMax - pixelMin;

  for (let i = 0; i < data.length; i++) {
    result[i] = pixelMin + ((data[i] - min) / range) * pixelRange;
  }

  return result;
}

// ============================================================================
// Single trace plot
// ============================================================================

/**
 * Plot a single 1D trace.
 *
 * @param options - Plot options
 * @returns Canvas element
 *
 * @example
 * ```ts
 * const canvas = plot1D({
 *   data: new Float32Array([1, 2, 3, 2, 1]),
 *   dt: 0.002,
 *   title: 'Seismic Trace',
 * });
 * document.body.appendChild(canvas);
 * ```
 */
export function plot1D(options: Plot1DOptions): HTMLCanvasElement {
  const {
    data,
    dt = 1,
    beg = 0,
    orient = 'v',
    width = 200,
    height = 800,
    title,
    axisLabel,
    valueLabel,
    fillUp,
    fillDown,
    fillColor = '#1f77b4',
    color = '#1f77b4',
    lineWidth = 1,
    backgroundColor = '#ffffff',
  } = options;

  const canvas = createCanvas(
    orient === 'v' ? width : height,
    orient === 'v' ? height : width
  );
  const ctx = getContext(canvas);

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Calculate sampling array
  const sampling = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    sampling[i] = beg + i * dt;
  }

  // Data range
  let dataMin = Infinity, dataMax = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < dataMin) dataMin = data[i];
    if (data[i] > dataMax) dataMax = data[i];
  }

  // Plot margins
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };
  const plotWidth = canvas.width - margin.left - margin.right;
  const plotHeight = canvas.height - margin.top - margin.bottom;

  // Map data to pixels
  const pixelData = orient === 'v'
    ? mapToPixels(data, dataMin, dataMax, margin.left, margin.left + plotWidth)
    : mapToPixels(data, dataMin, dataMax, margin.top + plotHeight, margin.top);

  const pixelSampling = orient === 'v'
    ? mapToPixels(sampling, sampling[0], sampling[sampling.length - 1], margin.top, margin.top + plotHeight)
    : mapToPixels(sampling, sampling[0], sampling[sampling.length - 1], margin.left, margin.left + plotWidth);

  // Draw line
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  for (let i = 0; i < data.length; i++) {
    const x = orient === 'v' ? pixelData[i] : pixelSampling[i];
    const y = orient === 'v' ? pixelSampling[i] : pixelData[i];

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Draw fill
  if (fillUp !== undefined || fillDown !== undefined) {
    drawFill(ctx, data, pixelData, pixelSampling, orient, fillUp, fillDown, fillColor, margin, plotWidth, plotHeight);
  }

  // Draw title
  if (title) {
    ctx.fillStyle = '#000000';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 20);
  }

  // Draw axis labels
  if (axisLabel) {
    ctx.fillStyle = '#000000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    if (orient === 'v') {
      ctx.fillText(axisLabel, canvas.width / 2, canvas.height - 10);
    } else {
      ctx.save();
      ctx.translate(15, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(axisLabel, 0, 0);
      ctx.restore();
    }
  }

  if (valueLabel) {
    ctx.fillStyle = '#000000';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    if (orient === 'v') {
      ctx.save();
      ctx.translate(15, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(valueLabel, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(valueLabel, canvas.width / 2, canvas.height - 10);
    }
  }

  return canvas;
}

/**
 * Draw fill regions.
 */
function drawFill(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  pixelData: Float32Array,
  pixelSampling: Float32Array,
  orient: Orientation,
  fillUp: number | undefined,
  fillDown: number | undefined,
  fillColor: string,
  margin: { top: number; right: number; bottom: number; left: number },
  plotWidth: number,
  plotHeight: number
): void {
  // Calculate mean
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  const mean = sum / data.length;

  // Calculate range
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i];
    if (data[i] > max) max = data[i];
  }
  const range = max - min;

  ctx.fillStyle = fillColor;
  ctx.globalAlpha = 0.3;

  if (fillDown !== undefined) {
    const threshold = mean - (range / 2) * fillDown;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      if (data[i] < threshold) {
        const x = orient === 'v' ? pixelData[i] : pixelSampling[i];
        const y = orient === 'v' ? pixelSampling[i] : pixelData[i];

        if (i === 0 || data[i - 1] >= threshold) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.fill();
  }

  if (fillUp !== undefined) {
    const threshold = mean + (range / 2) * fillUp;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      if (data[i] > threshold) {
        const x = orient === 'v' ? pixelData[i] : pixelSampling[i];
        const y = orient === 'v' ? pixelSampling[i] : pixelData[i];

        if (i === 0 || data[i - 1] <= threshold) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}

// ============================================================================
// Multi-trace plot
// ============================================================================

/**
 * Plot multiple traces side by side.
 *
 * @param options - Plot options
 * @returns Canvas element
 *
 * @example
 * ```ts
 * const canvas = plotMultiTraces({
 *   data: traceData,
 *   nTraces: 10,
 *   nSamples: 1000,
 *   dt: 0.002,
 * });
 * ```
 */
export function plotMultiTraces(options: PlotMultiTracesOptions): HTMLCanvasElement {
  const {
    data,
    nTraces,
    nSamples,
    dt = 0.002,
    beg = 0,
    inter = 1.0,
    color = 'black',
    fillUp,
    fillDown,
    fillColor = 'black',
    width = 800,
    height = 600,
    xlabel = 'Trace number',
    ylabel = 'Time / s',
    lineWidth = 1,
  } = options;

  const canvas = createCanvas(width, height);
  const ctx = getContext(canvas);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Calculate data range
  let dataMin = Infinity, dataMax = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < dataMin) dataMin = data[i];
    if (data[i] > dataMax) dataMax = data[i];
  }
  const range = dataMax - dataMin || 1;

  // Plot margins
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };
  const plotWidth = canvas.width - margin.left - margin.right;
  const plotHeight = canvas.height - margin.top - margin.bottom;

  // Trace spacing
  const spacing = 1 - inter;
  const traceWidth = plotWidth / nTraces;

  // Draw each trace
  let prevMax = 0;
  const tickPos: number[] = [];

  for (let t = 0; t < nTraces; t++) {
    const traceData = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; i++) {
      traceData[i] = data[i * nTraces + t];
    }

    // Normalize and offset
    const normalized = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; i++) {
      normalized[i] = ((traceData[i] - dataMin) / range) + prevMax;
    }

    // Calculate mean position for tick
    let mean = 0;
    for (let i = 0; i < nSamples; i++) mean += normalized[i];
    mean /= nSamples;
    tickPos.push(mean);

    // Draw trace
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    for (let i = 0; i < nSamples; i++) {
      const x = margin.left + normalized[i] * traceWidth;
      const y = margin.top + (i / (nSamples - 1)) * plotHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Update prevMax for next trace
    let maxNorm = 0;
    for (let i = 0; i < nSamples; i++) {
      if (normalized[i] > maxNorm) maxNorm = normalized[i];
    }
    prevMax = maxNorm - spacing;
  }

  // Draw labels
  ctx.fillStyle = '#000000';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(xlabel, canvas.width / 2, 20);

  ctx.save();
  ctx.translate(15, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(ylabel, 0, 0);
  ctx.restore();

  return canvas;
}

// ============================================================================
// Fill plot
// ============================================================================

/**
 * Plot a filled curve.
 *
 * @param options - Plot options
 * @returns Canvas element
 *
 * @example
 * ```ts
 * const canvas = plotWithFill({
 *   y: gammaRayData,
 *   x: depthData,
 *   orient: 'v',
 *   cmap: 'jet',
 * });
 * ```
 */
export function plotWithFill(options: PlotWithFillOptions): HTMLCanvasElement {
  const {
    y,
    x,
    y2 = 'min',
    v,
    orient = 'h',
    xlabel = '',
    ylabel = '',
    title = '',
    width = 800,
    height = 200,
  } = options;

  const canvas = createCanvas(
    orient === 'h' ? width : height,
    orient === 'h' ? height : width
  );
  const ctx = getContext(canvas);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Generate x if not provided
  const xData = x || new Float32Array(y.length).map((_, i) => i);

  // Calculate y2 boundary
  let y2Data: Float32Array;
  if (typeof y2 === 'string') {
    const val = y2 === 'min'
      ? Math.min(...y)
      : Math.max(...y);
    y2Data = new Float32Array(y.length).fill(val);
  } else if (typeof y2 === 'number') {
    y2Data = new Float32Array(y.length).fill(y2);
  } else {
    y2Data = y2;
  }

  // Data ranges
  let xMin = Infinity, xMax = -Infinity;
  let yMin = Infinity, yMax = -Infinity;

  for (let i = 0; i < y.length; i++) {
    if (xData[i] < xMin) xMin = xData[i];
    if (xData[i] > xMax) xMax = xData[i];
    if (y[i] < yMin) yMin = y[i];
    if (y[i] > yMax) yMax = y[i];
    if (y2Data[i] < yMin) yMin = y2Data[i];
    if (y2Data[i] > yMax) yMax = y2Data[i];
  }

  // Plot margins
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };
  const plotWidth = canvas.width - margin.left - margin.right;
  const plotHeight = canvas.height - margin.top - margin.bottom;

  // Map to pixels
  const mapX = (val: number) => margin.left + ((val - xMin) / (xMax - xMin || 1)) * plotWidth;
  const mapY = (val: number) => margin.top + ((val - yMin) / (yMax - yMin || 1)) * plotHeight;

  // Draw filled region
  ctx.beginPath();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;

  if (orient === 'h') {
    // Draw upper boundary
    for (let i = 0; i < y.length; i++) {
      const px = mapX(xData[i]);
      const py = mapY(y[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    // Draw lower boundary (reverse)
    for (let i = y.length - 1; i >= 0; i--) {
      const px = mapX(xData[i]);
      const py = mapY(y2Data[i]);
      ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.fillStyle = 'rgba(31, 119, 180, 0.3)';
    ctx.fill();
    ctx.stroke();
  } else {
    // Vertical orientation
    for (let i = 0; i < y.length; i++) {
      const px = mapX(y[i]);
      const py = mapY(xData[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    for (let i = y.length - 1; i >= 0; i--) {
      const px = mapX(y2Data[i]);
      const py = mapY(xData[i]);
      ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.fillStyle = 'rgba(31, 119, 180, 0.3)';
    ctx.fill();
    ctx.stroke();
  }

  // Draw title
  if (title) {
    ctx.fillStyle = '#000000';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 20);
  }

  // Draw labels
  ctx.fillStyle = '#000000';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';

  if (orient === 'h') {
    ctx.fillText(xlabel, canvas.width / 2, canvas.height - 10);
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(ylabel, 0, 0);
    ctx.restore();
  } else {
    ctx.fillText(ylabel, canvas.width / 2, canvas.height - 10);
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(xlabel, 0, 0);
    ctx.restore();
  }

  return canvas;
}

// ============================================================================
// Signal comparison plot (ported from mpl1dplot.py)
// ============================================================================

/**
 * Plot signal comparison for seismic data.
 * Ported from cigvis Python: plot_signal_compare
 *
 * @param data - 3D array [nStations, 3, nSamples] (3 components)
 * @param options - Optional parameters
 * @returns Canvas element
 *
 * @example
 * ```ts
 * const canvas = plotSignalCompare(seismicData, {
 *   ntstart: 0,
 *   ntend: 6144,
 * });
 * ```
 */
export function plotSignalCompare(
  data: Float32Array,
  shape: [number, number, number],
  options: {
    offsetDf?: Float32Array;
    offsetIndex?: Uint32Array;
    withOffset?: boolean;
    ntstart?: number;
    ntend?: number;
    width?: number;
    height?: number;
  } = {}
): HTMLCanvasElement {
  const {
    offsetDf,
    offsetIndex,
    withOffset = false,
    ntstart = 0,
    ntend = 6144,
    width = 800,
    height = 400,
  } = options;

  const [nStations, nComponents, nSamples] = shape;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Clear
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Plot margins
  const margin = { left: 60, right: 20, top: 20, bottom: 40 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Calculate scale
  const scale = 10;
  const timeRange = ntend - ntstart;
  const dt = 0.01;

  // Draw traces
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 0.5;

  if (!withOffset) {
    // Without offset
    for (let j = 0; j < nStations; j++) {
      for (let comp = 0; comp < nComponents; comp++) {
        ctx.beginPath();
        for (let i = 0; i < nSamples; i++) {
          const t = ntstart / 100 + i * dt;
          const x = margin.left + (t / (ntend / 100)) * plotW;
          const value = data[j * nComponents * nSamples + comp * nSamples + i];
          const y = margin.top + (j * scale + value) * (plotH / (nStations * scale));

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  } else {
    // With offset
    if (!offsetDf || !offsetIndex) {
      throw new Error('offsetDf and offsetIndex required when withOffset=true');
    }

    for (let j = 0; j < nStations; j++) {
      const idx = offsetIndex[j];
      const offset = offsetDf[j];

      for (let comp = 0; comp < nComponents; comp++) {
        ctx.beginPath();
        for (let i = 0; i < nSamples; i++) {
          const t = ntstart / 100 + i * dt;
          const x = margin.left + (t / (ntend / 100)) * plotW;
          const value = data[idx * nComponents * nSamples + comp * nSamples + i];
          const y = margin.top + (offset + value) * (plotH / (offsetDf[nStations - 1] - offsetDf[0]));

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }

  // Draw axes
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.lineTo(width - margin.right, height - margin.bottom);
  ctx.stroke();

  // X axis labels
  ctx.fillStyle = '#000000';
  ctx.font = '12px Times New Roman';
  ctx.textAlign = 'center';
  ctx.fillText('Time (s)', width / 2, height - 5);

  // X ticks
  const xTicks = [];
  for (let t = 0; t <= 64; t += 5) {
    xTicks.push(t);
  }
  for (const t of xTicks) {
    const x = margin.left + (t / 64) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, height - margin.bottom);
    ctx.lineTo(x, height - margin.bottom + 5);
    ctx.stroke();
    ctx.fillText(t.toString(), x, height - margin.bottom + 15);
  }

  // Y axis label
  ctx.save();
  ctx.translate(15, margin.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText(withOffset ? 'Offset (km)' : 'Station', 0, 0);
  ctx.restore();

  // Minor ticks
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < nStations; i++) {
    const y = margin.top + i * scale * (plotH / (nStations * scale));
    ctx.beginPath();
    ctx.moveTo(margin.left - 2, y);
    ctx.lineTo(margin.left, y);
    ctx.stroke();
  }

  return canvas;
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a 1D plotting agent for programmatic access.
 */
export function createPlot1DAgent() {
  return {
    plot1D,
    plotMultiTraces,
    plotWithFill,
    plotSignalCompare,
  };
}
