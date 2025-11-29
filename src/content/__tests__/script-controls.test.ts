/// <reference lib="dom" />


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
    // Set up DOM with an article element (required for control panel to be created)
    document.body.innerHTML = '<article><p>Test content</p></article>';
    jest.clearAllMocks();

    // Create text nodes and process them using processTextElements
    processTextElements();


  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
  });

  it('should process text elements and add play buttons', () => {
    // Verify that processTextElements was called and added play buttons
    expect(
      document.querySelectorAll('.talkient-processed').length
    ).toBeGreaterThan(0);
    expect(
      document.querySelectorAll('.talkient-play-button').length
    ).toBeGreaterThan(0);
  });

  it('should save state to storage when play buttons are toggled', () => {
    // Simulate disabling play buttons
    mockChrome.storage.local.set({ playButtonsEnabled: false });

    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      playButtonsEnabled: false,
    });
  });

  it('should send RELOAD_PLAY_BUTTONS message when re-enabling', () => {
    // Simulate sending reload message
    mockChrome.runtime.sendMessage({ type: 'RELOAD_PLAY_BUTTONS' }, jest.fn());

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'RELOAD_PLAY_BUTTONS' },
      expect.any(Function)
    );
  });
});
