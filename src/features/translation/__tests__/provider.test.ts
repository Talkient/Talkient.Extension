import { LibreTranslateProvider } from '../background/provider';

describe('LibreTranslateProvider', () => {
  const provider = new LibreTranslateProvider();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('returns normalized success payload', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        translatedText: 'Bonjour',
        detectedLanguage: { language: 'en' },
      }),
    });

    const result = await provider.translate({
      text: 'Hello',
      targetLanguage: 'fr',
    });

    expect(result).toEqual({
      ok: true,
      originalText: 'Hello',
      translatedText: 'Bonjour',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      provider: 'libre-translate',
    });
  });

  it('returns invalid response error when translated text is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const result = await provider.translate({
      text: 'Hello',
      endpoint: 'https://custom-translation-endpoint.test/translate',
    });

    expect(result).toEqual({
      ok: false,
      errorCode: 'INVALID_RESPONSE',
      message: 'Translation provider returned an invalid response.',
    });
  });

  it('returns timeout error when request aborts', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new DOMException('', 'AbortError'),
    );

    const result = await provider.translate({
      text: 'Hello',
      timeoutMs: 10,
      endpoint: 'https://custom-translation-endpoint.test/translate',
    });

    expect(result).toEqual({
      ok: false,
      errorCode: 'TIMEOUT',
      message: 'Translation request timed out. Please try again.',
    });
  });

  it('returns empty text error when selection is blank', async () => {
    const result = await provider.translate({ text: '   ' });

    expect(result).toEqual({
      ok: false,
      errorCode: 'EMPTY_TEXT',
      message: 'No text selected for translation.',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to google endpoint when primary provider fails', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [[['Bonjour', 'Hello', null, null]], null, 'en'],
      });

    const result = await provider.translate({
      text: 'Hello',
      targetLanguage: 'fr',
    });

    expect(result).toEqual({
      ok: true,
      originalText: 'Hello',
      translatedText: 'Bonjour',
      sourceLanguage: 'en',
      targetLanguage: 'fr',
      provider: 'google-translate-public',
    });
  });

  it('does not use fallback provider when primary request times out', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new DOMException('', 'AbortError'),
    );

    const result = await provider.translate({
      text: 'Hello',
    });

    expect(result).toEqual({
      ok: false,
      errorCode: 'TIMEOUT',
      message: 'Translation request timed out. Please try again.',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not use fallback provider when a custom endpoint is configured', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed'));

    const result = await provider.translate({
      text: 'Hello',
      endpoint: 'https://custom-translation-endpoint.test/translate',
    });

    expect(result).toEqual({
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message: 'Cannot reach translation provider (Failed).',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns combined provider error when primary and fallback fail', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError('Primary down'))
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

    const result = await provider.translate({
      text: 'Hello',
      targetLanguage: 'fr',
    });

    expect(result).toEqual({
      ok: false,
      errorCode: 'NETWORK_ERROR',
      message:
        'Translation providers are currently unavailable. ' +
        'Cannot reach translation provider (Primary down). ' +
        'Fallback translation request failed with status 503.',
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('joins translated text segments returned by google fallback', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError('Primary down'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          [
            ['Ola ', 'Hello ', null, null],
            ['mundo', 'world', null, null],
          ],
          null,
          'en',
        ],
      });

    const result = await provider.translate({
      text: 'Hello world',
      targetLanguage: 'pt',
    });

    expect(result).toEqual({
      ok: true,
      originalText: 'Hello world',
      translatedText: 'Ola mundo',
      sourceLanguage: 'en',
      targetLanguage: 'pt',
      provider: 'google-translate-public',
    });
  });
});
