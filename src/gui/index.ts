/**
 * GUI Web Components for CIGVis
 *
 * Ported from cigvis Python library (cigvis/gui/)
 * Provides Web Components for visualization controls.
 *
 * @module gui
 */

// ============================================================================
// Component imports
// ============================================================================

import { ColormapPicker as _ColormapPicker } from './colormap-picker';
import type { ColormapPickerOptions, ColormapChangeEvent } from './colormap-picker';

import { Sidebar as _Sidebar, SidebarSection as _SidebarSection } from './sidebar';
import type { SidebarSection as SidebarSectionType, SidebarOptions } from './sidebar';

// ============================================================================
// Re-exports
// ============================================================================

export const ColormapPicker = _ColormapPicker;
export const Sidebar = _Sidebar;
export const SidebarSection = _SidebarSection;

export type { ColormapPickerOptions, ColormapChangeEvent, SidebarSectionType, SidebarOptions };

// ============================================================================
// Additional components
// ============================================================================

/**
 * Range slider Web Component.
 */
export class RangeSlider extends HTMLElement {
  private _min: number = 0;
  private _max: number = 100;
  private _value: number = 50;
  private _step: number = 1;
  private _label: string = '';

  static get observedAttributes() {
    return ['min', 'max', 'value', 'step', 'label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'min') this._min = parseFloat(newValue) || 0;
    else if (name === 'max') this._max = parseFloat(newValue) || 100;
    else if (name === 'value') this._value = parseFloat(newValue) || 50;
    else if (name === 'step') this._step = parseFloat(newValue) || 1;
    else if (name === 'label') this._label = newValue || '';
    this.render();
  }

  get value(): number { return this._value; }
  set value(v: number) { this._value = v; this.setAttribute('value', String(v)); }
  get min(): number { return this._min; }
  set min(v: number) { this._min = v; this.setAttribute('min', String(v)); }
  get max(): number { return this._max; }
  set max(v: number) { this._max = v; this.setAttribute('max', String(v)); }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: sans-serif; font-size: 12px; }
        .container { display: flex; align-items: center; gap: 8px; }
        .label { min-width: 80px; color: #333; }
        input[type="range"] { flex: 1; }
        .value { min-width: 40px; text-align: right; color: #666; }
      </style>
      <div class="container">
        <span class="label">${this._label}</span>
        <input type="range" min="${this._min}" max="${this._max}" step="${this._step}" value="${this._value}">
        <span class="value">${this._value}</span>
      </div>
    `;

    const input = this.shadowRoot.querySelector('input')!;
    const valueEl = this.shadowRoot.querySelector('.value')!;

    input.addEventListener('input', () => {
      this._value = parseFloat(input.value);
      valueEl.textContent = String(this._value);

      this.dispatchEvent(new CustomEvent('change', {
        detail: { value: this._value },
        bubbles: true,
        composed: true,
      }));
    });
  }
}

/**
 * Button Web Component.
 */
export class CigvisButton extends HTMLElement {
  private _label: string = 'Button';
  private _variant: 'primary' | 'secondary' | 'ghost' = 'primary';

  static get observedAttributes() {
    return ['label', 'variant'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'label') this._label = newValue || 'Button';
    else if (name === 'variant') this._variant = (newValue as any) || 'primary';
    this.render();
  }

  get label(): string { return this._label; }
  set label(v: string) { this._label = v; this.setAttribute('label', v); }

  private render() {
    if (!this.shadowRoot) return;

    const colors = {
      primary: { bg: '#0078d4', text: '#ffffff', hover: '#106ebe' },
      secondary: { bg: '#e8e8e8', text: '#333333', hover: '#d4d4d4' },
      ghost: { bg: 'transparent', text: '#333333', hover: '#e8e8e8' },
    };

    const c = colors[this._variant];

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; font-family: sans-serif; font-size: 12px; }
        button {
          padding: 6px 16px;
          border: 1px solid ${this._variant === 'ghost' ? '#ccc' : c.bg};
          border-radius: 4px;
          background-color: ${c.bg};
          color: ${c.text};
          cursor: pointer;
          font-size: 12px;
          transition: background-color 0.2s;
        }
        button:hover { background-color: ${c.hover}; }
      </style>
      <button>${this._label}</button>
    `;

    this.shadowRoot.querySelector('button')!.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('click', { bubbles: true, composed: true }));
    });
  }
}

/**
 * Dropdown select Web Component.
 */
export class DropdownSelect extends HTMLElement {
  private _options: Array<{ value: string; label: string }> = [];
  private _value: string = '';
  private _label: string = '';

  static get observedAttributes() {
    return ['value', 'label', 'options'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'value') this._value = newValue || '';
    else if (name === 'label') this._label = newValue || '';
    else if (name === 'options') {
      try { this._options = JSON.parse(newValue); } catch {}
    }
    this.render();
  }

  get value(): string { return this._value; }
  set value(v: string) { this._value = v; this.setAttribute('value', v); }

  setOptions(options: Array<{ value: string; label: string }>) {
    this._options = options;
    this.render();
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: sans-serif; font-size: 12px; }
        .container { display: flex; align-items: center; gap: 8px; }
        .label { min-width: 80px; color: #333; }
        select { flex: 1; padding: 4px; border: 1px solid #ccc; border-radius: 4px; }
      </style>
      <div class="container">
        <span class="label">${this._label}</span>
        <select>
          ${this._options.map(o => `<option value="${o.value}"${o.value === this._value ? ' selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>
    `;

    this.shadowRoot.querySelector('select')!.addEventListener('change', (e) => {
      this._value = (e.target as HTMLSelectElement).value;
      this.dispatchEvent(new CustomEvent('change', {
        detail: { value: this._value },
        bubbles: true,
        composed: true,
      }));
    });
  }
}

/**
 * Plot canvas Web Component.
 */
export class PlotCanvas extends HTMLElement {
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  /** Get canvas element */
  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  /** Get 2D context */
  get ctx(): CanvasRenderingContext2D | null {
    return this._ctx;
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        canvas { display: block; width: 100%; height: 100%; }
      </style>
      <canvas></canvas>
    `;

    this._canvas = this.shadowRoot.querySelector('canvas')!;
    this._ctx = this._canvas.getContext('2d')!;

    // Resize observer
    const observer = new ResizeObserver(() => {
      if (this._canvas) {
        this._canvas.width = this.clientWidth;
        this._canvas.height = this.clientHeight;
      }
    });
    observer.observe(this);
  }
}

// Register components
if (typeof customElements !== 'undefined') {
  customElements.define('cigvis-range-slider', RangeSlider);
  customElements.define('cigvis-button', CigvisButton);
  customElements.define('cigvis-dropdown-select', DropdownSelect);
  customElements.define('cigvis-plot-canvas', PlotCanvas);
}

// ============================================================================
// Agent interface
// ============================================================================

/**
 * Create a GUI agent for programmatic access.
 */
export function createGuiAgent() {
  return {
    ColormapPicker,
    Sidebar,
    SidebarSection,
    RangeSlider,
    CigvisButton,
    DropdownSelect,
    PlotCanvas,
  };
}
