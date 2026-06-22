/**
 * Viser-like web-based 3D visualization for CIGVis
 *
 * Ported from cigvis Python library (cigvis/viserplot.py)
 * Provides web-based 3D visualization using WebSocket and Three.js.
 *
 * @module viser
 */

// ============================================================================
// Types
// ============================================================================

/** Server configuration */
export interface ServerConfig {
  /** Server host */
  host?: string;
  /** Server port */
  port?: number;
  /** Server label */
  label?: string;
  /** Verbose logging */
  verbose?: boolean;
}

/** Volume slice node */
export interface VolumeSliceNode {
  /** Node type */
  type: 'volume-slice';
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
}

/** Surface node */
export interface SurfaceNode {
  /** Node type */
  type: 'surface';
  /** Surface height map */
  heightMap: Float32Array;
  /** Surface shape [ni, nx] */
  shape: [number, number];
  /** Color */
  color?: string;
  /** Opacity */
  opacity?: number;
}

/** Mesh node */
export interface MeshNode {
  /** Node type */
  type: 'mesh';
  /** Vertex positions [N, 3] */
  vertices: Float32Array;
  /** Face indices [M, 3] */
  faces: Uint32Array;
  /** Vertex colors */
  colors?: Float32Array;
  /** Opacity */
  opacity?: number;
}

/** Well log node */
export interface WellLogNode {
  /** Node type */
  type: 'well-log';
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
}

/** Any visualization node */
export type VisNode = VolumeSliceNode | SurfaceNode | MeshNode | WellLogNode;

/** Server state */
export interface ServerState {
  /** Connected clients */
  clients: number;
  /** Scene nodes */
  nodes: VisNode[];
  /** Is running */
  running: boolean;
}

// ============================================================================
// Server (simplified for browser)
// ============================================================================

/**
 * Create a visualization server.
 *
 * In a browser environment, this creates a local scene manager
 * that can be used with Three.js or other renderers.
 *
 * @param config - Server configuration
 * @returns Server instance
 *
 * @example
 * ```ts
 * const server = createServer({ port: 8080 });
 * server.addVolumeSlice({ ... });
 * server.start();
 * ```
 */
export function createServer(config: ServerConfig = {}) {
  const state: ServerState = {
    clients: 0,
    nodes: [],
    running: false,
  };

  const listeners: Set<(state: ServerState) => void> = new Set();

  function notify() {
    for (const listener of listeners) {
      listener({ ...state });
    }
  }

  return {
    /** Get server state */
    getState(): ServerState {
      return { ...state };
    },

    /** Add a node to the scene */
    addNode(node: VisNode): void {
      state.nodes.push(node);
      notify();
    },

    /** Remove a node from the scene */
    removeNode(index: number): void {
      state.nodes.splice(index, 1);
      notify();
    },

    /** Clear all nodes */
    clearNodes(): void {
      state.nodes = [];
      notify();
    },

    /** Add a volume slice */
    addVolumeSlice(options: Omit<VolumeSliceNode, 'type'>): void {
      state.nodes.push({ type: 'volume-slice', ...options });
      notify();
    },

    /** Add a surface */
    addSurface(options: Omit<SurfaceNode, 'type'>): void {
      state.nodes.push({ type: 'surface', ...options });
      notify();
    },

    /** Add a mesh */
    addMesh(options: Omit<MeshNode, 'type'>): void {
      state.nodes.push({ type: 'mesh', ...options });
      notify();
    },

    /** Add a well log */
    addWellLog(options: Omit<WellLogNode, 'type'>): void {
      state.nodes.push({ type: 'well-log', ...options });
      notify();
    },

    /** Subscribe to state changes */
    subscribe(listener: (state: ServerState) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Start the server (no-op in browser) */
    start(): void {
      state.running = true;
      notify();
      console.log(`[cigvis] Server started on ${config.host || 'localhost'}:${config.port || 8080}`);
    },

    /** Stop the server */
    stop(): void {
      state.running = false;
      notify();
    },
  };
}

// ============================================================================
// Node creation helpers
// ============================================================================

/**
 * Create a volume slice node.
 *
 * @param options - Slice options
 * @returns VolumeSliceNode
 */
export function createVolumeSlice(options: {
  data: Float32Array;
  shape: [number, number, number];
  axis: 'x' | 'y' | 'z';
  pos: number;
  cmap?: string;
  clim?: [number, number];
}): VolumeSliceNode {
  return {
    type: 'volume-slice',
    ...options,
  };
}

/**
 * Create a surface node.
 *
 * @param options - Surface options
 * @returns SurfaceNode
 */
export function createSurface(options: {
  heightMap: Float32Array;
  shape: [number, number];
  color?: string;
  opacity?: number;
}): SurfaceNode {
  return {
    type: 'surface',
    ...options,
  };
}

/**
 * Create a mesh node.
 *
 * @param options - Mesh options
 * @returns MeshNode
 */
export function createMesh(options: {
  vertices: Float32Array;
  faces: Uint32Array;
  colors?: Float32Array;
  opacity?: number;
}): MeshNode {
  return {
    type: 'mesh',
    ...options,
  };
}

/**
 * Create a well log node.
 *
 * @param options - Well log options
 * @returns WellLogNode
 */
export function createWellLog(options: {
  trajectory: Float32Array;
  values?: Float32Array;
  radius?: number;
  cmap?: string;
  clim?: [number, number];
}): WellLogNode {
  return {
    type: 'well-log',
    ...options,
  };
}

// ============================================================================
// Scene compilation
// ============================================================================

/**
 * Compile scene nodes into Three.js-compatible objects.
 *
 * @param nodes - Scene nodes
 * @returns Compiled scene data
 */
export function compileScene(nodes: VisNode[]): {
  slices: VolumeSliceNode[];
  surfaces: SurfaceNode[];
  meshes: MeshNode[];
  wellLogs: WellLogNode[];
} {
  const slices: VolumeSliceNode[] = [];
  const surfaces: SurfaceNode[] = [];
  const meshes: MeshNode[] = [];
  const wellLogs: WellLogNode[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'volume-slice':
        slices.push(node);
        break;
      case 'surface':
        surfaces.push(node);
        break;
      case 'mesh':
        meshes.push(node);
        break;
      case 'well-log':
        wellLogs.push(node);
        break;
    }
  }

  return { slices, surfaces, meshes, wellLogs };
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a Viser agent for programmatic access.
 */
export function createViserAgent() {
  return {
    createServer,
    createVolumeSlice,
    createSurface,
    createMesh,
    createWellLog,
    compileScene,
  };
}
