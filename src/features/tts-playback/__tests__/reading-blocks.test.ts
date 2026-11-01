/**
 * @jest-environment jsdom
 *
 * Tests for block-based reading: a paragraph (or heading, list item...) is
 * read as one utterance with a single play button, instead of one utterance
 * per text node.
 */

import {
  processTextElements,
  setProcessableElements,
  setIgnoredDomains,
  setMinimumWords,
  setMaxNodesProcessed,
  setButtonPosition,
  resetEstimateCounters,
  getBlockElement,
  getBlockText,
  toSpeechText,
  hasReadableContent,
  findFirstVisibleBlock,
  unmarkProcessedBlocks,
} from '../content/text-processor';
import { DEFAULT_PROCESSABLE_ELEMENTS } from '../../settings/storage-schema';

jest.mock('../../assets/content/icons', () => ({
  getSvgIcon: jest.fn((name: string) => `<svg data-icon="${name}"></svg>`),
  isSvgPlayIcon: jest.fn(() => true),
  isSvgPauseIcon: jest.fn(() => false),
}));

const mockSafeSendMessage = jest.fn();
jest.mock('../../../shared/api/messaging', () => ({
  safeSendMessage: (...args: unknown[]) => mockSafeSendMessage(...args),
  isExtensionContextValid: jest.fn(() => true),
}));

const mockChrome = {
  runtime: {
    onMessage: { addListener: jest.fn() },
    sendMessage: jest.fn(),
    lastError: null,
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => callback({})),
      set: jest.fn(),
    },
    onChanged: { addListener: jest.fn() },
  },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

// Run processing batches synchronously
global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  callback(0);
  return 1;
});

function processedIds(): string[] {
  return Array.from(document.querySelectorAll('.talkient-processed')).map(
    (el) => el.id,
  );
}

beforeEach(() => {
  document.body.innerHTML = '';
  setProcessableElements([...DEFAULT_PROCESSABLE_ELEMENTS]);
  setIgnoredDomains([]);
  setMinimumWords(3);
  setMaxNodesProcessed(1000);
  setButtonPosition('left');
  resetEstimateCounters();
  mockSafeSendMessage.mockReset();
});

describe('block discovery', () => {
  it('adds one play button per paragraph, even with inline links and emphasis', () => {
    document.body.innerHTML = `
      <article>
        <p id="p1">Read <a href="#">the docs</a> and <em>try it</em> yourself today.</p>
        <p id="p2">Second paragraph with <strong>several</strong> words.</p>
      </article>`;

    processTextElements();

    expect(processedIds()).toEqual(['p1', 'p2']);
    expect(document.querySelectorAll('.talkient-play-button')).toHaveLength(2);
    expect(
      document
        .querySelector('#p1')!
        .firstElementChild!.classList.contains('talkient-play-button'),
    ).toBe(true);
  });

  it('places the button at the end of the block when position is right', () => {
    setButtonPosition('right');
    document.body.innerHTML = '<p id="p1">A paragraph with enough words.</p>';

    processTextElements();

    const block = document.querySelector('#p1')!;
    expect(
      block.lastElementChild!.classList.contains('talkient-play-button'),
    ).toBe(true);
  });

  it('does not wrap or move the page text nodes', () => {
    document.body.innerHTML =
      '<p id="p1">Some <a href="#">linked</a> text in a paragraph.</p>';
    const paragraph = document.querySelector('#p1')!;
    const link = paragraph.querySelector('a')!;
    const firstText = paragraph.firstChild;

    processTextElements();

    expect(link.parentElement).toBe(paragraph);
    expect(firstText!.parentNode).toBe(paragraph);
    expect(document.querySelectorAll('span.talkient-processed')).toHaveLength(
      0,
    );
  });

  it('skips navigation, aside, footer and the site header', () => {
    const text = 'This text has enough words to be read aloud.';
    document.body.innerHTML = `
      <header><p id="site-header">${text}</p></header>
      <nav><p id="nav">${text}</p></nav>
      <article>
        <header><h1 id="article-title">An article title with words</h1></header>
        <p id="content">${text}</p>
      </article>
      <aside><p id="aside">${text}</p></aside>
      <footer><p id="footer">${text}</p></footer>`;

    processTextElements();

    expect(processedIds()).toEqual(['article-title', 'content']);
  });

  it('never adds buttons to editable content', () => {
    document.body.innerHTML = `
      <div contenteditable="true"><p id="editable">User is typing many words here.</p></div>
      <p id="normal">A normal paragraph with words.</p>`;

    processTextElements();

    expect(processedIds()).toEqual(['normal']);
  });

  it('reads nested blocks separately from their parent', () => {
    document.body.innerHTML = `
      <article id="article">Loose intro text in the article.
        <p id="p1">A paragraph inside the article.</p>
      </article>`;

    processTextElements();

    expect(processedIds()).toEqual(['article', 'p1']);
    expect(
      getBlockText(document.querySelector('#article')!).text,
    ).not.toContain('paragraph inside');
  });

  it('falls back to an inline processable element without a block parent', () => {
    document.body.innerHTML =
      '<div><em id="em">Emphasized text with words</em></div>';

    processTextElements();

    expect(processedIds()).toEqual(['em']);
  });

  it('uses the nearest block-level processable ancestor', () => {
    document.body.innerHTML =
      '<p id="p1">Text <em id="em">emphasized here</em> end.</p>';
    const emText = document.querySelector('#em')!.firstChild!;

    expect(getBlockElement(emText)?.id).toBe('p1');
  });

  it('is idempotent when run again', () => {
    document.body.innerHTML = '<p id="p1">A paragraph with enough words.</p>';

    processTextElements();
    processTextElements();

    expect(document.querySelectorAll('.talkient-play-button')).toHaveLength(1);
  });

  it('only processes the given root', () => {
    document.body.innerHTML = `
      <p id="outside">Paragraph outside the root element.</p>
      <section id="root"><p id="inside">Paragraph inside the root element.</p></section>`;

    processTextElements(undefined, document.querySelector('#root')!);

    expect(processedIds()).toEqual(['inside']);
  });
});

describe('getBlockText', () => {
  it('concatenates text nodes and maps each one to its offset', () => {
    document.body.innerHTML = '<p id="p1">Hello <a href="#">big</a> world</p>';

    const { text, segments } = getBlockText(document.querySelector('#p1')!);

    expect(text).toBe('Hello big world');
    expect(segments.map((s) => [s.node.data, s.start])).toEqual([
      ['Hello ', 0],
      ['big', 6],
      [' world', 9],
    ]);
  });

  it('inserts a space for <br> so words are not glued together', () => {
    document.body.innerHTML = '<p id="p1">First line<br>Second line</p>';

    const { text, segments } = getBlockText(document.querySelector('#p1')!);

    expect(text).toBe('First line Second line');
    expect(segments[1].start).toBe(11);
  });

  it('excludes the play button, code and hidden descendants', () => {
    document.body.innerHTML = `<p id="p1">Visible <code>let x = 1;</code> text<span style="display: none"> hidden</span> end</p>`;
    processTextElements();

    const { text } = getBlockText(document.querySelector('#p1')!);

    expect(text).toBe('Visible  text end');
  });
});

describe('toSpeechText', () => {
  it('keeps the text length so word offsets still match the page', () => {
    const text =
      'Visit https://www.example.com/some/long/path?q=1 for details.';

    const speech = toSpeechText(text);

    expect(speech).toHaveLength(text.length);
    expect(speech.replace(/\s+/g, ' ')).toBe('Visit example.com for details.');
  });

  it('keeps sentence punctuation after a URL', () => {
    const speech = toSpeechText('See www.example.org/docs.');

    // The dropped path becomes padding before the period
    expect(speech).toBe('See     example.org     .');
  });

  it('handles long punctuation runs in page text quickly', () => {
    const hostile = `www.a${'.'.repeat(50000)}b`;

    const start = Date.now();
    const speech = toSpeechText(hostile);

    expect(speech).toHaveLength(hostile.length);
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('replaces newlines and tabs with spaces', () => {
    expect(toSpeechText('One\ntwo\tthree')).toBe('One two three');
  });

  it('leaves text without URLs unchanged', () => {
    expect(toSpeechText('Plain text, nothing else.')).toBe(
      'Plain text, nothing else.',
    );
  });
});

describe('playing a block', () => {
  it('sends the whole paragraph as one utterance', () => {
    document.body.innerHTML =
      '<p id="p1">Read <a href="https://example.com/a/b">https://example.com/a/b</a> now.</p>';
    processTextElements();

    (
      document.querySelector('.talkient-play-button') as HTMLButtonElement
    ).click();

    const message = mockSafeSendMessage.mock.calls[0][0];
    expect(message.type).toBe('SPEAK_TEXT');
    expect(message.text.replace(/\s+/g, ' ')).toBe('Read example.com now.');
  });
});

describe('hasReadableContent', () => {
  it('is true when the page has an <article>', () => {
    document.body.innerHTML = '<article><p>Short.</p></article>';

    expect(hasReadableContent()).toBe(true);
  });

  it('is true for enough paragraph text without an <article>', () => {
    const paragraph =
      '<p>This paragraph has plenty of readable words for a listener.</p>';
    document.body.innerHTML = `<main>${paragraph.repeat(10)}</main>`;

    expect(hasReadableContent()).toBe(true);
  });

  it('is false for a page with little text', () => {
    document.body.innerHTML = '<main><p>Only a few words here.</p></main>';

    expect(hasReadableContent()).toBe(false);
  });

  it('is false on an ignored domain', () => {
    document.body.innerHTML = '<article><p>Some article text.</p></article>';
    setIgnoredDomains([window.location.hostname || 'localhost']);

    expect(hasReadableContent()).toBe(false);
  });
});

describe('findFirstVisibleBlock', () => {
  function block(id: string, top: number): HTMLElement {
    const el = document.createElement('p');
    el.id = id;
    el.className = 'talkient-processed';
    el.getBoundingClientRect = jest.fn(
      () => ({ width: 100, height: 40, top, bottom: top + 40 }) as DOMRect,
    );
    document.body.appendChild(el);
    return el;
  }

  it('returns the first block in the viewport', () => {
    block('above', -500);
    block('visible', window.innerHeight * 0.4);

    expect(findFirstVisibleBlock()?.id).toBe('visible');
  });

  it('falls back to the first block when none is visible', () => {
    block('first', -500);
    block('second', -300);

    expect(findFirstVisibleBlock()?.id).toBe('first');
  });

  it('returns null when nothing was processed', () => {
    expect(findFirstVisibleBlock()).toBeNull();
  });
});

describe('unmarkProcessedBlocks', () => {
  it('removes buttons and markers but keeps the page elements', () => {
    document.body.innerHTML =
      '<p id="p1" class="lead">A paragraph with enough words.</p>';
    const paragraph = document.querySelector('#p1')!;
    processTextElements();

    unmarkProcessedBlocks();

    expect(document.querySelector('#p1')).toBe(paragraph);
    expect(paragraph.className).toBe('lead');
    expect(paragraph.innerHTML).toBe('A paragraph with enough words.');
  });
});
