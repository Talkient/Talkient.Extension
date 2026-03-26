/**
 * @jest-environment jsdom
 *
 * Tests for the duplicate play button fix:
 * - Re-processing after removeTalkientUiElements() does not duplicate buttons
 * - removeTalkientUiElements() fully unwraps .talkient-processed spans
 */

import {
  processTextElements,
  setProcessableElements,
  setIgnoredDomains,
  setMinimumWords,
  setMaxNodesProcessed,
  setButtonPosition,
  resetEstimateCounters,
} from '../content/text-processor';

// Mock icons
jest.mock('../../assets/content/icons', () => ({
  getSvgIcon: jest.fn((name: string) => `<svg data-icon="${name}"></svg>`),
  isSvgPlayIcon: jest.fn(() => false),
  isSvgPauseIcon: jest.fn(() => false),
}));

// Mock messaging
jest.mock('../../../shared/api/messaging', () => ({
  safeSendMessage: jest.fn(),
  isExtensionContextValid: jest.fn(() => true),
}));

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onMessage: { addListener: jest.fn() },
    sendMessage: jest.fn(),
    lastError: null,
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        callback({});
      }),
      set: jest.fn(),
    },
    onChanged: { addListener: jest.fn() },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

// Mock requestAnimationFrame to run synchronously
global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  callback(0);
  return 1;
});

/**
 * Simulates removeTalkientUiElements() from content.ts:
 * remove panel → remove buttons → unwrap spans
 */
function removeTalkientUiElements(): void {
  const controlPanel = document.getElementById('talkient-control-panel');
  if (controlPanel) {
    controlPanel.remove();
  }

  document.querySelectorAll('.talkient-play-button').forEach((button) => {
    button.remove();
  });

  document.querySelectorAll('.talkient-processed').forEach((el) => {
    const parent = el.parentNode;
    if (parent) {
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    }
  });
}

describe('duplicate play buttons fix', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setProcessableElements(['p', 'article', 'h1', 'h2', 'h3', 'li']);
    setIgnoredDomains([]);
    setMinimumWords(3);
    setMaxNodesProcessed(1000);
    setButtonPosition('left');
    resetEstimateCounters();
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('task 3.2: re-processing does not duplicate buttons', () => {
    it('should produce exactly one play button per qualifying text node after two processTextElements() calls', () => {
      const article = document.createElement('article');
      const p1 = document.createElement('p');
      p1.textContent = 'First paragraph with enough words to be processed.';
      const p2 = document.createElement('p');
      p2.textContent = 'Second paragraph with enough words to be processed.';
      article.appendChild(p1);
      article.appendChild(p2);
      document.body.appendChild(article);

      // First processing run
      processTextElements();

      const buttonsAfterFirst = document.querySelectorAll(
        '.talkient-play-button',
      );
      expect(buttonsAfterFirst.length).toBe(2);

      // Simulate settings change: remove UI, then re-process
      removeTalkientUiElements();
      resetEstimateCounters();
      processTextElements();

      // Each paragraph should still have exactly one play button
      const buttonsAfterSecond = document.querySelectorAll(
        '.talkient-play-button',
      );
      expect(buttonsAfterSecond.length).toBe(2);
    });

    it('should have exactly one .talkient-play-button per .talkient-processed wrapper after re-processing', () => {
      const article = document.createElement('article');
      const p = document.createElement('p');
      p.textContent =
        'A paragraph with enough words to be processed by Talkient.';
      article.appendChild(p);
      document.body.appendChild(article);

      // First run
      processTextElements();
      removeTalkientUiElements();
      resetEstimateCounters();

      // Second run
      processTextElements();

      const wrappers = document.querySelectorAll('.talkient-processed');
      wrappers.forEach((wrapper) => {
        const buttons = wrapper.querySelectorAll('.talkient-play-button');
        expect(buttons.length).toBe(1);
      });
    });
  });

  describe('task 3.3: removeTalkientUiElements fully unwraps .talkient-processed spans', () => {
    it('should leave no .talkient-processed elements after calling removeTalkientUiElements()', () => {
      const article = document.createElement('article');
      const p = document.createElement('p');
      p.textContent =
        'A paragraph with enough words to be processed by Talkient.';
      article.appendChild(p);
      document.body.appendChild(article);

      processTextElements();

      expect(
        document.querySelectorAll('.talkient-processed').length,
      ).toBeGreaterThan(0);

      removeTalkientUiElements();

      expect(document.querySelectorAll('.talkient-processed').length).toBe(0);
    });

    it('should preserve original text content after removeTalkientUiElements()', () => {
      const originalText =
        'A paragraph with enough words to be processed by Talkient.';
      const article = document.createElement('article');
      const p = document.createElement('p');
      p.textContent = originalText;
      article.appendChild(p);
      document.body.appendChild(article);

      processTextElements();
      removeTalkientUiElements();

      expect(document.body.textContent).toContain(originalText);
    });
  });
});
