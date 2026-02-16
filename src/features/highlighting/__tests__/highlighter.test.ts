/// <reference lib="dom" />
/// <reference types="jest" />

import {
  highlightText,
  clearHighlight,
  getCurrentHighlightedElement,
} from '../content/highlighter';

// Mock dependencies
jest.mock('../content/scroll', () => ({
  scrollToHighlightedElement: jest.fn(),
}));

// Mock DOM environment
beforeEach(() => {
  document.body.innerHTML = '';
  clearHighlight();
  jest.clearAllMocks();
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
    clearHighlight();
  });

  test('should add highlight class to element', () => {
    highlightText(testElement);
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);
  });

  test('should apply highlighting styles', () => {
    highlightText(testElement);
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);
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

    highlightText(testElement);
    expect(testElement.classList.contains('talkient-highlighted')).toBe(true);

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
