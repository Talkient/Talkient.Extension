import { createTextRange, mergeLineRects } from '../viewer/pdf-highlighter';

describe('mergeLineRects', () => {
  it('merges the text runs of a line into one rect', () => {
    const merged = mergeLineRects([
      { left: 60, top: 10, width: 40, height: 12 },
      { left: 10, top: 10, width: 45, height: 12 },
      { left: 104, top: 11, width: 20, height: 12 },
    ]);

    expect(merged).toEqual([{ left: 10, top: 10, width: 114, height: 13 }]);
  });

  it('keeps one rect per line', () => {
    const merged = mergeLineRects([
      { left: 10, top: 10, width: 100, height: 12 },
      { left: 10, top: 30, width: 80, height: 12 },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[1]).toEqual({ left: 10, top: 30, width: 80, height: 12 });
  });

  it('does not bridge large gaps, like between columns', () => {
    const merged = mergeLineRects([
      { left: 10, top: 10, width: 100, height: 12 },
      { left: 300, top: 10, width: 100, height: 12 },
    ]);

    expect(merged).toHaveLength(2);
  });

  it('ignores empty rects', () => {
    expect(
      mergeLineRects([{ left: 10, top: 10, width: 0, height: 12 }]),
    ).toEqual([]);
  });
});

describe('createTextRange', () => {
  it('spans text nodes nested at any depth', () => {
    const block = document.createElement('span');
    block.innerHTML =
      '<span>Hello </span><span>brave </span><span>world</span>';

    expect(createTextRange(block, 3, 9)?.toString()).toBe('lo bra');
    expect(createTextRange(block, 12, 17)?.toString()).toBe('world');
  });

  it('works on a block holding a single text node', () => {
    const block = document.createElement('span');
    block.textContent = 'Hello brave world';

    expect(createTextRange(block, 6, 11)?.toString()).toBe('brave');
  });

  it('returns null past the end of the text', () => {
    const block = document.createElement('span');
    block.textContent = 'Hello';

    expect(createTextRange(block, 10, 12)).toBeNull();
  });
});
