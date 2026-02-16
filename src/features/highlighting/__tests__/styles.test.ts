/// <reference lib="dom" />
/// <reference types="jest" />

import {
  setHighlightingStyle,
  getHighlightingStyle,
  loadHighlightStyleFromStorage,
  getStyleClasses,
} from '../content/styles';
import { highlightText, clearHighlight } from '../content/highlighter';

// Mock storage wrapper
jest.mock('../../../shared/api/storage', () => ({
  storage: {
    get: jest.fn(),
  },
}));

import { storage } from '../../../shared/api/storage';

beforeEach(() => {
  document.body.innerHTML = '';
  setHighlightingStyle('default');
  jest.clearAllMocks();
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
    setHighlightingStyle('default');
  });

  test('should set and get highlighting style', () => {
    expect(getHighlightingStyle()).toBe('default');
    setHighlightingStyle('bold');
    expect(getHighlightingStyle()).toBe('bold');
  });

  test('should apply bold style when specified', () => {
    highlightText(testElement, 'bold');
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);
    expect(testElement.classList.contains('style-bold')).toBe(true);
  });

  test('should get correct CSS classes for each style', () => {
    expect(getStyleClasses('default')).toEqual(['talkient-highlighted']);
    expect(getStyleClasses('minimal')).toEqual([
      'talkient-highlighted',
      'style-minimal',
    ]);
  });
});

describe('loadHighlightStyleFromStorage', () => {
  it('should load highlight style from storage using wrapper', async () => {
    (storage.get as jest.Mock).mockResolvedValue('bold');
    await loadHighlightStyleFromStorage();
    expect(storage.get).toHaveBeenCalledWith('highlightStyle');
    expect(getHighlightingStyle()).toBe('bold');
  });
});
