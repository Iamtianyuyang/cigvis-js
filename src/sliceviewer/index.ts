/**
 * Slice viewer for CIGVis
 *
 * Ported from cigvis Python library (cigvis/sliceviewer/)
 * Provides interactive 2D slice viewing with Canvas API.
 *
 * @module sliceviewer
 */

// ============================================================================
// Types
// ============================================================================

/** Slice viewer options */
export interface SliceViewerOptions {
  /** Container element */
  container: HTMLElement;
  /** Volume data */
  data: Float32Array;
  /** Volume shape [ni, nx, nt] */
  shape: [number, number, number];
  /** Initial axis */
  axis?: 'x' | 'y' | 'z';
  /** Initial position */
  pos?: number;
  /** Colormap */
  cmap?: string;
  /** Color limits */
  clim?: [number, number];
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
}

/** Slice viewer state */
export interface SliceViewerState {
  /** Current axis */
  axis: 'x' | 'y' | 'z';
  /** Current position */
  pos: number;
  /** Colormap */
  cmap: string;
  /** Color limits */
  clim: [number, number];
}

/** Slice viewer instance */
export interface SliceViewer {
  /** Get current state */
  getState(): SliceViewerState;
  /** Set axis */
  setAxis(axis: 'x' | 'y' | 'z'): void;
  /** Set position */
  setPos(pos: number): void;
  /** Set colormap */
  setCmap(cmap: string): void;
  /** Set color limits */
  setClim(clim: [number, number]): void;
  /** Update display */
  update(): void;
  /** Destroy viewer */
  destroy(): void;
  /** Subscribe to state changes */
  subscribe(listener: (state: SliceViewerState) => void): () => void;
}

// ============================================================================
// Colormaps
// ============================================================================

const COLORMAPS: Record<string, (t: number) => [number, number, number]> = {
  gray: (t) => [t, t, t],
  jet: (t) => {
    const r = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 3)));
    const g = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 2)));
    const b = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 1)));
    return [r, g, b];
  },
  hot: (t) => {
    const r = Math.min(1, t * 3);
    const g = Math.min(1, Math.max(0, t * 3 - 1));
    const b = Math.min(1, Math.max(0, t * 3 - 2));
    return [r, g, b];
  },
  viridis: (t) => {
    const r = Math.min(1, Math.max(0, 0.267 + t * (0.004 + t * (0.322 + t * (-0.635 + t * 0.374)))));
    const g = Math.min(1, Math.max(0, 0.004 + t * (0.538 + t * (0.745 + t * (-1.225 + t * 0.567)))));
    const b = Math.min(1, Math.max(0, 0.329 + t * (1.378 + t * (-2.067 + t * (1.308 + t * (-0.398))))));
    return [r, g, b];
  },
  petrel: (t) => {
    const r = Math.min(1, Math.max(0, t * 2 - 0.5));
    const g = Math.min(1, Math.max(0, 1 - Math.abs(t - 0.5) * 2));
    const b = Math.min(1, Math.max(0, 0.5 - t * 2 + 1));
    return [r, g, b];
  },
};

// ============================================================================
// Slice extraction
// ============================================================================

/**
 * Extract a 2D slice from 3D volume.
 */
function extractSlice(
  data: Float32Array,
  shape: [number, number, number],
  axis: 'x' | 'y' | 'z',
  pos: number
): { data: Float32Array; width: number; height: number } {
  const [ni, nx, nt] = shape;

  switch (axis) {
    case 'x': {
      const slice = new Float32Array(nx * nt);
      for (let y = 0; y < nx; y++) {
        for (let z = 0; z < nt; z++) {
          slice[y * nt + z] = data[pos * nx * nt + y * nt + z];
        }
      }
      return { data: slice, width: nt, height: nx };
    }
    case 'y': {
      const slice = new Float32Array(ni * nt);
      for (let x = 0; x < ni; x++) {
        for (let z = 0; z < nt; z++) {
          slice[x * nt + z] = data[x * nx * nt + pos * nt + z];
        }
      }
      return { data: slice, width: nt, height: ni };
    }
    case 'z': {
      const slice = new Float32Array(ni * nx);
      for (let x = 0; x < ni; x++) {
        for (let y = 0; y < nx; y++) {
          slice[x * nx + y] = data[x * nx * nt + y * nt + pos];
        }
      }
      return { data: slice, width: nx, height: ni };
    }
  }
}

/**
 * Apply colormap to slice data.
 */
function applyColormap(
  data: Float32Array,
  width: number,
  height: number,
  cmap: string,
  clim: [number, number]
): ImageData {
  const cmapFn = COLORMAPS[cmap] || COLORMAPS.gray;
  const imageData = new ImageData(width, height);
  const [vmin, vmax] = clim;
  const range = vmax - vmin || 1;

  for (let i = 0; i < width * height; i++) {
    let t = (data[i] - vmin) / range;
    t = Math.max(0, Math.min(1, t));

    const [r, g, b] = cmapFn(t);
    imageData.data[i * 4] = Math.round(r * 255);
    imageData.data[i * 4 + 1] = Math.round(g * 255);
    imageData.data[i * 4 + 2] = Math.round(b * 255);
    imageData.data[i * 4 + 3] = 255;
  }

  return imageData;
}

// ============================================================================
// Slice viewer creation
// ============================================================================

/**
 * Create an interactive slice viewer.
 *
 * @param options - Viewer options
 * @returns SliceViewer instance
 *
 * @example
 * ```ts
 * const viewer = createSliceViewer({
 *   container: document.getElementById('viewer')!,
 *   data: volumeData,
 *   shape: [192, 200, 240],
 *   axis: 'z',
 *   pos: 120,
 *   cmap: 'petrel',
 * });
 *
 * // Update position
 * viewer.setPos(150);
 *
 * // Subscribe to changes
 * viewer.subscribe(state => console.log(state));
 * ```
 */
export function createSliceViewer(options: SliceViewerOptions): SliceViewer {
  const {
    container,
    data,
    shape,
    axis: initialAxis = 'z',
    pos: initialPos,
    cmap: initialCmap = 'petrel',
    clim: initialClim,
    width: canvasWidth = 800,
    height: canvasHeight = 600,
  } = options;

  // Calculate default position
  const defaultPos = initialPos ?? Math.floor(shape[2] / 2);

  // Calculate default clim
  let dataMin = Infinity, dataMax = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < dataMin) dataMin = data[i];
    if (data[i] > dataMax) dataMax = data[i];
  }
  const defaultClim: [number, number] = initialClim ?? [dataMin, dataMax];

  // State
  const state: SliceViewerState = {
    axis: initialAxis,
    pos: defaultPos,
    cmap: initialCmap,
    clim: defaultClim,
  };

  const listeners: Set<(state: SliceViewerState) => void> = new Set();

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.cursor = 'crosshair';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;

  // Temp canvas for image scaling
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;

  function notify() {
    for (const listener of listeners) {
      listener({ ...state });
    }
  }

  function update() {
    // Extract slice
    const { data: sliceData, width: sliceWidth, height: sliceHeight } = extractSlice(
      data, shape, state.axis, state.pos
    );

    // Apply colormap
    const imageData = applyColormap(sliceData, sliceWidth, sliceHeight, state.cmap, state.clim);

    // Draw scaled
    tempCanvas.width = sliceWidth;
    tempCanvas.height = sliceHeight;
    tempCtx.putImageData(imageData, 0, 0);

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tempCanvas, 0, 0, canvasWidth, canvasHeight);

    // Draw axis info
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${state.axis.toUpperCase()}: ${state.pos}`, 10, 20);

    // Draw colorbar
    drawColorbar(ctx, state.cmap, state.clim, canvasWidth - 30, 20, 20, canvasHeight - 40);
  }

  function drawColorbar(
    ctx: CanvasRenderingContext2D,
    cmap: string,
    clim: [number, number],
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const cmapFn = COLORMAPS[cmap] || COLORMAPS.gray;
    const steps = 100;
    const stepHeight = height / steps;

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const [r, g, b] = cmapFn(t);
      ctx.fillStyle = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
      ctx.fillRect(x, y + i * stepHeight, width, stepHeight + 1);
    }

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  // Mouse wheel handler
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const maxPos = shape[state.axis === 'x' ? 0 : state.axis === 'y' ? 1 : 2] - 1;

    if (e.deltaY < 0) {
      state.pos = Math.min(maxPos, state.pos + 1);
    } else {
      state.pos = Math.max(0, state.pos - 1);
    }

    update();
    notify();
  };

  canvas.addEventListener('wheel', handleWheel);

  // Initial render
  update();

  return {
    getState() {
      return { ...state };
    },

    setAxis(axis) {
      state.axis = axis;
      state.pos = Math.floor(shape[axis === 'x' ? 0 : axis === 'y' ? 1 : 2] / 2);
      update();
      notify();
    },

    setPos(pos) {
      const maxPos = shape[state.axis === 'x' ? 0 : state.axis === 'y' ? 1 : 2] - 1;
      state.pos = Math.max(0, Math.min(maxPos, pos));
      update();
      notify();
    },

    setCmap(cmap) {
      state.cmap = cmap;
      update();
      notify();
    },

    setClim(clim) {
      state.clim = clim;
      update();
      notify();
    },

    update,

    destroy() {
      canvas.removeEventListener('wheel', handleWheel);
      container.removeChild(canvas);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// ============================================================================
// Multi-axis viewer
// ============================================================================

/**
 * Create a multi-axis slice viewer showing all three orientations.
 *
 * @param options - Viewer options
 * @returns Object with three viewers
 */
export function createMultiAxisViewer(options: Omit<SliceViewerOptions, 'axis'> & {
  container: HTMLElement;
}): {
  inline: SliceViewer;
  crossline: SliceViewer;
  time: SliceViewer;
} {
  const { container, ...rest } = options;

  // Create container layout
  container.style.display = 'grid';
  container.style.gridTemplateColumns = '1fr 1fr';
  container.style.gridTemplateRows = '1fr 1fr';
  container.style.gap = '4px';

  const inlineContainer = document.createElement('div');
  const crosslineContainer = document.createElement('div');
  const timeContainer = document.createElement('div');

  inlineContainer.style.gridColumn = '1';
  inlineContainer.style.gridRow = '1';
  crosslineContainer.style.gridColumn = '2';
  crosslineContainer.style.gridRow = '1';
  timeContainer.style.gridColumn = '1 / 3';
  timeContainer.style.gridRow = '2';

  container.appendChild(inlineContainer);
  container.appendChild(crosslineContainer);
  container.appendChild(timeContainer);

  const inline = createSliceViewer({ ...rest, container: inlineContainer, axis: 'x' });
  const crossline = createSliceViewer({ ...rest, container: crosslineContainer, axis: 'y' });
  const time = createSliceViewer({ ...rest, container: timeContainer, axis: 'z' });

  return { inline, crossline, time };
}

// ============================================================================
// Annotation functions (ported from sliceviewer Python module)
// ============================================================================

/** Horizon annotation */
export interface HorizonAnnotation {
  type: 'horizon';
  x: Float32Array;
  y: Float32Array;
  name: string;
  color: string;
  width: number;
  axes?: [number, number];
}

/** Fault annotation */
export interface FaultAnnotation {
  type: 'fault';
  x: Float32Array;
  y: Float32Array;
  name: string;
  color: string;
  width: number;
  axes?: [number, number];
}

/** Well annotation */
export interface WellAnnotation {
  type: 'well';
  x: Float32Array;
  y: Float32Array;
  name: string;
  color: string;
  size: number;
  axes?: [number, number];
}

/** Scatter annotation */
export interface ScatterAnnotation {
  type: 'scatter';
  x: Float32Array;
  y: Float32Array;
  name: string;
  mode: string;
  color: string;
  size: number;
  axes?: [number, number];
}

/** Any annotation */
export type Annotation = HorizonAnnotation | FaultAnnotation | WellAnnotation | ScatterAnnotation;

/**
 * Add a horizon line annotation.
 * Ported from cigvis Python: add_horizon
 *
 * @param x - X coordinates
 * @param y - Y coordinates
 * @param options - Optional parameters
 * @returns HorizonAnnotation
 *
 * @example
 * ```ts
 * const horizon = addHorizon(xData, yData, {
 *   name: 'Top Reservoir',
 *   color: 'yellow',
 * });
 * ```
 */
export function addHorizon(
  x: Float32Array,
  y: Float32Array,
  options: {
    name?: string;
    color?: string;
    width?: number;
    axes?: [number, number];
  } = {}
): HorizonAnnotation {
  const {
    name = 'horizon',
    color = 'yellow',
    width = 1.5,
    axes,
  } = options;

  return {
    type: 'horizon',
    x,
    y,
    name,
    color,
    width,
    axes,
  };
}

/**
 * Add a fault line annotation.
 * Ported from cigvis Python: add_fault
 *
 * @param x - X coordinates
 * @param y - Y coordinates
 * @param options - Optional parameters
 * @returns FaultAnnotation
 *
 * @example
 * ```ts
 * const fault = addFault(xData, yData, {
 *   name: 'Fault F1',
 *   color: 'red',
 * });
 * ```
 */
export function addFault(
  x: Float32Array,
  y: Float32Array,
  options: {
    name?: string;
    color?: string;
    width?: number;
    axes?: [number, number];
  } = {}
): FaultAnnotation {
  const {
    name = 'fault',
    color = 'red',
    width = 1.5,
    axes,
  } = options;

  return {
    type: 'fault',
    x,
    y,
    name,
    color,
    width,
    axes,
  };
}

/**
 * Add well positions as scatter points.
 * Ported from cigvis Python: add_well
 *
 * @param x - X coordinates
 * @param y - Y coordinates
 * @param options - Optional parameters
 * @returns WellAnnotation
 *
 * @example
 * ```ts
 * const well = addWell(xData, yData, {
 *   name: 'Well A-1',
 *   color: 'white',
 *   size: 6,
 * });
 * ```
 */
export function addWell(
  x: Float32Array,
  y: Float32Array,
  options: {
    name?: string;
    color?: string;
    size?: number;
    axes?: [number, number];
  } = {}
): WellAnnotation {
  const {
    name = 'well',
    color = 'white',
    size = 6,
    axes,
  } = options;

  return {
    type: 'well',
    x,
    y,
    name,
    color,
    size,
    axes,
  };
}

/**
 * Add a generic scatter or line annotation.
 * Ported from cigvis Python: add_scatter
 *
 * @param x - X coordinates
 * @param y - Y coordinates
 * @param options - Optional parameters
 * @returns ScatterAnnotation
 *
 * @example
 * ```ts
 * const scatter = addScatter(xData, yData, {
 *   name: 'Picks',
 *   mode: 'markers',
 *   color: 'cyan',
 * });
 * ```
 */
export function addScatter(
  x: Float32Array,
  y: Float32Array,
  options: {
    name?: string;
    mode?: string;
    color?: string;
    size?: number;
    axes?: [number, number];
  } = {}
): ScatterAnnotation {
  const {
    name = 'scatter',
    mode = 'markers',
    color = 'cyan',
    size = 6,
    axes,
  } = options;

  return {
    type: 'scatter',
    x,
    y,
    name,
    mode,
    color,
    size,
    axes,
  };
}

/**
 * Draw annotation on canvas.
 *
 * @param ctx - Canvas 2D context
 * @param annotation - Annotation to draw
 * @param scaleX - X scale factor
 * @param scaleY - Y scale factor
 * @param offsetX - X offset
 * @param offsetY - Y offset
 */
export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  scaleX: number,
  scaleY: number,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  ctx.save();

  switch (annotation.type) {
    case 'horizon':
    case 'fault':
      // Draw line
      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = annotation.width;
      ctx.beginPath();
      for (let i = 0; i < annotation.x.length; i++) {
        const x = offsetX + annotation.x[i] * scaleX;
        const y = offsetY + annotation.y[i] * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      break;

    case 'well':
      // Draw marker
      ctx.fillStyle = annotation.color;
      for (let i = 0; i < annotation.x.length; i++) {
        const x = offsetX + annotation.x[i] * scaleX;
        const y = offsetY + annotation.y[i] * scaleY;
        ctx.beginPath();
        ctx.arc(x, y, annotation.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw label
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      for (let i = 0; i < annotation.x.length; i++) {
        const x = offsetX + annotation.x[i] * scaleX + annotation.size;
        const y = offsetY + annotation.y[i] * scaleY;
        ctx.fillText(annotation.name, x, y);
      }
      break;

    case 'scatter':
      if (annotation.mode.includes('markers')) {
        ctx.fillStyle = annotation.color;
        for (let i = 0; i < annotation.x.length; i++) {
          const x = offsetX + annotation.x[i] * scaleX;
          const y = offsetY + annotation.y[i] * scaleY;
          ctx.beginPath();
          ctx.arc(x, y, annotation.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (annotation.mode.includes('lines')) {
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < annotation.x.length; i++) {
          const x = offsetX + annotation.x[i] * scaleX;
          const y = offsetY + annotation.y[i] * scaleY;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
  }

  ctx.restore();
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a slice viewer agent for programmatic access.
 */
export function createSliceViewerAgent() {
  return {
    createSliceViewer,
    createMultiAxisViewer,
    addHorizon,
    addFault,
    addWell,
    addScatter,
    drawAnnotation,
  };
}
