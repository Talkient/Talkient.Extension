/// <reference lib="dom" />
/// <reference types="chrome" />

import {
  getTotalProcessedChars,
  getRemainingChars,
  setRemainingChars,
  subtractRemainingChars,
  getCurrentPlayingChars,
  resetEstimateCounters,
  processTextElements,
  setOnPlayStartCallback,
} from '../content/index';

jest.mock('../../../shared/api/messaging', () => ({
  safeSendMessage: jest.fn((message, callback) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockChrome = (global as any).chrome;
    if (mockChrome?.runtime?.sendMessage) {
      mockChrome.runtime.sendMessage(message, callback);
    }
    return true;
  }),
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
      get: jest.fn(
        (_keys: unknown, callback: (r: Record<string, unknown>) => void) =>
          callback({}),
      ),
      set: jest.fn(),
    },
    onChanged: { addListener: jest.fn() },
  },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).requestAnimationFrame = jest.fn((callback: () => void) => {
  setTimeout(callback, 0);
  return 1;
});

describe('Reading Time Counters', () => {
  beforeEach(() => {
    resetEstimateCounters();
    jest.clearAllMocks();
    mockChrome.storage.local.get.mockImplementation(
      (_keys: unknown, callback: (r: Record<string, unknown>) => void) =>
        callback({}),
    );
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('getTotalProcessedChars returns 0', () => {
      expect(getTotalProcessedChars()).toBe(0);
    });

    it('getRemainingChars returns -1 (playback not started)', () => {
      expect(getRemainingChars()).toBe(-1);
    });

    it('getCurrentPlayingChars returns 0', () => {
      expect(getCurrentPlayingChars()).toBe(0);
    });
  });

  // ── resetEstimateCounters ──────────────────────────────────────────────────

  describe('resetEstimateCounters', () => {
    it('resets remaining chars to -1 after being set', () => {
      setRemainingChars(500);
      resetEstimateCounters();
      expect(getRemainingChars()).toBe(-1);
    });

    it('resets totalProcessedChars to 0', () => {
      resetEstimateCounters();
      expect(getTotalProcessedChars()).toBe(0);
    });

    it('resets currentPlayingChars to 0', () => {
      resetEstimateCounters();
      expect(getCurrentPlayingChars()).toBe(0);
    });
  });

  // ── setRemainingChars / getRemainingChars ──────────────────────────────────

  describe('setRemainingChars', () => {
    it('sets remaining chars to a positive value', () => {
      setRemainingChars(300);
      expect(getRemainingChars()).toBe(300);
    });

    it('can be set to 0', () => {
      setRemainingChars(0);
      expect(getRemainingChars()).toBe(0);
    });

    it('overrides the -1 sentinel', () => {
      expect(getRemainingChars()).toBe(-1);
      setRemainingChars(100);
      expect(getRemainingChars()).toBe(100);
    });
  });

  // ── subtractRemainingChars ─────────────────────────────────────────────────

  describe('subtractRemainingChars', () => {
    it('reduces remaining chars by the given amount', () => {
      setRemainingChars(400);
      subtractRemainingChars(150);
      expect(getRemainingChars()).toBe(250);
    });

    it('clamps at 0, never goes negative', () => {
      setRemainingChars(50);
      subtractRemainingChars(200);
      expect(getRemainingChars()).toBe(0);
    });

    it('is a no-op when remainingChars is -1 (playback not started)', () => {
      subtractRemainingChars(100);
      expect(getRemainingChars()).toBe(-1);
    });

    it('can subtract 0 without changing the value', () => {
      setRemainingChars(100);
      subtractRemainingChars(0);
      expect(getRemainingChars()).toBe(100);
    });
  });

  // ── processTextElements — onComplete callback ─────────────────────────────

  describe('processTextElements — onComplete callback', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('calls onComplete after processing all nodes', async () => {
      const article = document.createElement('article');
      const p = document.createElement('p');
      const text = 'This is a long enough sentence with words';
      p.textContent = text;
      article.appendChild(p);
      container.appendChild(article);

      const textNode = p.firstChild as Text;
      document.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn().mockReturnValueOnce(textNode).mockReturnValue(null),
        currentNode: textNode,
      });

      const onComplete = jest.fn();
      processTextElements(onComplete);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('calls onComplete even when no nodes are found', async () => {
      document.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn().mockReturnValue(null),
        currentNode: null,
      });

      const onComplete = jest.fn();
      processTextElements(onComplete);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('accumulates totalProcessedChars for each processed node', async () => {
      const article = document.createElement('article');
      const p = document.createElement('p');
      const text = 'This is a test sentence with enough words';
      p.textContent = text;
      article.appendChild(p);
      container.appendChild(article);

      const textNode = p.firstChild as Text;
      document.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn().mockReturnValueOnce(textNode).mockReturnValue(null),
        currentNode: textNode,
      });

      processTextElements();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(getTotalProcessedChars()).toBe(text.trim().length);
    });

    it('accumulates totalProcessedChars across multiple nodes', async () => {
      const article = document.createElement('article');
      const p1 = document.createElement('p');
      const p2 = document.createElement('p');
      const text1 = 'First paragraph with enough words here';
      const text2 = 'Second paragraph with enough words too';
      p1.textContent = text1;
      p2.textContent = text2;
      article.appendChild(p1);
      article.appendChild(p2);
      container.appendChild(article);

      const textNode1 = p1.firstChild as Text;
      const textNode2 = p2.firstChild as Text;

      let callCount = 0;
      const mockWalker = {
        nextNode: jest.fn(() => {
          callCount++;
          if (callCount === 1) {
            mockWalker.currentNode = textNode1;
            return textNode1;
          }
          if (callCount === 2) {
            mockWalker.currentNode = textNode2;
            return textNode2;
          }
          return null;
        }),
        currentNode: null as Node | null,
      };
      document.createTreeWalker = jest.fn().mockReturnValue(mockWalker);

      processTextElements();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(getTotalProcessedChars()).toBe(
        text1.trim().length + text2.trim().length,
      );
    });

    it('onComplete fires after totalProcessedChars is accumulated', async () => {
      const article = document.createElement('article');
      const p = document.createElement('p');
      p.textContent = 'Some valid text content here with enough words';
      article.appendChild(p);
      container.appendChild(article);

      const textNode = p.firstChild as Text;
      document.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn().mockReturnValueOnce(textNode).mockReturnValue(null),
        currentNode: textNode,
      });

      const onComplete = jest.fn(() => {
        expect(getTotalProcessedChars()).toBeGreaterThan(0);
      });

      processTextElements(onComplete);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onComplete).toHaveBeenCalled();
    });
  });

  // ── setOnPlayStartCallback + play button interaction ───────────────────────

  describe('setOnPlayStartCallback', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      // Simulate SW responding with success
      mockChrome.runtime.sendMessage.mockImplementation(
        (_msg: unknown, callback: (() => void) | undefined) => {
          if (callback) callback();
        },
      );
    });

    afterEach(() => {
      document.body.removeChild(container);
      setOnPlayStartCallback(() => {});
    });

    async function setupSingleProcessedNode(textContent: string) {
      const article = document.createElement('article');
      const p = document.createElement('p');
      p.textContent = textContent;
      article.appendChild(p);
      container.appendChild(article);

      const textNode = p.firstChild as Text;
      document.createTreeWalker = jest.fn().mockReturnValue({
        nextNode: jest.fn().mockReturnValueOnce(textNode).mockReturnValue(null),
        currentNode: textNode,
      });

      processTextElements();
      await new Promise((resolve) => setTimeout(resolve, 50));

      return container.querySelector(
        '.talkient-play-button',
      ) as HTMLButtonElement;
    }

    it('calls the registered callback inside the safeSendMessage response', async () => {
      const onPlayStart = jest.fn();
      setOnPlayStartCallback(onPlayStart);

      const playButton = await setupSingleProcessedNode(
        'Hello world this is a test sentence here',
      );
      expect(playButton).toBeTruthy();

      playButton.click();

      expect(onPlayStart).toHaveBeenCalledTimes(1);
    });

    it('sets remainingChars to a non-negative value when play is clicked', async () => {
      const playButton = await setupSingleProcessedNode(
        'Some text content with enough words for processing',
      );
      expect(playButton).toBeTruthy();
      expect(getRemainingChars()).toBe(-1);

      playButton.click();

      expect(getRemainingChars()).toBeGreaterThanOrEqual(0);
    });

    it('sets remainingChars to chars from the clicked node to the end', async () => {
      // Two paragraphs: clicking the first should include chars for both
      const article = document.createElement('article');
      const p1 = document.createElement('p');
      const p2 = document.createElement('p');
      const text1 = 'First paragraph with enough words here ok';
      const text2 = 'Second paragraph with enough words too yes';
      p1.textContent = text1;
      p2.textContent = text2;
      article.appendChild(p1);
      article.appendChild(p2);
      container.appendChild(article);

      const textNode1 = p1.firstChild as Text;
      const textNode2 = p2.firstChild as Text;

      let callCount = 0;
      const mockWalker = {
        nextNode: jest.fn(() => {
          callCount++;
          if (callCount === 1) {
            mockWalker.currentNode = textNode1;
            return textNode1;
          }
          if (callCount === 2) {
            mockWalker.currentNode = textNode2;
            return textNode2;
          }
          return null;
        }),
        currentNode: null as Node | null,
      };
      document.createTreeWalker = jest.fn().mockReturnValue(mockWalker);

      processTextElements();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const playButtons = container.querySelectorAll<HTMLButtonElement>(
        '.talkient-play-button',
      );
      expect(playButtons.length).toBe(2);

      // Click first play button: remaining should include chars for both nodes
      playButtons[0].click();
      const remainingAfterFirst = getRemainingChars();

      resetEstimateCounters();

      // Click second play button: remaining should include chars for second node only
      playButtons[1].click();
      const remainingAfterSecond = getRemainingChars();

      expect(remainingAfterFirst).toBeGreaterThan(remainingAfterSecond);
    });
  });
});
