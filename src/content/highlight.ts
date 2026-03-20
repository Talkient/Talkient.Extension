/// <reference lib="dom" />
/// <reference types="chrome" />

// Global state for text highlighting
let currentHighlightedElement: HTMLElement | null = null;
let currentHighlightingStyle: string = 'default';

// Word-level highlighting state
let wordSpans: HTMLSpanElement[] = [];
let originalInnerHTML: string | null = null;
let activeWordSpan: HTMLSpanElement | null = null;
let wordWrappedElement: HTMLElement | null = null;
let wordWrappedElementOriginalDisplay: string = '';

// Cached followHighlight setting to avoid repeated storage reads
let cachedFollowHighlight: boolean = true;

// Function to load highlight style from storage
export function loadHighlightStyleFromStorage(): void {
  chrome.storage.local.get(['highlightStyle', 'followHighlight'], (result) => {
    if (result.highlightStyle && typeof result.highlightStyle === 'string') {
      const style = result.highlightStyle;
      // Validate that the style is one of the allowed values
      if (['default', 'minimal', 'bold', 'elegant'].includes(style)) {
        setHighlightingStyle(
          style as 'default' | 'minimal' | 'bold' | 'elegant',
        );
      }
    }
    // Cache followHighlight setting
    if (typeof result.followHighlight === 'boolean') {
      cachedFollowHighlight = result.followHighlight;
    }
  });

  // Listen for future changes to followHighlight
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && 'followHighlight' in changes) {
      cachedFollowHighlight = changes.followHighlight.newValue !== false;
    }
  });
}

// Function to set the highlighting style
export function setHighlightingStyle(
  style: 'default' | 'minimal' | 'bold' | 'elegant',
): void {
  currentHighlightingStyle = style;
}

// Function to get the current highlighting style
export function getHighlightingStyle(): string {
  return currentHighlightingStyle;
}

// Wrap words in an element with individual spans for word-level highlighting
export function wrapWordsInElement(element: HTMLElement): HTMLSpanElement[] {
  const spans: HTMLSpanElement[] = [];
  let charOffset = 0;

  // Find text nodes (skip button children)
  const textNodes: Text[] = [];
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      textNodes.push(child as Text);
    }
  }

  for (const textNode of textNodes) {
    const text = textNode.textContent || '';
    originalInnerHTML = element.innerHTML;

    const fragment = document.createDocumentFragment();
    const regex = /(\S+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Add whitespace before the word
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index)),
        );
      }

      const word = match[1];
      const span = document.createElement('span');
      span.className = 'talkient-word';
      span.dataset.charIndex = String(charOffset + match.index);
      span.textContent = word;
      fragment.appendChild(span);
      spans.push(span);

      lastIndex = match.index + word.length;
    }

    // Add any trailing whitespace
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    charOffset += text.length;
    textNode.replaceWith(fragment);
  }

  wordWrappedElementOriginalDisplay = element.style.display;

  wordSpans = spans;
  wordWrappedElement = element;
  return spans;
}

// Highlight a specific word by character index
export function highlightWordAtIndex(
  charIndex: number,
  _length?: number,
): void {
  if (wordSpans.length === 0) {
    return;
  }

  // Find the matching span
  let targetSpan: HTMLSpanElement | null = null;
  for (const span of wordSpans) {
    const spanCharIndex = parseInt(span.dataset.charIndex || '0', 10);
    const spanLength = (span.textContent || '').length;
    if (charIndex >= spanCharIndex && charIndex < spanCharIndex + spanLength) {
      targetSpan = span;
      break;
    }
  }

  if (!targetSpan) {
    return;
  }

  // Remove previous active word
  if (activeWordSpan) {
    activeWordSpan.classList.remove('talkient-active-word');
  }

  // Activate new word
  targetSpan.classList.add('talkient-active-word');
  activeWordSpan = targetSpan;

  // Scroll to the active word
  scrollToHighlightedElement(targetSpan);
}

// Clear word-level highlighting and restore original text nodes
export function clearWordHighlight(): void {
  if (wordWrappedElement && originalInnerHTML) {
    wordWrappedElement.innerHTML = originalInnerHTML;
  }

  // Restore original display value
  if (wordWrappedElement) {
    wordWrappedElement.style.display = wordWrappedElementOriginalDisplay;
  }

  wordSpans = [];
  activeWordSpan = null;
  originalInnerHTML = null;
  wordWrappedElement = null;
  wordWrappedElementOriginalDisplay = '';
}

// Function to highlight text being spoken
export function highlightText(element: HTMLElement, style?: string): void {
  // Remove any existing highlights
  clearHighlight();

  // Use provided style or current preference
  const activeStyle = style || currentHighlightingStyle;

  // Add highlight class to the element
  element.classList.add('talkient-highlighted');

  // Add style modifier if specified
  if (activeStyle !== 'default') {
    element.classList.add(`style-${activeStyle}`);
  }

  currentHighlightedElement = element;

  // Wrap words for word-level highlighting
  wrapWordsInElement(element);

  // Scroll to the highlighted element if follow highlight is enabled
  scrollToHighlightedElement(element);
}

// Function to clear text highlighting
export function clearHighlight(): void {
  // Clear word-level highlighting first
  clearWordHighlight();

  if (currentHighlightedElement) {
    currentHighlightedElement.classList.remove('talkient-highlighted');
    // Remove style modifiers
    currentHighlightedElement.classList.remove(
      'style-minimal',
      'style-bold',
      'style-elegant',
    );
    // Clear any inline styles that might have been set
    currentHighlightedElement.style.backgroundColor = '';
    currentHighlightedElement.style.transition = '';
    currentHighlightedElement = null;
  }

  // Also clear any other highlighted elements (safety net)
  document.querySelectorAll('.talkient-highlighted').forEach((element) => {
    element.classList.remove('talkient-highlighted');
    element.classList.remove('style-minimal', 'style-bold', 'style-elegant');
    const htmlElement = element as HTMLElement;
    htmlElement.style.backgroundColor = '';
    htmlElement.style.transition = '';
  });

  // Safety net: remove any stray active word highlights
  document.querySelectorAll('.talkient-active-word').forEach((element) => {
    element.classList.remove('talkient-active-word');
  });
}

// Function to get currently highlighted element
export function getCurrentHighlightedElement(): HTMLElement | null {
  return currentHighlightedElement;
}

// Global function for testing/debugging highlighting styles
export function testHighlightingStyle(
  style: 'default' | 'minimal' | 'bold' | 'elegant',
): void {
  // Find the first text element and highlight it with the specified style
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
}

// Function to smoothly scroll to highlighted element if followHighlight is enabled
export function scrollToHighlightedElement(element: HTMLElement): void {
  // Use cached followHighlight setting to avoid repeated storage reads
  if (!cachedFollowHighlight || !element) {
    return;
  }

  const rect = element.getBoundingClientRect();
  const elementTop = rect.top;
  const elementBottom = rect.bottom;
  const viewportHeight = window.innerHeight;

  // Only scroll if the element is not fully visible in the viewport
  // or not close to the vertical center
  const buffer = viewportHeight * 0.2; // 20% buffer zone
  const isInCenterArea =
    elementTop > buffer && elementBottom < viewportHeight - buffer;

  if (!isInCenterArea) {
    // Calculate position to center the element in the viewport
    const scrollTo =
      window.scrollY + elementTop - viewportHeight / 2 + rect.height / 2;

    // Smoothly scroll to the position
    window.scrollTo({
      top: scrollTo,
      behavior: 'smooth',
    });
  }
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
