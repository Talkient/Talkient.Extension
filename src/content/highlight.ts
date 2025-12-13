/// <reference lib="dom" />
/// <reference types="chrome" />

// Global state for text highlighting
let currentHighlightedElement: HTMLElement | null = null;
let currentHighlightingStyle: string = 'default';

// Function to load highlight style from storage
export function loadHighlightStyleFromStorage(): void {
  chrome.storage.local.get(['highlightStyle'], (result) => {
    if (result.highlightStyle && typeof result.highlightStyle === 'string') {
      const style = result.highlightStyle;
      // Validate that the style is one of the allowed values
      if (['default', 'minimal', 'bold', 'elegant'].includes(style)) {
        setHighlightingStyle(
          style as 'default' | 'minimal' | 'bold' | 'elegant'
        );
      }
    }
  });
}

// Function to set the highlighting style
export function setHighlightingStyle(
  style: 'default' | 'minimal' | 'bold' | 'elegant'
): void {
  currentHighlightingStyle = style;
}

// Function to get the current highlighting style
export function getHighlightingStyle(): string {
  return currentHighlightingStyle;
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

  // Scroll to the highlighted element if follow highlight is enabled
  scrollToHighlightedElement(element);
}

// Function to clear text highlighting
export function clearHighlight(): void {
  if (currentHighlightedElement) {
    currentHighlightedElement.classList.remove('talkient-highlighted');
    // Remove style modifiers
    currentHighlightedElement.classList.remove(
      'style-minimal',
      'style-bold',
      'style-elegant'
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
}

// Function to get currently highlighted element
export function getCurrentHighlightedElement(): HTMLElement | null {
  return currentHighlightedElement;
}

// Global function for testing/debugging highlighting styles
export function testHighlightingStyle(
  style: 'default' | 'minimal' | 'bold' | 'elegant'
): void {
  // Find the first text element and highlight it with the specified style
  const firstTextElement = document.querySelector(
    'p, span, div'
  ) as HTMLElement;
  if (firstTextElement) {
    highlightText(firstTextElement, style);
    console.log(
      `Applied ${style} highlighting style to:`,
      firstTextElement.textContent?.substring(0, 50)
    );
  }
}

// Function to smoothly scroll to highlighted element if followHighlight is enabled
export function scrollToHighlightedElement(element: HTMLElement): void {
  // Check if chrome API is available
  if (
    typeof chrome === 'undefined' ||
    !chrome.storage ||
    !chrome.storage.local
  ) {
    return;
  }

  // Check if followHighlight setting is enabled (defaults to true if not set)
  chrome.storage.local.get(['followHighlight'], (result) => {
    const followHighlight = result.followHighlight !== false;

    if (followHighlight && element) {
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
  });
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).talkientSetStyle = setHighlightingStyle;
  (window as any).talkientTestStyle = testHighlightingStyle;
  (window as any).talkientGetStyle = getHighlightingStyle;
}
