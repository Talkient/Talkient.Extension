/**
 * @jest-environment jsdom
 */

import {
  shouldProcessNode,
  setProcessableElements,
  loadMinimumWordsFromStorage,
} from '../content/text-processor';

// Mock chrome runtime
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
    lastError: null,
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        callback({ minimumWords: 3 });
      }),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

describe('processable elements - shouldProcessNode', () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Reset to default processable elements
    setProcessableElements(['article', 'p', 'h1', 'h2', 'h3', 'li']);

    // Ensure minimum words is 3
    mockChrome.storage.local.get.mockImplementation(
      (keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({ minimumWords: 3 });
      },
    );
    await loadMinimumWordsFromStorage();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('text inside a configured element', () => {
    it('should return true for text inside <p>', () => {
      const p = document.createElement('p');
      const textNode = document.createTextNode('This has enough words here');
      p.appendChild(textNode);
      container.appendChild(p);

      expect(shouldProcessNode(textNode)).toBe(true);
    });

    it('should return true for text inside <article>', () => {
      const article = document.createElement('article');
      const textNode = document.createTextNode('This has enough words here');
      article.appendChild(textNode);
      container.appendChild(article);

      expect(shouldProcessNode(textNode)).toBe(true);
    });

    it('should return true for text inside <h1>', () => {
      const h1 = document.createElement('h1');
      const textNode = document.createTextNode('This is heading text');
      h1.appendChild(textNode);
      container.appendChild(h1);

      expect(shouldProcessNode(textNode)).toBe(true);
    });

    it('should return true for text inside <h2>', () => {
      const h2 = document.createElement('h2');
      const textNode = document.createTextNode('This is a subheading text');
      h2.appendChild(textNode);
      container.appendChild(h2);

      expect(shouldProcessNode(textNode)).toBe(true);
    });

    it('should return true for text inside <h3>', () => {
      const h3 = document.createElement('h3');
      const textNode = document.createTextNode('This is a sub subheading');
      h3.appendChild(textNode);
      container.appendChild(h3);

      expect(shouldProcessNode(textNode)).toBe(true);
    });

    it('should return true for text inside <li>', () => {
      const ul = document.createElement('ul');
      const li = document.createElement('li');
      const textNode = document.createTextNode('This is a list item text');
      li.appendChild(textNode);
      ul.appendChild(li);
      container.appendChild(ul);

      expect(shouldProcessNode(textNode)).toBe(true);
    });
  });

  describe('text outside any configured element', () => {
    it('should return false for text directly in <div> (not in list)', () => {
      const div = document.createElement('div');
      const textNode = document.createTextNode('This has enough words here');
      div.appendChild(textNode);
      container.appendChild(div);

      expect(shouldProcessNode(textNode)).toBe(false);
    });

    it('should return false for text in <section> (not in list)', () => {
      const section = document.createElement('section');
      const textNode = document.createTextNode('This has enough words here');
      section.appendChild(textNode);
      container.appendChild(section);

      expect(shouldProcessNode(textNode)).toBe(false);
    });

    it('should return false for text directly in <main> (not in list)', () => {
      const main = document.createElement('main');
      const textNode = document.createTextNode('This has enough words here');
      main.appendChild(textNode);
      container.appendChild(main);

      expect(shouldProcessNode(textNode)).toBe(false);
    });
  });

  describe('nested elements', () => {
    it('should return true for text nested inside a <p> that is inside a <div>', () => {
      const div = document.createElement('div');
      const p = document.createElement('p');
      const textNode = document.createTextNode('This has enough words here');
      p.appendChild(textNode);
      div.appendChild(p);
      container.appendChild(div);

      expect(shouldProcessNode(textNode)).toBe(true);
    });

    it('should return true for text inside <p> nested inside <article>', () => {
      const article = document.createElement('article');
      const p = document.createElement('p');
      const textNode = document.createTextNode('Nested text with enough words');
      p.appendChild(textNode);
      article.appendChild(p);
      container.appendChild(article);

      expect(shouldProcessNode(textNode)).toBe(true);
    });
  });

  describe('empty processable elements list', () => {
    it('should return false for all elements when list is empty', () => {
      setProcessableElements([]);

      const article = document.createElement('article');
      const textNode = document.createTextNode('This has enough words here');
      article.appendChild(textNode);
      container.appendChild(article);

      expect(shouldProcessNode(textNode)).toBe(false);
    });

    it('should return false for <p> when list is empty', () => {
      setProcessableElements([]);

      const p = document.createElement('p');
      const textNode = document.createTextNode('This has enough words here');
      p.appendChild(textNode);
      container.appendChild(p);

      expect(shouldProcessNode(textNode)).toBe(false);
    });
  });
});

describe('processable elements - setProcessableElements', () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    mockChrome.storage.local.get.mockImplementation(
      (keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({ minimumWords: 3 });
      },
    );
    await loadMinimumWordsFromStorage();
  });

  afterEach(() => {
    document.body.removeChild(container);
    // Reset to default after each test
    setProcessableElements(['article', 'p', 'h1', 'h2', 'h3', 'li']);
  });

  it('should update which elements are processed after calling setProcessableElements', () => {
    const div = document.createElement('div');
    const textNode = document.createTextNode('This has enough words here');
    div.appendChild(textNode);
    container.appendChild(div);

    // Initially div is not processable
    expect(shouldProcessNode(textNode)).toBe(false);

    // Add 'div' to processable elements
    setProcessableElements(['div', 'p']);
    expect(shouldProcessNode(textNode)).toBe(true);

    // Remove 'div' again
    setProcessableElements(['p', 'article']);
    expect(shouldProcessNode(textNode)).toBe(false);
  });

  it('should immediately affect subsequent shouldProcessNode calls', () => {
    const article = document.createElement('article');
    const textNode = document.createTextNode('This has enough words here');
    article.appendChild(textNode);
    container.appendChild(article);

    setProcessableElements(['article']);
    expect(shouldProcessNode(textNode)).toBe(true);

    setProcessableElements([]);
    expect(shouldProcessNode(textNode)).toBe(false);

    setProcessableElements(['article']);
    expect(shouldProcessNode(textNode)).toBe(true);
  });
});
