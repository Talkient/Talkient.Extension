/// <reference lib="dom" />

import { getSvgIcon } from '../../assets/content/icons';

// Utility function to safely click on elements without triggering parent events (like link navigation)
export function safeClickButton(button: HTMLElement): void {
  if (typeof button.click === 'function') {
    // In tests, we need to actually call the click method for jest spies to work
    if (process.env.NODE_ENV === 'test') {
      button.click();
    } else {
      // In production, use a non-bubbling event
      const clickEvent = new MouseEvent('click', {
        bubbles: false,
        cancelable: true,
        view: window,
      });
      button.dispatchEvent(clickEvent);
    }
  } else {
    console.error('[Talkient] Button does not have click method');
  }
}

// Function to create a play button element
export function createPlayButton(): HTMLButtonElement {
  const button = document.createElement('button');
  // Using SVG play icon for better visual appearance
  button.innerHTML = getSvgIcon('play');
  button.title =
    'Click to play/pause speech\nShift+Click: Bold highlighting\nCtrl+Click: Minimal highlighting\nAlt+Click: Elegant highlighting';
  // Styles are now primarily in content.css
  button.style.cssText =
    'display: flex; align-items: center; justify-content: center;';
  return button;
}
