/// <reference lib="dom" />

import { createControlPanel } from '../control-panel';
import { processTextElements } from '../content-lib';

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

// Mock processTextElements to actually add play buttons
jest.mock('../content-lib', () => {
  const originalModule = jest.requireActual('../content-lib');

  return {
    ...originalModule,
    processTextElements: jest.fn(() => {
      // Add some text nodes for processing
      const div = document.createElement('div');
      div.innerHTML = `
        <div>
          <span>Some processed text</span>
          <p>Another processed element</p>
        </div>
      `;
      document.body.appendChild(div);

      // Simulate adding play buttons to these text nodes
      document.querySelectorAll('span, p').forEach((element) => {
        const wrapper = document.createElement('span');
        wrapper.classList.add('talkient-processed');

        // Get text content
        const text = element.textContent || '';

        // Create play button
        const button = document.createElement('button');
        button.classList.add('talkient-play-button');
        button.textContent = 'Play';

        // Replace the element with our wrapper
        if (element.parentNode) {
          element.parentNode.insertBefore(wrapper, element);
          wrapper.appendChild(document.createTextNode(text));
          wrapper.appendChild(button);
          element.remove();
        }
      });
    }),
  };
});

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn((message, callback) => {
      // Mock successful response for messages
      if (callback) {
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

// Instead of trying to mock the internal function, we'll check if the DOM is modified correctly
describe('Script Control Buttons', () => {
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = '';
    jest.clearAllMocks();

    // Create text nodes and process them using processTextElements
    processTextElements();

    // Create the control panel
    createControlPanel();
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
  });

  it('should have Talkient Scripts toggle section', () => {
    const panel = document.getElementById('talkient-control-panel');
    expect(panel).toBeTruthy();

    // Check for Talkient Scripts section
    const sectionTitles = panel?.querySelectorAll('.talkient-section-title');
    let foundScriptsSection = false;
    sectionTitles?.forEach((title) => {
      if (title.textContent === 'Talkient Scripts') {
        foundScriptsSection = true;
      }
    });
    expect(foundScriptsSection).toBe(true);

    const controlsContainer = panel?.querySelector('.talkient-script-controls');
    expect(controlsContainer).toBeTruthy();
  });

  it('should have toggle switch for scripts', () => {
    const panel = document.getElementById('talkient-control-panel');

    // Check for toggle switch
    const toggleSwitch = panel?.querySelector(
      '.talkient-toggle-switch'
    ) as HTMLLabelElement;
    expect(toggleSwitch).toBeTruthy();

    // Check for toggle input
    const toggleInput = panel?.querySelector(
      '.talkient-toggle-input'
    ) as HTMLInputElement;
    expect(toggleInput).toBeTruthy();
    expect(toggleInput.type).toBe('checkbox');
    expect(toggleInput.checked).toBe(true); // Should be checked by default
  });

  it('should have toggle slider element', () => {
    const panel = document.getElementById('talkient-control-panel');

    // Check toggle slider
    const toggleSlider = panel?.querySelector(
      '.talkient-toggle-slider'
    ) as HTMLSpanElement;
    expect(toggleSlider).toBeTruthy();
  });

  it('should remove processed elements when toggle is turned off', () => {
    // Verify initial state - there should be processed elements from processTextElements
    expect(
      document.querySelectorAll('.talkient-processed').length
    ).toBeGreaterThan(0);
    expect(
      document.querySelectorAll('.talkient-play-button').length
    ).toBeGreaterThan(0);

    const panel = document.getElementById('talkient-control-panel');
    const toggleInput = panel?.querySelector(
      '.talkient-toggle-input'
    ) as HTMLInputElement;

    // Initially checked
    expect(toggleInput.checked).toBe(true);

    // Uncheck the toggle (turn off)
    toggleInput.checked = false;
    toggleInput.dispatchEvent(new Event('change'));

    // Check that the processed elements and play buttons are removed
    expect(document.querySelectorAll('.talkient-processed').length).toBe(0);
    expect(document.querySelectorAll('.talkient-play-button').length).toBe(0);

    // Check that text content is preserved
    expect(document.body.textContent).toContain('Some processed text');
    expect(document.body.textContent).toContain('Another processed element');

    // Check that the state is saved to storage
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      playButtonsEnabled: false,
    });
  });

  it('should send message when toggle is turned on', () => {
    const panel = document.getElementById('talkient-control-panel');
    const toggleInput = panel?.querySelector(
      '.talkient-toggle-input'
    ) as HTMLInputElement;

    // First turn it off
    toggleInput.checked = false;
    toggleInput.dispatchEvent(new Event('change'));

    // Reset mocks
    jest.clearAllMocks();

    // Now turn it back on
    toggleInput.checked = true;
    toggleInput.dispatchEvent(new Event('change'));

    // Check that processed elements are removed first (before re-adding)
    expect(document.querySelectorAll('.talkient-processed').length).toBe(0);
    expect(document.querySelectorAll('.talkient-play-button').length).toBe(0);

    // Check if the message was sent to the background script
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'RELOAD_PLAY_BUTTONS' },
      expect.any(Function)
    );

    // Check that the state is saved to storage
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      playButtonsEnabled: true,
    });
  });
});
