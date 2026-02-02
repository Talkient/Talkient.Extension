/**
 * @jest-environment jsdom
 */

import { shouldProcessNode, loadMinimumWordsFromStorage } from "../content-lib";

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
(global as any).chrome = mockChrome;

describe("Minimum words functionality", () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    container = document.createElement("div");
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

  test("should return false for text with fewer words than minimum setting", () => {
    const textNode = document.createTextNode("SingleWord");
    container.appendChild(textNode);

    expect(shouldProcessNode(textNode)).toBe(false);

    // Two words is also below minimum
    const twoWordsNode = document.createTextNode("Two Words");
    container.appendChild(twoWordsNode);

    expect(shouldProcessNode(twoWordsNode)).toBe(false);
  });

  test("should return true for text with exactly the minimum number of words", () => {
    const article = document.createElement("article");
    const textNode = document.createTextNode("Three Words Here");
    article.appendChild(textNode);
    container.appendChild(article);

    expect(shouldProcessNode(textNode)).toBe(true);
  });

  test("should return true for text with more than minimum number of words", () => {
    const article = document.createElement("article");
    const textNode = document.createTextNode("This has four words");
    article.appendChild(textNode);
    container.appendChild(article);

    expect(shouldProcessNode(textNode)).toBe(true);
  });

  test("should handle custom minimum words setting", async () => {
    // Change the mock to return a minimum of 4 words
    testMinimumWords = 4;
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ minimumWords: testMinimumWords });
    });

    // Reload the setting
    await loadMinimumWordsFromStorage();

    const article = document.createElement("article");
    const threeWordsNode = document.createTextNode("Three Words Here");
    article.appendChild(threeWordsNode);

    const fourWordsNode = document.createTextNode("This Has Four Words");
    article.appendChild(fourWordsNode);
    container.appendChild(article);

    // With minimum set to 4, three words should not be processed
    expect(shouldProcessNode(threeWordsNode)).toBe(false);

    // But four words should be processed
    expect(shouldProcessNode(fourWordsNode)).toBe(true);
  });

  test("should handle high minimum words value", async () => {
    // Set a high minimum word count
    testMinimumWords = 5;
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ minimumWords: testMinimumWords });
    });

    // Reload the setting
    await loadMinimumWordsFromStorage();

    const article = document.createElement("article");
    const fourWordsNode = document.createTextNode("This has four words");
    article.appendChild(fourWordsNode);

    const fiveWordsNode = document.createTextNode(
      "This has exactly five words",
    );
    article.appendChild(fiveWordsNode);
    container.appendChild(article);

    // Four words shouldn't be processed when minimum is 5
    expect(shouldProcessNode(fourWordsNode)).toBe(false);

    // Five words should be processed
    expect(shouldProcessNode(fiveWordsNode)).toBe(true);
  });
  test("should default to 3 words if minimumWords setting is not available", async () => {
    // Mock the storage to return empty object (no minimumWords)
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({});
    });

    // Reload the setting
    await loadMinimumWordsFromStorage();

    const article = document.createElement("article");
    const twoWordsNode = document.createTextNode("Two Words");
    article.appendChild(twoWordsNode);

    const threeWordsNode = document.createTextNode("Three Words Here");
    article.appendChild(threeWordsNode);
    container.appendChild(article);

    // Two words shouldn't be processed (default minimum is 3)
    expect(shouldProcessNode(twoWordsNode)).toBe(false);

    // Three words should be processed
    expect(shouldProcessNode(threeWordsNode)).toBe(true);
  });

  test("should handle punctuation when counting words", () => {
    const article = document.createElement("article");
    const textWithPunctuation = document.createTextNode(
      "Hello, world! How are you?",
    );
    article.appendChild(textWithPunctuation);
    container.appendChild(article);

    // "Hello, world! How are you?" has five words with punctuation
    expect(shouldProcessNode(textWithPunctuation)).toBe(true);
  });

  test("should handle multiple spaces between words", () => {
    const article = document.createElement("article");
    const textWithExtraSpaces = document.createTextNode(
      "Three    Words    Here",
    );
    article.appendChild(textWithExtraSpaces);
    container.appendChild(article);

    // "Three    Words    Here" has three words despite extra spaces
    expect(shouldProcessNode(textWithExtraSpaces)).toBe(true);
  });
});
