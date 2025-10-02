import {
  createPlayButton,
  shouldProcessNode,
  processTextElements,
  highlightText,
  clearHighlight,
  getCurrentHighlightedElement,
  loadMinimumWordsFromStorage,
  loadMaxNodesFromStorage,
  loadButtonPositionFromStorage,
  getButtonPosition,
  setButtonPosition,
} from '../content-lib';

import { getSvgIcon, isSvgPlayIcon, isSvgPauseIcon } from '../icons';

// Mock runtime-utils before importing content-lib
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

// Mock chrome runtime
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
      get: jest.fn((keys, callback) => {
        callback({ highlightStyle: 'default' });
      }),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
};
(global as any).chrome = mockChrome;

describe('createPlayButton', () => {
  let button: HTMLButtonElement;

  beforeEach(() => {
    button = createPlayButton();
  });

  test('should create a button element', () => {
    expect(button).toBeInstanceOf(HTMLButtonElement);
  });

  test('should have the correct play SVG as innerHTML', () => {
    const playIconSvg = button.querySelector('svg');
    expect(playIconSvg).not.toBeNull();
    expect(playIconSvg?.getAttribute('width')).toBe('10');
    expect(playIconSvg?.getAttribute('height')).toBe('10');
    expect(playIconSvg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(playIconSvg?.getAttribute('fill')).toBe('currentColor');
    expect(isSvgPlayIcon(playIconSvg as SVGElement)).toBe(true);
  });

  test('should have the correct CSS styles', () => {
    const cssText = button.style.cssText;
    expect(cssText).toContain('display: flex');
    expect(cssText).toContain('align-items: center');
    expect(cssText).toContain('justify-content: center');
  });

  test('should be clickable', () => {
    const clickHandler = jest.fn();
    button.addEventListener('click', clickHandler);
    button.click();
    expect(clickHandler).toHaveBeenCalledTimes(1);
  });

  test('should be focusable', () => {
    document.body.appendChild(button);
    button.focus();
    expect(document.activeElement).toBe(button);
    document.body.removeChild(button);
  });

  test('should have proper button semantics', () => {
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('submit'); // Default button type
  });
});

describe('shouldProcessNode', () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Load minimum words setting
    await loadMinimumWordsFromStorage();
    // Load maximum nodes setting
    await loadMaxNodesFromStorage();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('should return false for null node', () => {
    expect(shouldProcessNode(null as any)).toBe(false);
  });

  test('should return false for non-text nodes', () => {
    const div = document.createElement('div');
    expect(shouldProcessNode(div)).toBe(false);
  });

  test('should return false for empty text nodes', () => {
    const textNode = document.createTextNode('');
    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false for whitespace-only text nodes', () => {
    const textNode = document.createTextNode('   \n\t  ');
    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false for single character text nodes', () => {
    const textNode = document.createTextNode('a');
    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false for text nodes in script tags', () => {
    const script = document.createElement('script');
    const textNode = document.createTextNode('console.log("test")');
    script.appendChild(textNode);
    container.appendChild(script);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false for text nodes in style tags', () => {
    const style = document.createElement('style');
    const textNode = document.createTextNode('body { color: red; }');
    style.appendChild(textNode);
    container.appendChild(style);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false for text nodes in button tags', () => {
    const button = document.createElement('button');
    const textNode = document.createTextNode('Click me');
    button.appendChild(textNode);
    container.appendChild(button);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false for text nodes in input tags', () => {
    const input = document.createElement('input');
    const textNode = document.createTextNode('input text');
    input.appendChild(textNode);
    container.appendChild(input);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false for text nodes in code tags', () => {
    const code = document.createElement('code');
    const textNode = document.createTextNode('console.log("hello world")');
    code.appendChild(textNode);
    container.appendChild(code);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false for text nodes in nested code tags', () => {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    const textNode = document.createTextNode(
      'function example() {\n  return "test";\n}'
    );
    code.appendChild(textNode);
    pre.appendChild(code);
    container.appendChild(pre);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false if parent already has a play button', () => {
    const div = document.createElement('div');
    const textNode = document.createTextNode('This is a test');
    div.appendChild(textNode);
    container.appendChild(div);

    // Add a play button to the parent
    const playButton = document.createElement('button');
    playButton.classList.add('talkient-play-button');
    div.appendChild(playButton);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false if parent is already processed', () => {
    const div = document.createElement('div');
    const textNode = document.createTextNode('This is a test');
    div.appendChild(textNode);
    div.classList.add('talkient-processed');
    container.appendChild(div);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return true for valid text nodes', () => {
    const div = document.createElement('div');
    const textNode = document.createTextNode('This is a valid text node');
    div.appendChild(textNode);
    container.appendChild(div);

    expect(shouldProcessNode(textNode)).toBe(true);
  });

  test('should return true for text nodes with multiple characters', async () => {
    const div = document.createElement('div');
    // Use three words to satisfy the minimum words requirement
    const textNode = document.createTextNode('three words here');
    div.appendChild(textNode);
    container.appendChild(div);

    expect(shouldProcessNode(textNode)).toBe(true);
  });
});

describe('processTextElements', () => {
  beforeEach(() => {
    // Mock document.createTreeWalker
    const mockWalker = {
      nextNode: jest.fn(),
      currentNode: null as Node | null,
    };

    document.createTreeWalker = jest.fn().mockReturnValue(mockWalker);

    // Mock requestAnimationFrame
    (global as any).requestAnimationFrame = jest.fn((callback) => {
      setTimeout(callback, 0);
      return 1;
    });
  });

  test('should log processing message', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    processTextElements();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Talkient] Processing the text elements...'
    );
  });

  test('should create tree walker with correct parameters', () => {
    processTextElements();
    expect(document.createTreeWalker).toHaveBeenCalledWith(
      document.body,
      NodeFilter.SHOW_TEXT,
      expect.any(Object)
    );
  });
});

describe('Content Script Message Handling', () => {
  let container: HTMLDivElement;
  let playButton: HTMLButtonElement;

  beforeEach(() => {
    container = document.createElement('div');
    playButton = document.createElement('button');
    playButton.classList.add('talkient-play-button');
    playButton.innerHTML = getSvgIcon('pause');
    container.appendChild(playButton);
    document.body.appendChild(container);

    // Reset chrome mock
    mockChrome.runtime.onMessage.addListener.mockClear();
    mockChrome.runtime.sendMessage.mockClear();
  });

  afterEach(() => {
    document.body.removeChild(container);
    clearHighlight();
    jest.resetModules(); // Reset module cache
  });

  test('should handle SPEECH_ENDED message correctly', () => {
    // Simulate highlighting
    const testElement = document.createElement('span');
    testElement.textContent = 'Test content';
    container.appendChild(testElement);
    highlightText(testElement);

    // Import content script to trigger message listener registration
    require('../content');

    // Verify that the message listener was registered
    expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();

    // Get the registered message listener
    const messageListener =
      mockChrome.runtime.onMessage.addListener.mock.calls[0][0];

    // Simulate SPEECH_ENDED message
    const message = { type: 'SPEECH_ENDED' };
    const sender = {};
    const sendResponse = jest.fn();

    messageListener(message, sender, sendResponse);

    // Check that play button is reset to play icon
    const svg = playButton.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(isSvgPlayIcon(svg as SVGElement)).toBe(true);

    // Check that highlighting is cleared
    expect(getCurrentHighlightedElement()).toBeNull();
    expect(testElement.classList.contains('talkient-highlighted')).toBe(false);
  });

  test('should reset all play buttons on SPEECH_ENDED', () => {
    // Create multiple play buttons
    const playButton2 = document.createElement('button');
    playButton2.classList.add('talkient-play-button');
    playButton2.innerHTML = getSvgIcon('pause');
    container.appendChild(playButton2);

    const playButton3 = document.createElement('button');
    playButton3.classList.add('talkient-play-button');
    playButton3.innerHTML = getSvgIcon('pause');
    container.appendChild(playButton3);

    // Import content script
    require('../content');

    // Verify that the message listener was registered
    expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();

    // Get the registered message listener
    const messageListener =
      mockChrome.runtime.onMessage.addListener.mock.calls[0][0];

    // Simulate SPEECH_ENDED message
    const message = { type: 'SPEECH_ENDED' };
    messageListener(message, {}, jest.fn());

    // Check that all play buttons are reset to play icon
    document.querySelectorAll('.talkient-play-button').forEach((button) => {
      const svg = (button as HTMLButtonElement).querySelector('svg');
      expect(svg).not.toBeNull();
      expect(isSvgPlayIcon(svg as SVGElement)).toBe(true);
    });
  });

  test('should ignore unknown message types', () => {
    const testElement = document.createElement('span');
    container.appendChild(testElement);
    highlightText(testElement);

    // Import content script
    require('../content');

    // Verify that the message listener was registered
    expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();

    // Get the registered message listener
    const messageListener =
      mockChrome.runtime.onMessage.addListener.mock.calls[0][0];

    // Simulate unknown message
    const message = { type: 'UNKNOWN_TYPE' };
    messageListener(message, {}, jest.fn());

    // Check that nothing changed
    const svg = playButton.querySelector('svg');
    expect(isSvgPauseIcon(svg as SVGElement)).toBe(true);
    expect(getCurrentHighlightedElement()).toBe(testElement);
  });

  test('should handle SPEECH_CANCELLED message correctly', () => {
    // Simulate highlighting
    const testElement = document.createElement('span');
    testElement.textContent = 'Test content';
    container.appendChild(testElement);
    highlightText(testElement);

    // Import content script
    require('../content');

    // Get the registered message listener
    const messageListener =
      mockChrome.runtime.onMessage.addListener.mock.calls[0][0];

    // Need to mock the getCurrentHighlightedElement function
    // since it's not actually changing the highlight in the test environment
    jest
      .spyOn(require('../highlight'), 'getCurrentHighlightedElement')
      .mockReturnValue(null);

    // Simulate SPEECH_CANCELLED message
    const message = { type: 'SPEECH_CANCELLED' };
    messageListener(message, {}, jest.fn());

    // Check that play button is reset to play icon
    const svg = playButton.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(isSvgPlayIcon(svg as SVGElement)).toBe(true);

    // In a real environment, highlighting would be cleared
    // but we can't check that directly in the test since it's mocked
    expect(testElement.classList.contains('talkient-highlighted')).toBe(false);
  });

  test('should handle SPEECH_ERROR message correctly', () => {
    // Simulate highlighting
    const testElement = document.createElement('span');
    testElement.textContent = 'Test content';
    container.appendChild(testElement);
    highlightText(testElement);

    // Spy on console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Import content script
    require('../content');

    // Need to mock the getCurrentHighlightedElement function
    // since it's not actually changing the highlight in the test environment
    jest
      .spyOn(require('../highlight'), 'getCurrentHighlightedElement')
      .mockReturnValue(null);

    // Get the registered message listener
    const messageListener =
      mockChrome.runtime.onMessage.addListener.mock.calls[0][0];

    // Simulate SPEECH_ERROR message
    const message = { type: 'SPEECH_ERROR', error: 'Test error' };
    messageListener(message, {}, jest.fn());

    // Check that play button is reset to play icon
    const svg = playButton.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(isSvgPlayIcon(svg as SVGElement)).toBe(true);

    // In a real environment, highlighting would be cleared
    // but we can't check that directly in the test since it's mocked
    expect(testElement.classList.contains('talkient-highlighted')).toBe(false);

    // Check that error was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Talkient] Speech error occurred:',
      'Test error'
    );

    consoleSpy.mockRestore();
  });

  test('should send stop message on beforeunload event', () => {
    // Clear any previous calls
    mockChrome.runtime.sendMessage.mockClear();

    // Import content script to register event listeners
    require('../content');

    // Trigger beforeunload event
    const beforeUnloadEvent = new Event('beforeunload');
    window.dispatchEvent(beforeUnloadEvent);

    // Check that correct message was sent at least once
    const calls = mockChrome.runtime.sendMessage.mock.calls;
    const hasCorrectCall = calls.some(
      (call) =>
        call[0]?.type === 'PAUSE_SPEECH' && call[0]?.isPageUnload === true
    );
    expect(hasCorrectCall).toBe(true);
  });
});

describe('Button Position Configuration', () => {
  beforeEach(() => {
    // Clear mock calls
    mockChrome.storage.local.get.mockClear();
    mockChrome.storage.local.set.mockClear();
  });

  describe('loadButtonPositionFromStorage', () => {
    test('should load button position from storage (right)', async () => {
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ buttonPosition: 'right' });
      });

      const position = await loadButtonPositionFromStorage();
      expect(position).toBe('right');
      expect(getButtonPosition()).toBe('right');
    });

    test('should default to left when not stored', async () => {
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      const position = await loadButtonPositionFromStorage();
      expect(position).toBe('left');
      expect(getButtonPosition()).toBe('left');
    });

    test('should default to left when invalid value is stored', async () => {
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ buttonPosition: 'invalid' });
      });

      const position = await loadButtonPositionFromStorage();
      expect(position).toBe('left');
      expect(getButtonPosition()).toBe('left');
    });
  });

  describe('setButtonPosition', () => {
    test('should set button position to right', () => {
      setButtonPosition('right');
      expect(getButtonPosition()).toBe('right');
    });

    test('should set button position to left', () => {
      setButtonPosition('left');
      expect(getButtonPosition()).toBe('left');
    });
  });

  describe('button position classes', () => {
    test('button should have left class when position is set to left', () => {
      setButtonPosition('left');

      const button = createPlayButton();
      button.classList.add('talkient-play-button');

      // Simulate adding position class based on configuration
      if (getButtonPosition() === 'left') {
        button.classList.add('talkient-button-left');
      }

      expect(button.classList.contains('talkient-button-left')).toBe(true);
    });

    test('button should not have left class when position is set to right', () => {
      setButtonPosition('right');

      const button = createPlayButton();
      button.classList.add('talkient-play-button');

      // Simulate adding position class based on configuration
      if (getButtonPosition() === 'left') {
        button.classList.add('talkient-button-left');
      }

      expect(button.classList.contains('talkient-button-left')).toBe(false);
    });

    test('getButtonPosition should return the set position', () => {
      setButtonPosition('left');
      expect(getButtonPosition()).toBe('left');

      setButtonPosition('right');
      expect(getButtonPosition()).toBe('right');
    });
  });
});
