/// <reference lib="dom" />

import { createControlPanel } from '../control-panel';
import { processTextElements } from '../content-lib';

// Mock processTextElements for tracking calls
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
    clearHighlight: jest.fn(),
    loadHighlightStyleFromStorage: jest.fn(),
    setHighlightingStyle: jest.fn(),
    getCurrentHighlightedElement: jest.fn(),
    findNextTextElement: jest.fn(),
    safeClickButton: jest.fn(),
    loadMinimumWordsFromStorage: jest.fn(),
    setMinimumWords: jest.fn(),
    loadMaxNodesFromStorage: jest.fn(),
    setMaxNodesProcessed: jest.fn(),
  };
});

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn((message, callback) => {
      if (message.type === 'RELOAD_PLAY_BUTTONS' && callback) {
        // When message is received, mock that content.ts receives the message
        // and calls processTextElements
        setTimeout(() => {
          // Simulate the background script forwarding the message to content.ts
          document.dispatchEvent(new CustomEvent('mock-reload-buttons'));
        }, 0);
        callback({ success: true });
      } else if (callback) {
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

describe('Script Control Integration Tests', () => {
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = '';
    jest.clearAllMocks();

    // Use processTextElements to generate the play buttons
    processTextElements();

    // Set up event listener to simulate content.ts message handling
    document.addEventListener('mock-reload-buttons', () => {
      processTextElements();
    });

    // Create the control panel
    createControlPanel();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.removeEventListener('mock-reload-buttons', () => {});
  });

  it('should trigger full reload flow when toggle is turned on', (done) => {
    // Verify initial state
    expect(document.querySelectorAll('.talkient-processed').length).toBe(2);

    // Get the panel and toggle
    const panel = document.getElementById('talkient-control-panel');
    const toggleInput = panel?.querySelector(
      '.talkient-toggle-input'
    ) as HTMLInputElement;

    // First turn it off
    toggleInput.checked = false;
    toggleInput.dispatchEvent(new Event('change'));

    // Reset the mock call count
    jest.clearAllMocks();

    // Now turn it back on to trigger reload
    toggleInput.checked = true;
    toggleInput.dispatchEvent(new Event('change'));

    // Check that message was sent
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'RELOAD_PLAY_BUTTONS' },
      expect.any(Function)
    );

    // Wait for the message handling and processTextElements to be called
    setTimeout(() => {
      expect(processTextElements).toHaveBeenCalled();
      done();
    }, 10);
  });

  it('should integrate with the background script for reload operation', (done) => {
    // Get the toggle input
    const panel = document.getElementById('talkient-control-panel');
    const toggleInput = panel?.querySelector(
      '.talkient-toggle-input'
    ) as HTMLInputElement;

    // First turn it off
    toggleInput.checked = false;
    toggleInput.dispatchEvent(new Event('change'));

    // Reset the mock call count
    jest.clearAllMocks();

    // Now turn it back on to start reload flow
    toggleInput.checked = true;
    toggleInput.dispatchEvent(new Event('change'));

    // Verify message was sent
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'RELOAD_PLAY_BUTTONS' },
      expect.any(Function)
    );

    // Wait for the simulated message handling and verify processTextElements is called
    setTimeout(() => {
      expect(processTextElements).toHaveBeenCalled();
      done();
    }, 10);
  });
});
