/**
 * Three.js-based 3D volume renderer for CIGVis
 * Handles rendering of volume slices, surfaces, well logs, etc.
 */

import * as THREE from 'three';
import { CameraControls, CameraControlsOptions } from './camera-controls';
import { SliceNode, SurfaceNode, BodyNode, WellLogNode } from '../types';
import { createColormap, applyColormap } from '../colormap';

/** Options for the volume renderer */
export interface RendererOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
  bgColor?: string;
  showAxis?: boolean;
  showGrid?: boolean;
  cameraOptions?: CameraControlsOptions;
}

/**
 * Main 3D visualization renderer
 */
export class VolumeRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: CameraControls;
  private container: HTMLElement;
  private animationId: number | null = null;

  // Scene objects
  private sliceMeshes: Map<string, THREE.Mesh> = new Map();
  private surfaceMeshes: Map<string, THREE.Mesh> = new Map();
  private wellLogMeshes: Map<string, THREE.Group> = new Map();
  private bodyMeshes: Map<string, THREE.Mesh> = new Map();

  // Volume info
  private volumeShape: [number, number, number] = [0, 0, 0];

  constructor(options: RendererOptions) {
    this.container = options.container;

    // Create scene
    this.scene = new THREE.Scene();
    if (options.bgColor) {
      this.scene.background = new THREE.Color(options.bgColor);
    } else {
      this.scene.background = new THREE.Color(0x1a1a2e);
    }

    // Create camera
    const aspect = (options.width || this.container.clientWidth) /
                   (options.height || this.container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(5, 5, 5);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(
      options.width || this.container.clientWidth,
      options.height || this.container.clientHeight
    );
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Create controls
    this.controls = new CameraControls(
      this.camera,
      this.renderer.domElement,
      options.cameraOptions
    );

    // Add lights
    this.setupLights();

    // Add axis helper if requested
    if (options.showAxis !== false) {
      this.addAxisHelper();
    }

    // Add grid if requested
    if (options.showGrid) {
      this.addGrid();
    }

    // Start render loop
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-10, -10, -10);
    this.scene.add(directionalLight2);
  }

  private addAxisHelper(): void {
    const axesHelper = new THREE.AxesHelper(2);
    this.scene.add(axesHelper);
  }

  private addGrid(): void {
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x333333);
    this.scene.add(gridHelper);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Set volume dimensions (used for positioning slices)
   */
  setVolumeShape(ni: number, nx: number, nt: number): void {
    this.volumeShape = [ni, nx, nt];
  }

  /**
   * Add a slice to the scene
   */
  addSlice(node: SliceNode): void {
    const { axis, pos, data, shape, cmap, clim } = node;
    const [h, w] = shape;

    // Create image texture from data
    const imageData = applyColormap(data, w, h, cmap, clim);
    // Create a copy with a proper ArrayBuffer to satisfy Three.js types
    const buffer = new ArrayBuffer(imageData.byteLength);
    const view = new Uint8Array(buffer);
    view.set(imageData);
    const texture = new THREE.DataTexture(view, w, h, THREE.RGBAFormat);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: node.opacity,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Position and orient based on axis
    const [ni, nx, nt] = this.volumeShape;
    const scaleX = ni / Math.max(ni, nx, nt);
    const scaleY = nx / Math.max(ni, nx, nt);
    const scaleZ = nt / Math.max(ni, nx, nt);

    switch (axis) {
      case 'x':
        mesh.rotation.y = Math.PI / 2;
        mesh.position.x = (pos / ni) * scaleX - scaleX / 2;
        mesh.scale.set(scaleZ, scaleY, 1);
        break;
      case 'y':
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = (pos / nx) * scaleY - scaleY / 2;
        mesh.scale.set(scaleX, scaleZ, 1);
        break;
      case 'z':
        mesh.position.z = (pos / nt) * scaleZ - scaleZ / 2;
        mesh.scale.set(scaleX, scaleY, 1);
        break;
    }

    const key = `${axis}-${pos}`;
    this.sliceMeshes.set(key, mesh);
    this.scene.add(mesh);
  }

  /**
   * Add a surface to the scene
   */
  addSurface(node: SurfaceNode): void {
    const { heightMap, shape, color, opacity, valueData, cmap, clim } = node;
    const [h, w] = shape;

    // Create geometry from height map
    const geometry = new THREE.PlaneGeometry(1, 1, w - 1, h - 1);
    const positions = geometry.attributes.position;

    const [ni, nx, nt] = this.volumeShape;
    const maxDim = Math.max(ni, nx, nt);

    for (let i = 0; i < positions.count; i++) {
      const ix = i % w;
      const iy = Math.floor(i / w);
      const height = heightMap[iy * w + ix];

      // Scale height to normalized coordinates
      const z = (height / nt) * (nt / maxDim) - (nt / maxDim) / 2;
      positions.setZ(i, z);
    }

    geometry.computeVertexNormals();

    // Material
    let material: THREE.Material;
    if (valueData && cmap && clim) {
      // Color by values
      const colors = new Float32Array(positions.count * 3);
      const colormap = createColormap(cmap);
      for (let i = 0; i < positions.count; i++) {
        let t = (valueData[i] - clim[0]) / (clim[1] - clim[0]);
        t = Math.max(0, Math.min(1, t));
        const [r, g, b] = colormap.at(t);
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity,
      });
    } else {
      material = new THREE.MeshPhongMaterial({
        color: color || 0x888888,
        side: THREE.DoubleSide,
        transparent: true,
        opacity,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);

    // Position at center
    const scaleX = ni / maxDim;
    const scaleY = nx / maxDim;
    mesh.scale.set(scaleX, scaleY, 1);

    this.surfaceMeshes.set(`surface-${this.surfaceMeshes.size}`, mesh);
    this.scene.add(mesh);
  }

  /**
   * Add a well log to the scene
   */
  addWellLog(node: WellLogNode): void {
    const { trajectory, values, radius = 0.02, cmap, clim, style } = node;
    const group = new THREE.Group();

    const [ni, nx, nt] = this.volumeShape;
    const maxDim = Math.max(ni, nx, nt);

    if (style === 'line') {
      // Simple line
      const points = trajectory.map(p => new THREE.Vector3(
        (p.x / ni) * (ni / maxDim) - (ni / maxDim) / 2,
        (p.y / nx) * (nx / maxDim) - (nx / maxDim) / 2,
        (p.z / nt) * (nt / maxDim) - (nt / maxDim) / 2,
      ));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      let material: THREE.Material;
      if (values && cmap && clim) {
        const colors = new Float32Array(points.length * 3);
        const colormap = createColormap(cmap);
        for (let i = 0; i < points.length; i++) {
          let t = (values[i] - clim[0]) / (clim[1] - clim[0]);
          t = Math.max(0, Math.min(1, t));
          const [r, g, b] = colormap.at(t);
          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        material = new THREE.LineBasicMaterial({ vertexColors: true });
      } else {
        material = new THREE.LineBasicMaterial({ color: 0xffff00 });
      }

      const line = new THREE.Line(geometry, material);
      group.add(line);
    } else {
      // Tube geometry
      const points = trajectory.map(p => new THREE.Vector3(
        (p.x / ni) * (ni / maxDim) - (ni / maxDim) / 2,
        (p.y / nx) * (nx / maxDim) - (nx / maxDim) / 2,
        (p.z / nt) * (nt / maxDim) - (nt / maxDim) / 2,
      ));

      if (points.length < 2) return;

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeometry = new THREE.TubeGeometry(curve, points.length * 4, radius, 8, false);

      let material: THREE.Material;
      if (values && cmap && clim) {
        const colors = new Float32Array(tubeGeometry.attributes.position.count * 3);
        const colormap = createColormap(cmap);
        const positionAttr = tubeGeometry.attributes.position;

        for (let i = 0; i < positionAttr.count; i++) {
          // Approximate value based on position along tube
          const t = i / positionAttr.count;
          const valueIdx = Math.min(Math.floor(t * values.length), values.length - 1);
          let vt = (values[valueIdx] - clim[0]) / (clim[1] - clim[0]);
          vt = Math.max(0, Math.min(1, vt));
          const [r, g, b] = colormap.at(vt);
          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;
        }
        tubeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        material = new THREE.MeshPhongMaterial({ vertexColors: true });
      } else {
        material = new THREE.MeshPhongMaterial({ color: 0xffff00 });
      }

      const mesh = new THREE.Mesh(tubeGeometry, material);
      group.add(mesh);
    }

    this.wellLogMeshes.set(`welllog-${this.wellLogMeshes.size}`, group);
    this.scene.add(group);
  }

  /**
   * Add a body (isosurface) to the scene
   */
  addBody(node: BodyNode): void {
    const { volume, isoValue, color, cmap, clim } = node;

    // Marching cubes to extract isosurface
    const { positions, normals, indices } = this.marchingCubes(
      volume.data, volume.shape, isoValue
    );

    if (positions.length === 0) return;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);

    let material: THREE.Material;
    if (cmap && clim) {
      // Color by volume values
      const colors = new Float32Array(positions.length);
      const colormap = createColormap(cmap);
      const [ni, nx, nt] = volume.shape;

      for (let i = 0; i < positions.length / 3; i++) {
        const x = Math.round(positions[i * 3] * ni);
        const y = Math.round(positions[i * 3 + 1] * nx);
        const z = Math.round(positions[i * 3 + 2] * nt);
        const idx = x * nx * nt + y * nt + z;
        let t = (volume.data[idx] - clim[0]) / (clim[1] - clim[0]);
        t = Math.max(0, Math.min(1, t));
        const [r, g, b] = colormap.at(t);
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      material = new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide });
    } else {
      material = new THREE.MeshPhongMaterial({
        color: color || 0x00ff00,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: node.opacity,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    this.bodyMeshes.set(`body-${this.bodyMeshes.size}`, mesh);
    this.scene.add(mesh);
  }

  /**
   * Simple marching cubes implementation for isosurface extraction
   */
  private marchingCubes(
    data: Float32Array,
    shape: [number, number, number],
    isoValue: number
  ): { positions: number[]; normals: number[]; indices: number[] } {
    const [nx, ny, nz] = shape;
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    // Simplified marching cubes - in production, use a proper implementation
    for (let x = 0; x < nx - 1; x++) {
      for (let y = 0; y < ny - 1; y++) {
        for (let z = 0; z < nz - 1; z++) {
          // Get cube vertices
          const v = [
            data[x * ny * nz + y * nz + z],
            data[(x + 1) * ny * nz + y * nz + z],
            data[(x + 1) * ny * nz + (y + 1) * nz + z],
            data[x * ny * nz + (y + 1) * nz + z],
            data[x * ny * nz + y * nz + z + 1],
            data[(x + 1) * ny * nz + y * nz + z + 1],
            data[(x + 1) * ny * nz + (y + 1) * nz + z + 1],
            data[x * ny * nz + (y + 1) * nz + z + 1],
          ];

          // Check if surface passes through this cube
          const below = v.filter(val => val < isoValue).length;
          if (below === 0 || below === 8) continue;

          // Add a simple quad for each crossing (simplified)
          const idx = positions.length / 3;
          const sx = 1 / nx;
          const sy = 1 / ny;
          const sz = 1 / nz;

          positions.push(
            x * sx, y * sy, z * sz,
            (x + 1) * sx, y * sy, z * sz,
            (x + 1) * sx, (y + 1) * sy, z * sz,
            x * sx, (y + 1) * sy, z * sz,
          );

          normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);

          indices.push(idx, idx + 1, idx + 2, idx, idx + 2, idx + 3);
        }
      }
    }

    return { positions, normals, indices };
  }

  /**
   * Remove a node by key
   */
  removeNode(key: string): void {
    const mesh = this.sliceMeshes.get(key) ||
                 this.surfaceMeshes.get(key) ||
                 this.bodyMeshes.get(key);
    if (mesh) {
      this.scene.remove(mesh);
      this.sliceMeshes.delete(key);
      this.surfaceMeshes.delete(key);
      this.bodyMeshes.delete(key);
    }

    const group = this.wellLogMeshes.get(key);
    if (group) {
      this.scene.remove(group);
      this.wellLogMeshes.delete(key);
    }
  }

  /**
   * Clear all nodes
   */
  clearNodes(): void {
    this.sliceMeshes.forEach(mesh => this.scene.remove(mesh));
    this.surfaceMeshes.forEach(mesh => this.scene.remove(mesh));
    this.wellLogMeshes.forEach(group => this.scene.remove(group));
    this.bodyMeshes.forEach(mesh => this.scene.remove(mesh));

    this.sliceMeshes.clear();
    this.surfaceMeshes.clear();
    this.wellLogMeshes.clear();
    this.bodyMeshes.clear();
  }

  /**
   * Update slice position
   */
  updateSlicePosition(axis: 'x' | 'y' | 'z', pos: number): void {
    for (const [key, mesh] of this.sliceMeshes) {
      if (key.startsWith(`${axis}-`)) {
        const [ni, nx, nt] = this.volumeShape;
        const maxDim = Math.max(ni, nx, nt);

        switch (axis) {
          case 'x':
            mesh.position.x = (pos / ni) * (ni / maxDim) - (ni / maxDim) / 2;
            break;
          case 'y':
            mesh.position.y = (pos / nx) * (nx / maxDim) - (nx / maxDim) / 2;
            break;
          case 'z':
            mesh.position.z = (pos / nt) * (nt / maxDim) - (nt / maxDim) / 2;
            break;
        }
      }
    }
  }

  /**
   * Take a screenshot
   */
  screenshot(width?: number, height?: number): string {
    if (width && height) {
      this.renderer.setSize(width, height);
    }
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  /**
   * Reset camera view
   */
  resetView(): void {
    this.controls.reset();
  }

  /**
   * Set camera position
   */
  setCameraPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Resize renderer
   */
  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    this.clearNodes();
    this.renderer.dispose();
    this.controls.dispose();

    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
