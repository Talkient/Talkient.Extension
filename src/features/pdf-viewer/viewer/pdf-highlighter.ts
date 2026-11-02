/// <reference lib="dom" />

import { HIGHLIGHT_LAYER_CLASS, PAGE_CLASS } from './pdf-dom';

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Merges the rects of a text range into one rect per line, closing the small
 * gaps between the pdf.js text runs.
 */
export function mergeLineRects(rects: RectLike[]): RectLike[] {
  const sorted = rects
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .sort((a, b) => a.top - b.top || a.left - b.left);

  const lines: RectLike[] = [];
  for (const rect of sorted) {
    const line = lines[lines.length - 1];
    const sameLine =
      line !== undefined &&
      Math.abs(line.top - rect.top) <= Math.min(line.height, rect.height) / 2;
    const gap = line ? rect.left - (line.left + line.width) : 0;

    if (line && sameLine && gap <= Math.max(line.height, rect.height)) {
      const top = Math.min(line.top, rect.top);
      const right = Math.max(line.left + line.width, rect.left + rect.width);
      const bottom = Math.max(line.top + line.height, rect.top + rect.height);
      line.left = Math.min(line.left, rect.left);
      line.top = top;
      line.width = right - line.left;
      line.height = bottom - top;
    } else {
      lines.push({ ...rect });
    }
  }
  return lines;
}

/**
 * Range over [start, end) characters of the element's text, whatever the
 * nesting of its text nodes.
 */
export function createTextRange(
  element: Node,
  start: number,
  end: number,
): Range | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let offset = 0;
  let started = false;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const length = node.data.length;
    if (!started && start <= offset + length) {
      range.setStart(node, Math.max(0, start - offset));
      started = true;
    }
    if (started && end <= offset + length) {
      range.setEnd(node, Math.max(0, end - offset));
      return range;
    }
    offset += length;
  }
  return started ? range : null;
}

function toPageRect(rect: DOMRect, pageRect: DOMRect): RectLike {
  return {
    left: rect.left - pageRect.left,
    top: rect.top - pageRect.top,
    width: rect.width,
    height: rect.height,
  };
}

function placeBox(box: HTMLElement, rect: RectLike): void {
  box.style.left = `${rect.left}px`;
  box.style.top = `${rect.top}px`;
  box.style.width = `${rect.width}px`;
  box.style.height = `${rect.height}px`;
}

/**
 * Paints the sentence and word being read as boxes over the rendered page.
 * The text layer itself is transparent, so the CSS Highlight API used on web
 * pages would not show anything here.
 */
export class PdfHighlighter {
  private layer: HTMLElement | null = null;
  private wordBox: HTMLElement | null = null;
  private lastWordRect: RectLike | null = null;

  /**
   * Returns the first sentence line in viewport coordinates, or null when the
   * page is not rendered.
   */
  paint(
    block: HTMLElement,
    sentence: [number, number],
    word: [number, number] | null,
  ): DOMRect | null {
    const shell = block.closest<HTMLElement>(`.${PAGE_CLASS}`);
    const layer = shell?.querySelector<HTMLElement>(
      `.${HIGHLIGHT_LAYER_CLASS}`,
    );
    if (!shell || !layer || shell.dataset.mounted !== 'true') {
      this.clear();
      return null;
    }

    if (layer !== this.layer) {
      this.clear();
      this.layer = layer;
    }

    const pageRect = shell.getBoundingClientRect();
    const sentenceRange = createTextRange(block, sentence[0], sentence[1]);
    const lines = sentenceRange
      ? mergeLineRects(
          Array.from(sentenceRange.getClientRects()).map((rect) =>
            toPageRect(rect, pageRect),
          ),
        )
      : [];

    const sentenceBoxes = Array.from(
      layer.querySelectorAll<HTMLElement>('.tk-pdf-sentence-highlight'),
    );
    lines.forEach((line, index) => {
      let box = sentenceBoxes[index];
      if (!box) {
        box = document.createElement('div');
        box.className = 'tk-pdf-sentence-highlight';
        box.dataset.testid = 'pdf-sentence-highlight';
        layer.insertBefore(box, this.wordBox);
      }
      placeBox(box, line);
    });
    sentenceBoxes.slice(lines.length).forEach((box) => box.remove());

    this.paintWord(layer, block, word, pageRect);

    if (lines.length === 0) {
      return null;
    }
    return new DOMRect(
      lines[0].left + pageRect.left,
      lines[0].top + pageRect.top,
      lines[0].width,
      lines[0].height,
    );
  }

  clear(): void {
    this.layer?.replaceChildren();
    this.layer = null;
    this.wordBox = null;
    this.lastWordRect = null;
  }

  private paintWord(
    layer: HTMLElement,
    block: HTMLElement,
    word: [number, number] | null,
    pageRect: DOMRect,
  ): void {
    const wordRange = word ? createTextRange(block, word[0], word[1]) : null;
    const firstRect = wordRange
      ? Array.from(wordRange.getClientRects()).find(
          (rect) => rect.width > 0 && rect.height > 0,
        )
      : undefined;

    if (!firstRect) {
      this.wordBox?.remove();
      this.wordBox = null;
      this.lastWordRect = null;
      return;
    }

    const rect = toPageRect(firstRect, pageRect);
    if (!this.wordBox) {
      this.wordBox = document.createElement('div');
      this.wordBox.className = 'tk-pdf-word-highlight';
      this.wordBox.dataset.testid = 'pdf-word-highlight';
      layer.appendChild(this.wordBox);
    }

    // Glide along the line, jump everywhere else
    const previous = this.lastWordRect;
    const movesRightOnSameLine =
      previous !== null &&
      Math.abs(previous.top - rect.top) <= rect.height / 2 &&
      rect.left > previous.left;
    this.wordBox.style.transition = movesRightOnSameLine
      ? 'left 0.12s ease'
      : 'none';
    placeBox(this.wordBox, rect);
    this.lastWordRect = rect;
  }
}
