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
  loadSpeechRateFromStorage,
  setSpeechRate,
  loadMaxNodesFromStorage,
  setMaxNodesProcessed,
  loadButtonPositionFromStorage,
  setButtonPosition,
  scrollToHighlightedElement,
  initPanelHideDuration,
} from './content-lib';

import { getSvgIcon, isSvgPlayIcon } from '../features/assets/content/icons';
import { safeSendMessage } from './runtime-utils';
import type { ContentScriptMessage } from '../shared/types/messages';

// Type guard for content script messages
function isContentScriptMessage(
  message: unknown,
): message is ContentScriptMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof (message as { type: unknown }).type === 'string'
  );
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse) => {
    if (!isContentScriptMessage(message)) {
      console.log('[Talkient] Unknown message format received');
      return true;
    }

    console.log('[Talkient] Message received: ', message);

    if (message.type === 'SPEECH_ENDED') {
      // Check if auto-play next is enabled and find the next element BEFORE clearing highlights
      let nextElementToPlay: HTMLElement | null = null;
      if (message.autoPlayNext) {
        const currentHighlighted = getCurrentHighlightedElement();
        if (currentHighlighted) {
          const currentWrapper = currentHighlighted.closest(
            '.talkient-processed',
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
          '.talkient-play-button',
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
    } else if (
      message.type === 'SPEECH_CANCELLED' ||
      message.type === 'SPEECH_ERROR'
    ) {
      // Handle speech cancellation or errors by resetting UI
      console.warn(
        `[Talkient] Speech ${message.type === 'SPEECH_CANCELLED' ? 'cancelled' : 'error'}: `,
        JSON.stringify(message),
      );

      // Reset all play buttons to their initial state
      document.querySelectorAll('.talkient-play-button').forEach((button) => {
        if (button instanceof HTMLButtonElement) {
          button.innerHTML = getSvgIcon('play');
        }
      });

      // Clear text highlighting
      clearHighlight();

      if (message.type === 'SPEECH_ERROR') {
        // Show a small notification about the error (optional)
        console.error('[Talkient] Speech error occurred:', message.error);
      }
    } else if (message.type === 'RELOAD_PLAY_BUTTONS') {
      // Check if play buttons are enabled before processing
      chrome.storage.local.get(['playButtonsEnabled'], (result) => {
        // Default to true if not set
        const isEnabled = result.playButtonsEnabled !== false;

        if (isEnabled) {
          // Process text elements to re-add play buttons
          processTextElements();
          sendResponse({ success: true });
        } else {
          console.log(
            '[Talkient] Play buttons are disabled. Skipping processing.',
          );
          sendResponse({ success: false, disabled: true });
        }
      });
      return true; // Keep the message channel open for the async response
    } else {
      console.log('[Talkient] Message received but skipped.');
    }

    return true; // Keep the message channel open for async responses
  },
);

// Load highlight style from storage
void loadHighlightStyleFromStorage();

// Load minimum words setting from storage
void loadMinimumWordsFromStorage();

// Load speech rate setting from storage
void loadSpeechRateFromStorage();

// Load maximum nodes setting from storage
void loadMaxNodesFromStorage();

// Initialize panel hide duration from storage
initPanelHideDuration();

// Load button position setting from storage and then process elements
void loadButtonPositionFromStorage().then(() => {
  // Load follow highlight setting (defaults to true if not set)
  chrome.storage.local.get(['followHighlight'], (result) => {
    console.log(
      `[Talkient] Follow highlight setting loaded: ${result.followHighlight !== false}`,
    );
  });

  // Create and inject the control panel
  createControlPanel();

  // Check if play buttons are enabled before initial processing
  chrome.storage.local.get(['playButtonsEnabled'], (result) => {
    // Default to true if not set
    const isEnabled = result.playButtonsEnabled !== false;

    if (isEnabled) {
      // Initial processing
      processTextElements();
    } else {
      console.log(
        '[Talkient] Play buttons are disabled. Skipping initial processing.',
      );
    }
  });
});

// Listen for storage changes to update highlight style in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.highlightStyle) {
      const newStyle = changes.highlightStyle.newValue;
      if (newStyle && typeof newStyle === 'string') {
        setHighlightingStyle(
          newStyle as 'default' | 'minimal' | 'bold' | 'elegant',
        );
      }
    }

    if (changes.minimumWords) {
      const newMinWords = changes.minimumWords.newValue;
      if (typeof newMinWords === 'number') {
        // Update the cached value
        setMinimumWords(newMinWords);
        console.log(
          `[Talkient] Minimum words setting updated to: ${newMinWords}`,
        );
        // Re-process text elements to apply the new setting
        processTextElements();
      }
    }

    if (changes.speechRate) {
      const newRate = changes.speechRate.newValue;
      if (typeof newRate === 'number') {
        // Update the cached value
        setSpeechRate(newRate);
        console.log(`[Talkient] Speech rate updated to: ${newRate}`);

        // Update control panel rate slider if it exists
        const panel = document.getElementById('talkient-control-panel');
        if (panel) {
          const rateSlider = panel.querySelector(
            '.talkient-rate-slider',
          ) as HTMLInputElement;
          const rateValue = panel.querySelector(
            '.talkient-rate-value',
          ) as HTMLSpanElement;

          if (rateSlider && rateValue) {
            // Enforce 0.05 step increment by rounding to nearest 0.05
            const roundedRate = Math.round(newRate * 20) / 20;
            rateSlider.value = roundedRate.toString();
            rateValue.textContent = `${roundedRate.toFixed(2)}x`;
          }
        }
      }
    }

    if (changes.maxNodesProcessed) {
      const newMaxNodes = changes.maxNodesProcessed.newValue;
      if (typeof newMaxNodes === 'number') {
        // Update the cached value
        setMaxNodesProcessed(newMaxNodes);
        console.log(
          `[Talkient] Maximum nodes setting updated to: ${newMaxNodes}`,
        );
        // Re-process text elements to apply the new setting
        processTextElements();
      }
    }

    if (changes.playButtonsEnabled) {
      const isEnabled = changes.playButtonsEnabled.newValue as boolean;
      console.log(
        `[Talkient] Play buttons enabled setting updated to: ${String(isEnabled)}`,
      );

      // If changing from disabled to enabled, process text elements
      if (isEnabled && !changes.playButtonsEnabled.oldValue) {
        processTextElements();
      }
    }

    if (changes.followHighlight) {
      const followHighlight = changes.followHighlight.newValue !== false;
      console.log(
        `[Talkient] Follow highlight setting updated to: ${followHighlight}`,
      );

      // If there's a currently highlighted element and follow highlight was just enabled,
      // scroll to it immediately
      if (followHighlight && getCurrentHighlightedElement()) {
        const currentHighlighted = getCurrentHighlightedElement();
        if (currentHighlighted) {
          scrollToHighlightedElement(currentHighlighted);
        }
      }
    }

    if (changes.buttonPosition) {
      const newButtonPosition = changes.buttonPosition.newValue;
      if (
        typeof newButtonPosition === 'string' &&
        (newButtonPosition === 'left' || newButtonPosition === 'right')
      ) {
        // Update the cached value
        setButtonPosition(newButtonPosition);
        console.log(
          `[Talkient] Button position setting updated to: ${newButtonPosition}`,
        );
        // Re-process text elements to apply the new setting
        processTextElements();
      }
    }
  }
});

// Add event listener to stop speech when page is unloaded/refreshed
window.addEventListener('beforeunload', () => {
  console.log('[Talkient] Page unloading, stopping speech...');
  safeSendMessage({ type: 'PAUSE_SPEECH', isPageUnload: true });
});

// Remove Talkient UI elements when user opens print dialog
window.addEventListener('beforeprint', () => {
  console.log('[Talkient] Print dialog opened, removing UI elements...');

  // Stop any ongoing speech
  safeSendMessage({ type: 'PAUSE_SPEECH' });

  // Remove control panel
  const controlPanel = document.getElementById('talkient-control-panel');
  if (controlPanel) {
    controlPanel.remove();
  }

  // Remove all play buttons
  document.querySelectorAll('.talkient-play-button').forEach((button) => {
    button.remove();
  });

  // Remove processed markers so elements can be re-processed after print
  document.querySelectorAll('.talkient-processed').forEach((el) => {
    el.classList.remove('talkient-processed');
  });

  // Clear any highlights
  clearHighlight();
});

// Re-add Talkient UI elements after print dialog is closed
window.addEventListener('afterprint', () => {
  console.log('[Talkient] Print dialog closed, restoring UI elements...');

  // Re-create control panel
  createControlPanel();

  // Check if play buttons are enabled before re-processing
  chrome.storage.local.get(['playButtonsEnabled'], (result) => {
    const isEnabled = result.playButtonsEnabled !== false;
    if (isEnabled) {
      processTextElements();
    }
  });
});

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
