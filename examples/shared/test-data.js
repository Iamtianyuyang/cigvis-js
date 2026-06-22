/**
 * Test data generators for CIGVis examples
 * Generates synthetic seismic/geophysical data for demonstration
 */

const TestData = {
  /**
   * Generate a 1D seismic trace
   * @param {number} nSamples - Number of samples
   * @param {number} dt - Time interval (ms)
   * @returns {Float32Array}
   */
  generateTrace(nSamples = 1000, dt = 4) {
    const data = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; i++) {
      const t = i * dt / 1000;
      // Ricker wavelet + noise
      const f = 30; // 30 Hz dominant frequency
      const pi2f2 = (Math.PI * f) ** 2;
      const envelope = (1 - 2 * pi2f2 * t * t) * Math.exp(-pi2f2 * t * t);
      const noise = (Math.random() - 0.5) * 0.1;
      data[i] = envelope * 0.8 + noise;
    }
    return data;
  },

  /**
   * Generate multi-trace data (e.g., seismic section)
   * @param {number} nTraces - Number of traces
   * @param {number} nSamples - Samples per trace
   * @returns {{ data: Float32Array, nTraces: number, nSamples: number }}
   */
  generateMultiTraces(nTraces = 50, nSamples = 500) {
    const data = new Float32Array(nTraces * nSamples);
    for (let t = 0; t < nTraces; t++) {
      const phase = t * 0.1;
      for (let i = 0; i < nSamples; i++) {
        const time = i / nSamples;
        // Simple wavelet with phase shift
        const envelope = Math.exp(-((time - 0.3 - phase * 0.01) ** 2) / 0.01);
        const wavelet = Math.sin(2 * Math.PI * 8 * time + phase) * envelope;
        const noise = (Math.random() - 0.5) * 0.05;
        data[t * nSamples + i] = wavelet + noise;
      }
    }
    return { data, nTraces, nSamples };
  },

  /**
   * Generate a 2D seismic slice
   * @param {number} width - Width in pixels
   * @param {number} height - Height in pixels
   * @returns {{ data: Float32Array, width: number, height: number }}
   */
  generate2DSlice(width = 200, height = 150) {
    const data = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Create some layered structure
        const layer1 = Math.sin(x * 0.05 + y * 0.02) * 0.5;
        const layer2 = Math.cos(x * 0.03 - y * 0.04) * 0.3;
        const noise = (Math.random() - 0.5) * 0.1;
        data[y * width + x] = layer1 + layer2 + noise;
      }
    }
    return { data, width, height };
  },

  /**
   * Generate a 3D volume
   * @param {number} ni - Inline dimension
   * @param {number} nx - Crossline dimension
   * @param {number} nt - Time dimension
   * @returns {{ data: Float32Array, shape: [number, number, number] }}
   */
  generateVolume(ni = 64, nx = 64, nt = 64) {
    const data = new Float32Array(ni * nx * nt);
    for (let i = 0; i < ni; i++) {
      for (let j = 0; j < nx; j++) {
        for (let k = 0; k < nt; k++) {
          // Create some 3D structure
          const x = i / ni - 0.5;
          const y = j / nx - 0.5;
          const z = k / nt - 0.5;
          const r = Math.sqrt(x * x + y * y + z * z);
          const val = Math.sin(r * 10) * Math.exp(-r * 3);
          const noise = (Math.random() - 0.5) * 0.05;
          data[i * nx * nt + j * nt + k] = val + noise;
        }
      }
    }
    return { data, shape: [ni, nx, nt] };
  },

  /**
   * Generate a surface (horizon)
   * @param {number} ni - Inline dimension
   * @param {number} nx - Crossline dimension
   * @param {number} baseDepth - Base depth value
   * @returns {Float32Array}
   */
  generateSurface(ni = 64, nx = 64, baseDepth = 32) {
    const surface = new Float32Array(ni * nx);
    for (let i = 0; i < ni; i++) {
      for (let j = 0; j < nx; j++) {
        // Create a dipping horizon with some structure
        const x = i / ni;
        const y = j / nx;
        const dip = x * 10 + y * 5;
        const structure = Math.sin(x * Math.PI * 2) * Math.cos(y * Math.PI * 2) * 3;
        surface[i * nx + j] = baseDepth + dip + structure;
      }
    }
    return surface;
  },

  /**
   * Generate well log trajectory
   * @param {number} nPoints - Number of points
   * @returns {{ trajectory: Float32Array, values: Float32Array }}
   */
  generateWellLog(nPoints = 100) {
    const trajectory = new Float32Array(nPoints * 3);
    const values = new Float32Array(nPoints);

    for (let i = 0; i < nPoints; i++) {
      const t = i / nPoints;
      // Deviated well path
      trajectory[i * 3] = 32 + Math.sin(t * Math.PI) * 10; // x
      trajectory[i * 3 + 1] = 32 + t * 20; // y
      trajectory[i * 3 + 2] = t * 60; // z (depth)

      // Gamma ray values
      values[i] = 20 + Math.sin(t * 10) * 15 + Math.random() * 5;
    }

    return { trajectory, values };
  },

  /**
   * Generate point cloud data
   * @param {number} nPoints - Number of points
   * @returns {{ positions: Float32Array, values: Float32Array }}
   */
  generatePointCloud(nPoints = 1000) {
    const positions = new Float32Array(nPoints * 3);
    const values = new Float32Array(nPoints);

    for (let i = 0; i < nPoints; i++) {
      // Random points in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 0.4;

      positions[i * 3] = 0.5 + r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = 0.5 + r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = 0.5 + r * Math.cos(phi);

      // Value based on distance from center
      values[i] = r * 2.5;
    }

    return { positions, values };
  },

  /**
   * Generate random seismic-like image data
   * @param {number} width
   * @param {number} height
   * @returns {Float32Array}
   */
  generateSeismicImage(width = 256, height = 256) {
    const data = new Float32Array(width * height);

    // Create layered earth model
    const layers = [];
    let depth = 0;
    for (let i = 0; i < 8; i++) {
      depth += 20 + Math.random() * 30;
      layers.push({
        depth,
        amplitude: (Math.random() - 0.5) * 2,
        dip: (Math.random() - 0.5) * 0.02,
      });
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let val = 0;
        for (const layer of layers) {
          const layerY = layer.depth + x * layer.dip;
          const dist = Math.abs(y - layerY);
          if (dist < 3) {
            val += layer.amplitude * Math.exp(-(dist * dist) / 2);
          }
        }
        val += (Math.random() - 0.5) * 0.05;
        data[y * width + x] = val;
      }
    }

    return data;
  },
};

// Export for use in examples
if (typeof module !== 'undefined') {
  module.exports = TestData;
}
