/// <reference lib="dom" />
/// <reference types="chrome" />

import {
  highlightText,
  clearHighlight,
  getHighlightingStyle,
  setHighlightingStyle,
  getCurrentHighlightedElement,
  testHighlightingStyle,
  loadHighlightStyleFromStorage,
  scrollToHighlightedElement,
} from './highlight';

// Re-export highlighting functions for backward compatibility
export {
  highlightText,
  clearHighlight,
  getHighlightingStyle,
  setHighlightingStyle,
  getCurrentHighlightedElement,
  testHighlightingStyle,
  loadHighlightStyleFromStorage,
  scrollToHighlightedElement,
};
