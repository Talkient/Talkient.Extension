/// <reference lib="dom" />

// Import removeAllPlayButtons from control-panel
// Since it's not exported directly, we'll test it through the control panel

import { createControlPanel } from '../control-panel';
import { processTextElements } from '../content-lib';

// Mock the content-lib module
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
        <div>
          <span>Standalone text</span>
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

      // Create a standalone button (not part of a processed element)
      const standaloneDiv = document.createElement('div');
      const standaloneButton = document.createElement('button');
      standaloneButton.classList.add('talkient-play-button');
      standaloneButton.textContent = 'Standalone button';
      standaloneDiv.appendChild(standaloneButton);
      document.body.appendChild(standaloneDiv);
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

describe('removeAllPlayButtons Function', () => {
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = '';
    jest.clearAllMocks();

    // Use processTextElements to generate the play buttons
    processTextElements();

    // Create the control panel
    createControlPanel();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should remove all processed elements and play buttons', () => {
    // Verify initial state
    expect(document.querySelectorAll('.talkient-processed').length).toBe(3);
    expect(document.querySelectorAll('.talkient-play-button').length).toBe(4); // 3 in processed elements + 1 standalone

    // Get the panel and toggle
    const panel = document.getElementById('talkient-control-panel');
    const toggleInput = panel?.querySelector(
      '.talkient-toggle-input'
    ) as HTMLInputElement;

    // Toggle off to trigger removeAllPlayButtons
    toggleInput.checked = false;
    toggleInput.dispatchEvent(new Event('change'));

    // Check that all processed elements and play buttons have been removed
    expect(document.querySelectorAll('.talkient-processed').length).toBe(0);
    expect(document.querySelectorAll('.talkient-play-button').length).toBe(0);

    // Check that text content is preserved
    expect(document.body.textContent).toContain('Some processed text');
    expect(document.body.textContent).toContain('Another processed element');
    expect(document.body.textContent).toContain('Standalone text');
  });

  it('should call chrome.runtime.sendMessage when toggle is turned on', () => {
    // Get the toggle input
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

    // Check if the message was sent to the background script
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'RELOAD_PLAY_BUTTONS' },
      expect.any(Function)
    );
  });
});
