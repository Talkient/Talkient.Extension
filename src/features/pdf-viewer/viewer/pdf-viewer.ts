/// <reference lib="dom" />
/// <reference types="chrome" />

import { safeSendMessage } from '../../../shared/api/messaging';
import type { ContentScriptMessage } from '../../../shared/types/messages';
import { getPdfFileName, isSupportedPdfUrl } from '../pdf-url';
import {
  configurePdfWorker,
  loadPdfBytes,
  openPdfDocument,
} from './pdf-document';
import { PdfHighlighter } from './pdf-highlighter';
import { BLOCK_CLASS } from './pdf-dom';
import { PdfPages } from './pdf-pages';
import { PdfPlayer, type PdfPlayerStatus } from './pdf-player';

// Following the highlight pauses for a while after the user scrolls
const USER_SCROLL_SUSPEND_MS = 4000;

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`PDF viewer element #${id} not found`);
  }
  return element as T;
}

function showStatus(message: string, isError = false): void {
  const status = getElement('tk-pdf-status');
  status.textContent = message;
  status.classList.toggle('tk-pdf-status-error', isError);
  status.hidden = false;
}

function hideStatus(): void {
  getElement('tk-pdf-status').hidden = true;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getSpeechErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'errorMessage' in error) {
    return String((error as { errorMessage: unknown }).errorMessage);
  }
  return 'Speech failed';
}

function isContentScriptMessage(
  message: unknown,
): message is ContentScriptMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof (message as { type?: unknown }).type === 'string'
  );
}

function promptPassword(incorrect: boolean): Promise<string> {
  const form = getElement<HTMLFormElement>('tk-pdf-password');
  const input = getElement<HTMLInputElement>('tk-pdf-password-input');
  const label = getElement('tk-pdf-password-label');

  label.textContent = incorrect
    ? 'Incorrect password. Please try again.'
    : 'This PDF is protected. Enter its password to open it.';
  input.value = '';
  form.hidden = false;
  showStatus('Password required');
  input.focus();

  return new Promise((resolve) => {
    form.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        form.hidden = true;
        showStatus('Loading PDF…');
        resolve(input.value);
      },
      { once: true },
    );
  });
}

/**
 * Character offset inside `block` under the pointer, or 0 when unknown.
 */
function getOffsetAtPoint(block: HTMLElement, x: number, y: number): number {
  const caret = document.caretRangeFromPoint?.(x, y);
  if (!caret || !block.contains(caret.startContainer)) {
    return 0;
  }
  const before = document.createRange();
  before.setStart(block, 0);
  before.setEnd(caret.startContainer, caret.startOffset);
  return before.toString().length;
}

function updatePlayButton(status: PdfPlayerStatus): void {
  const playButton = getElement<HTMLButtonElement>('tk-pdf-play');
  const isPlaying = status === 'playing';
  const label = isPlaying ? 'Pause' : 'Play';
  playButton.title = label;
  playButton.setAttribute('aria-label', label);
  playButton.dataset.status = status;
  playButton
    .querySelector<SVGElement>('.tk-pdf-icon-play')
    ?.toggleAttribute('hidden', isPlaying);
  playButton
    .querySelector<SVGElement>('.tk-pdf-icon-pause')
    ?.toggleAttribute('hidden', !isPlaying);
}

async function boot(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const fileUrl = params.get('file');
  const autoplay = params.get('autoplay') === '1';

  if (!isSupportedPdfUrl(fileUrl)) {
    showStatus(
      'No PDF to open: the address is missing or not supported.',
      true,
    );
    return;
  }

  const fileName = getPdfFileName(fileUrl);
  getElement('tk-pdf-title').textContent = fileName;
  document.title = `${fileName} - Talkient`;

  configurePdfWorker();

  let pages: PdfPages;
  try {
    const bytes = await loadPdfBytes(fileUrl);
    const doc = await openPdfDocument(bytes, promptPassword);
    const scrollElement = getElement('tk-pdf-scroll');
    pages = await PdfPages.create(
      doc,
      getElement('tk-pdf-pages'),
      scrollElement,
    );
    setupViewer(pages, scrollElement, autoplay);
  } catch (error) {
    console.error('[Talkient.PDF] Failed to load the PDF:', error);
    showStatus(`Could not open this PDF. ${getErrorMessage(error)}`, true);
    return;
  }
}

function setupViewer(
  pages: PdfPages,
  scrollElement: HTMLElement,
  autoplay: boolean,
): void {
  const highlighter = new PdfHighlighter();
  const playButton = getElement<HTMLButtonElement>('tk-pdf-play');
  const previousButton = getElement<HTMLButtonElement>('tk-pdf-previous');
  const nextButton = getElement<HTMLButtonElement>('tk-pdf-next');
  const pageIndicator = getElement('tk-pdf-page-indicator');

  let followHighlight = true;
  let lastUserScrollAt = 0;
  chrome.storage.local.get(['followHighlight'], (result) => {
    followHighlight = result.followHighlight !== false;
  });
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && 'followHighlight' in changes) {
      followHighlight = changes.followHighlight.newValue !== false;
    }
  });

  const canFollow = (): boolean =>
    followHighlight && Date.now() - lastUserScrollAt > USER_SCROLL_SUSPEND_MS;

  const followLine = (lineRect: DOMRect | null, pageNumber: number): void => {
    if (!canFollow()) {
      return;
    }
    const viewport = scrollElement.getBoundingClientRect();
    if (!lineRect) {
      // The page being read is not rendered: bring it into view first
      pages.getShell(pageNumber)?.scrollIntoView({ block: 'start' });
      return;
    }
    const lineCenter = lineRect.top + lineRect.height / 2;
    const isComfortable =
      lineCenter > viewport.top + viewport.height * 0.2 &&
      lineCenter < viewport.top + viewport.height * 0.8;
    if (!isComfortable) {
      scrollElement.scrollBy({
        top: lineCenter - (viewport.top + viewport.height / 2),
        behavior: 'smooth',
      });
    }
  };

  let lastHighlight: {
    block: HTMLElement;
    sentence: [number, number];
    word: [number, number] | null;
    pageNumber: number;
  } | null = null;

  const player = new PdfPlayer(pages, {
    send: (message): void => {
      safeSendMessage(message);
    },
    onStatusChange: (status): void => updatePlayButton(status),
    onHighlight: (block, sentence, word, pageNumber): void => {
      lastHighlight = { block, sentence, word, pageNumber };
      followLine(highlighter.paint(block, sentence, word), pageNumber);
    },
    onClearHighlight: (): void => {
      lastHighlight = null;
      highlighter.clear();
    },
    onNoReadableText: (): void => {
      showStatus(
        'No readable text found in this PDF. It may be a scanned document.',
        true,
      );
    },
    onError: (message): void =>
      showStatus(`Could not read aloud: ${message}`, true),
  });

  // Repaint when the page being read finishes rendering
  pages.setOnPageMounted((pageNumber) => {
    if (lastHighlight && lastHighlight.pageNumber === pageNumber) {
      const { block, sentence, word } = lastHighlight;
      followLine(highlighter.paint(block, sentence, word), pageNumber);
    }
  });

  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (!isContentScriptMessage(message)) {
      return;
    }
    switch (message.type) {
      case 'WORD_BOUNDARY':
        player.handleWordBoundary(message.charIndex, message.length);
        break;
      case 'SPEECH_ENDED':
        player.handleSpeechEnded(message.autoPlayNext);
        break;
      case 'SPEECH_CANCELLED':
        player.handleSpeechStopped();
        break;
      case 'SPEECH_ERROR':
        player.handleSpeechStopped(getSpeechErrorMessage(message.error));
        break;
      default:
        break;
    }
  });

  const updatePageIndicator = (): void => {
    pageIndicator.textContent = `Page ${pages.getPageAtViewportCenter()} of ${pages.pageCount}`;
  };
  let indicatorScheduled = false;
  scrollElement.addEventListener(
    'scroll',
    () => {
      if (indicatorScheduled) {
        return;
      }
      indicatorScheduled = true;
      requestAnimationFrame(() => {
        indicatorScheduled = false;
        updatePageIndicator();
      });
    },
    { passive: true },
  );
  const noteUserScroll = (): void => {
    lastUserScrollAt = Date.now();
  };
  scrollElement.addEventListener('wheel', noteUserScroll, { passive: true });
  scrollElement.addEventListener('touchmove', noteUserScroll, {
    passive: true,
  });
  updatePageIndicator();

  playButton.addEventListener('click', () => void player.toggle());
  previousButton.addEventListener('click', () => void player.skip(-1));
  nextButton.addEventListener('click', () => void player.skip(1));

  // Click a sentence to read from there (but let users select text)
  getElement('tk-pdf-pages').addEventListener('click', (event) => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      return;
    }
    const block = (event.target as Element | null)?.closest<HTMLElement>(
      `.${BLOCK_CLASS}`,
    );
    const pageNumber = block ? pages.getPageNumberOf(block) : null;
    if (!block || pageNumber === null) {
      return;
    }
    lastUserScrollAt = 0;
    void player.playFrom(
      pageNumber,
      pages.getBlockIndexOf(block),
      getOffsetAtPoint(block, event.clientX, event.clientY),
    );
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLButtonElement ||
      target?.isContentEditable === true
    ) {
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      void player.toggle();
    } else if (event.key === 'PageDown' || event.key === 'PageUp') {
      event.preventDefault();
      noteUserScroll();
      const direction = event.key === 'PageDown' ? 1 : -1;
      scrollElement.scrollBy({
        top: direction * scrollElement.clientHeight * 0.9,
        behavior: 'smooth',
      });
    } else if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      noteUserScroll();
    }
  });

  window.addEventListener('beforeunload', () => player.stop());

  hideStatus();
  [playButton, previousButton, nextButton].forEach((button) => {
    button.disabled = false;
  });

  if (autoplay) {
    void player.play();
  }
}

void boot();
