/// <reference lib="dom" />

import {
  createControlPanel,
  removeControlPanel,
  isControlPanelVisible,
  toggleControlPanel,
} from '../control-panel';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
    lastError: null,
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
};

// @ts-ignore
global.chrome = mockChrome;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 0);
  return 0;
});

describe('Control Panel Module', () => {
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
  });

  describe('createControlPanel', () => {
    it('should create and append control panel to document body', () => {
      createControlPanel();

      const panel = document.getElementById('talkient-control-panel');
      expect(panel).toBeTruthy();
      expect(document.body.contains(panel)).toBe(true);
    });

    it('should not create duplicate panels', () => {
      createControlPanel();
      createControlPanel(); // Call twice

      const panels = document.querySelectorAll('#talkient-control-panel');
      expect(panels.length).toBe(1);
    });

    it('should create panel with correct structure', () => {
      createControlPanel();

      const panel = document.getElementById('talkient-control-panel');
      expect(panel).toBeTruthy();

      // Check header
      const header = panel?.querySelector('.talkient-panel-header');
      expect(header).toBeTruthy();

      const title = panel?.querySelector('.talkient-panel-title');
      expect(title?.textContent).toBe('Talkient');

      // Check controls
      const toggleBtn = panel?.querySelector('.talkient-panel-toggle');
      const closeBtn = panel?.querySelector('.talkient-panel-close');
      expect(toggleBtn).toBeTruthy();
      expect(closeBtn).toBeTruthy();

      // Check content
      const content = panel?.querySelector('.talkient-panel-content');
      expect(content).toBeTruthy();

      // Check buttons
      const playBtn = panel?.querySelector('.talkient-control-btn.primary');
      const settingsBtn = panel?.querySelector(
        '.talkient-control-btn.settings'
      );
      expect(playBtn).toBeTruthy();
      expect(settingsBtn).toBeTruthy();

      // Check slider
      const slider = panel?.querySelector('.talkient-rate-slider');
      expect(slider).toBeTruthy();
      expect((slider as HTMLInputElement)?.disabled).toBe(true);
    });
  });

  describe('removeControlPanel', () => {
    it('should remove existing control panel', () => {
      createControlPanel();
      expect(document.getElementById('talkient-control-panel')).toBeTruthy();

      removeControlPanel();
      expect(document.getElementById('talkient-control-panel')).toBeFalsy();
    });

    it('should not throw when no panel exists', () => {
      expect(() => removeControlPanel()).not.toThrow();
    });
  });

  describe('isControlPanelVisible', () => {
    it('should return false when no panel exists', () => {
      expect(isControlPanelVisible()).toBe(false);
    });

    it('should return true when panel exists', () => {
      createControlPanel();
      expect(isControlPanelVisible()).toBe(true);
    });

    it('should return false after panel is removed', () => {
      createControlPanel();
      expect(isControlPanelVisible()).toBe(true);

      removeControlPanel();
      expect(isControlPanelVisible()).toBe(false);
    });
  });

  describe('toggleControlPanel', () => {
    it('should create panel when none exists', () => {
      expect(isControlPanelVisible()).toBe(false);

      toggleControlPanel();

      expect(isControlPanelVisible()).toBe(true);
    });

    it('should remove panel when one exists', () => {
      createControlPanel();
      expect(isControlPanelVisible()).toBe(true);

      toggleControlPanel();

      expect(isControlPanelVisible()).toBe(false);
    });

    it('should toggle panel visibility multiple times', () => {
      // Start with no panel
      expect(isControlPanelVisible()).toBe(false);

      // Toggle to create
      toggleControlPanel();
      expect(isControlPanelVisible()).toBe(true);

      // Toggle to remove
      toggleControlPanel();
      expect(isControlPanelVisible()).toBe(false);

      // Toggle to create again
      toggleControlPanel();
      expect(isControlPanelVisible()).toBe(true);
    });
  });

  describe('Panel Interactions', () => {
    beforeEach(() => {
      createControlPanel();
    });

    it('should close panel when close button is clicked', () => {
      const panel = document.getElementById('talkient-control-panel');
      const closeBtn = panel?.querySelector(
        '.talkient-panel-close'
      ) as HTMLButtonElement;

      expect(panel).toBeTruthy();
      expect(closeBtn).toBeTruthy();

      closeBtn.click();

      expect(document.getElementById('talkient-control-panel')).toBeFalsy();
    });

    it('should toggle panel content when toggle button is clicked', () => {
      const panel = document.getElementById('talkient-control-panel');
      const toggleBtn = panel?.querySelector(
        '.talkient-panel-toggle'
      ) as HTMLButtonElement;
      const content = panel?.querySelector(
        '.talkient-panel-content'
      ) as HTMLElement;

      expect(toggleBtn).toBeTruthy();
      expect(content).toBeTruthy();

      // Initial state - expanded
      expect(content.style.display).not.toBe('none');
      expect(toggleBtn.textContent).toBe('−');

      // Click to collapse
      toggleBtn.click();
      expect(content.style.display).toBe('none');
      expect(toggleBtn.textContent).toBe('+');
      expect(panel?.classList.contains('talkient-collapsed')).toBe(true);

      // Click to expand
      toggleBtn.click();
      expect(content.style.display).toBe('block');
      expect(toggleBtn.textContent).toBe('−');
      expect(panel?.classList.contains('talkient-collapsed')).toBe(false);
    });

    it('should set up drag functionality', () => {
      const panel = document.getElementById('talkient-control-panel');
      const header = panel?.querySelector(
        '.talkient-panel-header'
      ) as HTMLElement;

      expect(header).toBeTruthy();
      expect(header.style.cursor).toBe('grab');
      expect(header.title).toBe('Drag to move panel');
    });

    it('should not start dragging when clicking on buttons', () => {
      const panel = document.getElementById('talkient-control-panel');
      const header = panel?.querySelector(
        '.talkient-panel-header'
      ) as HTMLElement;
      const closeBtn = panel?.querySelector(
        '.talkient-panel-close'
      ) as HTMLButtonElement;

      expect(header).toBeTruthy();
      expect(closeBtn).toBeTruthy();

      // Mock the mousedown event on button
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      });

      // Set target to button
      Object.defineProperty(mouseDownEvent, 'target', {
        value: closeBtn,
        writable: false,
      });

      header.dispatchEvent(mouseDownEvent);

      // Cursor should remain grab (not change to grabbing)
      expect(header.style.cursor).toBe('grab');
    });
  });
});
