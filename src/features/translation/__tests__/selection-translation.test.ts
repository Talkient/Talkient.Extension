import { executeSelectionTranslation } from '../background/selection-translation';

describe('executeSelectionTranslation', () => {
  const provider = {
    translate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (global as unknown as { chrome: typeof chrome }).chrome = {
      storage: {
        local: {
          get: jest.fn(
            (_, callback: (result: Record<string, unknown>) => void) => {
              callback({
                translationSourceLanguage: 'en',
                translationTargetLanguage: 'pt',
              });
            },
          ),
        },
      } as unknown as typeof chrome.storage,
      tabs: {
        sendMessage: jest.fn(),
      } as unknown as typeof chrome.tabs,
    } as unknown as typeof chrome;
  });

  it('sends loading and success messages for valid selection', async () => {
    provider.translate.mockResolvedValue({
      ok: true,
      originalText: 'Hello world',
      translatedText: 'Ola mundo',
      sourceLanguage: 'en',
      targetLanguage: 'pt',
      provider: 'libre-translate',
    });

    executeSelectionTranslation({
      tabId: 42,
      selectedText: 'Hello world',
      provider,
    });

    await Promise.resolve();

    expect(chrome.tabs.sendMessage).toHaveBeenNthCalledWith(1, 42, {
      type: 'TRANSLATION_LOADING',
      originalText: 'Hello world',
    });
    expect(chrome.tabs.sendMessage).toHaveBeenNthCalledWith(2, 42, {
      type: 'TRANSLATION_RESULT',
      originalText: 'Hello world',
      translatedText: 'Ola mundo',
      sourceLanguage: 'en',
      targetLanguage: 'pt',
      provider: 'libre-translate',
    });
  });

  it('returns EMPTY_TEXT without provider call for blank selection', () => {
    executeSelectionTranslation({
      tabId: 42,
      selectedText: '   ',
      provider,
    });

    expect(provider.translate).not.toHaveBeenCalled();
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(42, {
      type: 'TRANSLATION_ERROR',
      errorCode: 'EMPTY_TEXT',
      message: 'Please select text before translating.',
    });
  });

  it('forwards provider error result as TRANSLATION_ERROR', async () => {
    provider.translate.mockResolvedValue({
      ok: false,
      errorCode: 'TIMEOUT',
      message: 'Translation request timed out.',
    });

    executeSelectionTranslation({
      tabId: 42,
      selectedText: 'Hello world',
      provider,
    });

    await Promise.resolve();

    expect(chrome.tabs.sendMessage).toHaveBeenNthCalledWith(2, 42, {
      type: 'TRANSLATION_ERROR',
      errorCode: 'TIMEOUT',
      message: 'Translation request timed out.',
    });
  });

  it('maps rejected provider calls to UNKNOWN_ERROR', async () => {
    provider.translate.mockRejectedValue(new Error('Unexpected failure'));

    executeSelectionTranslation({
      tabId: 42,
      selectedText: 'Hello world',
      provider,
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(chrome.tabs.sendMessage).toHaveBeenNthCalledWith(2, 42, {
      type: 'TRANSLATION_ERROR',
      errorCode: 'UNKNOWN_ERROR',
      message: 'Unexpected failure',
    });
  });
});
