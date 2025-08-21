/// <reference lib="dom" />
/// <reference types="chrome" />

import {
  processTextElements,
  clearHighlight,
  loadHighlightStyleFromStorage,
  setHighlightingStyle,
  getCurrentHighlightedElement,
  findNextTextElement,
  safeClickButton,
  createControlPanel,
  loadMinimumWordsFromStorage,
  setMinimumWords,
} from './content-lib';

import { getSvgIcon, isSvgPlayIcon } from './icons';

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Talkient] Message received: ', message);
  if (message.type === 'SPEECH_ENDED') {
    // Check if auto-play next is enabled and find the next element BEFORE clearing highlights
    let nextElementToPlay: HTMLElement | null = null;
    if (message.autoPlayNext) {
      const currentHighlighted = getCurrentHighlightedElement();
      if (currentHighlighted) {
        const currentWrapper = currentHighlighted.closest(
          '.talkient-processed'
        ) as HTMLElement;
        if (currentWrapper) {
          nextElementToPlay = findNextTextElement(currentWrapper);
        }
      }
    }

    // Reset all play buttons to their initial state
    document.querySelectorAll('.talkient-play-button').forEach((button) => {
      if (button instanceof HTMLButtonElement) {
        button.innerHTML = getSvgIcon('play');
      }
    });

    // Clear text highlighting
    clearHighlight();

    // Auto-play the next element if one was found
    if (nextElementToPlay) {
      const nextPlayButton = nextElementToPlay.querySelector(
        '.talkient-play-button'
      ) as HTMLButtonElement;

      // Check if it has the play icon (not the pause icon)
      const svgInButton = nextPlayButton?.querySelector('svg');

      if (nextPlayButton && isSvgPlayIcon(svgInButton as SVGElement)) {
        // Add a small delay to ensure the UI state is updated before auto-playing
        setTimeout(() => {
          console.log('[Talkient] Auto-playing next text element');
          safeClickButton(nextPlayButton);
        }, 500);
      }
    }
  }
});

// Load highlight style from storage
loadHighlightStyleFromStorage();

// Load minimum words setting from storage
loadMinimumWordsFromStorage();

// Create and inject the control panel
createControlPanel();

// Listen for storage changes to update highlight style in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.highlightStyle) {
      const newStyle = changes.highlightStyle.newValue;
      if (newStyle && typeof newStyle === 'string') {
        setHighlightingStyle(
          newStyle as 'default' | 'minimal' | 'bold' | 'elegant'
        );
      }
    }

    if (changes.minimumWords) {
      const newMinWords = changes.minimumWords.newValue;
      if (typeof newMinWords === 'number') {
        // Update the cached value
        setMinimumWords(newMinWords);
        console.log(
          `[Talkient] Minimum words setting updated to: ${newMinWords}`
        );
        // Re-process text elements to apply the new setting
        processTextElements();
      }
    }
  }
});

// Initial processing
processTextElements();

// Watch for DOM changes to process new text elements
// const observer = new MutationObserver((mutations: MutationRecord[]) => {
//     for (const mutation of mutations) {
//         if (mutation.type === 'childList') {
//             processTextElements();
//         }
//     }
// });

// observer.observe(document.body, {
//     childList: true,
//     subtree: true
// });
