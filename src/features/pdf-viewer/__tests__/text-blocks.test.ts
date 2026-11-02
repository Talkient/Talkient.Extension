import {
  BLOCK_MAX_CHARS,
  FIRST_BLOCK_MAX_CHARS,
  buildPageBlocks,
  chunkPageText,
  chunkText,
  getNormalizedPageStrings,
  getSentenceBounds,
  normalizeItemStrings,
  orderTextItems,
  splitSentences,
} from '../text-blocks';

function item(str: string, x: number, y: number, height = 10) {
  return { str, transform: [height, 0, 0, height, x, y], height };
}

describe('orderTextItems', () => {
  it('orders items top to bottom, then left to right', () => {
    const items = [
      item('second line', 10, 80),
      item('right', 200, 100),
      item('left', 10, 100),
    ];

    expect(orderTextItems(items).map((i) => i.str)).toEqual([
      'left',
      'right',
      'second line',
    ]);
  });

  it('keeps slightly misaligned items on the same line', () => {
    const items = [item('world', 60, 100), item('hello', 10, 103)];

    expect(orderTextItems(items).map((i) => i.str)).toEqual(['hello', 'world']);
  });

  it('keeps items without a transform next to the previous item', () => {
    const items = [item('first', 10, 100), { str: '' }, item('below', 10, 50)];

    expect(orderTextItems(items).map((i) => i.str)).toEqual([
      'first',
      '',
      'below',
    ]);
  });
});

describe('normalizeItemStrings', () => {
  it('joins words hyphenated at the end of a line', () => {
    expect(normalizeItemStrings(['an exam-', 'ple'])).toEqual([
      'an exam',
      'ple ',
    ]);
  });

  it('adds a trailing space so lines do not stick together', () => {
    expect(normalizeItemStrings(['line one', 'line two '])).toEqual([
      'line one ',
      'line two ',
    ]);
  });

  it('keeps empty items and the hyphen of the last item', () => {
    expect(normalizeItemStrings(['', 'well-'])).toEqual(['', 'well- ']);
  });

  it('normalizes the items of a page in reading order', () => {
    const items = [item('world', 10, 80), item('Hello', 10, 100)];
    expect(getNormalizedPageStrings(items).join('')).toBe('Hello world ');
  });
});

describe('sentences', () => {
  const text = 'First one. Second one? Third "quoted." Last';

  it('splits sentences and keeps all the characters', () => {
    const sentences = splitSentences(text);

    expect(sentences).toEqual([
      'First one. ',
      'Second one? ',
      'Third "quoted." ',
      'Last',
    ]);
    expect(sentences.join('')).toBe(text);
  });

  it('finds the bounds of the sentence containing an offset', () => {
    expect(getSentenceBounds(text, 0)).toEqual([0, 11]);
    expect(getSentenceBounds(text, 13)).toEqual([11, 23]);
    expect(getSentenceBounds(text, text.length - 1)).toEqual([39, text.length]);
  });
});

describe('chunking', () => {
  it('groups whole sentences up to the maximum length', () => {
    expect(chunkText('Aaa aaa. Bbb bbb. Ccc ccc. ', 18)).toEqual([
      'Aaa aaa. Bbb bbb. ',
      'Ccc ccc. ',
    ]);
  });

  it('cuts sentences longer than the maximum at a space', () => {
    const chunks = chunkText('one two three four five six', 10);

    expect(chunks.join('')).toBe('one two three four five six');
    chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(10));
  });

  it('keeps the first chunk of a page short', () => {
    const sentence = 'This sentence is exactly fifty characters long ok. ';
    const text = sentence.repeat(40);
    const chunks = chunkPageText(text);

    expect(chunks[0].length).toBeLessThanOrEqual(FIRST_BLOCK_MAX_CHARS);
    chunks
      .slice(1)
      .forEach((chunk) =>
        expect(chunk.length).toBeLessThanOrEqual(BLOCK_MAX_CHARS),
      );
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.join('')).toBe(text);
  });

  it('returns no chunks for an empty page', () => {
    expect(chunkPageText('')).toEqual([]);
  });
});

describe('buildPageBlocks', () => {
  it('cuts blocks on item boundaries and keeps the text intact', () => {
    const strings = Array.from(
      { length: 30 },
      (_, index) => `Sentence number ${index} of the page. `,
    );
    const { ranges, texts } = buildPageBlocks(strings);

    expect(texts.join('')).toBe(strings.join(''));
    expect(ranges[0][0]).toBe(0);
    expect(ranges[ranges.length - 1][1]).toBe(strings.length);
    ranges.forEach(([from, to], index) => {
      expect(to).toBeGreaterThan(from);
      expect(texts[index]).toBe(strings.slice(from, to).join(''));
      if (index > 0) {
        expect(from).toBe(ranges[index - 1][1]);
      }
    });
    // The short first block lets reading start quickly
    expect(texts[0].length).toBeLessThan(texts[1].length);
  });

  it('moves a cut that falls inside an item to the next item', () => {
    // The first chunk ends after the first sentence, inside the first item
    const strings = [
      `${'a'.repeat(150)}. The second sentence goes past the limit. `,
      'Next item. ',
    ];
    const { ranges } = buildPageBlocks(strings);

    expect(ranges).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });

  it('creates no blocks for a page without items', () => {
    expect(buildPageBlocks([])).toEqual({ ranges: [], texts: [] });
  });
});
