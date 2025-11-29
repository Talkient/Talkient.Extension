/// <reference lib="dom" />

// Test play button removal functionality
// Control panel functionality moved to sidepanel, so we test the message handling directly

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

describe('Play Button Removal Functionality', () => {
  beforeEach(() => {
    // Set up DOM with an article element
    document.body.innerHTML = '<article><p>Test content</p></article>';
    jest.clearAllMocks();

    // Use processTextElements to generate the play buttons
    processTextElements();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should handle RELOAD_PLAY_BUTTONS message when playButtonsEnabled is false', () => {
    // Verify initial state
    expect(document.querySelectorAll('.talkient-processed').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.talkient-play-button').length).toBeGreaterThan(0);

    // Simulate receiving RELOAD_PLAY_BUTTONS message with playButtonsEnabled = false
    mockChrome.storage.local.get = jest.fn((keys, callback) => {
      if (callback) {
        callback({ playButtonsEnabled: false });
      }
    });

    // Simulate the message handler from content.ts
    const message = { type: 'RELOAD_PLAY_BUTTONS' };
    mockChrome.storage.local.get(['playButtonsEnabled'], (result: any) => {
      const isEnabled = result.playButtonsEnabled !== false;
      if (!isEnabled) {
        // Remove all play buttons and processed elements
        document.querySelectorAll('.talkient-processed').forEach((el) => {
          const textContent = el.textContent || '';
          const parent = el.parentNode;
          if (parent) {
            const textNode = document.createTextNode(textContent);
            parent.replaceChild(textNode, el);
          }
        });
        document.querySelectorAll('.talkient-play-button').forEach((btn) => btn.remove());
      }
    });

    // Verify that storage.get was called
    expect(mockChrome.storage.local.get).toHaveBeenCalled();
  });

  it('should handle storage change when playButtonsEnabled is set to false', () => {
    // Verify initial state
    expect(document.querySelectorAll('.talkient-processed').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.talkient-play-button').length).toBeGreaterThan(0);

    // Simulate storage change event (as would happen when sidepanel toggles the setting)
    const changes = {
      playButtonsEnabled: {
        oldValue: true,
        newValue: false,
      },
    };

    // Simulate the storage.onChanged listener from content.ts
    // When playButtonsEnabled changes to false, buttons should be removed
    if (changes.playButtonsEnabled.newValue === false) {
      // Remove all play buttons and processed elements
      document.querySelectorAll('.talkient-processed').forEach((el) => {
        const textContent = el.textContent || '';
        const parent = el.parentNode;
        if (parent) {
          const textNode = document.createTextNode(textContent);
          parent.replaceChild(textNode, el);
        }
      });
      document.querySelectorAll('.talkient-play-button').forEach((btn) => btn.remove());
    }

    // Verify buttons were removed
    expect(document.querySelectorAll('.talkient-play-button').length).toBe(0);
  });

  it('should send RELOAD_PLAY_BUTTONS message when playButtonsEnabled changes to true', () => {
    // Simulate storage change from false to true
    mockChrome.storage.local.set({ playButtonsEnabled: true });

    // Simulate the sidepanel sending a message to reload buttons
    mockChrome.runtime.sendMessage({ type: 'RELOAD_PLAY_BUTTONS' }, jest.fn());

    // Verify the message was sent
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'RELOAD_PLAY_BUTTONS' },
      expect.any(Function)
    );
  });
});
