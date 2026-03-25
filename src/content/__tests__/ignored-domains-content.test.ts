/**
 * @jest-environment jsdom
 */

const mockCreateControlPanel = jest.fn();
const mockProcessTextElements = jest.fn();
const mockSetIgnoredDomains = jest.fn();
const mockClearHighlight = jest.fn();

jest.mock('../../features/control-panel/content/panel-ui', () => ({
  createControlPanel: () => mockCreateControlPanel(),
}));

jest.mock('../../features/tts-playback/content/index', () => ({
  processTextElements: (...args: unknown[]) => mockProcessTextElements(...args),
  findNextTextElement: jest.fn(),
  safeClickButton: jest.fn(),
  loadMinimumWordsFromStorage: jest.fn(() => Promise.resolve(3)),
  setMinimumWords: jest.fn(),
  loadSpeechRateFromStorage: jest.fn(() => Promise.resolve(1)),
  setSpeechRate: jest.fn(),
  getSpeechRate: jest.fn(() => 1),
  loadMaxNodesFromStorage: jest.fn(() => Promise.resolve(1000)),
  setMaxNodesProcessed: jest.fn(),
  loadButtonPositionFromStorage: jest.fn(() => Promise.resolve('left')),
  setButtonPosition: jest.fn(),
  setIgnoredDomains: (...args: unknown[]) => mockSetIgnoredDomains(...args),
  setProcessableElements: jest.fn(),
  getTotalProcessedChars: jest.fn(() => 0),
  getRemainingChars: jest.fn(() => -1),
  subtractRemainingChars: jest.fn(),
  getCurrentPlayingChars: jest.fn(() => 0),
  resetEstimateCounters: jest.fn(),
  setOnPlayStartCallback: jest.fn(),
}));

jest.mock('../highlight', () => ({
  clearHighlight: (...args: unknown[]) => mockClearHighlight(...args),
  loadHighlightStyleFromStorage: jest.fn(() => Promise.resolve()),
  setHighlightingStyle: jest.fn(),
  getCurrentHighlightedElement: jest.fn(() => null),
  scrollToHighlightedElement: jest.fn(),
  highlightWordAtIndex: jest.fn(),
}));

jest.mock('../../features/control-panel/content/panel-visibility', () => ({
  initPanelHideDuration: jest.fn(),
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

describe('content ignored domains integration', () => {
  type StorageListener = (
    changes: Record<string, { newValue: unknown }>,
    namespace: string,
  ) => void;

  let storageListener: StorageListener | null = null;

  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML =
      '<main><p>Sample content for processing.</p></main>';
    mockCreateControlPanel.mockClear();
    mockProcessTextElements.mockClear();
    mockSetIgnoredDomains.mockClear();
    mockClearHighlight.mockClear();
    storageListener = null;
  });

  function setupChromeStorage(ignoredDomains: string[]): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).chrome = {
      runtime: {
        onMessage: {
          addListener: jest.fn(),
        },
      },
      storage: {
        local: {
          get: jest.fn(
            (keys: string[], callback: (result: unknown) => void) => {
              if (keys.includes('followHighlight')) {
                callback({ followHighlight: true });
                return;
              }

              if (keys.includes('processableElements')) {
                callback({
                  processableElements: ['article', 'p', 'h1', 'h2', 'h3', 'li'],
                  ignoredDomains,
                });
                return;
              }

              if (keys.includes('playButtonsEnabled')) {
                callback({ playButtonsEnabled: true });
                return;
              }

              callback({});
            },
          ),
          set: jest.fn(),
        },
        onChanged: {
          addListener: jest.fn((listener: StorageListener) => {
            storageListener = listener;
          }),
        },
      },
    };
  }

  it('skips initial UI injection when current hostname is ignored', async () => {
    setupChromeStorage(['localhost']);

    require('../content');
    await Promise.resolve();

    expect(mockSetIgnoredDomains).toHaveBeenCalledWith(['localhost']);
    expect(mockCreateControlPanel).not.toHaveBeenCalled();
    expect(mockProcessTextElements).not.toHaveBeenCalled();
  });

  it('removes existing UI when ignoredDomains update starts matching current hostname', async () => {
    setupChromeStorage([]);

    require('../content');
    await Promise.resolve();

    const panel = document.createElement('div');
    panel.id = 'talkient-control-panel';
    document.body.appendChild(panel);

    const processed = document.createElement('span');
    processed.classList.add('talkient-processed');
    document.body.appendChild(processed);

    const playButton = document.createElement('button');
    playButton.classList.add('talkient-play-button');
    document.body.appendChild(playButton);

    expect(storageListener).toBeTruthy();
    storageListener?.(
      {
        ignoredDomains: {
          newValue: ['localhost'],
        },
      },
      'local',
    );

    expect(document.getElementById('talkient-control-panel')).toBeNull();
    expect(document.querySelector('.talkient-play-button')).toBeNull();
    expect(processed.classList.contains('talkient-processed')).toBe(false);
    expect(mockClearHighlight).toHaveBeenCalled();
  });
});
