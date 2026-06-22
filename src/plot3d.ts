/**
 * Main plot3D function - ported from cigvis Python library
 * Entry point for 3D visualization
 */

import {
  VisNode, SliceNode, SurfaceNode, BodyNode, WellLogNode,
  Plot3DView, Plot3DSave, Plot3DColorbar,
} from './types';
import { VolumeRenderer, RendererOptions } from './renderer/volume-renderer';
import { createSlices } from './nodes';

export interface Plot3DOptions {
  /** Visualization nodes */
  nodes: VisNode[];
  /** View configuration */
  view?: Plot3DView;
  /** Save configuration */
  save?: Plot3DSave;
  /** Colorbar configuration */
  colorbar?: Plot3DColorbar;
  /** Container element or selector */
  container?: HTMLElement | string;
  /** Volume shape for positioning */
  volumeShape?: [number, number, number];
}

/**
 * Plot 3D visualization
 *
 * @example
 * ```ts
 * import { cigvis } from 'cigvis';
 *
 * // Create nodes
 * const nodes = cigvis.createSlices({
 *   data: volumeData,
 *   shape: [192, 200, 240],
 *   pos: { x: 0, y: 0, z: 239 },
 *   cmap: 'petrel',
 * });
 *
 * // Add surface
 * const surfNodes = cigvis.createSurfaces({
 *   surfaces: [surfaceData],
 *   shape: [192, 200],
 * });
 *
 * // Plot
 * cigvis.plot3D({
 *   nodes: [...nodes, ...surfNodes],
 *   container: '#viewer',
 * });
 * ```
 */
export function plot3D(options: Plot3DOptions): VolumeRenderer {
  const {
    nodes,
    view,
    container,
    volumeShape,
  } = options;

  // Resolve container
  let containerEl: HTMLElement;
  if (typeof container === 'string') {
    containerEl = document.querySelector(container) as HTMLElement;
    if (!containerEl) {
      throw new Error(`Container not found: ${container}`);
    }
  } else if (container instanceof HTMLElement) {
    containerEl = container;
  } else {
    // Create a full-screen container
    containerEl = document.createElement('div');
    containerEl.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;';
    document.body.appendChild(containerEl);
  }

  // Determine volume shape from nodes
  let shape: [number, number, number] = volumeShape || [100, 100, 100];

  // Try to infer from slice nodes
  if (!volumeShape) {
    for (const node of nodes) {
      if (node.type === 'slice') {
        const slice = node as SliceNode;
        if (slice.axis === 'x') {
          shape = [slice.pos + 1, slice.shape[0], slice.shape[1]];
        } else if (slice.axis === 'y') {
          shape = [slice.shape[0], slice.pos + 1, slice.shape[1]];
        } else {
          shape = [slice.shape[0], slice.shape[1], slice.pos + 1];
        }
        break;
      }
    }
  }

  // Create renderer
  const rendererOptions: RendererOptions = {
    container: containerEl,
    width: view?.size?.[0],
    height: view?.size?.[1],
    bgColor: view?.bgColor,
    showAxis: view?.axis !== false,
  };

  const renderer = new VolumeRenderer(rendererOptions);
  renderer.setVolumeShape(shape[0], shape[1], shape[2]);

  // Add nodes to renderer
  for (const node of nodes) {
    if (!node.visible) continue;

    switch (node.type) {
      case 'slice':
        renderer.addSlice(node as SliceNode);
        break;
      case 'surface':
        renderer.addSurface(node as SurfaceNode);
        break;
      case 'well-log':
        renderer.addWellLog(node as WellLogNode);
        break;
      case 'body':
        renderer.addBody(node as BodyNode);
        break;
      case 'point-cloud':
        // TODO: Add point cloud rendering
        break;
      case 'overlay':
        // Overlay is handled by the slice node
        break;
      default:
        console.warn(`Unknown node type: ${node.type}`);
    }
  }

  return renderer;
}

/**
 * Create a simple 3D viewer with default settings
 */
export function createViewer(
  container: HTMLElement | string,
  volumeShape?: [number, number, number]
): VolumeRenderer {
  const resolvedContainer = typeof container === 'string'
    ? document.querySelector(container) as HTMLElement
    : container;

  if (!resolvedContainer) {
    throw new Error(`Container not found: ${container}`);
  }

  const renderer = new VolumeRenderer({
    container: resolvedContainer,
    showAxis: true,
  });

  if (volumeShape) {
    renderer.setVolumeShape(volumeShape[0], volumeShape[1], volumeShape[2]);
  }

  return renderer;
}

/**
 * Quick visualization function - similar to cigvis Python API
 */
export function quickPlot(
  data: Float32Array,
  shape: [number, number, number],
  options: {
    pos?: { x?: number; y?: number; z?: number };
    cmap?: string;
    clim?: [number, number];
    container?: HTMLElement | string;
  } = {}
): VolumeRenderer {
  const nodes = createSlices({
    data,
    shape,
    pos: options.pos || {
      x: 0,
      y: 0,
      z: Math.floor(shape[2] / 2),
    },
    cmap: options.cmap || 'petrel',
    clim: options.clim,
  });

  return plot3D({
    nodes,
    container: options.container,
    volumeShape: shape,
  });
}
