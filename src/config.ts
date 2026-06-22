/**
 * Global configuration for CIGVis
 *
 * Ported from cigvis Python library (cigvis/config.py)
 * Controls data ordering and axis system conventions.
 *
 * @module config
 */

// ============================================================================
// Types
// ============================================================================

/** Configuration state */
export interface CigvisConfig {
  /** Is the first dimension inline? If true, volume.shape is (ni, nx, nt) */
  lineFirst: boolean;
  /** Is the X axis reversed? */
  xReversed: boolean;
  /** Is the Y axis reversed? */
  yReversed: boolean;
  /** Is the Z axis reversed? */
  zReversed: boolean;
}

/** Configuration change listener */
export type ConfigListener = (config: CigvisConfig) => void;

/** Agent interface for programmatic configuration access */
export interface ConfigAgent {
  /** Get current configuration */
  getConfig(): CigvisConfig;
  /** Set configuration */
  setConfig(config: Partial<CigvisConfig>): void;
  /** Reset to defaults */
  resetConfig(): void;
  /** Subscribe to changes */
  onConfigChange(listener: ConfigListener): () => void;
}

// ============================================================================
// State
// ============================================================================

/** Default configuration */
const DEFAULT_CONFIG: CigvisConfig = {
  lineFirst: true,
  xReversed: false,
  yReversed: true,
  zReversed: true,
};

/** Current configuration state */
let _config: CigvisConfig = { ...DEFAULT_CONFIG };

/** Registered listeners */
const _listeners: Set<ConfigListener> = new Set();

// ============================================================================
// Internal helpers
// ============================================================================

function _notify(): void {
  const snapshot = { ..._config };
  for (const listener of _listeners) {
    try {
      listener(snapshot);
    } catch (e) {
      console.error('[cigvis] config listener error:', e);
    }
  }
}

// ============================================================================
// Data order (line first / time first)
// ============================================================================

/**
 * Check if the first dimension is inline.
 *
 * If true, volume.shape is like (ni, nx, nt)
 * If false, volume.shape is like (nt, nx, ni)
 *
 * @returns Whether the first dimension is inline
 */
export function isLineFirst(): boolean {
  return _config.lineFirst;
}

/**
 * Set data ordering convention.
 *
 * @param lineFirst - If true, first dimension is inline (ni, nx, nt)
 * @throws {TypeError} If lineFirst is not a boolean
 */
export function setOrder(lineFirst: boolean): void {
  if (typeof lineFirst !== 'boolean') {
    throw new TypeError(`Expected boolean, got ${typeof lineFirst}`);
  }
  _config.lineFirst = lineFirst;
  _notify();
}

// ============================================================================
// Axis reversal
// ============================================================================

/**
 * Check if the X axis is reversed.
 *
 * @returns Whether X axis is reversed
 */
export function isXReversed(): boolean {
  return _config.xReversed;
}

/**
 * Set X axis reversal.
 *
 * @param reverse - Whether to reverse X axis
 * @throws {TypeError} If reverse is not a boolean
 */
export function setXReversed(reverse: boolean): void {
  if (typeof reverse !== 'boolean') {
    throw new TypeError(`Expected boolean, got ${typeof reverse}`);
  }
  _config.xReversed = reverse;
  _notify();
}

/**
 * Check if the Y axis is reversed.
 *
 * @returns Whether Y axis is reversed
 */
export function isYReversed(): boolean {
  return _config.yReversed;
}

/**
 * Set Y axis reversal.
 *
 * @param reverse - Whether to reverse Y axis
 * @throws {TypeError} If reverse is not a boolean
 */
export function setYReversed(reverse: boolean): void {
  if (typeof reverse !== 'boolean') {
    throw new TypeError(`Expected boolean, got ${typeof reverse}`);
  }
  _config.yReversed = reverse;
  _notify();
}

/**
 * Check if the Z axis is reversed.
 *
 * @returns Whether Z axis is reversed
 */
export function isZReversed(): boolean {
  return _config.zReversed;
}

/**
 * Set Z axis reversal.
 *
 * @param reverse - Whether to reverse Z axis
 * @throws {TypeError} If reverse is not a boolean
 */
export function setZReversed(reverse: boolean): void {
  if (typeof reverse !== 'boolean') {
    throw new TypeError(`Expected boolean, got ${typeof reverse}`);
  }
  _config.zReversed = reverse;
  _notify();
}

/**
 * Get axis reversal state as a tuple.
 *
 * @returns [xReversed, yReversed, zReversed]
 */
export function isAxisReversed(): [boolean, boolean, boolean] {
  return [_config.xReversed, _config.yReversed, _config.zReversed];
}

/**
 * Set all axis reversal states at once.
 *
 * @param x - X axis reversed
 * @param y - Y axis reversed
 * @param z - Z axis reversed
 */
export function setAxisReversed(x: boolean, y: boolean, z: boolean): void {
  if (typeof x !== 'boolean' || typeof y !== 'boolean' || typeof z !== 'boolean') {
    throw new TypeError('All arguments must be booleans');
  }
  _config.xReversed = x;
  _config.yReversed = y;
  _config.zReversed = z;
  _notify();
}

// ============================================================================
// Full config access
// ============================================================================

/**
 * Get a snapshot of the current configuration.
 *
 * @returns Current configuration (copy)
 */
export function getConfig(): CigvisConfig {
  return { ..._config };
}

/**
 * Set multiple configuration values at once.
 *
 * @param config - Partial configuration to merge
 */
export function setConfig(config: Partial<CigvisConfig>): void {
  if (config.lineFirst !== undefined) {
    if (typeof config.lineFirst !== 'boolean') {
      throw new TypeError(`lineFirst: expected boolean, got ${typeof config.lineFirst}`);
    }
    _config.lineFirst = config.lineFirst;
  }
  if (config.xReversed !== undefined) {
    if (typeof config.xReversed !== 'boolean') {
      throw new TypeError(`xReversed: expected boolean, got ${typeof config.xReversed}`);
    }
    _config.xReversed = config.xReversed;
  }
  if (config.yReversed !== undefined) {
    if (typeof config.yReversed !== 'boolean') {
      throw new TypeError(`yReversed: expected boolean, got ${typeof config.yReversed}`);
    }
    _config.yReversed = config.yReversed;
  }
  if (config.zReversed !== undefined) {
    if (typeof config.zReversed !== 'boolean') {
      throw new TypeError(`zReversed: expected boolean, got ${typeof config.zReversed}`);
    }
    _config.zReversed = config.zReversed;
  }
  _notify();
}

/**
 * Reset configuration to defaults.
 */
export function resetConfig(): void {
  _config = { ...DEFAULT_CONFIG };
  _notify();
}

// ============================================================================
// Change subscription
// ============================================================================

/**
 * Subscribe to configuration changes.
 *
 * @param listener - Callback invoked on any config change
 * @returns Unsubscribe function
 */
export function onConfigChange(listener: ConfigListener): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a configuration agent for programmatic access.
 * Provides a stable API surface for AI agents and automation.
 *
 * @returns ConfigAgent instance
 */
export function createConfigAgent(): ConfigAgent {
  return {
    getConfig,
    setConfig,
    resetConfig,
    onConfigChange,
  };
}
