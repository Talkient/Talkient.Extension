/// <reference lib="dom" />
/// <reference types="chrome" />

import type { HighlightStyle } from '../types';
import { VALID_HIGHLIGHT_STYLES } from '../types';
import { storage } from '../../../shared/api/storage';

// Global state for current highlighting style
let currentHighlightingStyle: HighlightStyle = 'default';

/**
 * CSS class names for each style
 */
const STYLE_CLASSES: Record<HighlightStyle, string[]> = {
  default: ['talkient-highlighted'],
  minimal: ['talkient-highlighted', 'style-minimal'],
  bold: ['talkient-highlighted', 'style-bold'],
  elegant: ['talkient-highlighted', 'style-elegant'],
};

/**
 * Function to load highlight style from storage using storage wrapper
 */
export async function loadHighlightStyleFromStorage(): Promise<void> {
  const style = await storage.get('highlightStyle');
  if (VALID_HIGHLIGHT_STYLES.includes(style as HighlightStyle)) {
    setHighlightingStyle(style as HighlightStyle);
  }
}

/**
 * Function to set the highlighting style
 */
export function setHighlightingStyle(style: HighlightStyle): void {
  currentHighlightingStyle = style;
}

/**
 * Function to get the current highlighting style
 */
export function getHighlightingStyle(): HighlightStyle {
  return currentHighlightingStyle;
}

/**
 * Get CSS classes for a given style
 */
export function getStyleClasses(style?: HighlightStyle): string[] {
  const activeStyle = style || currentHighlightingStyle;
  return STYLE_CLASSES[activeStyle];
}

/**
 * Remove all style modifier classes from an element
 */
export function removeAllStyleClasses(element: HTMLElement): void {
  element.classList.remove(
    'talkient-highlighted',
    'style-minimal',
    'style-bold',
    'style-elegant',
  );
}

/**
 * Global function for testing/debugging highlighting styles
 */
export function testHighlightingStyle(style: HighlightStyle): void {
  // Import highlighter to avoid circular dependency
  void import('./highlighter').then(({ highlightText }) => {
    const firstTextElement = document.querySelector(
      'p, span, div',
    ) as HTMLElement;
    if (firstTextElement) {
      highlightText(firstTextElement, style);
      console.log(
        `Applied ${style} highlighting style to:`,
        firstTextElement.textContent?.substring(0, 50),
      );
    }
  });
}

// Extend Window interface for Talkient testing functions
declare global {
  interface Window {
    talkientSetStyle?: typeof setHighlightingStyle;
    talkientTestStyle?: typeof testHighlightingStyle;
    talkientGetStyle?: typeof getHighlightingStyle;
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  window.talkientSetStyle = setHighlightingStyle;
  window.talkientTestStyle = testHighlightingStyle;
  window.talkientGetStyle = getHighlightingStyle;
}
