/**
 * @jest-environment jsdom
 *
 * Tests for content that appears after the page loaded (SPAs, lazy loading,
 * infinite scroll) and for gapless auto-play between blocks.
 */

const mockCreateControlPanel = jest.fn();
const mockProcessTextElements = jest.fn();
const mockSafeClickButton = jest.fn();
const mockFindNextTextElement = jest.fn();
const mockGetCurrentHighlightedElement = jest.fn();

jest.mock('../../features/control-panel/content/panel-ui', () => ({
  createControlPanel: () => mockCreateControlPanel(),
}));

jest.mock('../../features/tts-playback/content/index', () => ({
  processTextElements: (...args: unknown[]) => mockProcessTextElements(...args),
  findNextTextElement: (...args: unknown[]) => mockFindNextTextElement(...args),
  safeClickButton: (...args: unknown[]) => mockSafeClickButton(...args),
  loadMinimumWordsFromStorage: jest.fn(() => Promise.resolve(3)),
  setMinimumWords: jest.fn(),
  loadSpeechRateFromStorage: jest.fn(() => Promise.resolve(1)),
  setSpeechRate: jest.fn(),
  getSpeechRate: jest.fn(() => 1),
  loadMaxNodesFromStorage: jest.fn(() => Promise.resolve(1000)),
  setMaxNodesProcessed: jest.fn(),
  loadButtonPositionFromStorage: jest.fn(() => Promise.resolve('left')),
  setButtonPosition: jest.fn(),
  setIgnoredDomains: jest.fn(),
  getIgnoredDomains: jest.fn(() => []),
  setProcessableElements: jest.fn(),
  getTotalProcessedChars: jest.fn(() => 0),
  getRemainingChars: jest.fn(() => -1),
  subtractRemainingChars: jest.fn(),
  getCurrentPlayingChars: jest.fn(() => 0),
  resetEstimateCounters: jest.fn(),
  setOnPlayStartCallback: jest.fn(),
  unmarkProcessedBlocks: jest.fn(),
  hasReadableContent: () =>
    jest
      .requireActual('../../features/tts-playback/content/text-processor')
      .hasReadableContent(),
}));

jest.mock('../highlight', () => ({
  clearHighlight: jest.fn(),
  loadHighlightStyleFromStorage: jest.fn(),
  setHighlightingStyle: jest.fn(),
  getCurrentHighlightedElement: () => mockGetCurrentHighlightedElement(),
  scrollToHighlightedElement: jest.fn(),
  highlightWordAtIndex: jest.fn(),
}));

jest.mock('../../features/control-panel/content/panel-visibility', () => ({
  initPanelHideDuration: jest.fn(),
}));

jest.mock('../../features/control-panel/content/panel-controller', () => ({
  updatePanelPlayIcon: jest.fn(),
}));

jest.mock('../../features/assets/content/icons', () => ({
  getSvgIcon: jest.fn(() => '<svg></svg>'),
  isSvgPlayIcon: jest.fn(() => true),
}));

jest.mock('../../shared/api/messaging', () => ({
  safeSendMessage: jest.fn(),
}));

jest.mock('../translation-result', () => ({
  showTranslationError: jest.fn(),
  showTranslationLoading: jest.fn(),
  showTranslationSuccess: jest.fn(),
}));

// Every require of the content script starts its own observer on the shared
// document.body; disconnect them between tests so instances don't leak.
const observers: MutationObserver[] = [];
const RealMutationObserver = MutationObserver;
global.MutationObserver = class extends RealMutationObserver {
  constructor(callback: MutationCallback) {
    super(callback);
    observers.push(this);
  }
};
afterEach(() => {
  observers.splice(0).forEach((observer) => observer.disconnect());
});

const READABLE_PARAGRAPH =
  '<p>This paragraph has plenty of readable words so that the page is worth listening to.</p>';

type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => void;

let messageListener: MessageListener | null = null;

function setupChrome(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).chrome = {
    runtime: {
      onMessage: {
        addListener: jest.fn((listener: MessageListener) => {
          messageListener = listener;
        }),
      },
    },
    storage: {
      local: {
        get: jest.fn((keys: string[], callback: (result: unknown) => void) => {
          if (keys.includes('processableElements')) {
            callback({
              processableElements: ['article', 'p', 'h1', 'h2', 'h3', 'li'],
              ignoredDomains: [],
            });
            return;
          }
          if (keys.includes('playButtonsEnabled')) {
            callback({ playButtonsEnabled: true });
            return;
          }
          callback({});
        }),
        set: jest.fn(),
      },
      onChanged: {
        addListener: jest.fn(),
      },
    },
  };
}

async function loadContentScript(): Promise<void> {
  require('../content');
  // Let the storage-driven bootstrap promise chain settle
  await Promise.resolve();
  await Promise.resolve();
}

// MutationObserver callbacks run as microtasks
async function flushMutations(): Promise<void> {
  await Promise.resolve();
}

describe('content watcher', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    mockCreateControlPanel.mockClear();
    mockProcessTextElements.mockClear();
    messageListener = null;
    setupChrome();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  it('injects the UI once readable content appears after load', async () => {
    document.body.innerHTML = '<main id="app"></main>';

    await loadContentScript();
    expect(mockCreateControlPanel).not.toHaveBeenCalled();

    document.getElementById('app')!.innerHTML = READABLE_PARAGRAPH.repeat(8);
    await flushMutations();
    jest.advanceTimersByTime(1000);

    expect(mockCreateControlPanel).toHaveBeenCalledTimes(1);
    expect(mockProcessTextElements).toHaveBeenCalledTimes(1);
  });

  it('processes only the newly added content on an initialized page', async () => {
    document.body.innerHTML = `<article id="feed">${READABLE_PARAGRAPH}</article>`;

    await loadContentScript();
    expect(mockProcessTextElements).toHaveBeenCalledTimes(1);

    const added = document.createElement('section');
    added.innerHTML = READABLE_PARAGRAPH;
    document.getElementById('feed')!.appendChild(added);
    await flushMutations();
    jest.advanceTimersByTime(1000);

    expect(mockProcessTextElements).toHaveBeenCalledTimes(2);
    expect(mockProcessTextElements.mock.calls[1][1]).toBe(added);
  });

  it('ignores mutations caused by Talkient itself', async () => {
    document.body.innerHTML = `<article id="feed">${READABLE_PARAGRAPH}</article>`;

    await loadContentScript();
    mockProcessTextElements.mockClear();

    const button = document.createElement('button');
    button.className = 'talkient-play-button';
    document.querySelector('p')!.appendChild(button);
    const panel = document.createElement('div');
    panel.id = 'talkient-control-panel';
    document.body.appendChild(panel);
    await flushMutations();
    jest.advanceTimersByTime(1000);

    expect(mockProcessTextElements).not.toHaveBeenCalled();
  });
});

describe('auto-play next block', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSafeClickButton.mockClear();
    messageListener = null;
    setupChrome();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('starts the next block right away when speech ends', async () => {
    document.body.innerHTML = `
      <article>
        <p id="current" class="talkient-processed">First block</p>
        <p id="next" class="talkient-processed"><button class="talkient-play-button"></button>Next block</p>
      </article>`;
    const current = document.getElementById('current')!;
    const next = document.getElementById('next')!;
    mockGetCurrentHighlightedElement.mockReturnValue(current);
    mockFindNextTextElement.mockReturnValue(next);

    await loadContentScript();
    messageListener!(
      { type: 'SPEECH_ENDED', autoPlayNext: true },
      {},
      jest.fn(),
    );

    // No timer in between: the next utterance is requested synchronously
    expect(mockSafeClickButton).toHaveBeenCalledTimes(1);
    expect(mockSafeClickButton.mock.calls[0][0]).toBe(
      next.querySelector('.talkient-play-button'),
    );
  });
});
