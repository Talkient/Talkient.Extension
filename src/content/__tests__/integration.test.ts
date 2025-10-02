/// <reference lib="dom" />
/// <reference types="chrome" />

import {
  processTextElements,
  highlightText,
  clearHighlight,
  getCurrentHighlightedElement,
} from '../content-lib';
import { isSvgPlayIcon, isSvgPauseIcon } from '../icons';

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
        // Mock implementation with default values
        if (Array.isArray(keys) && keys.includes('followHighlight')) {
          callback({ followHighlight: false });
        } else if (Array.isArray(keys) && keys.includes('highlightStyle')) {
          callback({ highlightStyle: 'default' });
        } else if (
          keys === 'playButtonsEnabled' ||
          (Array.isArray(keys) && keys.includes('playButtonsEnabled'))
        ) {
          callback({ playButtonsEnabled: true });
        } else {
          callback({});
        }
      }),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
};
(global as any).chrome = mockChrome;

describe('Text Highlighting Integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Reset mocks
    mockChrome.runtime.sendMessage.mockClear();

    // Mock requestAnimationFrame
    (global as any).requestAnimationFrame = jest.fn((callback) => {
      setTimeout(callback, 0);
      return 1;
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
    clearHighlight();
    jest.clearAllMocks();
  });

  test('should highlight text when play button is clicked', async () => {
    // Create a paragraph with text
    const paragraph = document.createElement('p');
    const textContent = 'This is a test paragraph for speech synthesis.';
    paragraph.textContent = textContent;
    container.appendChild(paragraph);

    // Mock the tree walker to return our text node
    const textNode = paragraph.firstChild as Text;
    const mockWalker = {
      nextNode: jest.fn().mockReturnValueOnce(textNode).mockReturnValue(null),
      currentNode: textNode,
    };

    document.createTreeWalker = jest.fn().mockReturnValue(mockWalker);

    // Process text elements to add play buttons
    processTextElements();

    // Wait for requestAnimationFrame to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Find the play button that was added
    const playButton = container.querySelector(
      '.talkient-play-button'
    ) as HTMLButtonElement;
    expect(playButton).toBeTruthy();

    // Check for SVG play icon
    const svg = playButton.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(isSvgPlayIcon(svg as SVGElement)).toBe(true);

    // Mock successful sendMessage response
    mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (callback) callback({ success: true });
    });

    // Click the play button
    playButton.click();

    // Check that the text is highlighted
    const highlightedElement = getCurrentHighlightedElement();
    expect(highlightedElement).toBeTruthy();
    expect(highlightedElement?.classList.contains('talkient-highlighted')).toBe(
      true
    );

    // Check that the play button changed to pause
    const svgAfterClick = playButton.querySelector('svg');
    expect(svgAfterClick).not.toBeNull();
    expect(isSvgPauseIcon(svgAfterClick as SVGElement)).toBe(true);

    // Check that the correct message was sent
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SPEAK_TEXT',
        text: textContent,
      }),
      expect.any(Function)
    );
  });

  test('should clear highlight when pause button is clicked', async () => {
    // Create a paragraph with text
    const paragraph = document.createElement('p');
    const textContent = 'This is another test paragraph.';
    paragraph.textContent = textContent;
    container.appendChild(paragraph);

    // Mock the tree walker
    const textNode = paragraph.firstChild as Text;
    const mockWalker = {
      nextNode: jest.fn().mockReturnValueOnce(textNode).mockReturnValue(null),
      currentNode: textNode,
    };

    document.createTreeWalker = jest.fn().mockReturnValue(mockWalker);

    // Process text elements
    processTextElements();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const playButton = container.querySelector(
      '.talkient-play-button'
    ) as HTMLButtonElement;

    // Mock successful sendMessage response
    mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (callback) callback({ success: true });
    });

    // Click play to start and highlight
    playButton.click();
    expect(getCurrentHighlightedElement()).toBeTruthy();

    // Check for pause icon
    const svgAfterPlay = playButton.querySelector('svg');
    expect(svgAfterPlay).not.toBeNull();
    expect(isSvgPauseIcon(svgAfterPlay as SVGElement)).toBe(true);

    // Click pause to stop and clear highlight
    playButton.click();
    expect(getCurrentHighlightedElement()).toBeNull();

    // Check for play icon
    const svgAfterPause = playButton.querySelector('svg');
    expect(svgAfterPause).not.toBeNull();
    expect(isSvgPlayIcon(svgAfterPause as SVGElement)).toBe(true);

    // Check that pause message was sent
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PAUSE_SPEECH',
      }),
      expect.any(Function)
    );
  });

  test('should handle sendMessage errors gracefully', async () => {
    // Create a paragraph with text
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Test paragraph for error handling.';
    container.appendChild(paragraph);

    // Mock the tree walker
    const textNode = paragraph.firstChild as Text;
    const mockWalker = {
      nextNode: jest.fn().mockReturnValueOnce(textNode).mockReturnValue(null),
      currentNode: textNode,
    };

    document.createTreeWalker = jest.fn().mockReturnValue(mockWalker);

    // Spy on console.error before processing
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock chrome.runtime.lastError with a non-context-invalidation error BEFORE processing
    (mockChrome.runtime as any).lastError = {
      message: 'Some other test error',
    };
    mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
      // Simulate error by immediately calling callback with lastError set
      if (callback) {
        callback(null);
      }
    });

    // Process text elements
    processTextElements();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const playButton = container.querySelector(
      '.talkient-play-button'
    ) as HTMLButtonElement;

    // Click the play button
    playButton.click();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Check that the message was at least attempted
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();

    // Cleanup
    consoleErrorSpy.mockRestore();
    (mockChrome.runtime as any).lastError = null;
  });

  test('should handle multiple text elements independently', async () => {
    // Create multiple paragraphs
    const paragraph1 = document.createElement('p');
    const paragraph2 = document.createElement('p');
    paragraph1.textContent = 'First paragraph text.';
    paragraph2.textContent = 'Second paragraph text.';
    container.appendChild(paragraph1);
    container.appendChild(paragraph2);

    // Mock the tree walker to return both text nodes
    const textNode1 = paragraph1.firstChild as Text;
    const textNode2 = paragraph2.firstChild as Text;

    let callCount = 0;
    const mockWalker = {
      nextNode: jest.fn(() => {
        callCount++;
        if (callCount === 1) {
          mockWalker.currentNode = textNode1;
          return textNode1;
        } else if (callCount === 2) {
          mockWalker.currentNode = textNode2;
          return textNode2;
        }
        return null;
      }),
      currentNode: null as Node | null,
    };

    document.createTreeWalker = jest.fn().mockReturnValue(mockWalker);

    // Process text elements
    processTextElements();
    await new Promise((resolve) => setTimeout(resolve, 50)); // Increased timeout

    // Find both play buttons
    const playButtons = container.querySelectorAll(
      '.talkient-play-button'
    ) as NodeListOf<HTMLButtonElement>;
    expect(playButtons.length).toBe(2);

    // Mock successful sendMessage response
    mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (callback) callback({ success: true });
    });

    // Click the first play button
    playButtons[0].click();

    // Check that only the first paragraph's text is highlighted
    const highlightedElement = getCurrentHighlightedElement();
    expect(highlightedElement).toBeTruthy();

    // Click the second play button (should clear first highlight and highlight second)
    playButtons[1].click();

    // Check that now only the second paragraph's text is highlighted
    const newHighlightedElement = getCurrentHighlightedElement();
    expect(newHighlightedElement).toBeTruthy();
    expect(newHighlightedElement).not.toBe(highlightedElement);
  });
});
