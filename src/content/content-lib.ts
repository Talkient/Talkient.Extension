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
} from './highlight';

import { getSvgIcon, isSvgPlayIcon, isSvgPauseIcon } from './icons';
import {
  createControlPanel,
  removeControlPanel,
  isControlPanelVisible,
  toggleControlPanel,
} from './control-panel';

// Re-export highlighting functions for backward compatibility
export {
  highlightText,
  clearHighlight,
  getHighlightingStyle,
  setHighlightingStyle,
  getCurrentHighlightedElement,
  testHighlightingStyle,
  loadHighlightStyleFromStorage,
};

// Re-export control panel functions
export {
  createControlPanel,
  removeControlPanel,
  isControlPanelVisible,
  toggleControlPanel,
};

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

// Cache for settings
let minimumWordsCache = 3; // Default minimum words
let speechRateCache = 1.0; // Default speech rate
let maxNodesProcessedCache = 1000; // Default maximum nodes processed

// Load minimum words setting from storage
export function loadMinimumWordsFromStorage(): Promise<number> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['minimumWords'], (result) => {
      minimumWordsCache =
        typeof result.minimumWords === 'number' ? result.minimumWords : 3;
      console.log(
        `[Talkient] Loaded minimum words setting: ${minimumWordsCache}`
      );
      resolve(minimumWordsCache);
    });
  });
}

// Load speech rate setting from storage
export function loadSpeechRateFromStorage(): Promise<number> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['speechRate'], (result) => {
      speechRateCache =
        typeof result.speechRate === 'number' ? result.speechRate : 1.0;
      console.log(`[Talkient] Loaded speech rate setting: ${speechRateCache}`);
      resolve(speechRateCache);
    });
  });
}

// Get the current minimum words setting
export function getMinimumWords(): number {
  return minimumWordsCache;
}

// Get the current speech rate setting
export function getSpeechRate(): number {
  return speechRateCache;
}

// Set the minimum words setting (used when it changes in storage)
export function setMinimumWords(value: number): void {
  minimumWordsCache = value;
}

// Set the speech rate setting (used when it changes in storage)
export function setSpeechRate(value: number): void {
  speechRateCache = value;
}

// Load maximum nodes processed setting from storage
export function loadMaxNodesFromStorage(): Promise<number> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['maxNodesProcessed'], (result) => {
      maxNodesProcessedCache =
        typeof result.maxNodesProcessed === 'number'
          ? result.maxNodesProcessed
          : 1000;
      console.log(
        `[Talkient] Loaded maximum nodes setting: ${maxNodesProcessedCache}`
      );
      resolve(maxNodesProcessedCache);
    });
  });
}

// Get the current maximum nodes setting
export function getMaxNodesProcessed(): number {
  return maxNodesProcessedCache;
}

// Set the maximum nodes setting (used when it changes in storage)
export function setMaxNodesProcessed(value: number): void {
  maxNodesProcessedCache = value;
}

// Function to check if a node should be processed
export function shouldProcessNode(node: Node): boolean {
  // Skip if node is null or not a text node
  if (!node || node.nodeType !== Node.TEXT_NODE) return false;

  // Skip if text is empty or just whitespace
  const text = node.textContent?.trim();
  if (!text || text.length < 2) return false;

  // Count words in text
  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;

  // Skip if text doesn't have enough words
  if (wordCount < minimumWordsCache) return false;

  // Skip if parent is null
  const parent = node.parentElement;
  if (!parent) return false;

  // Check if the node is within a hidden element
  let current: HTMLElement | null = parent;
  while (current) {
    const style = window.getComputedStyle(current);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    ) {
      return false;
    }
    current = current.parentElement;
  }

  // Skip if parent is a script, style, or button
  if (
    parent.tagName === 'SCRIPT' ||
    parent.tagName === 'STYLE' ||
    parent.tagName === 'BUTTON' ||
    parent.tagName === 'CODE' ||
    parent.tagName === 'INPUT'
  )
    return false;

  // Skip if the node itself already has a play button directly attached to it
  // This handles the case where a text node has been wrapped with a span + button
  const nextSibling = node.nextSibling;
  if (
    nextSibling &&
    nextSibling instanceof HTMLElement &&
    nextSibling.classList.contains('talkient-play-button')
  ) {
    return false;
  }

  // Skip if parent is already processed
  if (parent.classList.contains('talkient-processed')) return false;

  // Skip if parent's direct children contain a play button for this specific text node
  // But allow other text nodes in the same parent to be processed
  const isDirectlyNextToButton = Array.from(parent.childNodes).some(
    (childNode, index, array) => {
      if (childNode === node) {
        const nextNode = array[index + 1];
        return (
          nextNode &&
          nextNode instanceof HTMLElement &&
          nextNode.classList.contains('talkient-play-button')
        );
      }
      return false;
    }
  );

  if (isDirectlyNextToButton) return false;

  // Skip if node is inside the control panel
  const controlPanel = parent.closest('#talkient-control-panel');
  if (controlPanel) return false;

  return true;
}

// Function to find the next text element to play
export function findNextTextElement(
  currentElement: HTMLElement
): HTMLElement | null {
  // Get all processed elements in document order
  const allProcessedElements = Array.from(
    document.querySelectorAll('.talkient-processed')
  ) as HTMLElement[];

  // Find current element index
  const currentIndex = allProcessedElements.indexOf(currentElement);

  if (currentIndex === -1 || currentIndex >= allProcessedElements.length - 1) {
    return null; // Current element not found or it's the last one
  }

  // Return the next element
  return allProcessedElements[currentIndex + 1];
}

// Function to auto-play the next text element
export function autoPlayNextText(): void {
  const currentHighlighted = getCurrentHighlightedElement();
  if (!currentHighlighted) return;

  // Find the wrapper element that contains the currently highlighted text
  const currentWrapper = currentHighlighted.closest(
    '.talkient-processed'
  ) as HTMLElement;
  if (!currentWrapper) return;

  // Find the next text element
  const nextElement = findNextTextElement(currentWrapper);
  if (!nextElement) {
    console.log('[Talkient] No next element found for auto-play');
    return;
  }

  // Find the play button in the next element
  const nextPlayButton = nextElement.querySelector(
    '.talkient-play-button'
  ) as HTMLButtonElement;
  if (!nextPlayButton) {
    console.log('[Talkient] No play button found in next element');
    return;
  }

  // Only auto-play if the button is not currently playing
  const svgInButton = nextPlayButton.querySelector('svg');
  if (isSvgPlayIcon(svgInButton as SVGElement)) {
    console.log('[Talkient] Auto-playing next text element');
    safeClickButton(nextPlayButton);
  }
}

// Function to process text nodes and add play buttons
export function processTextElements(): void {
  console.log('[Talkient] Processing the text elements...');

  // Get all text nodes in the document
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node: Node): number {
        return shouldProcessNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    }
  );

  const processedNodes = new Set<Node>();
  const BATCH_SIZE = 50; // Process 50 nodes at a time
  let processedCount = 0;

  function processBatch() {
    let batchCount = 0;

    while (walker.nextNode() && batchCount < BATCH_SIZE) {
      const textNode = walker.currentNode;

      // Skip if already processed
      if (processedNodes.has(textNode)) continue;

      // Skip if the parent of the text node is already processed
      const parentEl = textNode.parentElement;
      if (parentEl && parentEl.classList.contains('talkient-processed'))
        continue;

      // Skip if direct parent is a span that already has a play button
      if (
        parentEl &&
        parentEl.tagName === 'SPAN' &&
        parentEl.querySelector('.talkient-play-button')
      )
        continue;

      // Create a wrapper span if the text node is not already wrapped
      const wrapper = document.createElement('span');
      wrapper.style.cssText = 'display: inline-flex; align-items: center;';
      wrapper.classList.add('talkient-processed');

      // Create and add the play button
      const playButton = createPlayButton();
      playButton.classList.add('talkient-play-button');

      // Add click handler
      playButton.addEventListener('click', (event) => {
        // Prevent event propagation to avoid triggering link navigation
        event.preventDefault();
        event.stopPropagation();

        const isPlaying = isSvgPauseIcon(
          playButton.querySelector('svg') as SVGElement
        );

        if (isPlaying) {
          // Pause the speech and clear highlighting
          chrome.runtime.sendMessage(
            {
              type: 'PAUSE_SPEECH',
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  'Error sending message:',
                  chrome.runtime.lastError
                );
              } else {
                // Set play icon
                playButton.innerHTML = getSvgIcon('play');
                clearHighlight();

                // Reset all other buttons that might be in pause state
                document
                  .querySelectorAll('.talkient-play-button')
                  .forEach((btn) => {
                    if (
                      btn !== playButton &&
                      isSvgPauseIcon(btn.querySelector('svg') as SVGElement)
                    ) {
                      btn.innerHTML = getSvgIcon('play');
                    }
                  });
              }
            }
          );
        } else {
          // Determine highlighting style based on keyboard modifiers
          let highlightStyle = getHighlightingStyle();
          if (event.shiftKey) {
            highlightStyle = 'bold';
          } else if (event.ctrlKey || event.metaKey) {
            highlightStyle = 'minimal';
          } else if (event.altKey) {
            highlightStyle = 'elegant';
          }

          // Reset all other buttons that might be in pause state
          document.querySelectorAll('.talkient-play-button').forEach((btn) => {
            if (
              btn !== playButton &&
              isSvgPauseIcon(btn.querySelector('svg') as SVGElement)
            ) {
              btn.innerHTML = getSvgIcon('play');
            }
          });

          // Play the speech and highlight the text
          const textElement = wrapper.querySelector('span') || wrapper;
          highlightText(textElement as HTMLElement, highlightStyle);

          chrome.runtime.sendMessage(
            {
              type: 'SPEAK_TEXT',
              text: textNode.textContent || '',
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  'Error sending message:',
                  chrome.runtime.lastError
                );
                clearHighlight();
              } else {
                // Set pause icon
                playButton.innerHTML = getSvgIcon('pause');
              }
            }
          );
        }
      });

      // Replace the text node with our wrapped version
      const parentNode = textNode.parentNode;
      if (parentNode) {
        parentNode.insertBefore(wrapper, textNode);
        wrapper.appendChild(textNode);
        wrapper.appendChild(playButton);
      } else {
        // Parent node is null, skip this text node
        continue;
      }

      processedNodes.add(textNode);
      batchCount++;
      processedCount++;
    }

    // If we processed a batch and there might be more nodes, schedule the next batch
    if (batchCount > 0 && processedCount < maxNodesProcessedCache) {
      // Safety limit based on user setting
      requestAnimationFrame(processBatch);
    } else {
      console.log(
        `[Talkient] Elements processed. Total nodes processed: ${processedCount}`
      );
    }
  }

  // Start processing the first batch
  requestAnimationFrame(processBatch);
}
