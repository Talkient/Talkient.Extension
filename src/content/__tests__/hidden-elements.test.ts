/**
 * @jest-environment jsdom
 */

import {
  shouldProcessNode,
  processTextElements,
  loadMinimumWordsFromStorage,
  loadMaxNodesFromStorage,
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
        // Default settings
        callback({
          minimumWords: 3,
          highlightStyle: 'default',
          maxNodesProcessed: 1000,
        });
      }),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
};
(global as any).chrome = mockChrome;

// Mock for window.getComputedStyle
const originalGetComputedStyle = window.getComputedStyle;

describe('Hidden element handling', () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Load settings
    await loadMinimumWordsFromStorage();
    await loadMaxNodesFromStorage();

    // Mock requestAnimationFrame
    (global as any).requestAnimationFrame = jest.fn((callback) => {
      setTimeout(callback, 0);
      return 1;
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllMocks();

    // Restore original getComputedStyle
    window.getComputedStyle = originalGetComputedStyle;
  });

  test('should return false for text nodes with display:none', () => {
    // Create a parent with display:none
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.display = 'none';
    const textNode = document.createTextNode(
      'This is hidden with display none'
    );
    hiddenDiv.appendChild(textNode);
    container.appendChild(hiddenDiv);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false for text nodes with visibility:hidden', () => {
    // Create a parent with visibility:hidden
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.visibility = 'hidden';
    const textNode = document.createTextNode(
      'This is hidden with visibility hidden'
    );
    hiddenDiv.appendChild(textNode);
    container.appendChild(hiddenDiv);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false for text nodes with opacity:0', () => {
    // Create a parent with opacity:0
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.opacity = '0';
    const textNode = document.createTextNode(
      'This is hidden with opacity zero'
    );
    hiddenDiv.appendChild(textNode);
    container.appendChild(hiddenDiv);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return false for text nodes with hidden ancestor', () => {
    // Create a nested structure with a hidden ancestor
    const outerDiv = document.createElement('div');
    outerDiv.style.display = 'none';

    const innerDiv = document.createElement('div');
    const textNode = document.createTextNode('This has a hidden ancestor');

    innerDiv.appendChild(textNode);
    outerDiv.appendChild(innerDiv);
    container.appendChild(outerDiv);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should handle computed styles properly', () => {
    // Create an element that appears visible but is actually hidden via CSS
    const hiddenViaCSS = document.createElement('div');
    hiddenViaCSS.className = 'hidden-by-css';
    const textNode = document.createTextNode('This is hidden via external CSS');
    hiddenViaCSS.appendChild(textNode);
    container.appendChild(hiddenViaCSS);

    // Mock getComputedStyle to simulate CSS hiding the element
    window.getComputedStyle = jest.fn().mockImplementation((element) => {
      if (element === hiddenViaCSS) {
        return {
          display: 'none',
          visibility: 'visible',
          opacity: '1',
        } as CSSStyleDeclaration;
      }
      return originalGetComputedStyle(element);
    });

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('should return true for visible text nodes', () => {
    // Create a visible element
    const visibleDiv = document.createElement('div');
    const textNode = document.createTextNode('This is a visible text node');
    visibleDiv.appendChild(textNode);
    container.appendChild(visibleDiv);

    expect(shouldProcessNode(textNode)).toBe(true);
  });

  test('should handle multiple levels of DOM hierarchy', () => {
    // Create a deeply nested structure
    const level1 = document.createElement('div');
    const level2 = document.createElement('div');
    const level3 = document.createElement('div');
    const level4 = document.createElement('div');
    const level5 = document.createElement('div');

    // Make level 3 hidden
    level3.style.display = 'none';

    const textNode = document.createTextNode('This is deeply nested');

    level5.appendChild(textNode);
    level4.appendChild(level5);
    level3.appendChild(level4);
    level2.appendChild(level3);
    level1.appendChild(level2);
    container.appendChild(level1);

    expect(shouldProcessNode(textNode)).toBe(false);
  });

  test('processTextElements should not add buttons to hidden elements', async () => {
    // Set up document with visible and hidden elements
    const visibleDiv = document.createElement('div');
    visibleDiv.innerHTML =
      '<p>This is visible text that should get a button</p>';

    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.display = 'none';
    hiddenDiv.innerHTML =
      '<p>This is hidden text that should not get a button</p>';

    container.appendChild(visibleDiv);
    container.appendChild(hiddenDiv);

    // Create a real TreeWalker to test the processTextElements function
    // But first save the original implementation
    const originalCreateTreeWalker = document.createTreeWalker;

    // Call processTextElements
    processTextElements();

    // Wait for any async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that visible element has a play button
    expect(
      visibleDiv.querySelectorAll('.talkient-play-button').length
    ).toBeGreaterThan(0);

    // Check that hidden element doesn't have a play button
    expect(hiddenDiv.querySelectorAll('.talkient-play-button').length).toBe(0);

    // Restore original createTreeWalker
    document.createTreeWalker = originalCreateTreeWalker;
  });

  test('should handle dynamically changed visibility', async () => {
    // Create an element that starts visible
    const dynamicDiv = document.createElement('div');
    const textNode = document.createTextNode(
      'This visibility will change dynamically'
    );
    dynamicDiv.appendChild(textNode);
    container.appendChild(dynamicDiv);

    // Initially it should be processable
    expect(shouldProcessNode(textNode)).toBe(true);

    // Now hide it
    dynamicDiv.style.visibility = 'hidden';

    // Now it should not be processable
    expect(shouldProcessNode(textNode)).toBe(false);

    // Make it visible again
    dynamicDiv.style.visibility = 'visible';

    // Now it should be processable again
    expect(shouldProcessNode(textNode)).toBe(true);
  });
});
