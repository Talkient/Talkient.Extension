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

// Function to create a play button element
export function createPlayButton(): HTMLButtonElement {
  const button = document.createElement('button');
  button.innerHTML = '▶️';
  button.title =
    'Click to play/pause speech\nShift+Click: Bold highlighting\nCtrl+Click: Minimal highlighting\nAlt+Click: Elegant highlighting';
  button.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px 5px;
        margin-left: 5px;
        font-size: 14px;
    `;
  return button;
}

// Function to check if a node should be processed
export function shouldProcessNode(node: Node): boolean {
  // Skip if node is null or not a text node
  if (!node || node.nodeType !== Node.TEXT_NODE) return false;

  // Skip if text is empty or just whitespace
  const text = node.textContent?.trim();
  if (!text || text.length < 2) return false;

  // Skip if parent is null
  const parent = node.parentElement;
  if (!parent) return false;

  // Skip if parent is a script, style, or button
  if (
    parent.tagName === 'SCRIPT' ||
    parent.tagName === 'STYLE' ||
    parent.tagName === 'BUTTON' ||
    parent.tagName === 'INPUT'
  )
    return false;

  // Skip if parent or any ancestor already has a play button
  if (parent.querySelector('.talkient-play-button')) return false;

  // Skip if parent is already processed
  if (parent.classList.contains('talkient-processed')) return false;

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
  if (nextPlayButton.innerHTML === '▶️') {
    console.log('[Talkient] Auto-playing next text element');
    // Simulate a click on the next play button
    nextPlayButton.click();
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

      // Create a wrapper span if the text node is not already wrapped
      const wrapper = document.createElement('span');
      wrapper.style.cssText = 'display: inline-flex; align-items: center;';
      wrapper.classList.add('talkient-processed');

      // Create and add the play button
      const playButton = createPlayButton();
      playButton.classList.add('talkient-play-button');

      // Add click handler
      playButton.addEventListener('click', (event) => {
        const isPlaying = playButton.innerHTML === '⏸️';
        chrome.runtime.sendMessage({
          type: 'GA4_EVENT',
          event: {
            name: 'play_pause_clicked',
            params: {
              id: 'play-pause-button',
              page_title: document.title,
              page_location: document.location.href,
            },
          },
        });

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
                playButton.innerHTML = '▶️';
                clearHighlight();
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
                playButton.innerHTML = '⏸️';
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
    if (batchCount > 0 && processedCount < 1000) {
      // Safety limit of 1000 nodes
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
