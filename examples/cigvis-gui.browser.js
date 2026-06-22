// CIGVis GUI Components - Browser Bundle
// This file registers all Web Components for use in plain HTML

(function() {
  'use strict';

  // ========================================================================
  // Helpers
  // ========================================================================

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseNumber(value, fallback) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }

  function safeDefine(name, constructor) {
    if (typeof customElements !== 'undefined' && !customElements.get(name)) {
      customElements.define(name, constructor);
    }
  }

  // ========================================================================
  // ColormapPicker
  // ========================================================================

  class ColormapPicker extends HTMLElement {
    constructor() {
      super();
      this._selected = 'petrel';
      this._colormaps = [
        'gray', 'jet', 'hot', 'viridis', 'petrel',
        'cool', 'spring', 'summer', 'autumn', 'winter',
        'bone', 'copper', 'pink', 'rainbow', 'terrain',
      ];
      this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['selected', 'colormaps']; }

    connectedCallback() { this.render(); }

    attributeChangedCallback(name, _old, value) {
      if (name === 'selected') { this._selected = value; this.render(); }
      else if (name === 'colormaps') {
        try { this._colormaps = JSON.parse(value); this.render(); }
        catch (e) { console.error('Invalid colormaps:', e); }
      }
    }

    get selected() { return this._selected; }
    set selected(v) { this._selected = v; this.setAttribute('selected', v); }
    get colormaps() { return this._colormaps; }
    set colormaps(v) { this._colormaps = v; this.setAttribute('colormaps', JSON.stringify(v)); this.render(); }

    getGradient(cmap) {
      const g = {
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
      return g[cmap] || g.gray;
    }

    render() {
      if (!this.shadowRoot) return;
      this.shadowRoot.innerHTML = '';

      const style = document.createElement('style');
      style.textContent = `
        :host { display: block; font-family: sans-serif; font-size: 12px; }
        .container { display: flex; flex-direction: column; gap: 2px; max-height: 300px; overflow-y: auto; }
        .item { display: flex; align-items: center; gap: 8px; padding: 4px 8px; cursor: pointer; border-radius: 4px; transition: background-color 0.2s; }
        .item:hover { background-color: rgba(255, 255, 255, 0.1); }
        .item.selected { background-color: rgba(0, 120, 215, 0.2); border: 1px solid rgba(0, 120, 215, 0.5); }
        .colorbar { flex: 1; height: 20px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.2); }
        .label { min-width: 80px; text-align: right; color: #ccc; }
      `;
      this.shadowRoot.appendChild(style);

      const container = document.createElement('div');
      container.className = 'container';

      for (const cmap of this._colormaps) {
        const item = document.createElement('div');
        item.className = `item${cmap === this._selected ? ' selected' : ''}`;

        const bar = document.createElement('div');
        bar.className = 'colorbar';
        bar.style.background = this.getGradient(cmap);

        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = cmap;

        item.appendChild(bar);
        item.appendChild(label);
        item.addEventListener('click', () => {
          this._selected = cmap;
          this.setAttribute('selected', cmap);
          this.render();
          this.dispatchEvent(new CustomEvent('change', { detail: { colormap: cmap }, bubbles: true, composed: true }));
        });

        container.appendChild(item);
      }

      this.shadowRoot.appendChild(container);
    }
  }

  // ========================================================================
  // Sidebar & SidebarSection
  // ========================================================================

  class Sidebar extends HTMLElement {
    constructor() {
      super();
      this._width = 250;
      this._position = 'right';
      this._backgroundColor = '#0f1117';
      this._sections = [];
      this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['width', 'position', 'background-color']; }

    connectedCallback() { this.render(); }

    attributeChangedCallback(name, _old, value) {
      if (name === 'width') this._width = parseInt(value) || 250;
      else if (name === 'position') this._position = (value === 'left' || value === 'right') ? value : 'right';
      else if (name === 'background-color') this._backgroundColor = value || '#16213e';
      this.render();
    }

    addSection(section) { this._sections.push(section); this.render(); }
    removeSection(title) { this._sections = this._sections.filter(s => s.title !== title); this.render(); }

    render() {
      if (!this.shadowRoot) return;
      this.shadowRoot.innerHTML = '';

      const style = document.createElement('style');
      style.textContent = `
        :host { display: block; font-family: sans-serif; font-size: 12px; }
        .sidebar { width: ${this._width}px; background: ${this._backgroundColor}; overflow-y: auto; height: 100%; }
        .section { border-bottom: 1px solid rgba(255,255,255,0.06); }
        .section-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; cursor: pointer; user-select: none; }
        .section-header:hover { background: rgba(255,255,255,0.03); }
        .section-title { font-weight: 600; color: #8b8fa3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
        .section-toggle { font-size: 10px; color: #5c6078; transition: transform 0.2s; }
        .section-toggle.collapsed { transform: rotate(-90deg); }
        .section-content { padding: 8px 14px; }
        .section-content.collapsed { display: none; }
      `;
      this.shadowRoot.appendChild(style);

      const container = document.createElement('div');
      container.className = 'sidebar';

      // Slotted children
      const slots = this.querySelectorAll('cigvis-sidebar-section');
      for (const slot of slots) {
        const title = slot.getAttribute('title') || 'Section';
        const collapsed = slot.hasAttribute('collapsed');
        const section = this.createSection(title, slot, collapsed);
        container.appendChild(section);
      }

      // Programmatic sections
      for (const section of this._sections) {
        const el = this.createSectionFromConfig(section);
        container.appendChild(el);
      }

      this.shadowRoot.appendChild(container);
    }

    createSection(title, source, collapsed) {
      const section = document.createElement('div');
      section.className = 'section';

      const header = this.createHeader(title, collapsed);
      const contentEl = document.createElement('div');
      contentEl.className = `section-content${collapsed ? ' collapsed' : ''}`;

      for (const child of Array.from(source.childNodes)) {
        contentEl.appendChild(child.cloneNode(true));
      }

      this.attachToggle(header, contentEl, title);
      section.appendChild(header);
      section.appendChild(contentEl);
      return section;
    }

    createSectionFromConfig(section) {
      const wrapper = document.createElement('div');
      wrapper.className = 'section';

      const header = this.createHeader(section.title, section.collapsed ?? false);
      const contentEl = document.createElement('div');
      contentEl.className = `section-content${section.collapsed ? ' collapsed' : ''}`;

      if (typeof section.content === 'string') contentEl.innerHTML = section.content;
      else contentEl.appendChild(section.content);

      this.attachToggle(header, contentEl, section.title);
      wrapper.appendChild(header);
      wrapper.appendChild(contentEl);
      return wrapper;
    }

    createHeader(title, collapsed) {
      const header = document.createElement('div');
      header.className = 'section-header';

      const titleEl = document.createElement('span');
      titleEl.className = 'section-title';
      titleEl.textContent = title;

      const toggle = document.createElement('span');
      toggle.className = `section-toggle${collapsed ? ' collapsed' : ''}`;
      toggle.textContent = '▼';

      header.appendChild(titleEl);
      header.appendChild(toggle);
      return header;
    }

    attachToggle(header, contentEl, title) {
      header.addEventListener('click', () => {
        const isCollapsed = contentEl.classList.toggle('collapsed');
        const toggle = header.querySelector('.section-toggle');
        if (toggle) toggle.classList.toggle('collapsed', isCollapsed);
        this.dispatchEvent(new CustomEvent('toggle', { detail: { title, collapsed: isCollapsed }, bubbles: true, composed: true }));
      });
    }
  }

  class SidebarSection extends HTMLElement {
    static get observedAttributes() { return ['title', 'collapsed']; }
    constructor() { super(); this.style.display = 'none'; }
    get title() { return this.getAttribute('title') || 'Section'; }
    set title(v) { this.setAttribute('title', v); }
    get collapsed() { return this.hasAttribute('collapsed'); }
    set collapsed(v) { v ? this.setAttribute('collapsed', '') : this.removeAttribute('collapsed'); }
  }

  // ========================================================================
  // RangeSlider
  // ========================================================================

  class RangeSlider extends HTMLElement {
    constructor() {
      super();
      this._min = 0;
      this._max = 100;
      this._value = 50;
      this._step = 1;
      this._label = '';
      this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['min', 'max', 'value', 'step', 'label']; }

    connectedCallback() { this.render(); }

    attributeChangedCallback(name, _old, value) {
      if (name === 'min') this._min = parseNumber(value, 0);
      else if (name === 'max') this._max = parseNumber(value, 100);
      else if (name === 'value') this._value = parseNumber(value, 50);
      else if (name === 'step') this._step = parseNumber(value, 1);
      else if (name === 'label') this._label = value || '';
      this.render();
    }

    get value() { return this._value; }
    set value(v) { this._value = v; this.setAttribute('value', String(v)); }
    get min() { return this._min; }
    set min(v) { this._min = v; this.setAttribute('min', String(v)); }
    get max() { return this._max; }
    set max(v) { this._max = v; this.setAttribute('max', String(v)); }

    render() {
      if (!this.shadowRoot) return;
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; font-family: sans-serif; font-size: 12px; }
          .container { display: flex; align-items: center; gap: 8px; }
          .label { min-width: 80px; color: #8b8fa3; }
          input[type="range"] { flex: 1; accent-color: #00d4aa; }
          .value { min-width: 40px; text-align: right; color: #e8eaed; font-family: monospace; }
        </style>
        <div class="container">
          <span class="label">${escapeHtml(this._label)}</span>
          <input type="range" min="${this._min}" max="${this._max}" step="${this._step}" value="${this._value}">
          <span class="value">${this._value}</span>
        </div>
      `;

      const input = this.shadowRoot.querySelector('input');
      const valueEl = this.shadowRoot.querySelector('.value');
      input.addEventListener('input', () => {
        this._value = parseFloat(input.value);
        valueEl.textContent = String(this._value);
        this.dispatchEvent(new CustomEvent('change', { detail: { value: this._value }, bubbles: true, composed: true }));
      });
    }
  }

  // ========================================================================
  // CigvisButton
  // ========================================================================

  class CigvisButton extends HTMLElement {
    constructor() {
      super();
      this._label = 'Button';
      this._variant = 'primary';
      this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['label', 'variant']; }

    connectedCallback() { this.render(); }

    attributeChangedCallback(name, _old, value) {
      if (name === 'label') this._label = value || 'Button';
      else if (name === 'variant') {
        const valid = ['primary', 'secondary', 'ghost'];
        this._variant = valid.includes(value) ? value : 'primary';
      }
      this.render();
    }

    get label() { return this._label; }
    set label(v) { this._label = v; this.setAttribute('label', v); }

    render() {
      if (!this.shadowRoot) return;
      const colors = {
        primary: { bg: '#00d4aa', text: '#0a0c10', hover: '#00eabb' },
        secondary: { bg: '#232736', text: '#e8eaed', hover: '#2a2e3e' },
        ghost: { bg: 'transparent', text: '#e8eaed', hover: 'rgba(255,255,255,0.06)' },
      };
      const c = colors[this._variant];

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-block; font-family: sans-serif; font-size: 12px; }
          button {
            padding: 6px 16px; border: 1px solid ${this._variant === 'ghost' ? 'rgba(255,255,255,0.10)' : c.bg};
            border-radius: 6px; background: ${c.bg}; color: ${c.text}; cursor: pointer;
            font-size: 12px; font-weight: 500; transition: all 0.15s ease;
          }
          button:hover { background: ${c.hover}; }
        </style>
        <button>${escapeHtml(this._label)}</button>
      `;

      this.shadowRoot.querySelector('button').addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('click', { bubbles: true, composed: true }));
      });
    }
  }

  // ========================================================================
  // DropdownSelect
  // ========================================================================

  class DropdownSelect extends HTMLElement {
    constructor() {
      super();
      this._options = [];
      this._value = '';
      this._label = '';
      this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['value', 'label', 'options']; }

    connectedCallback() { this.render(); }

    attributeChangedCallback(name, _old, value) {
      if (name === 'value') this._value = value || '';
      else if (name === 'label') this._label = value || '';
      else if (name === 'options') {
        try { this._options = JSON.parse(value); }
        catch (e) { console.warn('[cigvis] DropdownSelect: invalid options JSON:', e); }
      }
      this.render();
    }

    get value() { return this._value; }
    set value(v) { this._value = v; this.setAttribute('value', v); }

    setOptions(options) { this._options = options; this.render(); }

    render() {
      if (!this.shadowRoot) return;
      const optionsHtml = this._options
        .map(o => `<option value="${escapeHtml(o.value)}"${o.value === this._value ? ' selected' : ''}>${escapeHtml(o.label)}</option>`)
        .join('');

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; font-family: sans-serif; font-size: 12px; }
          .container { display: flex; align-items: center; gap: 8px; }
          .label { min-width: 80px; color: #8b8fa3; }
          select { flex: 1; padding: 6px 8px; border: 1px solid rgba(255,255,255,0.10); border-radius: 6px;
            background: #161922; color: #e8eaed; font-size: 12px; }
          option { background: #1c1f2b; }
        </style>
        <div class="container">
          <span class="label">${escapeHtml(this._label)}</span>
          <select>${optionsHtml}</select>
        </div>
      `;

      this.shadowRoot.querySelector('select').addEventListener('change', (e) => {
        this._value = e.target.value;
        this.dispatchEvent(new CustomEvent('change', { detail: { value: this._value }, bubbles: true, composed: true }));
      });
    }
  }

  // ========================================================================
  // PlotCanvas
  // ========================================================================

  class PlotCanvas extends HTMLElement {
    constructor() {
      super();
      this._canvas = null;
      this._ctx = null;
      this._observer = null;
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() { this.render(); }

    disconnectedCallback() {
      if (this._observer) { this._observer.disconnect(); this._observer = null; }
    }

    get canvas() { return this._canvas; }
    get ctx() { return this._ctx; }

    render() {
      if (!this.shadowRoot) return;
      this.shadowRoot.innerHTML = `
        <style>:host { display: block; } canvas { display: block; width: 100%; height: 100%; }</style>
        <canvas></canvas>
      `;

      this._canvas = this.shadowRoot.querySelector('canvas');
      this._ctx = this._canvas.getContext('2d');

      this._observer = new ResizeObserver(() => {
        if (this._canvas) {
          this._canvas.width = this.clientWidth;
          this._canvas.height = this.clientHeight;
        }
      });
      this._observer.observe(this);
    }
  }

  // ========================================================================
  // Register all components
  // ========================================================================

  safeDefine('cigvis-colormap-picker', ColormapPicker);
  safeDefine('cigvis-sidebar', Sidebar);
  safeDefine('cigvis-sidebar-section', SidebarSection);
  safeDefine('cigvis-range-slider', RangeSlider);
  safeDefine('cigvis-button', CigvisButton);
  safeDefine('cigvis-dropdown-select', DropdownSelect);
  safeDefine('cigvis-plot-canvas', PlotCanvas);

  // Export for programmatic access
  window.cigvisGui = {
    ColormapPicker,
    Sidebar,
    SidebarSection,
    RangeSlider,
    CigvisButton,
    DropdownSelect,
    PlotCanvas,
  };

  console.log('[cigvis] GUI components registered:', Object.keys(window.cigvisGui).length);
})();
