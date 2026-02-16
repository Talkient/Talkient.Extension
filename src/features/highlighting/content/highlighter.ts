/// <reference lib="dom" />
/// <reference types="chrome" />

import type { HighlightStyle } from '../types';
import { getStyleClasses, removeAllStyleClasses } from './styles';
import { scrollToHighlightedElement } from './scroll';

// Global state for text highlighting
let currentHighlightedElement: HTMLElement | null = null;

/**
 * Function to highlight text being spoken
 */
export function highlightText(
  element: HTMLElement,
  style?: HighlightStyle,
): void {
  // Remove any existing highlights
  clearHighlight();

  // Get CSS classes for the style
  const classes = getStyleClasses(style);

  // Add highlight classes to the element
  element.classList.add(...classes);

  currentHighlightedElement = element;

  // Scroll to the highlighted element if follow highlight is enabled
  void scrollToHighlightedElement(element);
}

/**
 * Function to clear text highlighting
 */
export function clearHighlight(): void {
  if (currentHighlightedElement) {
    removeAllStyleClasses(currentHighlightedElement);
    // Clear any inline styles that might have been set
    currentHighlightedElement.style.backgroundColor = '';
    currentHighlightedElement.style.transition = '';
    currentHighlightedElement = null;
  }

  // Also clear any other highlighted elements (safety net)
  document.querySelectorAll('.talkient-highlighted').forEach((element) => {
    removeAllStyleClasses(element as HTMLElement);
    const htmlElement = element as HTMLElement;
    htmlElement.style.backgroundColor = '';
    htmlElement.style.transition = '';
  });
}

/**
 * Function to get currently highlighted element
 */
export function getCurrentHighlightedElement(): HTMLElement | null {
  return currentHighlightedElement;
}

// Re-export commonly used functions from other modules
export {
  loadHighlightStyleFromStorage,
  setHighlightingStyle,
  getHighlightingStyle,
  testHighlightingStyle,
} from './styles';

export { scrollToHighlightedElement } from './scroll';
