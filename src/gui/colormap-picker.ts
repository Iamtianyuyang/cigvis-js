/**
 * Colormap picker Web Component for CIGVis
 *
 * Ported from cigvis Python library (cigvis/gui/)
 * Provides a colormap selection interface.
 *
 * @module gui/colormap-picker
 */

// ============================================================================
// Types
// ============================================================================

/** Colormap picker options */
export interface ColormapPickerOptions {
  /** Available colormap names */
  colormaps?: string[];
  /** Selected colormap */
  selected?: string;
  /** Width */
  width?: number;
  /** Height per colormap */
  itemHeight?: number;
}

/** Colormap change event */
export interface ColormapChangeEvent {
  /** Selected colormap name */
  colormap: string;
}

// ============================================================================
// Web Component
// ============================================================================

/**
 * Colormap picker Web Component.
 *
 * @example
 * ```html
 * <cigvis-colormap-picker selected="petrel"></cigvis-colormap-picker>
 * ```
 *
 * @example
 * ```ts
 * const picker = document.createElement('cigvis-colormap-picker');
 * picker.selected = 'petrel';
 * picker.addEventListener('change', (e) => {
 *   console.log(e.detail.colormap);
 * });
 * document.body.appendChild(picker);
 * ```
 */
export class ColormapPicker extends HTMLElement {
  private _selected: string = 'petrel';
  private _colormaps: string[] = [
    'gray', 'jet', 'hot', 'viridis', 'petrel',
    'cool', 'spring', 'summer', 'autumn', 'winter',
    'bone', 'copper', 'pink', 'rainbow', 'terrain',
  ];
  private _container: HTMLDivElement | null = null;

  static get observedAttributes() {
    return ['selected', 'colormaps'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'selected') {
      this._selected = newValue;
      this.render();
    } else if (name === 'colormaps') {
      try {
        this._colormaps = JSON.parse(newValue);
        this.render();
      } catch (e) {
        console.error('Invalid colormaps attribute:', e);
      }
    }
  }

  /** Get selected colormap */
  get selected(): string {
    return this._selected;
  }

  /** Set selected colormap */
  set selected(value: string) {
    this._selected = value;
    this.setAttribute('selected', value);
    this.render();
  }

  /** Get available colormaps */
  get colormaps(): string[] {
    return this._colormaps;
  }

  /** Set available colormaps */
  set colormaps(value: string[]) {
    this._colormaps = value;
    this.setAttribute('colormaps', JSON.stringify(value));
    this.render();
  }

  private render() {
    if (!this.shadowRoot) return;

    // Clear
    this.shadowRoot.innerHTML = '';

    // Styles
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        font-family: sans-serif;
        font-size: 12px;
      }
      .container {
        display: flex;
        flex-direction: column;
        gap: 2px;
        max-height: 300px;
        overflow-y: auto;
      }
      .item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        cursor: pointer;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      .item:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }
      .item.selected {
        background-color: rgba(0, 120, 215, 0.2);
        border: 1px solid rgba(0, 120, 215, 0.5);
      }
      .colorbar {
        flex: 1;
        height: 20px;
        border-radius: 3px;
        border: 1px solid #ccc;
      }
      .label {
        min-width: 80px;
        text-align: right;
        color: #333;
      }
    `;
    this.shadowRoot.appendChild(style);

    // Container
    this._container = document.createElement('div');
    this._container.className = 'container';

    // Create items
    for (const cmap of this._colormaps) {
      const item = document.createElement('div');
      item.className = `item${cmap === this._selected ? ' selected' : ''}`;

      // Colorbar preview
      const colorbar = document.createElement('div');
      colorbar.className = 'colorbar';
      colorbar.style.background = this.getGradient(cmap);

      // Label
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = cmap;

      item.appendChild(colorbar);
      item.appendChild(label);

      // Click handler
      item.addEventListener('click', () => {
        this._selected = cmap;
        this.setAttribute('selected', cmap);
        this.render();

        // Dispatch change event
        this.dispatchEvent(new CustomEvent('change', {
          detail: { colormap: cmap },
          bubbles: true,
          composed: true,
        }));
      });

      this._container.appendChild(item);
    }

    this.shadowRoot.appendChild(this._container);
  }

  private getGradient(cmap: string): string {
    const gradients: Record<string, string> = {
      gray: 'linear-gradient(to right, #000000, #ffffff)',
      jet: 'linear-gradient(to right, #000080, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000, #800000)',
      hot: 'linear-gradient(to right, #000000, #ff0000, #ffff00, #ffffff)',
      viridis: 'linear-gradient(to right, #440154, #31688e, #35b779, #fde725)',
      petrel: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
      cool: 'linear-gradient(to right, #00ffff, #ff00ff)',
      spring: 'linear-gradient(to right, #ff00ff, #ffff00)',
      summer: 'linear-gradient(to right, #00ff00, #ffff00)',
      autumn: 'linear-gradient(to right, #ff0000, #ffff00)',
      winter: 'linear-gradient(to right, #0000ff, #00ff00)',
      bone: 'linear-gradient(to right, #000000, #4c4c4c, #969696, #ffffff)',
      copper: 'linear-gradient(to right, #000000, #ff7f00)',
      pink: 'linear-gradient(to right, #1a0a0a, #ff69b4, #ffc0cb)',
      rainbow: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)',
      terrain: 'linear-gradient(to right, #0000ff, #00ff00, #ffff00, #8b4513, #ffffff)',
    };

    return gradients[cmap] || gradients.gray;
  }
}

// Register component (safe against double-registration)
if (typeof customElements !== 'undefined' && !customElements.get('cigvis-colormap-picker')) {
  customElements.define('cigvis-colormap-picker', ColormapPicker);
}
