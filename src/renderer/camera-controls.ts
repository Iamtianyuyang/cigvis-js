/**
 * Camera controls for 3D visualization
 * Provides orbit, pan, and zoom controls
 */

import * as THREE from 'three';

export interface CameraControlsOptions {
  enableDamping?: boolean;
  dampingFactor?: number;
  enableZoom?: boolean;
  zoomSpeed?: number;
  enableRotate?: boolean;
  rotateSpeed?: number;
  enablePan?: boolean;
  panSpeed?: number;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
}

export class CameraControls {
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private domElement: HTMLElement;
  private target: THREE.Vector3;

  // State
  private spherical: THREE.Spherical;
  private sphericalDelta: THREE.Spherical;
  private panOffset: THREE.Vector3;
  private scale: number = 1;

  // Options
  public enableDamping: boolean = true;
  public dampingFactor: number = 0.05;
  public enableZoom: boolean = true;
  public zoomSpeed: number = 1.0;
  public enableRotate: boolean = true;
  public rotateSpeed: number = 1.0;
  public enablePan: boolean = true;
  public panSpeed: number = 1.0;
  public minDistance: number = 0;
  public maxDistance: number = Infinity;
  public minPolarAngle: number = 0;
  public maxPolarAngle: number = Math.PI;

  // Mouse state
  private rotateStart: THREE.Vector2 = new THREE.Vector2();
  private rotateEnd: THREE.Vector2 = new THREE.Vector2();
  private rotateDelta: THREE.Vector2 = new THREE.Vector2();
  private panStart: THREE.Vector2 = new THREE.Vector2();
  private panEnd: THREE.Vector2 = new THREE.Vector2();
  private panDelta: THREE.Vector2 = new THREE.Vector2();

  private STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
  };
  private state: number = this.STATE.NONE;

  // Store bound handlers for cleanup
  private _boundMouseDown: (e: MouseEvent) => void;
  private _boundMouseMove: (e: MouseEvent) => void;
  private _boundMouseUp: (e: MouseEvent) => void;
  private _boundWheel: (e: WheelEvent) => void;
  private _boundContextMenu: (e: Event) => void;

  constructor(
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
    domElement: HTMLElement,
    options?: CameraControlsOptions
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3();

    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();
    this.panOffset = new THREE.Vector3();

    if (options) {
      Object.assign(this, options);
    }

    // Bind handlers
    this._boundMouseDown = this.onMouseDown.bind(this);
    this._boundMouseMove = this.onMouseMove.bind(this);
    this._boundMouseUp = this.onMouseUp.bind(this);
    this._boundWheel = this.onMouseWheel.bind(this);
    this._boundContextMenu = (e) => e.preventDefault();

    this.bindEvents();
    this.update();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this._boundMouseDown);
    this.domElement.addEventListener('mousemove', this._boundMouseMove);
    this.domElement.addEventListener('mouseup', this._boundMouseUp);
    this.domElement.addEventListener('wheel', this._boundWheel);
    this.domElement.addEventListener('contextmenu', this._boundContextMenu);
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      if (!this.enableRotate) return;
      this.rotateStart.set(event.clientX, event.clientY);
      this.state = this.STATE.ROTATE;
    } else if (event.button === 1) {
      if (!this.enablePan) return;
      this.panStart.set(event.clientX, event.clientY);
      this.state = this.STATE.PAN;
    } else if (event.button === 2) {
      if (!this.enableZoom) return;
      this.rotateStart.set(event.clientX, event.clientY);
      this.state = this.STATE.DOLLY;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.state === this.STATE.ROTATE) {
      this.rotateEnd.set(event.clientX, event.clientY);
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

      const element = this.domElement;
      this.sphericalDelta.theta -= (2 * Math.PI * this.rotateDelta.x * this.rotateSpeed) / element.clientHeight;
      this.sphericalDelta.phi -= (2 * Math.PI * this.rotateDelta.y * this.rotateSpeed) / element.clientHeight;

      this.rotateStart.copy(this.rotateEnd);
    } else if (this.state === this.STATE.PAN) {
      this.panEnd.set(event.clientX, event.clientY);
      this.panDelta.subVectors(this.panEnd, this.panStart);
      this.pan(this.panDelta.x, this.panDelta.y);
      this.panStart.copy(this.panEnd);
    } else if (this.state === this.STATE.DOLLY) {
      this.rotateEnd.set(event.clientX, event.clientY);
      this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart);
      this.dollyDelta(this.rotateDelta.y);
      this.rotateStart.copy(this.rotateEnd);
    }
  }

  private onMouseUp(): void {
    this.state = this.STATE.NONE;
  }

  private onMouseWheel(event: WheelEvent): void {
    if (!this.enableZoom) return;
    event.preventDefault();

    if (event.deltaY < 0) {
      this.scale /= Math.pow(0.95, this.zoomSpeed);
    } else {
      this.scale *= Math.pow(0.95, this.zoomSpeed);
    }
  }

  private dollyDelta(delta: number): void {
    if (delta > 0) {
      this.scale /= Math.pow(0.95, this.zoomSpeed);
    } else {
      this.scale *= Math.pow(0.95, this.zoomSpeed);
    }
  }

  private pan(deltaX: number, deltaY: number): void {
    const offset = new THREE.Vector3();
    const element = this.domElement;

    if (this.camera instanceof THREE.PerspectiveCamera) {
      const position = this.camera.position;
      offset.copy(position).sub(this.target);
      let targetDistance = offset.length();
      targetDistance *= Math.tan(((this.camera.fov / 2) * Math.PI) / 180);

      this.panLeft((2 * deltaX * targetDistance * this.panSpeed) / element.clientHeight, this.camera.matrix);
      this.panUp((2 * deltaY * targetDistance * this.panSpeed) / element.clientHeight, this.camera.matrix);
    }
  }

  private panLeft(distance: number, objectMatrix: THREE.Matrix4): void {
    const v = new THREE.Vector3();
    v.setFromMatrixColumn(objectMatrix, 0);
    v.multiplyScalar(-distance);
    this.panOffset.add(v);
  }

  private panUp(distance: number, objectMatrix: THREE.Matrix4): void {
    const v = new THREE.Vector3();
    v.setFromMatrixColumn(objectMatrix, 1);
    v.multiplyScalar(distance);
    this.panOffset.add(v);
  }

  /**
   * Update camera position
   */
  update(): boolean {
    const offset = new THREE.Vector3();
    const position = this.camera.position;

    offset.copy(position).sub(this.target);

    // Spherical coordinates
    this.spherical.setFromVector3(offset);

    if (this.enableDamping) {
      this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor;
      this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor;
    } else {
      this.spherical.theta += this.sphericalDelta.theta;
      this.spherical.phi += this.sphericalDelta.phi;
    }

    // Clamp phi
    this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));

    this.spherical.radius = offset.length() * this.scale;
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    this.target.add(this.panOffset);

    offset.setFromSpherical(this.spherical);
    position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    if (this.enableDamping) {
      this.sphericalDelta.theta *= 1 - this.dampingFactor;
      this.sphericalDelta.phi *= 1 - this.dampingFactor;
      this.panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      this.sphericalDelta.set(0, 0, 0);
      this.panOffset.set(0, 0, 0);
    }

    this.scale = 1;

    return true;
  }

  /**
   * Reset camera to initial position
   */
  reset(): void {
    this.target.set(0, 0, 0);
    this.spherical.set(0, 0, 10);
    this.sphericalDelta.set(0, 0, 0);
    this.panOffset.set(0, 0, 0);
    this.scale = 1;
    this.update();
  }

  /**
   * Dispose event listeners
   */
  dispose(): void {
    this.domElement.removeEventListener('mousedown', this._boundMouseDown);
    this.domElement.removeEventListener('mousemove', this._boundMouseMove);
    this.domElement.removeEventListener('mouseup', this._boundMouseUp);
    this.domElement.removeEventListener('wheel', this._boundWheel);
    this.domElement.removeEventListener('contextmenu', this._boundContextMenu);
  }
}
