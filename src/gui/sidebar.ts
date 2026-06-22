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
  /** Section content */
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
  sections?: SidebarSection[];
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

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === 'width') {
      this._width = parseInt(newValue) || 250;
    } else if (name === 'position') {
      this._position = (newValue as 'left' | 'right') || 'right';
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

      const section = this.createSection(title, slot.innerHTML, collapsed);
      this._container.appendChild(section);
    }

    // Sections from programmatic API
    for (const section of this._sections) {
      const content = typeof section.content === 'string'
        ? section.content
        : section.content.outerHTML;

      const sectionEl = this.createSection(section.title, content, section.collapsed);
      this._container.appendChild(sectionEl);
    }

    this.shadowRoot.appendChild(this._container);
  }

  private createSection(title: string, content: string, collapsed: boolean = false): HTMLElement {
    const section = document.createElement('div');
    section.className = 'section';

    // Header
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

    // Content
    const contentEl = document.createElement('div');
    contentEl.className = `section-content${collapsed ? ' collapsed' : ''}`;
    contentEl.innerHTML = content;

    // Toggle handler
    header.addEventListener('click', () => {
      const isCollapsed = contentEl.classList.toggle('collapsed');
      toggle.classList.toggle('collapsed', isCollapsed);

      // Dispatch toggle event
      this.dispatchEvent(new CustomEvent('toggle', {
        detail: { title, collapsed: isCollapsed },
        bubbles: true,
        composed: true,
      }));
    });

    section.appendChild(header);
    section.appendChild(contentEl);

    return section;
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

// Register components
if (typeof customElements !== 'undefined') {
  customElements.define('cigvis-sidebar', Sidebar);
  customElements.define('cigvis-sidebar-section', SidebarSection);
}
