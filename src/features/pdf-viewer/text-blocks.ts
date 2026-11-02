/**
 * Turns pdf.js text items into readable text and splits each page into
 * reading blocks. Every caller (blocks, text layer, playback) must use the
 * same functions so that the strings, and therefore character offsets, are
 * identical everywhere.
 */

export interface PdfTextItemLike {
  str?: string;
  transform?: number[];
  height?: number;
}

export interface PageBlocks {
  // [firstItem, lastItemExclusive) for every block
  ranges: Array<[number, number]>;
  texts: string[];
}

// The first block is short so reading starts quickly; the rest are longer.
export const FIRST_BLOCK_MAX_CHARS = 180;
export const BLOCK_MAX_CHARS = 1500;

const HYPHENATED_LINE_END = /[A-Za-z]-\s*$/;
const SENTENCE_END = /[.!?]+["'”’)\]]*\s+/g;

interface PositionedItem<T> {
  item: T;
  index: number;
  x: number;
  y: number;
  height: number;
}

/**
 * Sorts items top to bottom (PDF y axis points up), grouping items on the
 * same line, then left to right inside each line.
 */
export function orderTextItems<T extends PdfTextItemLike>(items: T[]): T[] {
  let lastX = 0;
  let lastY = 0;
  let lastHeight = 1;

  const positioned: Array<PositionedItem<T>> = items.map((item, index) => {
    // Items without a transform (marked content) keep the previous position
    if (item.transform && item.transform.length >= 6) {
      lastX = item.transform[4];
      lastY = item.transform[5];
      lastHeight = Math.max(item.height || Math.abs(item.transform[3]) || 1, 1);
    }
    return { item, index, x: lastX, y: lastY, height: lastHeight };
  });

  positioned.sort((a, b) => b.y - a.y || a.x - b.x || a.index - b.index);

  const lines: Array<Array<PositionedItem<T>>> = [];
  for (const entry of positioned) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line[0].y - entry.y) <= line[0].height * 0.5) {
      line.push(entry);
    } else {
      lines.push([entry]);
    }
  }

  const ordered: T[] = [];
  for (const line of lines) {
    line.sort((a, b) => a.x - b.x || a.index - b.index);
    line.forEach((entry) => ordered.push(entry.item));
  }
  return ordered;
}

export function getItemString(item: PdfTextItemLike): string {
  return typeof item.str === 'string' ? item.str : '';
}

/**
 * Joins words hyphenated across lines and makes sure every item ends with a
 * space, so that concatenating the items reads naturally.
 */
export function normalizeItemStrings(strings: string[]): string[] {
  return strings.map((text, index) => {
    const isLast = index === strings.length - 1;
    if (!isLast && HYPHENATED_LINE_END.test(text)) {
      return text.replace(/-\s*$/, '');
    }
    if (text !== '' && !/\s$/.test(text)) {
      return `${text} `;
    }
    return text;
  });
}

export function getNormalizedPageStrings(items: PdfTextItemLike[]): string[] {
  return normalizeItemStrings(orderTextItems(items).map(getItemString));
}

/**
 * Splits text into sentences. The pieces include their trailing whitespace,
 * so joining them gives back the original text.
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  SENTENCE_END.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SENTENCE_END.exec(text)) !== null) {
    const end = match.index + match[0].length;
    sentences.push(text.slice(start, end));
    start = end;
  }
  if (start < text.length) {
    sentences.push(text.slice(start));
  }
  return sentences;
}

/**
 * Returns the [start, end) bounds of the sentence containing `offset`.
 */
export function getSentenceBounds(
  text: string,
  offset: number,
): [number, number] {
  let start = 0;
  for (const sentence of splitSentences(text)) {
    const end = start + sentence.length;
    if (offset < end) {
      return [start, end];
    }
    start = end;
  }
  return [start, text.length];
}

function hardSplit(text: string, maxLength: number): string[] {
  const pieces: string[] = [];
  let rest = text;
  while (rest.length > maxLength) {
    // Cut after the last space that keeps the piece within maxLength
    const lastSpace = rest.lastIndexOf(' ', maxLength - 1);
    const cut = lastSpace > 0 ? lastSpace + 1 : maxLength;
    pieces.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest !== '') {
    pieces.push(rest);
  }
  return pieces;
}

/**
 * Groups whole sentences into chunks of at most `maxLength` characters.
 * Sentences longer than that are cut at a space.
 */
export function chunkText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const sentence of splitSentences(text)) {
    if (current !== '' && current.length + sentence.length > maxLength) {
      chunks.push(current);
      current = '';
    }
    if (sentence.length > maxLength) {
      const pieces = hardSplit(sentence, maxLength);
      chunks.push(...pieces.slice(0, -1));
      current = pieces[pieces.length - 1];
    } else {
      current += sentence;
    }
  }
  if (current !== '') {
    chunks.push(current);
  }
  return chunks;
}

export function chunkPageText(text: string): string[] {
  if (text === '') {
    return [];
  }
  const first = chunkText(text, FIRST_BLOCK_MAX_CHARS)[0];
  const rest = text.slice(first.length);
  return rest === '' ? [first] : [first, ...chunkText(rest, BLOCK_MAX_CHARS)];
}

/**
 * Splits the page items into reading blocks. Cuts always fall on item
 * boundaries (a text layer div never spans two blocks), so a block can be
 * slightly longer than its chunk.
 */
export function buildPageBlocks(strings: string[]): PageBlocks {
  const chunkEnds: number[] = [];
  let total = 0;
  for (const chunk of chunkPageText(strings.join(''))) {
    total += chunk.length;
    chunkEnds.push(total);
  }

  const ranges: Array<[number, number]> = [];
  let from = 0;
  let offset = 0;
  let chunk = 0;
  for (let index = 0; index < strings.length; index++) {
    if (
      index > from &&
      chunk < chunkEnds.length &&
      offset >= chunkEnds[chunk]
    ) {
      ranges.push([from, index]);
      from = index;
      while (chunk < chunkEnds.length && chunkEnds[chunk] <= offset) {
        chunk++;
      }
    }
    offset += strings[index].length;
  }
  if (from < strings.length) {
    ranges.push([from, strings.length]);
  }

  return {
    ranges,
    texts: ranges.map(([start, end]) => strings.slice(start, end).join('')),
  };
}
