/**
 * CIGVis 3D Browser Bundle
 * Standalone Three.js-based 3D volume viewer
 */

const CigVis3D = (() => {
  // Colormaps
  const colormaps = {
    gray: t => [t, t, t],
    petrel: t => {
      const r = Math.min(1, Math.max(0, t * 2 - 0.5));
      const g = Math.min(1, Math.max(0, 1 - Math.abs(t - 0.5) * 2));
      const b = Math.min(1, Math.max(0, 0.5 - t * 2 + 1));
      return [r, g, b];
    },
    seismic: t => {
      const r = Math.min(1, Math.max(0, t * 2));
      const g = Math.min(1, Math.max(0, 1 - Math.abs(t - 0.5) * 2));
      const b = Math.min(1, Math.max(0, 1 - t * 2));
      return [r, g, b];
    },
    jet: t => {
      const r = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 3)));
      const g = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 2)));
      const b = Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - 1)));
      return [r, g, b];
    },
    viridis: t => {
      const r = Math.min(1, Math.max(0, 0.267 + t * (0.004 + t * (0.322 + t * (-0.635 + t * 0.374)))));
      const g = Math.min(1, Math.max(0, 0.004 + t * (0.538 + t * (0.745 + t * (-1.225 + t * 0.567)))));
      const b = Math.min(1, Math.max(0, 0.329 + t * (1.378 + t * (-2.067 + t * (1.308 + t * (-0.398))))));
      return [r, g, b];
    },
  };

  // Generate volume data
  function generateVolume(nx, ny, nz) {
    const data = new Float32Array(nx * ny * nz);
    for (let z = 0; z < nz; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < nx; x++) {
          const fx = x / nx - 0.5;
          const fy = y / ny - 0.5;
          const fz = z / nz - 0.5;
          const layer = Math.sin(fx * 6 + fz * 4) * 0.3;
          const fold = Math.cos(fy * 4 + fx * 2) * 0.2;
          const noise = (Math.sin(x * 13.7 + y * 7.3 + z * 11.1) * 0.5 + 0.5) * 0.1;
          data[x * ny * nz + y * nz + z] = layer + fold + noise - 0.5;
        }
      }
    }
    return data;
  }

  // Create slice texture
  function createSliceTexture(data, nx, ny, nz, axis, pos, cmapName) {
    const cmap = colormaps[cmapName] || colormaps.petrel;
    let w, h, pixels;

    if (axis === 'x') {
      w = nz; h = ny;
      pixels = new Uint8Array(w * h * 4);
      for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) {
        const t = Math.max(0, Math.min(1, data[pos * ny * nz + y * nz + z] + 0.5));
        const [r, g, b] = cmap(t);
        const i = (y * nz + z) * 4;
        pixels[i] = r * 255; pixels[i+1] = g * 255; pixels[i+2] = b * 255; pixels[i+3] = 255;
      }
    } else if (axis === 'y') {
      w = nz; h = nx;
      pixels = new Uint8Array(w * h * 4);
      for (let x = 0; x < nx; x++) for (let z = 0; z < nz; z++) {
        const t = Math.max(0, Math.min(1, data[x * ny * nz + pos * nz + z] + 0.5));
        const [r, g, b] = cmap(t);
        const i = (x * nz + z) * 4;
        pixels[i] = r * 255; pixels[i+1] = g * 255; pixels[i+2] = b * 255; pixels[i+3] = 255;
      }
    } else {
      w = nx; h = ny;
      pixels = new Uint8Array(w * h * 4);
      for (let x = 0; x < nx; x++) for (let y = 0; y < ny; y++) {
        const t = Math.max(0, Math.min(1, data[x * ny * nz + y * nz + pos] + 0.5));
        const [r, g, b] = cmap(t);
        const i = (x * ny + y) * 4;
        pixels[i] = r * 255; pixels[i+1] = g * 255; pixels[i+2] = b * 255; pixels[i+3] = 255;
      }
    }

    const texture = new THREE.DataTexture(pixels, w, h, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }

  // OrbitControls (simplified)
  class OrbitControls {
    constructor(camera, domElement) {
      this.camera = camera;
      this.domElement = domElement;
      this.target = new THREE.Vector3();
      this.spherical = new THREE.Spherical();
      this.sphericalDelta = new THREE.Spherical();
      this.panOffset = new THREE.Vector3();
      this.scale = 1;
      this.rotateSpeed = 1.0;
      this.panSpeed = 1.0;
      this.zoomSpeed = 1.0;
      this.mouseStart = new THREE.Vector2();
      this.mouseEnd = new THREE.Vector2();
      this.mouseDelta = new THREE.Vector2();
      this.state = -1; // NONE

      this.bindEvents();
      this.update();
    }

    bindEvents() {
      this.domElement.addEventListener('mousedown', e => {
        if (e.button === 0) { this.state = 0; this.mouseStart.set(e.clientX, e.clientY); }
        else if (e.button === 2) { this.state = 2; this.mouseStart.set(e.clientX, e.clientY); }
      });
      this.domElement.addEventListener('mousemove', e => {
        if (this.state === 0) {
          this.mouseEnd.set(e.clientX, e.clientY);
          this.mouseDelta.subVectors(this.mouseEnd, this.mouseStart);
          this.sphericalDelta.theta -= 2 * Math.PI * this.mouseDelta.x * this.rotateSpeed / this.domElement.clientHeight;
          this.sphericalDelta.phi -= 2 * Math.PI * this.mouseDelta.y * this.rotateSpeed / this.domElement.clientHeight;
          this.mouseStart.copy(this.mouseEnd);
        } else if (this.state === 2) {
          this.mouseEnd.set(e.clientX, e.clientY);
          this.mouseDelta.subVectors(this.mouseEnd, this.mouseStart);
          this.pan(this.mouseDelta.x, this.mouseDelta.y);
          this.mouseStart.copy(this.mouseEnd);
        }
      });
      this.domElement.addEventListener('mouseup', () => this.state = -1);
      this.domElement.addEventListener('wheel', e => {
        e.preventDefault();
        this.scale *= e.deltaY < 0 ? 1 / Math.pow(0.95, this.zoomSpeed) : Math.pow(0.95, this.zoomSpeed);
      });
      this.domElement.addEventListener('contextmenu', e => e.preventDefault());
    }

    pan(dx, dy) {
      const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
      let d = offset.length() * Math.tan((this.camera.fov / 2) * Math.PI / 180);
      const v = new THREE.Vector3();
      v.setFromMatrixColumn(this.camera.matrix, 0).multiplyScalar(-2 * dx * d * this.panSpeed / this.domElement.clientHeight);
      this.panOffset.add(v);
      v.setFromMatrixColumn(this.camera.matrix, 1).multiplyScalar(2 * dy * d * this.panSpeed / this.domElement.clientHeight);
      this.panOffset.add(v);
    }

    update() {
      const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
      this.spherical.setFromVector3(offset);
      this.spherical.theta += this.sphericalDelta.theta * 0.05;
      this.spherical.phi += this.sphericalDelta.phi * 0.05;
      this.spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.spherical.phi));
      this.spherical.radius = Math.max(1, Math.min(20, offset.length() * this.scale));
      this.target.add(this.panOffset);
      offset.setFromSpherical(this.spherical);
      this.camera.position.copy(this.target).add(offset);
      this.camera.lookAt(this.target);
      this.sphericalDelta.theta *= 0.95;
      this.sphericalDelta.phi *= 0.95;
      this.panOffset.multiplyScalar(0.95);
      this.scale = 1;
    }
  }

  // Viewer class
  class Viewer {
    constructor(container) {
      this.container = container;
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0a0a0f);

      const aspect = container.clientWidth / container.clientHeight;
      this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
      this.camera.position.set(2.5, 2, 2.5);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(this.renderer.domElement);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

      // Lights
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dl = new THREE.DirectionalLight(0xffffff, 0.4);
      dl.position.set(5, 5, 5);
      this.scene.add(dl);

      // Axes
      this.scene.add(new THREE.AxesHelper(1.5));

      // Bounding box
      this.scene.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(2, 2, 2)),
        new THREE.LineBasicMaterial({ color: 0x333333 })
      ));

      // Slices
      this.slices = {};
      this.currentCmap = 'petrel';
      this.volumeData = null;
      this.volumeShape = [0, 0, 0];

      this.animate();

      // Resize
      window.addEventListener('resize', () => {
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
      });
    }

    createSlices(data, shape, positions) {
      this.volumeData = data;
      this.volumeShape = shape;

      const axes = ['x', 'y', 'z'];
      for (const axis of axes) {
        const pos = positions[axis] !== undefined ? Math.round(positions[axis] * (shape[axis === 'x' ? 0 : axis === 'y' ? 1 : 2] - 1)) : Math.floor(shape[axis === 'x' ? 0 : axis === 'y' ? 1 : 2] / 2);
        this.createSlice(axis, pos);
      }
    }

    createSlice(axis, pos) {
      const [ni, nx, nt] = this.volumeShape;
      const texture = createSliceTexture(this.volumeData, ni, nx, nt, axis, pos, this.currentCmap);
      const geom = new THREE.PlaneGeometry(2, 2);
      const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
      const mesh = new THREE.Mesh(geom, mat);

      if (axis === 'x') { mesh.rotation.y = Math.PI / 2; mesh.position.x = (pos / ni - 0.5) * 2; }
      else if (axis === 'y') { mesh.rotation.x = -Math.PI / 2; mesh.position.y = (pos / nx - 0.5) * 2; }
      else { mesh.position.z = (pos / nt - 0.5) * 2; }

      if (this.slices[axis]) this.scene.remove(this.slices[axis]);
      this.slices[axis] = mesh;
      this.scene.add(mesh);
    }

    setSlicePosition(axis, normalizedPos) {
      const [ni, nx, nt] = this.volumeShape;
      const dim = axis === 'x' ? ni : axis === 'y' ? nx : nt;
      const pos = Math.round(normalizedPos * (dim - 1));
      this.createSlice(axis, pos);
    }

    setSliceVisibility(axis, visible) {
      if (this.slices[axis]) {
        this.slices[axis].visible = visible;
      }
    }

    setColormap(cmapName) {
      this.currentCmap = cmapName;
      // Recreate all slices with new colormap
      for (const [axis, mesh] of Object.entries(this.slices)) {
        const [ni, nx, nt] = this.volumeShape;
        const pos = Math.round(mesh.position[axis === 'x' ? 'x' : axis === 'y' ? 'y' : 'z'] * (axis === 'x' ? ni : axis === 'y' ? nx : nt) / 2 + (axis === 'x' ? ni : axis === 'y' ? nx : nt) / 2);
        this.createSlice(axis, pos);
      }
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }

    dispose() {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
  }

  return {
    Viewer,
    generateVolume,
    colormaps,
  };
})();
