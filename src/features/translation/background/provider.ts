export type TranslationErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'EMPTY_TEXT'
  | 'UNKNOWN_ERROR';

export interface TranslationRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  endpoint?: string;
  timeoutMs?: number;
}

export interface TranslationSuccessResult {
  ok: true;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
}

export interface TranslationErrorResult {
  ok: false;
  errorCode: TranslationErrorCode;
  message: string;
}

export type TranslationResult =
  | TranslationSuccessResult
  | TranslationErrorResult;

export interface TranslationProvider {
  translate(request: TranslationRequest): Promise<TranslationResult>;
}

interface LibreTranslateResponse {
  translatedText?: string;
  detectedLanguage?: {
    language?: string;
  };
}

type GoogleTranslateResponse = [Array<Array<string | null>>, unknown, string?];

const DEFAULT_ENDPOINT = 'https://translate.argosopentech.com/translate';
const FALLBACK_GOOGLE_ENDPOINT =
  'https://translate.googleapis.com/translate_a/single';
const DEFAULT_TARGET_LANGUAGE = 'en';
const DEFAULT_TIMEOUT_MS = 8000;

export class LibreTranslateProvider implements TranslationProvider {
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const text = request.text.trim();
    if (!text) {
      return {
        ok: false,
        errorCode: 'EMPTY_TEXT',
        message: 'No text selected for translation.',
      };
    }

    const targetLanguage = request.targetLanguage ?? DEFAULT_TARGET_LANGUAGE;
    const sourceLanguage = request.sourceLanguage ?? 'auto';
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const endpoint = request.endpoint ?? DEFAULT_ENDPOINT;

    const primaryResult = await this.translateWithLibreEndpoint({
      text,
      sourceLanguage,
      targetLanguage,
      endpoint,
      timeoutMs,
    });

    if (primaryResult.ok || request.endpoint) {
      return primaryResult;
    }

    if (
      primaryResult.errorCode === 'EMPTY_TEXT' ||
      primaryResult.errorCode === 'TIMEOUT'
    ) {
      return primaryResult;
    }

    const fallbackResult = await this.translateWithGoogleEndpoint({
      text,
      sourceLanguage,
      targetLanguage,
      timeoutMs,
    });

    if (fallbackResult.ok) {
      return fallbackResult;
    }

    return {
      ok: false,
      errorCode: fallbackResult.errorCode,
      message:
        'Translation providers are currently unavailable. ' +
        `${primaryResult.message} ${fallbackResult.message}`,
    };
  }

  private async translateWithLibreEndpoint(input: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
    endpoint: string;
    timeoutMs: number;
  }): Promise<TranslationResult> {
    const { text, sourceLanguage, targetLanguage, endpoint, timeoutMs } = input;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLanguage,
          target: targetLanguage,
          format: 'text',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          ok: false,
          errorCode: 'NETWORK_ERROR',
          message: `Translation request failed with status ${response.status}.`,
        };
      }

      const payload = (await response.json()) as LibreTranslateResponse;
      const translatedText = payload.translatedText?.trim();

      if (!translatedText) {
        return {
          ok: false,
          errorCode: 'INVALID_RESPONSE',
          message: 'Translation provider returned an invalid response.',
        };
      }

      return {
        ok: true,
        originalText: text,
        translatedText,
        sourceLanguage: payload.detectedLanguage?.language ?? sourceLanguage,
        targetLanguage,
        provider: 'libre-translate',
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          ok: false,
          errorCode: 'TIMEOUT',
          message: 'Translation request timed out. Please try again.',
        };
      }

      if (error instanceof Error) {
        return {
          ok: false,
          errorCode: 'NETWORK_ERROR',
          message: `Cannot reach translation provider (${error.message}).`,
        };
      }

      return {
        ok: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Cannot reach translation provider.',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async translateWithGoogleEndpoint(input: {
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
    timeoutMs: number;
  }): Promise<TranslationResult> {
    const { text, sourceLanguage, targetLanguage, timeoutMs } = input;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = new URL(FALLBACK_GOOGLE_ENDPOINT);
      url.searchParams.set('client', 'gtx');
      url.searchParams.set('dt', 't');
      url.searchParams.set('sl', sourceLanguage || 'auto');
      url.searchParams.set('tl', targetLanguage);
      url.searchParams.set('q', text);

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          ok: false,
          errorCode: 'NETWORK_ERROR',
          message: `Fallback translation request failed with status ${response.status}.`,
        };
      }

      const payload = (await response.json()) as GoogleTranslateResponse;
      const translatedText = payload[0]
        ?.map((segment) => segment[0] ?? '')
        .join('')
        .trim();

      if (!translatedText) {
        return {
          ok: false,
          errorCode: 'INVALID_RESPONSE',
          message:
            'Fallback translation provider returned an invalid response.',
        };
      }

      return {
        ok: true,
        originalText: text,
        translatedText,
        sourceLanguage: payload[2] ?? sourceLanguage,
        targetLanguage,
        provider: 'google-translate-public',
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          ok: false,
          errorCode: 'TIMEOUT',
          message: 'Fallback translation request timed out. Please try again.',
        };
      }

      if (error instanceof Error) {
        return {
          ok: false,
          errorCode: 'NETWORK_ERROR',
          message: `Fallback translation request failed (${error.message}).`,
        };
      }

      return {
        ok: false,
        errorCode: 'NETWORK_ERROR',
        message: 'Fallback translation request failed.',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const defaultTranslationProvider: TranslationProvider =
  new LibreTranslateProvider();
