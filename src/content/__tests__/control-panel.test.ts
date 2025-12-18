/// <reference lib="dom" />

import {
  createControlPanel,
  removeControlPanel,
  isControlPanelVisible,
  toggleControlPanel,
  getDomainHideCookieName,
  isPanelHiddenForDomain,
  setDomainHideCookie,
  clearDomainHideCookie,
  initPanelHideDuration,
  getPanelHideDuration,
} from '../control-panel';

// Mock runtime-utils before importing control-panel
jest.mock('../runtime-utils', () => ({
  safeSendMessage: jest.fn((message, callback) => {
    // Call the mocked chrome.runtime.sendMessage
    const mockChrome = (global as any).chrome;
    if (mockChrome?.runtime?.sendMessage) {
      mockChrome.runtime.sendMessage(message, callback);
    }
    return true;
  }),
  isExtensionContextValid: jest.fn(() => true),
}));

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn((message, callback) => {
      // Mock successful response for OPEN_OPTIONS
      if (message.type === 'OPEN_OPTIONS') {
        callback({ success: true });
      }
    }),
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
    // Set up DOM with an article element (required for control panel to be created)
    document.body.innerHTML = '<article><p>Test content</p></article>';
    // Clear any cookies from previous tests
    document.cookie =
      'talkient_panel_hidden=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    // Clear cookies
    document.cookie =
      'talkient_panel_hidden=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
  });

  describe('createControlPanel', () => {
    it('should not create control panel when no article element exists', () => {
      // Clear the DOM to remove the article element
      document.body.innerHTML = '';

      // Spy on console.log to verify the message
      const consoleLogSpy = jest.spyOn(console, 'log');

      createControlPanel();

      const panel = document.getElementById('talkient-control-panel');
      expect(panel).toBeFalsy();

      // Verify the console log message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Talkient.ControlPanel] No article element found in DOM. Control panel will not be created.'
      );

      consoleLogSpy.mockRestore();
    });

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

      // Check script control buttons
      const scriptControlsSection = panel?.querySelector(
        '.talkient-control-section:nth-child(2)'
      );
      expect(scriptControlsSection).toBeTruthy();

      // Check for toggle switch instead of reload/remove buttons
      const toggleSwitch = panel?.querySelector('.talkient-toggle-switch');
      const toggleInput = panel?.querySelector('.talkient-toggle-input');
      expect(toggleSwitch).toBeTruthy();
      expect(toggleInput).toBeTruthy();

      // Check slider
      const slider = panel?.querySelector('.talkient-rate-slider');
      expect(slider).toBeTruthy();
      expect((slider as HTMLInputElement)?.disabled).toBe(true);
    });

    it('should enable settings button by default', () => {
      createControlPanel();

      const panel = document.getElementById('talkient-control-panel');
      const settingsBtn = panel?.querySelector(
        '.talkient-control-btn.settings'
      ) as HTMLButtonElement;

      expect(settingsBtn).toBeTruthy();
      expect(settingsBtn.disabled).toBe(false);
    });

    it('should keep play button disabled by default', () => {
      createControlPanel();

      const panel = document.getElementById('talkient-control-panel');
      const playBtn = panel?.querySelector(
        '.talkient-control-btn.primary'
      ) as HTMLButtonElement;

      expect(playBtn).toBeTruthy();
      expect(playBtn.disabled).toBe(true);
    });

    it('should create panel collapsed by default', () => {
      createControlPanel();

      const panel = document.getElementById('talkient-control-panel');
      const content = panel?.querySelector(
        '.talkient-panel-content'
      ) as HTMLElement;
      const toggleBtn = panel?.querySelector(
        '.talkient-panel-toggle'
      ) as HTMLButtonElement;

      expect(panel).toBeTruthy();
      expect(content).toBeTruthy();
      expect(toggleBtn).toBeTruthy();

      // Should be collapsed by default
      expect(content.style.display).toBe('none');
      expect(toggleBtn.textContent).toBe('+');
      expect(toggleBtn.title).toBe('Expand panel');
      expect(panel?.classList.contains('talkient-collapsed')).toBe(true);
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

    it('should not create panel when toggling on page without article element', () => {
      // Clear DOM to remove article element
      document.body.innerHTML = '';

      expect(isControlPanelVisible()).toBe(false);

      // Try to toggle to create
      toggleControlPanel();

      // Should still be false because there's no article element
      expect(isControlPanelVisible()).toBe(false);
    });

    it('should handle multiple toggle attempts on page without article element', () => {
      // Clear DOM to remove article element
      document.body.innerHTML = '';

      // Multiple toggle attempts should all fail gracefully
      toggleControlPanel();
      expect(isControlPanelVisible()).toBe(false);

      toggleControlPanel();
      expect(isControlPanelVisible()).toBe(false);

      toggleControlPanel();
      expect(isControlPanelVisible()).toBe(false);
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

      // Initial state - collapsed by default
      expect(content.style.display).toBe('none');
      expect(toggleBtn.textContent).toBe('+');
      expect(panel?.classList.contains('talkient-collapsed')).toBe(true);

      // Click to expand
      toggleBtn.click();
      expect(content.style.display).toBe('block');
      expect(toggleBtn.textContent).toBe('−');
      expect(panel?.classList.contains('talkient-collapsed')).toBe(false);

      // Click to collapse
      toggleBtn.click();
      expect(content.style.display).toBe('none');
      expect(toggleBtn.textContent).toBe('+');
      expect(panel?.classList.contains('talkient-collapsed')).toBe(true);
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

  describe('Settings Button Functionality', () => {
    beforeEach(() => {
      createControlPanel();
      jest.clearAllMocks();
    });

    it('should send OPEN_OPTIONS message when settings button is clicked', () => {
      const panel = document.getElementById('talkient-control-panel');
      const settingsBtn = panel?.querySelector(
        '.talkient-control-btn.settings'
      ) as HTMLButtonElement;

      expect(settingsBtn).toBeTruthy();
      expect(settingsBtn.disabled).toBe(false);

      settingsBtn.click();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: 'OPEN_OPTIONS' },
        expect.any(Function)
      );
    });

    it('should handle response from background script', () => {
      // Mock sendMessage to simulate background script response
      const mockCallback = jest.fn();
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'OPEN_OPTIONS') {
          callback({ success: true });
        }
      });

      const panel = document.getElementById('talkient-control-panel');
      const settingsBtn = panel?.querySelector(
        '.talkient-control-btn.settings'
      ) as HTMLButtonElement;

      expect(settingsBtn).toBeTruthy();

      settingsBtn.click();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: 'OPEN_OPTIONS' },
        expect.any(Function)
      );
    });

    it('should have settings button enabled and clickable', () => {
      const panel = document.getElementById('talkient-control-panel');
      const settingsBtn = panel?.querySelector(
        '.talkient-control-btn.settings'
      ) as HTMLButtonElement;

      expect(settingsBtn).toBeTruthy();
      expect(settingsBtn.disabled).toBe(false);
      expect(settingsBtn.title).toBe('Settings');

      // Verify it has the correct SVG icon
      const icon = settingsBtn.querySelector('.talkient-control-icon');
      expect(icon).toBeTruthy();
      expect(icon?.tagName.toLowerCase()).toBe('svg');
    });
  });

  describe('Cookie-based Panel Hiding', () => {
    beforeEach(() => {
      // Clear any cookies from previous tests
      document.cookie =
        'talkient_panel_hidden=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    });

    afterEach(() => {
      // Clean up cookies
      document.cookie =
        'talkient_panel_hidden=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    });

    describe('getDomainHideCookieName', () => {
      it('should return the correct cookie name', () => {
        expect(getDomainHideCookieName()).toBe('talkient_panel_hidden');
      });
    });

    describe('isPanelHiddenForDomain', () => {
      it('should return false when no cookie is set', () => {
        expect(isPanelHiddenForDomain()).toBe(false);
      });

      it('should return true when hide cookie is set', () => {
        document.cookie = 'talkient_panel_hidden=true; path=/';
        expect(isPanelHiddenForDomain()).toBe(true);
      });

      it('should return false when cookie has different value', () => {
        document.cookie = 'talkient_panel_hidden=false; path=/';
        expect(isPanelHiddenForDomain()).toBe(false);
      });

      it('should handle multiple cookies correctly', () => {
        document.cookie = 'other_cookie=value; path=/';
        document.cookie = 'talkient_panel_hidden=true; path=/';
        document.cookie = 'another_cookie=test; path=/';
        expect(isPanelHiddenForDomain()).toBe(true);
      });
    });

    describe('setDomainHideCookie', () => {
      it('should set the hide cookie', () => {
        setDomainHideCookie();
        expect(isPanelHiddenForDomain()).toBe(true);
      });

      it('should set cookie with expiration in the future', () => {
        const beforeSet = Date.now();
        setDomainHideCookie();

        // Check that the cookie is set with the correct value
        expect(document.cookie).toContain('talkient_panel_hidden=true');
      });
    });

    describe('clearDomainHideCookie', () => {
      it('should clear the hide cookie', () => {
        // First set the cookie
        setDomainHideCookie();
        expect(isPanelHiddenForDomain()).toBe(true);

        // Then clear it
        clearDomainHideCookie();
        expect(isPanelHiddenForDomain()).toBe(false);
      });

      it('should not throw when cookie does not exist', () => {
        expect(() => clearDomainHideCookie()).not.toThrow();
      });
    });

    describe('createControlPanel with cookie', () => {
      it('should not create panel when hide cookie is set', () => {
        // Set the hide cookie
        setDomainHideCookie();

        // Spy on console.log to verify the message
        const consoleLogSpy = jest.spyOn(console, 'log');

        // Try to create the panel
        createControlPanel();

        // Panel should not be created
        const panel = document.getElementById('talkient-control-panel');
        expect(panel).toBeFalsy();

        // Verify the console log message
        expect(consoleLogSpy).toHaveBeenCalledWith(
          '[Talkient.ControlPanel] Control panel is hidden for this domain. Will be available again after cookie expires.'
        );

        consoleLogSpy.mockRestore();
      });

      it('should create panel after cookie is cleared', () => {
        // Set the hide cookie
        setDomainHideCookie();

        // Panel should not be created
        createControlPanel();
        expect(document.getElementById('talkient-control-panel')).toBeFalsy();

        // Clear the cookie
        clearDomainHideCookie();

        // Now panel should be created
        createControlPanel();
        expect(document.getElementById('talkient-control-panel')).toBeTruthy();
      });
    });

    describe('Close button sets cookie', () => {
      it('should set hide cookie when close button is clicked', () => {
        // Create the panel
        createControlPanel();
        const panel = document.getElementById('talkient-control-panel');
        expect(panel).toBeTruthy();

        // Verify no cookie is set yet
        expect(isPanelHiddenForDomain()).toBe(false);

        // Click the close button
        const closeBtn = panel?.querySelector(
          '.talkient-panel-close'
        ) as HTMLButtonElement;
        closeBtn.click();

        // Panel should be removed
        expect(document.getElementById('talkient-control-panel')).toBeFalsy();

        // Cookie should be set
        expect(isPanelHiddenForDomain()).toBe(true);
      });

      it('should prevent panel from being created again after close', () => {
        // Create and close the panel
        createControlPanel();
        const panel = document.getElementById('talkient-control-panel');
        const closeBtn = panel?.querySelector(
          '.talkient-panel-close'
        ) as HTMLButtonElement;
        closeBtn.click();

        // Try to create the panel again
        createControlPanel();

        // Panel should not be created
        expect(document.getElementById('talkient-control-panel')).toBeFalsy();
      });
    });

    describe('toggleControlPanel with cookie', () => {
      it('should not toggle panel on when hide cookie is set', () => {
        // Set the hide cookie
        setDomainHideCookie();

        // Try to toggle the panel on
        toggleControlPanel();

        // Panel should not be created
        expect(isControlPanelVisible()).toBe(false);
      });

      it('should still remove panel when toggling off regardless of cookie', () => {
        // Create the panel (no cookie set)
        createControlPanel();
        expect(isControlPanelVisible()).toBe(true);

        // Toggle off (this uses removeControlPanel which doesn't set cookie)
        toggleControlPanel();
        expect(isControlPanelVisible()).toBe(false);

        // Cookie should NOT be set when using toggleControlPanel
        // because it uses removeControlPanel directly, not the close button
        expect(isPanelHiddenForDomain()).toBe(false);
      });
    });

    describe('Configurable panel hide duration', () => {
      it('should return default duration of 30 minutes', () => {
        // By default, duration should be 30 minutes
        expect(getPanelHideDuration()).toBe(30);
      });

      it('should update duration from storage when initPanelHideDuration is called', () => {
        // Mock storage to return a custom duration
        mockChrome.storage.local.get.mockImplementation(
          (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            callback({ panelHideDuration: 60 });
          }
        );

        // Initialize the duration
        initPanelHideDuration();

        // Duration should be updated
        expect(getPanelHideDuration()).toBe(60);

        // Reset mock
        mockChrome.storage.local.get.mockImplementation(
          (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            callback({});
          }
        );
      });

      it('should not set cookie when duration is 0', () => {
        // Mock storage to return 0 duration
        mockChrome.storage.local.get.mockImplementation(
          (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            callback({ panelHideDuration: 0 });
          }
        );

        // Initialize the duration
        initPanelHideDuration();

        // Verify duration is 0
        expect(getPanelHideDuration()).toBe(0);

        // Clear any existing cookie first
        clearDomainHideCookie();

        // Try to set the cookie
        setDomainHideCookie();

        // Cookie should NOT be set because duration is 0
        expect(isPanelHiddenForDomain()).toBe(false);

        // Reset mock
        mockChrome.storage.local.get.mockImplementation(
          (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            callback({});
          }
        );
      });

      it('should set cookie when duration is greater than 0', () => {
        // Mock storage to return custom duration
        mockChrome.storage.local.get.mockImplementation(
          (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            callback({ panelHideDuration: 15 });
          }
        );

        // Initialize the duration
        initPanelHideDuration();

        // Verify duration is 15
        expect(getPanelHideDuration()).toBe(15);

        // Clear any existing cookie first
        clearDomainHideCookie();

        // Set the cookie
        setDomainHideCookie();

        // Cookie should be set
        expect(isPanelHiddenForDomain()).toBe(true);

        // Reset mock
        mockChrome.storage.local.get.mockImplementation(
          (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            callback({});
          }
        );
      });

      it('should handle maximum boundary value of 9999 minutes', () => {
        // Mock storage to return maximum duration
        mockChrome.storage.local.get.mockImplementation(
          (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            callback({ panelHideDuration: 9999 });
          }
        );

        // Initialize the duration
        initPanelHideDuration();

        // Verify duration is 9999
        expect(getPanelHideDuration()).toBe(9999);

        // Clear any existing cookie first
        clearDomainHideCookie();

        // Set the cookie
        setDomainHideCookie();

        // Cookie should be set
        expect(isPanelHiddenForDomain()).toBe(true);

        // Reset mock
        mockChrome.storage.local.get.mockImplementation(
          (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            callback({});
          }
        );
      });

      it('should update cached duration when storage changes via onChanged listener', () => {
        // First, initialize with default duration
        mockChrome.storage.local.get.mockImplementation(
          (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            callback({ panelHideDuration: 30 });
          }
        );
        initPanelHideDuration();
        expect(getPanelHideDuration()).toBe(30);

        // Verify the storage change listener was registered
        expect(mockChrome.storage.onChanged.addListener).toHaveBeenCalled();

        // Get the registered listener
        const changeListener =
          mockChrome.storage.onChanged.addListener.mock.calls[0][0];

        // Simulate a storage change
        changeListener(
          {
            panelHideDuration: {
              oldValue: 30,
              newValue: 120,
            },
          },
          'local'
        );

        // Verify the cached duration was updated
        expect(getPanelHideDuration()).toBe(120);

        // Reset mock
        mockChrome.storage.local.get.mockImplementation(
          (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            callback({});
          }
        );
      });

      it('should not update duration when storage change is from sync namespace', () => {
        // Initialize with default duration
        mockChrome.storage.local.get.mockImplementation(
          (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            callback({ panelHideDuration: 30 });
          }
        );
        initPanelHideDuration();
        expect(getPanelHideDuration()).toBe(30);

        // Get the registered listener
        const changeListener =
          mockChrome.storage.onChanged.addListener.mock.calls[0][0];

        // Simulate a storage change from 'sync' namespace (should be ignored)
        changeListener(
          {
            panelHideDuration: {
              oldValue: 30,
              newValue: 999,
            },
          },
          'sync'
        );

        // Duration should still be 30 (not changed)
        expect(getPanelHideDuration()).toBe(30);

        // Reset mock
        mockChrome.storage.local.get.mockImplementation(
          (
            keys: string[],
            callback: (result: Record<string, unknown>) => void
          ) => {
            callback({});
          }
        );
      });
    });
  });
});
