/**
 * Plotly.js integration for CIGVis
 *
 * Ported from cigvis Python library (cigvis/plotlyplot.py)
 * Provides 3D visualization using Plotly.js for Jupyter-like environments.
 *
 * @module plotly
 */

// ============================================================================
// Types
// ============================================================================

/** Plotly trace type (simplified) */
export interface PlotlyTrace {
  type: string;
  [key: string]: unknown;
}

/** Base specification for Plotly visualization */
export interface PlotlySpec {
  /** Convert to Plotly traces */
  toTraces(): PlotlyTrace[];
}

/** Slice specification */
export interface PlotlySliceSpec extends PlotlySpec {
  /** Volume data */
  data: Float32Array;
  /** Volume shape [ni, nx, nt] */
  shape: [number, number, number];
  /** Slice axis */
  axis: 'x' | 'y' | 'z';
  /** Slice position */
  pos: number;
  /** Colormap */
  cmap?: string;
  /** Color limits */
  clim?: [number, number];
  /** Interpolation method */
  interpolation?: 'nearest' | 'linear' | 'cubic';
  /** Show colorbar */
  showColorbar?: boolean;
  /** Overlay specs */
  overlays?: PlotlyOverlaySpec[];
}

/** Overlay specification */
export interface PlotlyOverlaySpec extends PlotlySpec {
  /** Mask data */
  maskData: Float32Array;
  /** Colormap */
  cmap?: string;
  /** Color limits */
  clim?: [number, number];
  /** Opacity */
  opacity?: number;
}

/** Surface specification */
export interface PlotlySurfacesSpec extends PlotlySpec {
  /** Surface height maps */
  surfaces: Float32Array[];
  /** Surface shape [ni, nx] */
  shape: [number, number];
  /** Volume data for amplitude coloring */
  volume?: Float32Array;
  /** Volume shape */
  volumeShape?: [number, number, number];
  /** Value type */
  valueType?: 'depth' | 'amp';
  /** Colormap */
  cmap?: string;
  /** Color limits */
  clim?: [number, number];
}

/** Well log specification */
export interface PlotlyWellLogSpec extends PlotlySpec {
  /** Trajectory points [N, 3] */
  trajectory: Float32Array;
  /** Values along trajectory */
  values?: Float32Array;
  /** Tube radius */
  radius?: number;
  /** Colormap */
  cmap?: string;
  /** Color limits */
  clim?: [number, number];
  /** Visualization style */
  style?: 'line' | 'tubes';
}

/** Points specification */
export interface PlotlyPointsSpec extends PlotlySpec {
  /** Point positions [N, 3] */
  positions: Float32Array;
  /** Point colors */
  colors?: Float32Array;
  /** Point values */
  values?: Float32Array;
  /** Colormap */
  cmap?: string;
  /** Color limits */
  clim?: [number, number];
  /** Point size */
  size?: number;
}

/** Body (isosurface) specification */
export interface PlotlyBodySpec extends PlotlySpec {
  /** Volume data */
  data: Float32Array;
  /** Volume shape */
  shape: [number, number, number];
  /** Isovalue */
  isoValue?: number;
  /** Colormap */
  cmap?: string;
  /** Color limits */
  clim?: [number, number];
  /** Opacity */
  opacity?: number;
}

/** Plot3D options for Plotly */
export interface PlotlyPlot3DOptions {
  /** Visualization specs */
  specs: PlotlySpec[];
  /** Figure size */
  size?: [number, number];
  /** Background color */
  bgColor?: string;
  /** Show axis */
  showAxis?: boolean;
  /** Title */
  title?: string;
}

// ============================================================================
// Slice creation
// ============================================================================

/**
 * Create a slice specification for Plotly.
 *
 * @param options - Slice options
 * @returns PlotlySliceSpec
 *
 * @example
 * ```ts
 * const spec = createPlotlySlice({
 *   data: volumeData,
 *   shape: [192, 200, 240],
 *   axis: 'z',
 *   pos: 239,
 *   cmap: 'petrel',
 * });
 * ```
 */
export function createPlotlySlice(options: {
  data: Float32Array;
  shape: [number, number, number];
  axis: 'x' | 'y' | 'z';
  pos: number;
  cmap?: string;
  clim?: [number, number];
  interpolation?: 'nearest' | 'linear' | 'cubic';
  showColorbar?: boolean;
}): PlotlySliceSpec {
  return {
    ...options,
    cmap: options.cmap || 'petrel',
    interpolation: options.interpolation || 'linear',
    showColorbar: options.showColorbar ?? false,
    overlays: [],
    toTraces() {
      // Extract slice data
      const [ni, nx, nt] = options.shape;
      let sliceData: Float32Array;
      let sliceShape: [number, number];

      switch (options.axis) {
        case 'x':
          sliceData = new Float32Array(nx * nt);
          for (let y = 0; y < nx; y++) {
            for (let z = 0; z < nt; z++) {
              sliceData[y * nt + z] = options.data[options.pos * nx * nt + y * nt + z];
            }
          }
          sliceShape = [nx, nt];
          break;
        case 'y':
          sliceData = new Float32Array(ni * nt);
          for (let x = 0; x < ni; x++) {
            for (let z = 0; z < nt; z++) {
              sliceData[x * nt + z] = options.data[x * nx * nt + options.pos * nt + z];
            }
          }
          sliceShape = [ni, nt];
          break;
        case 'z':
          sliceData = new Float32Array(ni * nx);
          for (let x = 0; x < ni; x++) {
            for (let y = 0; y < nx; y++) {
              sliceData[x * nx + y] = options.data[x * nx * nt + y * nt + options.pos];
            }
          }
          sliceShape = [ni, nx];
          break;
      }

      // Create heatmap trace
      const clim = options.clim || [
        Math.min(...sliceData),
        Math.max(...sliceData),
      ];

      return [{
        type: 'heatmap',
        z: Array.from({ length: sliceShape[0] }, (_, i) =>
          Array.from(sliceData.slice(i * sliceShape[1], (i + 1) * sliceShape[1]))
        ),
        colorscale: options.cmap || 'Viridis',
        zmin: clim[0],
        zmax: clim[1],
        showscale: options.showColorbar,
      }];
    },
  };
}

/**
 * Add an overlay to a slice specification.
 *
 * @param spec - Slice specification
 * @param maskData - Mask data
 * @param options - Overlay options
 * @returns Updated slice specification
 */
export function addPlotlyOverlay(
  spec: PlotlySliceSpec,
  maskData: Float32Array,
  options: {
    cmap?: string;
    clim?: [number, number];
    opacity?: number;
  } = {}
): PlotlySliceSpec {
  const overlay: PlotlyOverlaySpec = {
    maskData,
    cmap: options.cmap || 'jet',
    clim: options.clim,
    opacity: options.opacity ?? 1,
    toTraces() {
      return [{
        type: 'heatmap',
        z: Array.from({ length: spec.shape[0] }, (_, i) =>
          Array.from(maskData.slice(i * spec.shape[1], (i + 1) * spec.shape[1]))
        ),
        colorscale: options.cmap || 'Jet',
        opacity: options.opacity ?? 1,
        showscale: false,
      }];
    },
  };

  return {
    ...spec,
    overlays: [...(spec.overlays || []), overlay],
  };
}

// ============================================================================
// Surface creation
// ============================================================================

/**
 * Create surface specifications for Plotly.
 *
 * @param options - Surface options
 * @returns PlotlySurfacesSpec
 */
export function createPlotlySurfaces(options: {
  surfaces: Float32Array[];
  shape: [number, number];
  volume?: Float32Array;
  volumeShape?: [number, number, number];
  valueType?: 'depth' | 'amp';
  cmap?: string;
  clim?: [number, number];
}): PlotlySurfacesSpec {
  return {
    ...options,
    valueType: options.valueType || 'depth',
    toTraces() {
      const traces: PlotlyTrace[] = [];

      for (const surface of options.surfaces) {
        const [ni, nx] = options.shape;

        // Create mesh3d trace
        const x: number[] = [];
        const y: number[] = [];
        const z: number[] = [];

        for (let i = 0; i < ni; i++) {
          for (let j = 0; j < nx; j++) {
            x.push(i);
            y.push(j);
            z.push(surface[i * nx + j]);
          }
        }

        traces.push({
          type: 'mesh3d',
          x,
          y,
          z,
          intensity: z,
          colorscale: options.cmap || 'Viridis',
          opacity: 0.8,
        });
      }

      return traces;
    },
  };
}

// ============================================================================
// Well log creation
// ============================================================================

/**
 * Create well log specification for Plotly.
 *
 * @param options - Well log options
 * @returns PlotlyWellLogSpec
 */
export function createPlotlyWellLog(options: {
  trajectory: Float32Array;
  values?: Float32Array;
  radius?: number;
  cmap?: string;
  clim?: [number, number];
  style?: 'line' | 'tubes';
}): PlotlyWellLogSpec {
  return {
    ...options,
    radius: options.radius || 0.02,
    style: options.style || 'tubes',
    toTraces() {
      const traces: PlotlyTrace[] = [];
      const numPoints = options.trajectory.length / 3;

      const x: number[] = [];
      const y: number[] = [];
      const z: number[] = [];

      for (let i = 0; i < numPoints; i++) {
        x.push(options.trajectory[i * 3]);
        y.push(options.trajectory[i * 3 + 1]);
        z.push(options.trajectory[i * 3 + 2]);
      }

      if (options.style === 'line') {
        traces.push({
          type: 'scatter3d',
          mode: 'lines',
          x,
          y,
          z,
          line: {
            color: options.values ? Array.from(options.values) : '#ffff00',
            colorscale: options.cmap || 'Hot',
            width: 5,
          },
        });
      } else {
        traces.push({
          type: 'scatter3d',
          mode: 'lines',
          x,
          y,
          z,
          line: {
            color: options.values ? Array.from(options.values) : '#ffff00',
            colorscale: options.cmap || 'Hot',
            width: 10,
          },
        });
      }

      return traces;
    },
  };
}

// ============================================================================
// Points creation
// ============================================================================

/**
 * Create points specification for Plotly.
 *
 * @param options - Points options
 * @returns PlotlyPointsSpec
 */
export function createPlotlyPoints(options: {
  positions: Float32Array;
  colors?: Float32Array;
  values?: Float32Array;
  cmap?: string;
  clim?: [number, number];
  size?: number;
}): PlotlyPointsSpec {
  return {
    ...options,
    size: options.size || 2,
    toTraces() {
      const numPoints = options.positions.length / 3;
      const x: number[] = [];
      const y: number[] = [];
      const z: number[] = [];

      for (let i = 0; i < numPoints; i++) {
        x.push(options.positions[i * 3]);
        y.push(options.positions[i * 3 + 1]);
        z.push(options.positions[i * 3 + 2]);
      }

      return [{
        type: 'scatter3d',
        mode: 'markers',
        x,
        y,
        z,
        marker: {
          size: options.size || 2,
          color: options.values ? Array.from(options.values) : (options.colors ? Array.from(options.colors) : '#1f77b4'),
          colorscale: options.cmap || 'Viridis',
          showscale: true,
        },
      }];
    },
  };
}

// ============================================================================
// Body creation
// ============================================================================

/**
 * Create body (isosurface) specification for Plotly.
 *
 * @param options - Body options
 * @returns PlotlyBodySpec
 */
export function createPlotlyBody(options: {
  data: Float32Array;
  shape: [number, number, number];
  isoValue?: number;
  cmap?: string;
  clim?: [number, number];
  opacity?: number;
}): PlotlyBodySpec {
  const [ni, nx, nt] = options.shape;

  // Calculate default isovalue
  let sum = 0;
  let count = 0;
  for (let i = 0; i < options.data.length; i++) {
    if (!isNaN(options.data[i]) && isFinite(options.data[i])) {
      sum += options.data[i];
      count++;
    }
  }
  const defaultIsoValue = count > 0 ? sum / count : 0;

  return {
    ...options,
    isoValue: options.isoValue ?? defaultIsoValue,
    opacity: options.opacity ?? 1,
    toTraces() {
      return [{
        type: 'isosurface',
        x: Array.from({ length: ni }, (_, i) => i),
        y: Array.from({ length: nx }, (_, i) => i),
        z: Array.from({ length: nt }, (_, i) => i),
        value: Array.from(options.data),
        isomin: options.isoValue ?? defaultIsoValue,
        isomax: options.isoValue ?? defaultIsoValue,
        colorscale: options.cmap || 'Viridis',
        opacity: options.opacity ?? 1,
      }];
    },
  };
}

// ============================================================================
// Plot3D compilation
// ============================================================================

/**
 * Compile specifications into Plotly traces.
 *
 * @param specs - Array of visualization specifications
 * @returns Array of Plotly traces
 */
export function compileTraces(specs: PlotlySpec[]): PlotlyTrace[] {
  const traces: PlotlyTrace[] = [];

  for (const spec of specs) {
    traces.push(...spec.toTraces());
  }

  return traces;
}

/**
 * Create a 3D plot using Plotly.
 *
 * @param options - Plot options
 * @returns Plotly traces and layout
 *
 * @example
 * ```ts
 * const { traces, layout } = plot3D({
 *   specs: [sliceSpec, surfaceSpec],
 *   size: [800, 600],
 * });
 * // Use with Plotly.newPlot('container', traces, layout)
 * ```
 */
export function plot3D(options: PlotlyPlot3DOptions): {
  traces: PlotlyTrace[];
  layout: Record<string, unknown>;
} {
  const {
    specs,
    size = [800, 600],
    bgColor = '#1a1a2e',
    showAxis = true,
    title,
  } = options;

  const traces = compileTraces(specs);

  const layout: Record<string, unknown> = {
    width: size[0],
    height: size[1],
    paper_bgcolor: bgColor,
    scene: {
      xaxis: { visible: showAxis, title: 'Inline' },
      yaxis: { visible: showAxis, title: 'Crossline' },
      zaxis: { visible: showAxis, title: 'Time/Depth' },
      bgcolor: bgColor,
    },
  };

  if (title) {
    layout.title = title;
  }

  return { traces, layout };
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a Plotly agent for programmatic access.
 */
export function createPlotlyAgent() {
  return {
    createPlotlySlice,
    addPlotlyOverlay,
    createPlotlySurfaces,
    createPlotlyWellLog,
    createPlotlyPoints,
    createPlotlyBody,
    compileTraces,
    plot3D,
  };
}
