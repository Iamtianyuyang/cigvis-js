/**
 * Sidebar Web Component for CIGVis
 *
 * Ported from cigvis Python library (cigvis/gui/gui3d/sidebar.py)
 * Provides a collapsible sidebar for visualization controls.
 *
 * @module gui/sidebar
 */

// ============================================================================
// Types
// ============================================================================

/** Sidebar section configuration */
export interface SidebarSectionConfig {
  /** Section title */
  title: string;
  /** Section content (string HTML or HTMLElement) */
  content: HTMLElement | string;
  /** Is collapsed */
  collapsed?: boolean;
}

/** Sidebar options */
export interface SidebarOptions {
  /** Width */
  width?: number;
  /** Position */
  position?: 'left' | 'right';
  /** Background color */
  backgroundColor?: string;
  /** Sections */
  sections?: SidebarSectionConfig[];
}

// ============================================================================
// Helpers
// ============================================================================

/** Safely register a custom element (skip if already defined) */
function safeDefine(name: string, constructor: CustomElementConstructor): void {
  if (typeof customElements !== 'undefined' && !customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

// ============================================================================
// Web Component
// ============================================================================

/**
 * Sidebar Web Component.
 *
 * @example
 * ```html
 * <cigvis-sidebar position="right">
 *   <cigvis-sidebar-section title="Colormap">
 *     <cigvis-colormap-picker></cigvis-colormap-picker>
 *   </cigvis-sidebar-section>
 * </cigvis-sidebar>
 * ```
 */
export class Sidebar extends HTMLElement {
  private _width: number = 250;
  private _position: 'left' | 'right' = 'right';
  private _backgroundColor: string = '#f5f5f5';
  private _sections: SidebarSectionConfig[] = [];
  private _container: HTMLDivElement | null = null;

  static get observedAttributes() {
    return ['width', 'position', 'background-color'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'width') {
      this._width = parseInt(newValue) || 250;
    } else if (name === 'position') {
      this._position = (newValue === 'left' || newValue === 'right') ? newValue : 'right';
    } else if (name === 'background-color') {
      this._backgroundColor = newValue || '#f5f5f5';
    }
    this.render();
  }

  /** Get sidebar width */
  get width(): number {
    return this._width;
  }

  /** Set sidebar width */
  set width(value: number) {
    this._width = value;
    this.setAttribute('width', String(value));
  }

  /** Get sidebar position */
  get position(): 'left' | 'right' {
    return this._position;
  }

  /** Set sidebar position */
  set position(value: 'left' | 'right') {
    this._position = value;
    this.setAttribute('position', value);
  }

  /** Add a section */
  addSection(section: SidebarSectionConfig): void {
    this._sections.push(section);
    this.render();
  }

  /** Remove a section */
  removeSection(title: string): void {
    this._sections = this._sections.filter(s => s.title !== title);
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
      .sidebar {
        width: ${this._width}px;
        background-color: ${this._backgroundColor};
        border-${this._position === 'left' ? 'right' : 'left'}: 1px solid #ddd;
        overflow-y: auto;
        height: 100%;
      }
      .section {
        border-bottom: 1px solid #ddd;
      }
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background-color: #e8e8e8;
        cursor: pointer;
        user-select: none;
      }
      .section-header:hover {
        background-color: #ddd;
      }
      .section-title {
        font-weight: 600;
        color: #333;
      }
      .section-toggle {
        font-size: 10px;
        color: #666;
        transition: transform 0.2s;
      }
      .section-toggle.collapsed {
        transform: rotate(-90deg);
      }
      .section-content {
        padding: 8px 12px;
      }
      .section-content.collapsed {
        display: none;
      }
    `;
    this.shadowRoot.appendChild(style);

    // Container
    this._container = document.createElement('div');
    this._container.className = 'sidebar';

    // Sections from slotted children
    const slots = this.querySelectorAll('cigvis-sidebar-section');
    for (const slot of slots) {
      const title = slot.getAttribute('title') || 'Section';
      const collapsed = slot.hasAttribute('collapsed');

      // Clone children instead of serializing to outerHTML (preserves event listeners)
      const section = this.createSectionFromChildren(title, slot, collapsed);
      this._container.appendChild(section);
    }

    // Sections from programmatic API
    for (const section of this._sections) {
      const sectionEl = this.createSectionFromConfig(section);
      this._container.appendChild(sectionEl);
    }

    this.shadowRoot.appendChild(this._container);
  }

  /**
   * Create a section from a slotted child element.
   * Clones children directly to preserve event listeners and state.
   */
  private createSectionFromChildren(title: string, source: Element, collapsed: boolean = false): HTMLElement {
    const section = document.createElement('div');
    section.className = 'section';

    // Header
    const header = this.createHeader(title, collapsed);

    // Content — clone children to preserve listeners and state
    const contentEl = document.createElement('div');
    contentEl.className = `section-content${collapsed ? ' collapsed' : ''}`;

    // Clone child nodes (preserves event listeners on the clones)
    for (const child of Array.from(source.childNodes)) {
      contentEl.appendChild(child.cloneNode(true));
    }

    // Toggle handler
    this.attachToggleHandler(header, contentEl, title);

    section.appendChild(header);
    section.appendChild(contentEl);
    return section;
  }

  /**
   * Create a section from a SidebarSectionConfig.
   * If content is an HTMLElement, appends it directly (preserves listeners).
   * If content is a string, uses innerHTML.
   */
  private createSectionFromConfig(section: SidebarSectionConfig): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'section';

    // Header
    const header = this.createHeader(section.title, section.collapsed ?? false);

    // Content
    const contentEl = document.createElement('div');
    contentEl.className = `section-content${section.collapsed ? ' collapsed' : ''}`;

    if (typeof section.content === 'string') {
      contentEl.innerHTML = section.content;
    } else {
      // Append the actual element directly — preserves listeners and state
      contentEl.appendChild(section.content);
    }

    // Toggle handler
    this.attachToggleHandler(header, contentEl, section.title);

    wrapper.appendChild(header);
    wrapper.appendChild(contentEl);
    return wrapper;
  }

  /**
   * Create a section header element.
   */
  private createHeader(title: string, collapsed: boolean): HTMLElement {
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

  /**
   * Attach collapse/expand toggle handler to a header.
   */
  private attachToggleHandler(header: HTMLElement, contentEl: HTMLElement, title: string): void {
    header.addEventListener('click', () => {
      const isCollapsed = contentEl.classList.toggle('collapsed');
      const toggle = header.querySelector('.section-toggle');
      if (toggle) toggle.classList.toggle('collapsed', isCollapsed);

      this.dispatchEvent(new CustomEvent('toggle', {
        detail: { title, collapsed: isCollapsed },
        bubbles: true,
        composed: true,
      }));
    });
  }
}

/**
 * Sidebar section Web Component.
 */
export class SidebarSection extends HTMLElement {
  static get observedAttributes() {
    return ['title', 'collapsed'];
  }

  constructor() {
    super();
    this.style.display = 'none';
  }

  /** Get section title */
  get title(): string {
    return this.getAttribute('title') || 'Section';
  }

  /** Set section title */
  set title(value: string) {
    this.setAttribute('title', value);
  }

  /** Get collapsed state */
  get collapsed(): boolean {
    return this.hasAttribute('collapsed');
  }

  /** Set collapsed state */
  set collapsed(value: boolean) {
    if (value) {
      this.setAttribute('collapsed', '');
    } else {
      this.removeAttribute('collapsed');
    }
  }
}

// Register components (safe against double-registration)
safeDefine('cigvis-sidebar', Sidebar);
safeDefine('cigvis-sidebar-section', SidebarSection);
