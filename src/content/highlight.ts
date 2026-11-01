/// <reference lib="dom" />
/// <reference types="chrome" />

// Global state for text highlighting
let currentHighlightedElement: HTMLElement | null = null;
let currentHighlightingStyle: string = 'default';

// Word-level highlighting state. Words are painted with the CSS Custom
// Highlight API, so the page DOM is never rewritten while reading.
export interface WordSegment {
  node: Text;
  // Offset of this text node inside the spoken text
  start: number;
}

const WORD_HIGHLIGHT_NAMES = [
  'talkient-word',
  'talkient-word-minimal',
  'talkient-word-bold',
  'talkient-word-elegant',
];
let wordSegments: WordSegment[] = [];
let wordHighlightName = 'talkient-word';
let activeWordRange: Range | null = null;

// Cached followHighlight setting to avoid repeated storage reads
let cachedFollowHighlight: boolean = true;

// Auto-scroll is suspended for a while after the user scrolls manually, so
// following the highlight never fights the reader.
const USER_SCROLL_SUSPEND_MS = 4000;
const SCROLL_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
]);
let lastUserScrollAt = 0;

function noteUserScroll(): void {
  lastUserScrollAt = Date.now();
}

if (typeof window !== 'undefined') {
  window.addEventListener('wheel', noteUserScroll, { passive: true });
  window.addEventListener('touchmove', noteUserScroll, { passive: true });
  window.addEventListener('keydown', (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const isEditable =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target?.isContentEditable === true;
    if (!isEditable && SCROLL_KEYS.has(event.key)) noteUserScroll();
  });
}

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

function supportsHighlightApi(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    'highlights' in CSS &&
    typeof Highlight !== 'undefined'
  );
}

// Collects the text nodes of an element (excluding the play button) with
// their offsets, for callers that don't provide segments themselves.
function collectTextSegments(element: HTMLElement): WordSegment[] {
  const segments: WordSegment[] = [];
  let offset = 0;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node): number {
      return node.parentElement?.closest('.talkient-play-button')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    segments.push({ node, start: offset });
    offset += node.data.length;
  }
  return segments;
}

function findSegment(index: number): WordSegment | null {
  for (const segment of wordSegments) {
    if (index >= segment.start && index < segment.start + segment.node.length) {
      return segment;
    }
  }
  return null;
}

// Maps a spoken-text char range onto the page text nodes
function createWordRange(charIndex: number, length?: number): Range | null {
  const startSegment = findSegment(charIndex);
  if (!startSegment || !startSegment.node.isConnected) return null;

  const startText = startSegment.node.data;
  let startOffset = charIndex - startSegment.start;
  // Some engines report the whitespace before the word
  while (startOffset < startText.length && /\s/.test(startText[startOffset])) {
    startOffset++;
  }
  if (startOffset >= startText.length) return null;

  let endSegment = startSegment;
  let endOffset: number;
  const endSegmentFromLength =
    length && length > 0 ? findSegment(charIndex + length - 1) : null;
  if (endSegmentFromLength && endSegmentFromLength.node.isConnected) {
    endSegment = endSegmentFromLength;
    endOffset = Math.min(
      charIndex + (length as number) - endSegment.start,
      endSegment.node.length,
    );
  } else {
    const word = /^\S+/.exec(startText.slice(startOffset));
    endOffset = startOffset + (word ? word[0].length : 0);
  }

  try {
    const range = document.createRange();
    range.setStart(startSegment.node, startOffset);
    range.setEnd(endSegment.node, endOffset);
    return range;
  } catch {
    // The page changed the text while it was being read
    return null;
  }
}

// Highlight a specific word by character index of the spoken text
export function highlightWordAtIndex(charIndex: number, length?: number): void {
  if (wordSegments.length === 0 || !Number.isFinite(charIndex)) {
    return;
  }

  const range = createWordRange(charIndex, length);
  if (!range) {
    return;
  }

  activeWordRange = range;
  if (supportsHighlightApi()) {
    WORD_HIGHLIGHT_NAMES.forEach((name) => CSS.highlights.delete(name));
    CSS.highlights.set(wordHighlightName, new Highlight(range));
  }

  // Scroll to the active word
  scrollToHighlightedElement(range);
}

// Get the range of the word currently being spoken
export function getActiveWordRange(): Range | null {
  return activeWordRange;
}

// Clear word-level highlighting
export function clearWordHighlight(): void {
  if (supportsHighlightApi()) {
    WORD_HIGHLIGHT_NAMES.forEach((name) => CSS.highlights.delete(name));
  }
  wordSegments = [];
  activeWordRange = null;
}

// Function to highlight text being spoken. `segments` maps the spoken text
// onto the element's text nodes; when omitted, all its text nodes are used.
export function highlightText(
  element: HTMLElement,
  style?: string,
  segments?: WordSegment[],
): void {
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

  // Prepare word-level highlighting
  wordSegments = segments ?? collectTextSegments(element);
  wordHighlightName =
    activeStyle === 'default'
      ? 'talkient-word'
      : `talkient-word-${activeStyle}`;

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
export function scrollToHighlightedElement(element: HTMLElement | Range): void {
  // Use cached followHighlight setting to avoid repeated storage reads
  if (!cachedFollowHighlight || !element) {
    return;
  }

  // Don't fight a reader who just scrolled away
  if (Date.now() - lastUserScrollAt < USER_SCROLL_SUSPEND_MS) {
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
