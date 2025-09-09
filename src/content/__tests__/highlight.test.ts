/// <reference lib="dom" />
/// <reference types="jest" />

import {
  highlightText,
  clearHighlight,
  getCurrentHighlightedElement,
  setHighlightingStyle,
  getHighlightingStyle,
  testHighlightingStyle,
  loadHighlightStyleFromStorage,
  scrollToHighlightedElement,
} from '../highlight';

// Mock scrollTo function
window.scrollTo = jest.fn();

// Mock chrome runtime for storage tests
const mockChrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        // Default mock behavior for get - provide default values
        if (Array.isArray(keys) && keys.includes('highlightStyle')) {
          callback({ highlightStyle: 'default' });
        } else if (Array.isArray(keys) && keys.includes('followHighlight')) {
          callback({ followHighlight: false });
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
  runtime: {
    sendMessage: jest.fn(),
  },
};
(global as any).chrome = mockChrome;

// Mock DOM environment
beforeEach(() => {
  document.body.innerHTML = '';
  clearHighlight(); // Reset any previous state
  setHighlightingStyle('default'); // Reset to default style
  jest.clearAllMocks(); // Clear all mock calls
});

describe('highlightText', () => {
  let container: HTMLDivElement;
  let testElement: HTMLSpanElement;

  beforeEach(() => {
    container = document.createElement('div');
    testElement = document.createElement('span');
    testElement.textContent = 'Test text content';
    container.appendChild(testElement);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    clearHighlight(); // Clean up any highlights
  });

  test('should add highlight class to element', () => {
    highlightText(testElement);
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);
  });

  test('should apply highlighting styles', () => {
    highlightText(testElement);
    // We now rely on CSS classes instead of inline styles for better visual appearance
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);
    // Verify that any inline styles are handled properly
    expect(testElement.style.backgroundColor).toBe('');
  });

  test('should set current highlighted element', () => {
    highlightText(testElement);
    expect(getCurrentHighlightedElement()).toBe(testElement);
  });

  test('should clear previous highlight when highlighting new element', () => {
    const secondElement = document.createElement('span');
    secondElement.textContent = 'Second test text';
    container.appendChild(secondElement);

    // Highlight first element
    highlightText(testElement);
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);

    // Highlight second element
    highlightText(secondElement);
    expect(testElement.classList.contains('talkient-highlighted')).toBe(false);
    expect(testElement.style.backgroundColor).toBe('');
    expect(secondElement.classList.contains('talkient-highlighted')).toBe(true);
    expect(getCurrentHighlightedElement()).toBe(secondElement);
  });
});

describe('clearHighlight', () => {
  let container: HTMLDivElement;
  let testElement: HTMLSpanElement;

  beforeEach(() => {
    container = document.createElement('div');
    testElement = document.createElement('span');
    testElement.textContent = 'Test text content';
    container.appendChild(testElement);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('should remove highlight class from current element', () => {
    highlightText(testElement);
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);

    clearHighlight();
    expect(testElement.classList.contains('talkient-highlighted')).toBe(false);
  });

  test('should remove highlighting styles from current element', () => {
    highlightText(testElement);
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);

    clearHighlight();
    expect(testElement.style.backgroundColor).toBe('');
    expect(testElement.classList.contains('talkient-highlighted')).toBe(false);
  });

  test('should reset current highlighted element to null', () => {
    highlightText(testElement);
    expect(getCurrentHighlightedElement()).toBe(testElement);

    clearHighlight();
    expect(getCurrentHighlightedElement()).toBeNull();
  });

  test('should work when no element is currently highlighted', () => {
    expect(getCurrentHighlightedElement()).toBeNull();
    expect(() => clearHighlight()).not.toThrow();
    expect(getCurrentHighlightedElement()).toBeNull();
  });

  test('should clear all highlighted elements as safety net', () => {
    // Create multiple elements with highlight class
    const element1 = document.createElement('span');
    const element2 = document.createElement('span');
    element1.classList.add('talkient-highlighted');
    element2.classList.add('talkient-highlighted');
    element1.style.backgroundColor = '#ffff99';
    element2.style.backgroundColor = '#ffff99';

    container.appendChild(element1);
    container.appendChild(element2);

    clearHighlight();

    expect(element1.classList.contains('talkient-highlighted')).toBe(false);
    expect(element2.classList.contains('talkient-highlighted')).toBe(false);
    expect(element1.style.backgroundColor).toBe('');
    expect(element2.style.backgroundColor).toBe('');
  });
});

describe('getCurrentHighlightedElement', () => {
  let container: HTMLDivElement;
  let testElement: HTMLSpanElement;

  beforeEach(() => {
    container = document.createElement('div');
    testElement = document.createElement('span');
    testElement.textContent = 'Test text content';
    container.appendChild(testElement);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    clearHighlight();
  });

  test('should return null when no element is highlighted', () => {
    expect(getCurrentHighlightedElement()).toBeNull();
  });

  test('should return currently highlighted element', () => {
    highlightText(testElement);
    expect(getCurrentHighlightedElement()).toBe(testElement);
  });

  test('should return null after clearing highlight', () => {
    highlightText(testElement);
    expect(getCurrentHighlightedElement()).toBe(testElement);

    clearHighlight();
    expect(getCurrentHighlightedElement()).toBeNull();
  });
});

describe('Highlighting Style Management', () => {
  let container: HTMLDivElement;
  let testElement: HTMLSpanElement;

  beforeEach(() => {
    container = document.createElement('div');
    testElement = document.createElement('span');
    testElement.textContent = 'Test text content';
    container.appendChild(testElement);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    clearHighlight();
    setHighlightingStyle('default'); // Reset to default
  });

  test('should set and get highlighting style', () => {
    expect(getHighlightingStyle()).toBe('default');

    setHighlightingStyle('bold');
    expect(getHighlightingStyle()).toBe('bold');

    setHighlightingStyle('minimal');
    expect(getHighlightingStyle()).toBe('minimal');
  });

  test('should apply bold style when specified', () => {
    highlightText(testElement, 'bold');
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);
    expect(testElement.classList.contains('style-bold')).toBe(true);
  });

  test('should apply minimal style when specified', () => {
    highlightText(testElement, 'minimal');
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);
    expect(testElement.classList.contains('style-minimal')).toBe(true);
  });

  test('should apply elegant style when specified', () => {
    highlightText(testElement, 'elegant');
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);
    expect(testElement.classList.contains('style-elegant')).toBe(true);
  });

  test('should use current style when no style is specified', () => {
    setHighlightingStyle('bold');
    highlightText(testElement);
    expect(testElement.classList.contains('style-bold')).toBe(true);
  });

  test('should clear all style modifiers when clearing highlight', () => {
    highlightText(testElement, 'bold');
    expect(testElement.classList.contains('style-bold')).toBe(true);

    clearHighlight();
    expect(testElement.classList.contains('talkient-highlighted')).toBe(false);
    expect(testElement.classList.contains('style-bold')).toBe(false);
    expect(testElement.classList.contains('style-minimal')).toBe(false);
    expect(testElement.classList.contains('style-elegant')).toBe(false);
  });

  test('should test highlighting style with testHighlightingStyle function', () => {
    // This function finds elements in the document, so we need elements
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Test paragraph for style testing';
    container.appendChild(paragraph);

    testHighlightingStyle('bold');

    // Should highlight the first found element
    const highlighted = getCurrentHighlightedElement();
    expect(highlighted).toBeTruthy();
    expect(highlighted?.classList.contains('style-bold')).toBe(true);
  });
});

describe('loadHighlightStyleFromStorage', () => {
  it('should load highlight style from storage', () => {
    // Mock chrome.storage.local.get to return 'bold' style
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ highlightStyle: 'bold' });
      }
    );

    loadHighlightStyleFromStorage();

    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(
      ['highlightStyle'],
      expect.any(Function)
    );
    expect(getHighlightingStyle()).toBe('bold');
  });

  it('should handle missing highlight style in storage', () => {
    // Mock chrome.storage.local.get to return empty result
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({});
      }
    );

    loadHighlightStyleFromStorage();

    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(
      ['highlightStyle'],
      expect.any(Function)
    );
    expect(getHighlightingStyle()).toBe('default'); // Should remain default
  });

  it('should handle invalid highlight style in storage', () => {
    // Mock chrome.storage.local.get to return invalid style
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ highlightStyle: 'invalid-style' });
      }
    );

    loadHighlightStyleFromStorage();

    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(
      ['highlightStyle'],
      expect.any(Function)
    );
    // Should not change from default since invalid style is passed
    expect(getHighlightingStyle()).toBe('default');
  });

  it('should load each valid highlight style from storage', () => {
    const validStyles = ['default', 'minimal', 'bold', 'elegant'];

    validStyles.forEach((style) => {
      // Reset to default before each test
      setHighlightingStyle('default');

      // Mock chrome.storage.local.get to return the test style
      (mockChrome.storage.local.get as jest.Mock).mockImplementation(
        (keys, callback) => {
          callback({ highlightStyle: style });
        }
      );

      loadHighlightStyleFromStorage();

      expect(getHighlightingStyle()).toBe(style);
    });
  });
});

describe('scrollToHighlightedElement', () => {
  let container: HTMLDivElement;
  let testElement: HTMLElement;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create test element
    container = document.createElement('div');
    testElement = document.createElement('p');
    testElement.textContent = 'Test element for scrolling';
    testElement.style.height = '50px';
    container.appendChild(testElement);
    document.body.appendChild(container);

    // Mock getBoundingClientRect
    testElement.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 500, // Element is below viewport
      bottom: 550,
      height: 50,
      width: 200,
    });

    // Mock window properties
    Object.defineProperty(window, 'innerHeight', { value: 400 });
    Object.defineProperty(window, 'scrollY', { value: 0 });
  });

  afterEach(() => {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  test('should not scroll when followHighlight is disabled', () => {
    // Mock the storage to return followHighlight: false
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ followHighlight: false });
      }
    );

    scrollToHighlightedElement(testElement);

    // Verify storage was queried with the right key
    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(
      ['followHighlight'],
      expect.any(Function)
    );

    // Verify scrollTo was not called
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  test('should scroll to center element when followHighlight is enabled', () => {
    // Mock the storage to return followHighlight: true
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ followHighlight: true });
      }
    );

    scrollToHighlightedElement(testElement);

    // Verify storage was queried
    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(
      ['followHighlight'],
      expect.any(Function)
    );

    // Verify scrollTo was called with correct parameters
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: expect.any(Number),
      behavior: 'smooth',
    });

    // Check that the scrollTo position centers the element
    const scrollCall = (window.scrollTo as jest.Mock).mock.calls[0][0];
    expect(scrollCall.top).toBeGreaterThan(0); // Should scroll down
    expect(scrollCall.behavior).toBe('smooth');
  });

  test('should not scroll when element is already centered', () => {
    // Mock element that is already in center
    testElement.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 150,
      bottom: 200,
      height: 50,
      width: 200,
    });

    // Mock the storage to return followHighlight: true
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ followHighlight: true });
      }
    );

    scrollToHighlightedElement(testElement);

    // Verify storage was queried
    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(
      ['followHighlight'],
      expect.any(Function)
    );

    // Verify scrollTo was not called since element is already centered
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
