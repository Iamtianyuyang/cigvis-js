/**
 * Interactive tools for CIGVis
 *
 * Ported from cigvis Python library (cigvis/tools.py)
 * Provides interactive data extraction tools using Canvas API.
 *
 * @module tools
 */

// ============================================================================
// Types
// ============================================================================

/** Point coordinate [x, y] */
export type Point = [number, number];

/** Arbitrary line extraction result */
export interface ArbitraryLineResult {
  /** Extracted line data */
  data: Float32Array;
  /** Path points */
  path: Point[];
  /** Path indices */
  indices: number[];
  /** User-clicked coordinates */
  coords: Point[];
}

/** Extract arbitrary line options */
export interface ExtractArbitraryLineOptions {
  /** 3D volume data */
  data: Float32Array;
  /** Volume shape [ni, nx, nt] */
  shape: [number, number, number];
  /** Background map: 'data' for slice, 'blank' for empty */
  background?: 'data' | 'blank';
  /** Slice index for background */
  sliceIndex?: number;
  /** Show broken line segments */
  showLine?: boolean;
  /** Line color */
  lineColor?: string;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
}

// ============================================================================
// Arbitrary line extraction
// ============================================================================

/**
 * Extract an arbitrary line from 3D data interactively.
 *
 * Displays a canvas where the user can click to define a path,
 * then extracts data along that path.
 *
 * @param options - Extraction options
 * @returns Promise with extraction result
 *
 * @example
 * ```ts
 * const result = await extractArbitraryLine({
 *   data: volumeData,
 *   shape: [192, 200, 240],
 *   background: 'data',
 *   sliceIndex: 50,
 * });
 * ```
 */
export async function extractArbitraryLine(
  options: ExtractArbitraryLineOptions
): Promise<ArbitraryLineResult> {
  const {
    data,
    shape,
    background = 'data',
    sliceIndex = 50,
    showLine = true,
    lineColor = '#F3AA3C',
    width = 800,
    height = 600,
  } = options;

  return new Promise((resolve) => {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.cursor = 'crosshair';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d')!;
    const coords: Point[] = [];
    const points: { x: number; y: number }[] = [];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];

    // Draw background
    drawBackground(ctx, data, shape, background, sliceIndex, width, height);

    // Draw title
    ctx.fillStyle = '#000000';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Click to add points, press "u" to undo, "Enter" to finish',
      width / 2,
      20
    );

    // Click handler
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      coords.push([x, y]);

      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'red';
      ctx.fill();

      // Draw line segment
      if (coords.length > 1) {
        const prev = coords[coords.length - 2];
        ctx.beginPath();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.moveTo(prev[0], prev[1]);
        ctx.lineTo(x, y);
        ctx.stroke();

        lines.push({ x1: prev[0], y1: prev[1], x2: x, y2: y });
      }

      points.push({ x, y });
    };

    // Key handler
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'u') {
        // Undo
        if (coords.length > 0) {
          coords.pop();
          points.pop();
          if (lines.length > 0) lines.pop();

          // Redraw
          ctx.clearRect(0, 0, width, height);
          drawBackground(ctx, data, shape, background, sliceIndex, width, height);

          // Redraw points and lines
          for (let i = 0; i < coords.length; i++) {
            const [x, y] = coords[i];
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();

            if (i > 0) {
              const prev = coords[i - 1];
              ctx.beginPath();
              ctx.strokeStyle = lineColor;
              ctx.lineWidth = 2;
              ctx.moveTo(prev[0], prev[1]);
              ctx.lineTo(x, y);
              ctx.stroke();
            }
          }
        }
      } else if (e.key === 'Enter' || e.key === 'Escape') {
        // Finish
        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('keydown', handleKey);
        document.body.removeChild(canvas);

        // Extract data along path
        const result = extractDataAlongPath(data, shape, coords);

        resolve(result);
      }
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('keydown', handleKey);
    canvas.focus();
  });
}

/**
 * Draw background on canvas.
 */
function drawBackground(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  shape: [number, number, number],
  background: 'data' | 'blank',
  sliceIndex: number,
  width: number,
  height: number
): void {
  const [ni, nx, nt] = shape;

  if (background === 'data') {
    // Draw slice
    const slice = new Float32Array(ni * nx);
    for (let i = 0; i < ni; i++) {
      for (let j = 0; j < nx; j++) {
        slice[i * nx + j] = data[i * nx * nt + j * nt + sliceIndex];
      }
    }

    // Apply colormap
    const imageData = ctx.createImageData(ni, nx);
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < slice.length; i++) {
      if (slice[i] < min) min = slice[i];
      if (slice[i] > max) max = slice[i];
    }
    const range = max - min || 1;

    for (let i = 0; i < slice.length; i++) {
      const t = (slice[i] - min) / range;
      const val = Math.round(t * 255);
      imageData.data[i * 4] = val;
      imageData.data[i * 4 + 1] = val;
      imageData.data[i * 4 + 2] = val;
      imageData.data[i * 4 + 3] = 255;
    }

    // Draw scaled
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = ni;
    tempCanvas.height = nx;
    tempCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

    ctx.drawImage(tempCanvas, 0, 0, width, height);
  } else {
    // Blank background with grid
    ctx.fillStyle = '#e6e6e6';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 0.5;

    const gridSize = 20;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
}

/**
 * Extract data along a path in 3D volume.
 */
function extractDataAlongPath(
  data: Float32Array,
  shape: [number, number, number],
  coords: Point[],
  canvasWidth: number = 800,
  canvasHeight: number = 600
): ArbitraryLineResult {
  const [ni, nx, nt] = shape;

  if (coords.length < 2) {
    return {
      data: new Float32Array(0),
      path: [],
      indices: [],
      coords,
    };
  }

  // Interpolate path
  const path: Point[] = [];
  const indices: number[] = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist);

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      path.push([
        x1 + dx * t,
        y1 + dy * t,
      ]);
    }

    indices.push(path.length - 1);
  }

  // Add last point
  path.push(coords[coords.length - 1]);
  indices.push(path.length - 1);

  // Extract data along path
  const lineData = new Float32Array(path.length * nt);

  for (let p = 0; p < path.length; p++) {
    const [px, py] = path[p];

    // Map canvas coordinates to volume coordinates
    const vi = Math.round((px / canvasWidth) * ni);
    const vj = Math.round((py / canvasHeight) * nx);

    for (let t = 0; t < nt; t++) {
      if (vi >= 0 && vi < ni && vj >= 0 && vj < nx) {
        lineData[p * nt + t] = data[vi * nx * nt + vj * nt + t];
      }
    }
  }

  return {
    data: lineData,
    path,
    indices,
    coords,
  };
}

/**
 * Create an interactive point selector on a 2D image.
 *
 * @param data - 2D image data
 * @param width - Image width
 * @param height - Image height
 * @returns Promise with selected points
 */
export async function selectPoints(
  data: Float32Array,
  width: number,
  height: number
): Promise<Point[]> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.cursor = 'crosshair';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d')!;

    // Draw image
    const imageData = ctx.createImageData(width, height);
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    const range = max - min || 1;

    for (let i = 0; i < data.length; i++) {
      const t = (data[i] - min) / range;
      const val = Math.round(t * 255);
      imageData.data[i * 4] = val;
      imageData.data[i * 4 + 1] = val;
      imageData.data[i * 4 + 2] = val;
      imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    const points: Point[] = [];

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      points.push([x, y]);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'red';
      ctx.fill();
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'u' && points.length > 0) {
        points.pop();
        ctx.clearRect(0, 0, width, height);
        ctx.putImageData(imageData, 0, 0);

        for (const [x, y] of points) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = 'red';
          ctx.fill();
        }
      } else if (e.key === 'Enter' || e.key === 'Escape') {
        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('keydown', handleKey);
        document.body.removeChild(canvas);
        resolve(points);
      }
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('keydown', handleKey);
    canvas.focus();
  });
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a tools agent for programmatic access.
 */
export function createToolsAgent() {
  return {
    extractArbitraryLine,
    selectPoints,
  };
}
