/**
 * @jest-environment jsdom
 */

import {
  shouldProcessNode,
  loadMinimumWordsFromStorage,
  processTextElements,
} from '../content/text-processor';

// Mock for minimum words
let testMinimumWords = 3;

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
        callback({ minimumWords: testMinimumWords });
      }),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

// Run processing batches synchronously
global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  callback(0);
  return 1;
});

// The minimum words setting applies to a whole reading block
function isProcessed(element: Element): boolean {
  return element.classList.contains('talkient-processed');
}

describe('Minimum words functionality', () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Reset the mock implementation to default (3 words)
    testMinimumWords = 3;
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ minimumWords: testMinimumWords });
    });

    // Load the setting
    await loadMinimumWordsFromStorage();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('should return false for text with fewer words than minimum setting', () => {
    const textNode = document.createTextNode('SingleWord');
    container.appendChild(textNode);

    expect(shouldProcessNode(textNode)).toBe(false);

    // Two words is also below minimum
    const twoWordsNode = document.createTextNode('Two Words');
    container.appendChild(twoWordsNode);

    expect(shouldProcessNode(twoWordsNode)).toBe(false);
  });

  test('should return true for text with exactly the minimum number of words', () => {
    const article = document.createElement('article');
    const textNode = document.createTextNode('Three Words Here');
    article.appendChild(textNode);
    container.appendChild(article);

    expect(shouldProcessNode(textNode)).toBe(true);
  });

  test('should return true for text with more than minimum number of words', () => {
    const article = document.createElement('article');
    const textNode = document.createTextNode('This has four words');
    article.appendChild(textNode);
    container.appendChild(article);

    expect(shouldProcessNode(textNode)).toBe(true);
  });

  test('should handle custom minimum words setting', async () => {
    // Change the mock to return a minimum of 4 words
    testMinimumWords = 4;
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ minimumWords: testMinimumWords });
    });

    // Reload the setting
    await loadMinimumWordsFromStorage();

    container.innerHTML =
      '<article><p id="three">Three Words Here</p><p id="four">This Has Four Words</p></article>';

    processTextElements();

    // With minimum set to 4, three words should not be processed
    expect(isProcessed(container.querySelector('#three')!)).toBe(false);

    // But four words should be processed
    expect(isProcessed(container.querySelector('#four')!)).toBe(true);
  });

  test('should handle high minimum words value', async () => {
    // Set a high minimum word count
    testMinimumWords = 5;
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ minimumWords: testMinimumWords });
    });

    // Reload the setting
    await loadMinimumWordsFromStorage();

    container.innerHTML =
      '<article><p id="four">This has four words</p><p id="five">This has exactly five words</p></article>';

    processTextElements();

    // Four words shouldn't be processed when minimum is 5
    expect(isProcessed(container.querySelector('#four')!)).toBe(false);

    // Five words should be processed
    expect(isProcessed(container.querySelector('#five')!)).toBe(true);
  });
  test('should default to 3 words if minimumWords setting is not available', async () => {
    // Mock the storage to return empty object (no minimumWords)
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({});
    });

    // Reload the setting
    await loadMinimumWordsFromStorage();

    container.innerHTML =
      '<article><p id="two">Two Words</p><p id="three">Three Words Here</p></article>';

    processTextElements();

    // Two words shouldn't be processed (default minimum is 3)
    expect(isProcessed(container.querySelector('#two')!)).toBe(false);

    // Three words should be processed
    expect(isProcessed(container.querySelector('#three')!)).toBe(true);
  });

  test('should count words across the whole block, not per text node', () => {
    // Every fragment is below the minimum, the paragraph as a whole is not
    container.innerHTML =
      '<p id="fragmented">Read <a href="#">the docs</a> now.</p>';
    const fragment = container.querySelector('a')!.firstChild!;

    expect(shouldProcessNode(fragment)).toBe(true);

    processTextElements();

    expect(isProcessed(container.querySelector('#fragmented')!)).toBe(true);
  });

  test('should handle punctuation when counting words', () => {
    const article = document.createElement('article');
    const textWithPunctuation = document.createTextNode(
      'Hello, world! How are you?',
    );
    article.appendChild(textWithPunctuation);
    container.appendChild(article);

    // "Hello, world! How are you?" has five words with punctuation
    expect(shouldProcessNode(textWithPunctuation)).toBe(true);
  });

  test('should handle multiple spaces between words', () => {
    const article = document.createElement('article');
    const textWithExtraSpaces = document.createTextNode(
      'Three    Words    Here',
    );
    article.appendChild(textWithExtraSpaces);
    container.appendChild(article);

    // "Three    Words    Here" has three words despite extra spaces
    expect(shouldProcessNode(textWithExtraSpaces)).toBe(true);
  });
});
