/// <reference lib="dom" />
/// <reference types="chrome" />

import { createPlayButton, safeClickButton } from './play-button';
import {
  getSvgIcon,
  isSvgPlayIcon,
  isSvgPauseIcon,
} from '../../assets/content/icons';
import { safeSendMessage } from '../../../shared/api/messaging';
import {
  highlightText,
  getHighlightingStyle,
  getCurrentHighlightedElement,
} from '../../../content/highlight';
import {
  DEFAULT_PROCESSABLE_ELEMENTS,
  isHostnameIgnored,
  normalizeIgnoredDomains,
  normalizeProcessableElements,
} from '../../settings/storage-schema';

// Cache for settings
let minimumWordsCache = 3; // Default minimum words
let speechRateCache = 1.0; // Default speech rate
let maxNodesProcessedCache = 1000; // Default maximum nodes processed
let buttonPositionCache: 'left' | 'right' = 'left'; // Default button position
let processableElementsCache: string[] = [...DEFAULT_PROCESSABLE_ELEMENTS]; // Default processable elements
let ignoredDomainsCache: string[] = []; // Default ignored domains list
// Per-page cached result of the hostname check so shouldProcessNode() is O(1)
let isCurrentHostIgnored = false;

// Reading time estimate counters
let totalProcessedChars = 0;
let remainingChars = -1; // -1 = playback not started; ≥0 = chars left from current position
let currentPlayingChars = 0;
// Number of chars before the node that started playback, captured at click time.
// Used to correct `remainingChars` after async processing batches finish.
let playbackCharsBeforeCurrentNode: number | null = null;
let onPlayStartCallback: (() => void) | undefined;

export function setOnPlayStartCallback(cb: () => void): void {
  onPlayStartCallback = cb;
}

export function getTotalProcessedChars(): number {
  return totalProcessedChars;
}
export function getRemainingChars(): number {
  return remainingChars;
}
export function setRemainingChars(n: number): void {
  remainingChars = n;
}
export function subtractRemainingChars(n: number): void {
  if (remainingChars >= 0) remainingChars = Math.max(0, remainingChars - n);
}
export function getCurrentPlayingChars(): number {
  return currentPlayingChars;
}
export function resetEstimateCounters(): void {
  totalProcessedChars = 0;
  remainingChars = -1;
  currentPlayingChars = 0;
  playbackCharsBeforeCurrentNode = null;
}

// Load minimum words setting from storage
export function loadMinimumWordsFromStorage(): Promise<number> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['minimumWords'], (result) => {
      minimumWordsCache =
        typeof result.minimumWords === 'number' ? result.minimumWords : 3;
      console.log(
        `[Talkient] Loaded minimum words setting: ${minimumWordsCache}`,
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
        `[Talkient] Loaded maximum nodes setting: ${maxNodesProcessedCache}`,
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

// Load button position setting from storage
export function loadButtonPositionFromStorage(): Promise<'left' | 'right'> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['buttonPosition'], (result) => {
      buttonPositionCache =
        result.buttonPosition === 'right' ? 'right' : 'left';
      console.log(
        `[Talkient] Loaded button position setting: ${buttonPositionCache}`,
      );
      resolve(buttonPositionCache);
    });
  });
}

// Get the current button position setting
export function getButtonPosition(): 'left' | 'right' {
  return buttonPositionCache;
}

// Set the button position setting (used when it changes in storage)
export function setButtonPosition(value: 'left' | 'right'): void {
  buttonPositionCache = value;
}

// Set the processable elements list (used when it changes in storage)
export function setProcessableElements(tags: string[]): void {
  processableElementsCache = normalizeProcessableElements(tags);
}

// Get the current processable elements list
export function getProcessableElements(): string[] {
  return processableElementsCache;
}

// Set the ignored domains list (used when it changes in storage)
export function setIgnoredDomains(domains: string[]): void {
  ignoredDomainsCache = normalizeIgnoredDomains(domains);
  // Cache the result for the current page so shouldProcessNode() is O(1)
  isCurrentHostIgnored = isHostnameIgnored(
    window.location.hostname,
    ignoredDomainsCache,
  );
}

// Get the current ignored domains list
export function getIgnoredDomains(): string[] {
  return ignoredDomainsCache;
}

// Inline tags never become a reading block on their own when a block-level
// processable ancestor exists (e.g. <em> inside <p> is read as part of the <p>).
const INLINE_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'cite',
  'data',
  'dfn',
  'em',
  'font',
  'i',
  'kbd',
  'mark',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
]);

// Subtrees whose text is never spoken (code, form controls, our own UI and
// page boilerplate such as menus and footers)
const SKIPPED_SELECTOR = [
  'script',
  'style',
  'noscript',
  'template',
  'button',
  'code',
  'pre',
  'input',
  'textarea',
  'select',
  'svg',
  'nav',
  'aside',
  'footer',
  '[role="navigation"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="tablist"]',
  '[role="toolbar"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[aria-hidden="true"]',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '.talkient-play-button',
  '#talkient-control-panel',
  '#talkient-translation-result',
  '#talkient-inline-translate-trigger',
].join(', ');

// Minimum amount of readable text for a page without <article> to get the UI
const MIN_READABLE_PAGE_CHARS = 500;

export interface TextSegment {
  node: Text;
  // Offset of this text node inside the spoken block text
  start: number;
}

export interface BlockText {
  text: string;
  segments: TextSegment[];
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

// A site-level <header> (outside article/main) is boilerplate; an article
// header usually holds the title and is read.
function isInSiteHeader(element: HTMLElement): boolean {
  const header = element.closest('header');
  return header !== null && header.closest('article, main') === null;
}

function isSkippedElement(element: HTMLElement): boolean {
  return element.closest(SKIPPED_SELECTOR) !== null || isInSiteHeader(element);
}

function isElementHidden(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.opacity === '0'
  );
}

/**
 * Returns the element that is read as one utterance for the given text node:
 * the nearest block-level processable ancestor, falling back to the nearest
 * inline processable ancestor.
 */
export function getBlockElement(node: Node): HTMLElement | null {
  let inlineFallback: HTMLElement | null = null;
  for (let el = node.parentElement; el; el = el.parentElement) {
    const tag = el.tagName.toLowerCase();
    if (!processableElementsCache.includes(tag)) continue;
    if (!INLINE_TAGS.has(tag)) return el;
    if (!inlineFallback) inlineFallback = el;
  }
  return inlineFallback;
}

/**
 * Collects the speakable text of a block. Text of nested blocks, skipped
 * subtrees and hidden descendants is excluded. A space is inserted where a
 * <br> or block-level child would otherwise glue two words together.
 * `segments` maps every text node to its offset in `text`.
 */
export function getBlockText(block: HTMLElement): BlockText {
  const segments: TextSegment[] = [];
  let text = '';
  let pendingBreak = false;

  const walker = document.createTreeWalker(
    block,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node: Node): number {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return NodeFilter.FILTER_ACCEPT;
        }
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        // A nested block-level processable element is read as its own block
        const isNestedBlock =
          processableElementsCache.includes(tag) && !INLINE_TAGS.has(tag);
        if (
          isNestedBlock ||
          el.matches(SKIPPED_SELECTOR) ||
          el.classList.contains('talkient-processed') ||
          isElementHidden(el)
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName.toLowerCase();
      if (tag === 'br' || !INLINE_TAGS.has(tag)) pendingBreak = true;
      continue;
    }

    const value = node.textContent ?? '';
    if (!value) continue;
    if (pendingBreak && text && !/\s$/.test(text) && !/^\s/.test(value)) {
      text += ' ';
    }
    pendingBreak = false;
    segments.push({ node: node as Text, start: text.length });
    text += value;
  }

  return { text, segments };
}

// Sentence punctuation that ends the sentence, not the URL
const URL_TRAILING_PUNCTUATION = new Set([
  '.',
  ',',
  ';',
  ':',
  '!',
  '?',
  ')',
  ']',
  '}',
  "'",
  '"',
]);

/**
 * Prepares block text for the TTS engine without changing its length, so
 * word boundary offsets still map 1:1 to the page text. URLs are reduced to
 * their host name (the rest is replaced by spaces) and control characters
 * become spaces.
 */
export function toSpeechText(text: string): string {
  return text
    .replace(/[\t\n\r\f\v\u00a0]/g, ' ')
    .replace(
      /\b(?:(?:https?|ftp):\/\/|www\.)[^\s<>"']+/gi,
      (url: string): string => {
        // Linear scan: a regex anchored with `+$` backtracks quadratically on
        // long punctuation runs, and this text is page-controlled.
        let bodyEnd = url.length;
        while (bodyEnd > 0 && URL_TRAILING_PUNCTUATION.has(url[bodyEnd - 1])) {
          bodyEnd--;
        }
        const trailing = url.slice(bodyEnd);
        const body = url.slice(0, bodyEnd);
        const prefix =
          /^(?:(?:https?|ftp):\/\/)?(?:www\.)?/i.exec(body)?.[0] ?? '';
        const rest = body.slice(prefix.length);
        const host = rest.split(/[/?#:]/)[0] ?? '';
        return (
          ' '.repeat(prefix.length) +
          host +
          ' '.repeat(rest.length - host.length) +
          trailing
        );
      },
    );
}

/**
 * Cheap readability check used to decide whether the page gets the Talkient
 * UI: any <article>, or enough paragraph-like text outside boilerplate.
 */
export function hasReadableContent(): boolean {
  if (isCurrentHostIgnored) return false;
  if (document.querySelector('article')) return true;

  const blockTags = processableElementsCache.filter(
    (tag) => !INLINE_TAGS.has(tag),
  );
  if (blockTags.length === 0) return false;

  let readableChars = 0;
  for (const el of Array.from(
    document.body.querySelectorAll<HTMLElement>(blockTags.join(', ')),
  )) {
    if (isSkippedElement(el)) continue;
    // Collapse source indentation so only readable characters count
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (countWords(text) < minimumWordsCache) continue;
    readableChars += text.length;
    if (readableChars >= MIN_READABLE_PAGE_CHARS) return true;
  }
  return false;
}

/**
 * Picks where playback should start when the user presses the panel play
 * button: the first block in view, falling back to the first block.
 */
export function findFirstVisibleBlock(): HTMLElement | null {
  const blocks = Array.from(
    document.querySelectorAll<HTMLElement>('.talkient-processed'),
  );
  const minVisibleBottom = window.innerHeight * 0.15;
  const visible = blocks.find((block) => {
    const rect = block.getBoundingClientRect();
    return (
      (rect.width > 0 || rect.height > 0) &&
      rect.bottom > minVisibleBottom &&
      rect.top < window.innerHeight
    );
  });
  return visible ?? blocks[0] ?? null;
}

/**
 * Removes every play button and processed marker, leaving the page DOM as it
 * was before processing.
 */
export function unmarkProcessedBlocks(): void {
  document.querySelectorAll('.talkient-play-button').forEach((button) => {
    button.remove();
  });
  document.querySelectorAll('.talkient-processed').forEach((el) => {
    el.classList.remove('talkient-processed');
  });
}

// Only ancestors up to the node's own block count: an outer processed block
// (e.g. an <article> with loose text) must not hide the paragraphs inside it.
function isInProcessedAncestor(
  parent: HTMLElement,
  block: HTMLElement,
): boolean {
  let ancestor: HTMLElement | null = parent;
  while (ancestor) {
    if (ancestor.classList.contains('talkient-processed')) return true;
    if (ancestor === block) return false;
    ancestor = ancestor.parentElement;
  }
  return false;
}

function isHiddenByStyle(parent: HTMLElement): boolean {
  let current: HTMLElement | null = parent;
  while (current) {
    const style = window.getComputedStyle(current);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    ) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

// Function to check if a node should be processed
export function shouldProcessNode(node: Node): boolean {
  if (isCurrentHostIgnored) {
    return false;
  }

  // Skip if node is null or not a text node
  if (!node || node.nodeType !== Node.TEXT_NODE) return false;

  // Skip if text is empty or just whitespace
  const text = node.textContent?.trim();
  if (!text || text.length < 2) return false;

  // Skip if parent is null
  const parent = node.parentElement;
  if (!parent) return false;

  // Only process nodes within a configured processable element
  const block = getBlockElement(node);
  if (!block) return false;

  // Skip if the node's block (or anything in between) is already processed
  if (isInProcessedAncestor(parent, block)) return false;

  // Skip code, form controls, our own UI and page boilerplate (nav, footer...)
  if (isSkippedElement(parent)) return false;

  // Check if the node is within a hidden element
  if (isHiddenByStyle(parent)) return false;

  return true;
}

// The minimum words setting applies to the whole block, so a paragraph made
// of short fragments (text, link, text) is still read in full.
function isReadableBlock(block: HTMLElement): boolean {
  if (block.classList.contains('talkient-processed')) return false;
  if (block.isContentEditable) return false;
  return countWords(getBlockText(block).text) >= minimumWordsCache;
}

// Function to find the next text element to play
export function findNextTextElement(
  currentElement: HTMLElement,
): HTMLElement | null {
  // Get all processed elements in document order
  const allProcessedElements = Array.from(
    document.querySelectorAll('.talkient-processed'),
  );

  // Find current element index
  const currentIndex = allProcessedElements.indexOf(currentElement);

  if (currentIndex === -1 || currentIndex >= allProcessedElements.length - 1) {
    return null; // Current element not found or it's the last one
  }

  // Return the next element
  return allProcessedElements[currentIndex + 1] as HTMLElement;
}

// Function to auto-play the next text element
export function autoPlayNextText(): void {
  const currentHighlighted = getCurrentHighlightedElement();
  if (!currentHighlighted) return;

  // Find the wrapper element that contains the currently highlighted text
  const currentWrapper = currentHighlighted.closest(
    '.talkient-processed',
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
    '.talkient-play-button',
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

// Chars per block, captured at processing time for the reading time estimate
const blockCharCounts = new WeakMap<Element, number>();

function getBlockCharCount(block: Element): number {
  return blockCharCounts.get(block) ?? (block.textContent ?? '').trim().length;
}

function resetOtherPlayButtons(current: HTMLButtonElement): void {
  document.querySelectorAll('.talkient-play-button').forEach((btn) => {
    if (
      btn !== current &&
      isSvgPauseIcon(btn.querySelector('svg') as SVGElement)
    ) {
      btn.innerHTML = getSvgIcon('play');
    }
  });
}

function playBlock(
  block: HTMLElement,
  playButton: HTMLButtonElement,
  highlightStyle: string,
): void {
  resetOtherPlayButtons(playButton);

  const blockText = getBlockText(block);

  // Re-highlighting a paused block would drop its word highlight; the SW
  // resumes the same text, so keep the current highlight in that case.
  if (getCurrentHighlightedElement() !== block) {
    highlightText(block, highlightStyle, blockText.segments);
  }

  // Compute playback offsets based on currently processed blocks.
  currentPlayingChars = blockText.text.trim().length;
  const allProcessed = Array.from(
    document.querySelectorAll('.talkient-processed'),
  );
  const currentIndex = allProcessed.indexOf(block);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  // Chars before the clicked block. This remains stable as more blocks are
  // processed and is later used with final `totalProcessedChars`.
  playbackCharsBeforeCurrentNode = allProcessed
    .slice(0, safeIndex)
    .reduce((sum, el) => sum + getBlockCharCount(el), 0);

  // Provisional remaining chars from this block through processed end.
  remainingChars = allProcessed
    .slice(safeIndex)
    .reduce((sum, el) => sum + getBlockCharCount(el), 0);

  safeSendMessage(
    {
      type: 'SPEAK_TEXT',
      text: toSpeechText(blockText.text),
    },
    (_response) => {
      // Set pause icon
      playButton.innerHTML = getSvgIcon('pause');
      // Update remaining time now that playback has started
      onPlayStartCallback?.();
    },
  );
}

function attachPlayButton(block: HTMLElement): void {
  const playButton = createPlayButton();
  playButton.classList.add('talkient-play-button');

  // Add position class based on configuration
  if (buttonPositionCache === 'left') {
    playButton.classList.add('talkient-button-left');
  }

  playButton.addEventListener('click', (event) => {
    // Prevent event propagation to avoid triggering link navigation
    event.preventDefault();
    event.stopPropagation();

    const isPlaying = isSvgPauseIcon(
      playButton.querySelector('svg') as SVGElement,
    );

    if (isPlaying) {
      // Pause the speech. The highlight stays so the reader keeps their place.
      safeSendMessage(
        {
          type: 'PAUSE_SPEECH',
        },
        (_response) => {
          playButton.innerHTML = getSvgIcon('play');
          resetOtherPlayButtons(playButton);
        },
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

      playBlock(block, playButton, highlightStyle);
    }
  });

  block.classList.add('talkient-processed');
  if (buttonPositionCache === 'left') {
    block.insertBefore(playButton, block.firstChild);
  } else {
    block.appendChild(playButton);
  }
}

// Function to find reading blocks and add one play button to each
export function processTextElements(
  onComplete?: () => void,
  root: Node = document.body,
): void {
  console.log('[Talkient] Processing the text elements...');

  // Every qualifying text node leads to the block it belongs to
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node: Node): number {
      return shouldProcessNode(node)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const BATCH_SIZE = 50; // Process 50 blocks at a time
  let processedCount = 0;
  // Blocks below the minimum words, so their other text nodes skip the check
  const rejectedBlocks = new Set<HTMLElement>();

  function processBatch(): void {
    let batchCount = 0;

    while (batchCount < BATCH_SIZE && walker.nextNode()) {
      const block = getBlockElement(walker.currentNode);
      if (!block || rejectedBlocks.has(block)) continue;
      if (!isReadableBlock(block)) {
        rejectedBlocks.add(block);
        continue;
      }

      const chars = getBlockText(block).text.trim().length;
      attachPlayButton(block);
      blockCharCounts.set(block, chars);

      totalProcessedChars += chars;
      batchCount++;
      processedCount++;
    }

    // If we processed a batch and there might be more blocks, schedule the next batch
    if (batchCount > 0 && processedCount < maxNodesProcessedCache) {
      // Safety limit based on user setting
      requestAnimationFrame(processBatch);
    } else {
      console.log(
        `[Talkient] Elements processed. Total blocks processed: ${processedCount}`,
      );

      // After all batches complete, fix early-click undercount using final total.
      if (playbackCharsBeforeCurrentNode !== null) {
        const recomputedRemaining =
          totalProcessedChars - playbackCharsBeforeCurrentNode;
        if (recomputedRemaining > remainingChars) {
          remainingChars = recomputedRemaining;
        }
        playbackCharsBeforeCurrentNode = null;
      }

      onComplete?.();
    }
  }

  // Start processing the first batch
  requestAnimationFrame(processBatch);
}
