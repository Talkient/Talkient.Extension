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

  it('trims selected text before sending loading and provider request', async () => {
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
      selectedText: '  Hello world  ',
      provider,
    });

    await Promise.resolve();

    expect(chrome.tabs.sendMessage).toHaveBeenNthCalledWith(1, 42, {
      type: 'TRANSLATION_LOADING',
      originalText: 'Hello world',
    });
    expect(provider.translate).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Hello world',
      }),
    );
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

  it('uses fallback storage values when translation settings are invalid', async () => {
    (
      chrome.storage.local.get as unknown as jest.MockedFunction<
        typeof chrome.storage.local.get
      >
    ).mockImplementationOnce(
      (_, callback: (result: Record<string, unknown>) => void) => {
        callback({
          translationSourceLanguage: 10,
          translationTargetLanguage: false,
          translationProviderEndpoint: 20,
          translationRequestTimeoutMs: '2000',
        });
      },
    );

    provider.translate.mockResolvedValue({
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message: 'Down',
    });

    executeSelectionTranslation({
      tabId: 42,
      selectedText: 'Hello world',
      provider,
    });

    await Promise.resolve();

    expect(provider.translate).toHaveBeenCalledWith({
      text: 'Hello world',
      sourceLanguage: 'auto',
      targetLanguage: 'en',
      endpoint: undefined,
      timeoutMs: undefined,
    });
  });

  it('passes endpoint and timeout values from storage when valid', async () => {
    (
      chrome.storage.local.get as unknown as jest.MockedFunction<
        typeof chrome.storage.local.get
      >
    ).mockImplementationOnce(
      (_, callback: (result: Record<string, unknown>) => void) => {
        callback({
          translationSourceLanguage: 'en',
          translationTargetLanguage: 'fr',
          translationProviderEndpoint:
            'https://custom-translation-endpoint.test/translate',
          translationRequestTimeoutMs: 3210,
        });
      },
    );

    provider.translate.mockResolvedValue({
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message: 'Down',
    });

    executeSelectionTranslation({
      tabId: 42,
      selectedText: 'Hello world',
      provider,
    });

    await Promise.resolve();

    expect(provider.translate).toHaveBeenCalledWith({
      text: 'Hello world',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      endpoint: 'https://custom-translation-endpoint.test/translate',
      timeoutMs: 3210,
    });
  });

  it('uses default unknown error message when provider rejects with non-error', async () => {
    provider.translate.mockRejectedValue('boom');

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
      message: 'An unknown error occurred during translation.',
    });
  });
});
