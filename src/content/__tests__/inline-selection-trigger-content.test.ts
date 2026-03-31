/**
 * @jest-environment jsdom
 */

const safeSendMessageMock = jest.fn();

jest.mock('../../features/control-panel/content/panel-ui', () => ({
  createControlPanel: jest.fn(),
}));

jest.mock('../../features/control-panel/content/panel-visibility', () => ({
  initPanelHideDuration: jest.fn(),
}));

jest.mock('../../features/control-panel/content/panel-controller', () => ({
  updatePanelPlayIcon: jest.fn(),
}));

jest.mock('../../features/settings/storage-schema', () => ({
  isHostnameIgnored: jest.fn(() => false),
}));

jest.mock('../../features/assets/content/icons', () => ({
  getSvgIcon: jest.fn(() => '<svg></svg>'),
  isSvgPlayIcon: jest.fn(() => true),
}));

jest.mock('../../features/tts-playback/content/index', () => ({
  processTextElements: jest.fn(),
  findNextTextElement: jest.fn(() => null),
  safeClickButton: jest.fn(),
  loadMinimumWordsFromStorage: jest.fn(() => Promise.resolve()),
  setMinimumWords: jest.fn(),
  loadSpeechRateFromStorage: jest.fn(() => Promise.resolve()),
  setSpeechRate: jest.fn(),
  getSpeechRate: jest.fn(() => 1),
  loadMaxNodesFromStorage: jest.fn(() => Promise.resolve()),
  setMaxNodesProcessed: jest.fn(),
  loadButtonPositionFromStorage: jest.fn(() => Promise.resolve('left')),
  setButtonPosition: jest.fn(),
  setIgnoredDomains: jest.fn(),
  setProcessableElements: jest.fn(),
  getTotalProcessedChars: jest.fn(() => 0),
  getRemainingChars: jest.fn(() => -1),
  subtractRemainingChars: jest.fn(),
  getCurrentPlayingChars: jest.fn(() => 0),
  resetEstimateCounters: jest.fn(),
  setOnPlayStartCallback: jest.fn(),
}));

jest.mock('../highlight', () => ({
  clearHighlight: jest.fn(),
  loadHighlightStyleFromStorage: jest.fn(() => Promise.resolve()),
  setHighlightingStyle: jest.fn(),
  getCurrentHighlightedElement: jest.fn(() => null),
  scrollToHighlightedElement: jest.fn(),
  highlightWordAtIndex: jest.fn(),
}));

jest.mock('../../shared/api/messaging', () => ({
  safeSendMessage: (...args: unknown[]) => safeSendMessageMock(...args),
}));

jest.mock('../translation-result', () => ({
  showTranslationError: jest.fn(),
  showTranslationLoading: jest.fn(),
  showTranslationSuccess: jest.fn(),
}));

describe('inline selection translate trigger', () => {
  type SelectionState = {
    text: string;
    isCollapsed: boolean;
    hasRange: boolean;
    rect: DOMRect;
    fallbackRect: DOMRect | null;
  };

  const selectionState: SelectionState = {
    text: '',
    isCollapsed: true,
    hasRange: false,
    rect: new DOMRect(0, 0, 0, 0),
    fallbackRect: null,
  };

  beforeEach(() => {
    jest.resetModules();
    safeSendMessageMock.mockClear();
    document.body.innerHTML =
      '<article><p>Test content for selection.</p></article>';

    jest.spyOn(window, 'getSelection').mockImplementation(() => {
      if (!selectionState.hasRange) {
        return {
          rangeCount: 0,
          isCollapsed: true,
          toString: () => '',
        } as unknown as Selection;
      }

      const range = {
        getBoundingClientRect: () => selectionState.rect,
        getClientRects: () => ({
          length: selectionState.fallbackRect ? 1 : 0,
          item: (_: number) => selectionState.fallbackRect,
          [Symbol.iterator]: function* iterator(): IterableIterator<DOMRect> {
            if (selectionState.fallbackRect) {
              yield selectionState.fallbackRect;
            }
          },
        }),
      } as unknown as Range;

      return {
        rangeCount: 1,
        isCollapsed: selectionState.isCollapsed,
        getRangeAt: () => range,
        toString: () => selectionState.text,
      } as unknown as Selection;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).chrome = {
      runtime: {
        onMessage: { addListener: jest.fn() },
      },
      storage: {
        local: {
          get: jest.fn((keys: unknown, callback: (result: unknown) => void) => {
            if (Array.isArray(keys) && keys.includes('followHighlight')) {
              callback({ followHighlight: true });
              return;
            }
            if (Array.isArray(keys) && keys.includes('playButtonsEnabled')) {
              callback({ playButtonsEnabled: true });
              return;
            }
            if (Array.isArray(keys) && keys.includes('processableElements')) {
              callback({
                processableElements: ['article', 'p'],
                ignoredDomains: [],
              });
              return;
            }
            callback({});
          }),
        },
        onChanged: { addListener: jest.fn() },
      },
    };

    require('../content');
  });

  it('shows trigger for valid non-empty double-click selection', () => {
    selectionState.text = 'Hello';
    selectionState.isCollapsed = false;
    selectionState.hasRange = true;
    selectionState.rect = new DOMRect(50, 40, 80, 18);
    selectionState.fallbackRect = null;

    window.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, button: 0 }),
    );

    expect(
      document.getElementById('talkient-inline-translate-trigger'),
    ).not.toBeNull();
  });

  it('does not show trigger for invalid selection geometry', () => {
    selectionState.text = 'Hello';
    selectionState.isCollapsed = false;
    selectionState.hasRange = true;
    selectionState.rect = new DOMRect(0, 0, 0, 0);
    selectionState.fallbackRect = null;

    window.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, button: 0 }),
    );

    expect(
      document.getElementById('talkient-inline-translate-trigger'),
    ).toBeNull();
  });

  it('uses fallback selection client rect when bounding rect is empty', () => {
    selectionState.text = 'Hello';
    selectionState.isCollapsed = false;
    selectionState.hasRange = true;
    selectionState.rect = new DOMRect(0, 0, 0, 0);
    selectionState.fallbackRect = new DOMRect(40, 30, 60, 18);

    window.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, button: 0 }),
    );

    expect(
      document.getElementById('talkient-inline-translate-trigger'),
    ).not.toBeNull();
  });

  it('removes trigger when selection collapses', () => {
    selectionState.text = 'Hello';
    selectionState.isCollapsed = false;
    selectionState.hasRange = true;
    selectionState.rect = new DOMRect(50, 40, 80, 18);
    selectionState.fallbackRect = null;

    window.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, button: 0 }),
    );
    expect(
      document.getElementById('talkient-inline-translate-trigger'),
    ).not.toBeNull();

    selectionState.isCollapsed = true;
    selectionState.text = '';
    document.dispatchEvent(new Event('selectionchange'));

    expect(
      document.getElementById('talkient-inline-translate-trigger'),
    ).toBeNull();
  });

  it('removes trigger on outside pointerdown', () => {
    selectionState.text = 'Hello';
    selectionState.isCollapsed = false;
    selectionState.hasRange = true;
    selectionState.rect = new DOMRect(50, 40, 80, 18);
    selectionState.fallbackRect = null;

    window.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, button: 0 }),
    );
    expect(
      document.getElementById('talkient-inline-translate-trigger'),
    ).not.toBeNull();

    document.body.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true }),
    );

    expect(
      document.getElementById('talkient-inline-translate-trigger'),
    ).toBeNull();
  });

  it('sends TRANSLATE_SELECTION and removes trigger on click', () => {
    selectionState.text = 'Hello';
    selectionState.isCollapsed = false;
    selectionState.hasRange = true;
    selectionState.rect = new DOMRect(50, 40, 80, 18);
    selectionState.fallbackRect = null;

    window.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true, button: 0 }),
    );

    const trigger = document.getElementById(
      'talkient-inline-translate-trigger',
    ) as HTMLButtonElement | null;

    expect(trigger).not.toBeNull();
    trigger?.click();

    expect(safeSendMessageMock).toHaveBeenCalledWith({
      type: 'TRANSLATE_SELECTION',
      text: 'Hello',
    });
    expect(
      document.getElementById('talkient-inline-translate-trigger'),
    ).toBeNull();
  });
});
