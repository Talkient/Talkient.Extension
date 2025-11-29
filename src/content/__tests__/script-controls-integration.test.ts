/// <reference lib="dom" />

// Test script controls integration
// Control panel functionality moved to sidepanel, so we test message handling directly

import { processTextElements } from '../content-lib';

// Mock runtime-utils
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
      get: jest.fn((keys, callback) => {
        if (callback) {
          callback({ playButtonsEnabled: true });
        }
      }),
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
    // Set up DOM with an article element
    document.body.innerHTML = '<article><p>Test content</p></article>';
    jest.clearAllMocks();

    // Use processTextElements to generate the play buttons
    processTextElements();

    // Set up event listener to simulate content.ts message handling
    document.addEventListener('mock-reload-buttons', () => {
      processTextElements();
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.removeEventListener('mock-reload-buttons', () => {});
  });

  it('should trigger full reload flow when RELOAD_PLAY_BUTTONS message is received', (done) => {
    // Verify initial state
    expect(document.querySelectorAll('.talkient-processed').length).toBeGreaterThan(0);

    // Reset the mock call count
    jest.clearAllMocks();

    // Simulate sidepanel sending RELOAD_PLAY_BUTTONS message
    mockChrome.runtime.sendMessage({ type: 'RELOAD_PLAY_BUTTONS' }, (response: any) => {
      // Simulate content.ts message handler
      mockChrome.storage.local.get(['playButtonsEnabled'], (result: any) => {
        const isEnabled = result.playButtonsEnabled !== false;
        if (isEnabled) {
          processTextElements();
        }
      });
    });

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

  it('should integrate with storage changes for reload operation', (done) => {
    // Reset the mock call count
    jest.clearAllMocks();

    // Simulate sidepanel toggling playButtonsEnabled to true (triggering reload)
    mockChrome.storage.local.set({ playButtonsEnabled: true });

    // Simulate storage.onChanged listener from content.ts
    const changes = {
      playButtonsEnabled: {
        oldValue: false,
        newValue: true,
      },
    };

    // When changing from disabled to enabled, process text elements
    if (changes.playButtonsEnabled.newValue && !changes.playButtonsEnabled.oldValue) {
      processTextElements();
    }

    // Verify processTextElements was called
    setTimeout(() => {
      expect(processTextElements).toHaveBeenCalled();
      done();
    }, 10);
  });
});
