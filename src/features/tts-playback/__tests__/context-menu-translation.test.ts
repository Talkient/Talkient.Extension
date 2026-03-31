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

const executeSelectionTranslationMock = jest.fn();

jest.mock('../../translation/background/selection-translation', () => ({
  executeSelectionTranslation: (input: unknown) =>
    executeSelectionTranslationMock(input),
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
          get: jest.fn(),
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

  it('delegates translate menu clicks to selection translation executor', () => {
    setupContextMenuClickHandler();
    clickHandler?.(
      {
        menuItemId: 'talkient-translate-text',
        selectionText: 'Hello world',
      } as chrome.contextMenus.OnClickData,
      { id: 101 } as chrome.tabs.Tab,
    );

    expect(executeSelectionTranslationMock).toHaveBeenCalledWith({
      tabId: 101,
      selectedText: 'Hello world',
    });
  });

  it('passes empty selection string through to shared executor', () => {
    setupContextMenuClickHandler();
    clickHandler?.(
      {
        menuItemId: 'talkient-translate-text',
        selectionText: undefined,
      } as chrome.contextMenus.OnClickData,
      { id: 101 } as chrome.tabs.Tab,
    );

    expect(executeSelectionTranslationMock).toHaveBeenCalledWith({
      tabId: 101,
      selectedText: '',
    });
  });

  it('skips translation execution when translate click has no tab id', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    setupContextMenuClickHandler();
    clickHandler?.(
      {
        menuItemId: 'talkient-translate-text',
        selectionText: 'Hello world',
      } as chrome.contextMenus.OnClickData,
      {} as chrome.tabs.Tab,
    );

    expect(executeSelectionTranslationMock).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[Talkient.SW] Missing tab id for translation request',
    );

    consoleWarnSpy.mockRestore();
  });
});
