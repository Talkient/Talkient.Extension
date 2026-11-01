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
  highlightWordAtIndex,
  getActiveWordRange,
  clearWordHighlight,
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  test('should not add style-default class when using default style', () => {
    highlightText(testElement, 'default');
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);
    expect(testElement.classList.contains('style-default')).toBe(false);
  });

  test('should not add duplicate talkient-highlighted class when re-highlighting same element', () => {
    highlightText(testElement);
    highlightText(testElement);
    const classes = Array.from(testElement.classList).filter(
      (c) => c === 'talkient-highlighted',
    );
    expect(classes).toHaveLength(1);
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

  test('should remove stray .talkient-active-word spans as safety net', () => {
    const stray = document.createElement('span');
    stray.classList.add('talkient-active-word');
    container.appendChild(stray);

    clearHighlight();

    expect(stray.classList.contains('talkient-active-word')).toBe(false);
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
      },
    );

    loadHighlightStyleFromStorage();

    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(
      ['highlightStyle', 'followHighlight'],
      expect.any(Function),
    );
    expect(getHighlightingStyle()).toBe('bold');
  });

  it('should handle missing highlight style in storage', () => {
    // Mock chrome.storage.local.get to return empty result
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({});
      },
    );

    loadHighlightStyleFromStorage();

    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(
      ['highlightStyle', 'followHighlight'],
      expect.any(Function),
    );
    expect(getHighlightingStyle()).toBe('default'); // Should remain default
  });

  it('should handle invalid highlight style in storage', () => {
    // Mock chrome.storage.local.get to return invalid style
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ highlightStyle: 'invalid-style' });
      },
    );

    loadHighlightStyleFromStorage();

    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(
      ['highlightStyle', 'followHighlight'],
      expect.any(Function),
    );
    // Should not change from default since invalid style is passed
    expect(getHighlightingStyle()).toBe('default');
  });

  it('should ignore onChanged events from non-local storage areas', () => {
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ highlightStyle: 'default', followHighlight: true });
      },
    );

    loadHighlightStyleFromStorage();

    // Simulate a change from the 'sync' area — should be ignored
    const changeListener =
      mockChrome.storage.onChanged.addListener.mock.calls[0][0];
    changeListener(
      { followHighlight: { oldValue: true, newValue: false } },
      'sync',
    );

    // followHighlight should still be true → scroll should still happen
    // Use top: 700 so the element is below the 20% buffer zone in any jsdom viewport height
    const testEl = document.createElement('p');
    testEl.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 700,
      bottom: 750,
      height: 50,
      width: 200,
    });
    document.body.appendChild(testEl);
    scrollToHighlightedElement(testEl);
    expect(window.scrollTo).toHaveBeenCalled();
    document.body.removeChild(testEl);
  });

  it('should not overwrite cachedFollowHighlight when storage value is not a boolean', () => {
    // Start with followHighlight: true cached
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ highlightStyle: 'default', followHighlight: true });
      },
    );
    loadHighlightStyleFromStorage();

    // Now reload with a non-boolean followHighlight value
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ highlightStyle: 'default', followHighlight: 'yes' });
      },
    );
    loadHighlightStyleFromStorage();

    // cachedFollowHighlight should still be true → scroll should happen
    // Use top: 700 so the element is below the 20% buffer zone in any jsdom viewport height
    const testEl = document.createElement('p');
    testEl.getBoundingClientRect = jest.fn().mockReturnValue({
      top: 700,
      bottom: 750,
      height: 50,
      width: 200,
    });
    document.body.appendChild(testEl);
    scrollToHighlightedElement(testEl);
    expect(window.scrollTo).toHaveBeenCalled();
    document.body.removeChild(testEl);
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
        },
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
    // Mock the storage to return followHighlight: false and load the cache
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ followHighlight: false });
      },
    );

    // Load the cached setting first
    loadHighlightStyleFromStorage();

    scrollToHighlightedElement(testElement);

    // Verify scrollTo was not called
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  test('should scroll to center element when followHighlight is enabled', () => {
    // Reset the mock implementation to ensure our override is applied
    (mockChrome.storage.local.get as jest.Mock).mockReset();

    // Mock the storage to return both highlightStyle and followHighlight: true
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ highlightStyle: 'default', followHighlight: true });
      },
    );

    // Load the cached setting first
    loadHighlightStyleFromStorage();

    // Verify the storage get was called with the expected keys
    expect(mockChrome.storage.local.get).toHaveBeenCalledWith(
      ['highlightStyle', 'followHighlight'],
      expect.any(Function),
    );

    scrollToHighlightedElement(testElement);

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

    // Mock the storage to return followHighlight: true and load the cache
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ followHighlight: true });
      },
    );

    // Load the cached setting first
    loadHighlightStyleFromStorage();

    scrollToHighlightedElement(testElement);

    // Verify scrollTo was not called since element is already centered
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  test('should stop scrolling after followHighlight is toggled off via storage change', () => {
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ highlightStyle: 'default', followHighlight: true });
      },
    );

    loadHighlightStyleFromStorage();

    const changeListener =
      mockChrome.storage.onChanged.addListener.mock.calls[0][0];
    changeListener(
      { followHighlight: { oldValue: true, newValue: false } },
      'local',
    );

    scrollToHighlightedElement(testElement);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  test('should resume scrolling after followHighlight is toggled on via storage change', () => {
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ highlightStyle: 'default', followHighlight: false });
      },
    );

    loadHighlightStyleFromStorage();

    const changeListener =
      mockChrome.storage.onChanged.addListener.mock.calls[0][0];

    changeListener(
      { followHighlight: { oldValue: false, newValue: true } },
      'local',
    );

    scrollToHighlightedElement(testElement);

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: expect.any(Number),
      behavior: 'smooth',
    });
  });
});

describe('word highlighting (CSS Custom Highlight API)', () => {
  class MockHighlight {
    ranges: Range[];
    constructor(...ranges: Range[]) {
      this.ranges = ranges;
    }
  }
  const mockHighlights = new Map<string, MockHighlight>();

  let container: HTMLDivElement;
  let element: HTMLSpanElement;

  function activeWordText(): string | undefined {
    return getActiveWordRange()?.toString();
  }

  beforeAll(() => {
    // jsdom has no Highlight API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).Highlight = MockHighlight;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).CSS = { highlights: mockHighlights };
  });

  afterAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).Highlight;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).CSS;
  });

  beforeEach(() => {
    mockHighlights.clear();
    container = document.createElement('div');
    element = document.createElement('span');
    element.textContent = 'Hello world test';
    container.appendChild(element);
    document.body.appendChild(container);

    // Mock storage for scrollToHighlightedElement
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({ followHighlight: false });
      },
    );
  });

  afterEach(() => {
    document.body.removeChild(container);
    clearHighlight();
  });

  test('should highlight the word at the given charIndex', () => {
    highlightText(element);

    highlightWordAtIndex(0);

    expect(activeWordText()).toBe('Hello');
    expect(mockHighlights.get('talkient-word')?.ranges[0]).toBe(
      getActiveWordRange(),
    );
  });

  test('should not modify the page DOM', () => {
    element.innerHTML = 'Hello <a href="#">world</a> test';
    const originalHtml = element.innerHTML;
    highlightText(element);

    highlightWordAtIndex(6);

    expect(activeWordText()).toBe('world');
    expect(element.innerHTML).toBe(originalHtml);
    expect(element.querySelectorAll('.talkient-word')).toHaveLength(0);
  });

  test('should move highlight between words (only 1 active at a time)', () => {
    highlightText(element);

    highlightWordAtIndex(0);
    expect(activeWordText()).toBe('Hello');

    highlightWordAtIndex(6);
    expect(activeWordText()).toBe('world');
    expect(mockHighlights.size).toBe(1);
  });

  test('should paint with the style-specific highlight name', () => {
    highlightText(element, 'bold');

    highlightWordAtIndex(6);

    expect(mockHighlights.has('talkient-word-bold')).toBe(true);
    expect(mockHighlights.has('talkient-word')).toBe(false);
  });

  test('should no-op when nothing is highlighted', () => {
    expect(() => highlightWordAtIndex(0)).not.toThrow();
    expect(getActiveWordRange()).toBeNull();
    expect(mockHighlights.size).toBe(0);
  });

  test('should no-op for an element with only whitespace text', () => {
    element.textContent = '   ';
    highlightText(element);

    highlightWordAtIndex(0);

    expect(getActiveWordRange()).toBeNull();
  });

  test('should skip play button text when mapping offsets', () => {
    const button = document.createElement('button');
    button.classList.add('talkient-play-button');
    button.textContent = 'Play';
    element.insertBefore(button, element.firstChild);
    highlightText(element);

    highlightWordAtIndex(0);

    expect(activeWordText()).toBe('Hello');
    expect(element.querySelector('.talkient-play-button')).toBe(button);
  });

  test('should call scrollToHighlightedElement with the word', () => {
    // Mock the storage to load the cached setting with followHighlight: true
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ highlightStyle: 'default', followHighlight: true });
      },
    );

    // Load cached setting first
    loadHighlightStyleFromStorage();
    highlightText(element);
    (window.scrollTo as jest.Mock).mockClear();

    highlightWordAtIndex(6); // "world"

    expect(window.scrollTo).toHaveBeenCalled();
  });

  test('should no-op when charIndex is beyond the text', () => {
    highlightText(element);

    highlightWordAtIndex(999);

    expect(getActiveWordRange()).toBeNull();
  });

  test('should advance to the next word when charIndex points at whitespace', () => {
    highlightText(element); // "Hello world test" — gap at index 5

    highlightWordAtIndex(5);

    expect(activeWordText()).toBe('world');
  });

  test('should highlight a word located in the second text node', () => {
    element.textContent = '';
    element.appendChild(document.createTextNode('Hello '));
    element.appendChild(document.createTextNode('world test'));
    highlightText(element);

    highlightWordAtIndex(6);

    expect(activeWordText()).toBe('world');
  });

  test('should use the reported length across text nodes', () => {
    element.innerHTML = 'Say Hel<b>lo</b> there';
    highlightText(element);

    highlightWordAtIndex(4, 5);

    expect(activeWordText()).toBe('Hello');
  });

  test('should map offsets through the provided segments', () => {
    element.innerHTML = 'First line<br>Second line';
    const [first, second] = Array.from(element.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE,
    ) as Text[];
    // The spoken text inserts a space for the <br>: "First line Second line"
    highlightText(element, undefined, [
      { node: first, start: 0 },
      { node: second, start: 11 },
    ]);

    highlightWordAtIndex(11);

    expect(activeWordText()).toBe('Second');
  });

  test('should remove the word highlight on clearHighlight', () => {
    highlightText(element);
    highlightWordAtIndex(0);

    clearHighlight();

    expect(mockHighlights.size).toBe(0);
    expect(getActiveWordRange()).toBeNull();
  });
});

describe('auto-scroll while the user scrolls', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.textContent = 'Some text';
    document.body.appendChild(element);
    element.getBoundingClientRect = jest.fn(
      () => ({ top: 2000, bottom: 2020, height: 20 }) as DOMRect,
    );
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({ highlightStyle: 'default', followHighlight: true });
      },
    );
    loadHighlightStyleFromStorage();
    (window.scrollTo as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    element.remove();
  });

  test('should not scroll right after the user scrolls with the wheel', () => {
    window.dispatchEvent(new Event('wheel'));

    scrollToHighlightedElement(element);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  test('should follow again once the user stopped scrolling for a while', () => {
    const now = Date.now();
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    window.dispatchEvent(new Event('wheel'));

    dateSpy.mockReturnValue(now + 5000);
    scrollToHighlightedElement(element);

    expect(window.scrollTo).toHaveBeenCalled();
  });

  test('should ignore scroll keys typed into an input', () => {
    // Far enough from earlier tests' wheel events
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 60000);
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
    );

    scrollToHighlightedElement(element);

    expect(window.scrollTo).toHaveBeenCalled();
    input.remove();
  });
});

describe('clearWordHighlight standalone', () => {
  test('should not throw when nothing was wrapped', () => {
    expect(() => clearWordHighlight()).not.toThrow();
  });
});

describe('clearWordHighlight / clearHighlight integration', () => {
  let container: HTMLDivElement;
  let element: HTMLSpanElement;

  beforeEach(() => {
    container = document.createElement('div');
    element = document.createElement('span');
    element.textContent = 'Hello world test';
    container.appendChild(element);
    document.body.appendChild(container);

    // Mock storage for scrollToHighlightedElement
    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({ followHighlight: false });
      },
    );
  });

  afterEach(() => {
    document.body.removeChild(container);
    clearHighlight();
  });

  test('should restore original text content after clearing', () => {
    highlightText(element);
    highlightWordAtIndex(0);

    clearHighlight();

    expect(element.textContent).toBe('Hello world test');
  });

  test('should leave no leftover .talkient-word spans in DOM', () => {
    highlightText(element);
    highlightWordAtIndex(6);

    clearHighlight();

    expect(element.querySelectorAll('.talkient-word')).toHaveLength(0);
  });

  test('should preserve play button siblings', () => {
    const wrapper = document.createElement('span');
    wrapper.classList.add('talkient-processed');

    const button = document.createElement('button');
    button.classList.add('talkient-play-button');
    button.textContent = 'Play';
    wrapper.appendChild(button);
    wrapper.appendChild(document.createTextNode('Hello world'));
    container.appendChild(wrapper);

    highlightText(wrapper);
    highlightWordAtIndex(0);
    clearHighlight();

    expect(wrapper.querySelector('.talkient-play-button')).toBeTruthy();
  });
});

describe('fallback behavior', () => {
  let container: HTMLDivElement;
  let element: HTMLSpanElement;

  beforeEach(() => {
    container = document.createElement('div');
    element = document.createElement('span');
    element.textContent = 'Test text';
    container.appendChild(element);
    document.body.appendChild(container);

    (mockChrome.storage.local.get as jest.Mock).mockImplementation(
      (keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({ followHighlight: false });
      },
    );
  });

  afterEach(() => {
    document.body.removeChild(container);
    clearHighlight();
  });

  test('element-level highlight works when no word events fire', () => {
    highlightText(element);

    // Element should be highlighted even without word events
    expect(element.classList.contains('talkient-highlighted')).toBe(true);
  });

  test('highlightWordAtIndex does not throw when not wrapped', () => {
    // Reset word state by clearing first
    clearWordHighlight();

    expect(() => highlightWordAtIndex(0)).not.toThrow();
  });
});
