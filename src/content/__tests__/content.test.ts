import {
  createPlayButton,
  shouldProcessNode,
  processTextElements,
  highlightText,
  clearHighlight,
  getCurrentHighlightedElement,
} from '../content-lib';

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

  test('should have the correct play emoji as innerHTML', () => {
    expect(button.innerHTML).toBe('▶️');
  });

  test('should have the correct CSS styles', () => {
    const cssText = button.style.cssText;
    expect(cssText).toContain('background: none');
    expect(cssText).toContain('cursor: pointer');
    expect(cssText).toContain('padding: 2px 5px');
    expect(cssText).toContain('margin-left: 5px');
    expect(cssText).toContain('font-size: 14px');
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

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
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

  test('should return true for text nodes with multiple characters', () => {
    const div = document.createElement('div');
    const textNode = document.createTextNode('ab');
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
    playButton.innerHTML = '⏸️';
    container.appendChild(playButton);
    document.body.appendChild(container);

    // Reset chrome mock
    mockChrome.runtime.onMessage.addListener.mockClear();
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

    // Check that play button is reset
    expect(playButton.innerHTML).toBe('▶️');

    // Check that highlighting is cleared
    expect(getCurrentHighlightedElement()).toBeNull();
    expect(testElement.classList.contains('talkient-highlighted')).toBe(false);
  });

  test('should reset all play buttons on SPEECH_ENDED', () => {
    // Create multiple play buttons
    const playButton2 = document.createElement('button');
    playButton2.classList.add('talkient-play-button');
    playButton2.innerHTML = '⏸️';
    container.appendChild(playButton2);

    const playButton3 = document.createElement('button');
    playButton3.classList.add('talkient-play-button');
    playButton3.innerHTML = '⏸️';
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

    // Check that all play buttons are reset
    document.querySelectorAll('.talkient-play-button').forEach((button) => {
      expect((button as HTMLButtonElement).innerHTML).toBe('▶️');
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
    expect(playButton.innerHTML).toBe('⏸️');
    expect(getCurrentHighlightedElement()).toBe(testElement);
  });
});
