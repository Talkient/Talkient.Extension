import {
  setupContextMenu,
  setupContextMenuClickHandler,
} from '../background/context-menu';

jest.mock('../background/tts-engine', () => ({
  checkTtsAvailability: jest.fn(),
  isTtsAvailable: jest.fn(() => true),
  getAvailableVoices: jest.fn(() => []),
  getCurrentText: jest.fn(() => ''),
  setCurrentText: jest.fn(),
  setIsPaused: jest.fn(),
}));

jest.mock('../../../background/tab-manager', () => ({
  setActiveTabId: jest.fn(),
}));

const translateMock = jest.fn();

jest.mock('../../translation/background/provider', () => ({
  defaultTranslationProvider: {
    translate: (input: unknown) => translateMock(input),
  },
}));

describe('context menu translation flow', () => {
  let clickHandler:
    | ((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => void)
    | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    clickHandler = undefined;

    (global as unknown as { chrome: typeof chrome }).chrome = {
      runtime: {
        onInstalled: {
          addListener: jest.fn(),
        },
      } as unknown as typeof chrome.runtime,
      contextMenus: {
        removeAll: jest.fn((cb?: () => void) => cb && cb()),
        create: jest.fn(),
        onClicked: {
          addListener: jest.fn((cb) => {
            clickHandler = cb;
          }),
        },
      } as unknown as typeof chrome.contextMenus,
      storage: {
        local: {
          get: jest.fn((_, cb: (result: Record<string, unknown>) => void) =>
            cb({ translationTargetLanguage: 'fr' }),
          ),
        },
      } as unknown as typeof chrome.storage,
      tabs: {
        sendMessage: jest.fn(),
      } as unknown as typeof chrome.tabs,
      tts: {
        stop: jest.fn(),
      } as unknown as typeof chrome.tts,
    } as unknown as typeof chrome;
  });

  it('registers separate play and translate context menu items', () => {
    setupContextMenu();

    expect(chrome.contextMenus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'talkient-play-text',
        title: 'Play text',
        contexts: ['selection'],
      }),
    );

    expect(chrome.contextMenus.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'talkient-translate-text',
        title: 'Translate text',
        contexts: ['selection'],
      }),
    );

    expect(chrome.contextMenus.create).toHaveBeenCalledTimes(2);
  });

  it('sends loading and translation result messages for selected text', async () => {
    translateMock.mockResolvedValue({
      ok: true,
      originalText: 'Hello world',
      translatedText: 'Bonjour le monde',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      provider: 'libre-translate',
    });

    setupContextMenuClickHandler();
    clickHandler?.(
      {
        menuItemId: 'talkient-translate-text',
        selectionText: 'Hello world',
      } as chrome.contextMenus.OnClickData,
      { id: 101 } as chrome.tabs.Tab,
    );

    await Promise.resolve();

    expect(chrome.tabs.sendMessage).toHaveBeenNthCalledWith(1, 101, {
      type: 'TRANSLATION_LOADING',
      originalText: 'Hello world',
    });
    expect(chrome.tabs.sendMessage).toHaveBeenNthCalledWith(2, 101, {
      type: 'TRANSLATION_RESULT',
      originalText: 'Hello world',
      translatedText: 'Bonjour le monde',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      provider: 'libre-translate',
    });
  });

  it('sends translation error message when provider fails', async () => {
    translateMock.mockResolvedValue({
      ok: false,
      errorCode: 'TIMEOUT',
      message: 'Translation request timed out. Please try again.',
    });

    setupContextMenuClickHandler();
    clickHandler?.(
      {
        menuItemId: 'talkient-translate-text',
        selectionText: 'Hello world',
      } as chrome.contextMenus.OnClickData,
      { id: 101 } as chrome.tabs.Tab,
    );

    await Promise.resolve();

    expect(chrome.tabs.sendMessage).toHaveBeenNthCalledWith(2, 101, {
      type: 'TRANSLATION_ERROR',
      errorCode: 'TIMEOUT',
      message: 'Translation request timed out. Please try again.',
    });
  });
});
