/// <reference lib="dom" />
/// <reference types="chrome" />

import { storage } from '../../../shared/api/storage';

/**
 * Function to smoothly scroll to highlighted element if followHighlight is enabled
 */
export async function scrollToHighlightedElement(
  element: HTMLElement,
): Promise<void> {
  // Check if chrome API is available
  if (
    typeof chrome === 'undefined' ||
    !chrome.storage ||
    !chrome.storage.local
  ) {
    return;
  }

  // Check if followHighlight setting is enabled using storage wrapper
  const followHighlight = await storage.get('followHighlight');

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
}
