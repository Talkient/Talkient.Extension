import {
  defaultTranslationProvider,
  type TranslationErrorCode,
  type TranslationProvider,
  type TranslationResult,
} from './provider';
import type {
  TranslationErrorMessage,
  TranslationResultMessage,
} from '../../../shared/types/messages';

interface TranslationStorageValues {
  translationSourceLanguage?: unknown;
  translationTargetLanguage?: unknown;
  translationProviderEndpoint?: unknown;
  translationRequestTimeoutMs?: unknown;
}

interface ExecuteSelectionTranslationInput {
  tabId: number;
  selectedText: string;
  provider?: TranslationProvider;
}

function sendTranslationLoading(tabId: number, originalText: string): void {
  void chrome.tabs.sendMessage(tabId, {
    type: 'TRANSLATION_LOADING',
    originalText,
  });
}

function sendTranslationResult(tabId: number, result: TranslationResult): void {
  if (result.ok) {
    const message: TranslationResultMessage = {
      type: 'TRANSLATION_RESULT',
      originalText: result.originalText,
      translatedText: result.translatedText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      provider: result.provider,
    };
    void chrome.tabs.sendMessage(tabId, message);
    return;
  }

  const message: TranslationErrorMessage = {
    type: 'TRANSLATION_ERROR',
    errorCode: result.errorCode,
    message: result.message,
  };
  void chrome.tabs.sendMessage(tabId, message);
}

function sendTranslationError(
  tabId: number,
  errorCode: TranslationErrorCode,
  message: string,
): void {
  const normalizedMessage = message.trim();

  const translationError: TranslationErrorMessage = {
    type: 'TRANSLATION_ERROR',
    errorCode,
    message:
      normalizedMessage || 'An unknown error occurred during translation.',
  };

  void chrome.tabs.sendMessage(tabId, translationError);
}

export function executeSelectionTranslation(
  input: ExecuteSelectionTranslationInput,
): void {
  const provider = input.provider ?? defaultTranslationProvider;
  const selectedText = input.selectedText.trim();

  if (!selectedText) {
    sendTranslationError(
      input.tabId,
      'EMPTY_TEXT',
      'Please select text before translating.',
    );
    return;
  }

  sendTranslationLoading(input.tabId, selectedText);

  chrome.storage.local.get(
    [
      'translationSourceLanguage',
      'translationTargetLanguage',
      'translationProviderEndpoint',
      'translationRequestTimeoutMs',
    ],
    (result: TranslationStorageValues) => {
      const sourceLanguage =
        typeof result.translationSourceLanguage === 'string'
          ? result.translationSourceLanguage
          : 'auto';
      const targetLanguage =
        typeof result.translationTargetLanguage === 'string'
          ? result.translationTargetLanguage
          : 'en';
      const endpoint =
        typeof result.translationProviderEndpoint === 'string'
          ? result.translationProviderEndpoint
          : undefined;
      const timeoutMs =
        typeof result.translationRequestTimeoutMs === 'number'
          ? result.translationRequestTimeoutMs
          : undefined;

      void provider
        .translate({
          text: selectedText,
          sourceLanguage,
          targetLanguage,
          endpoint,
          timeoutMs,
        })
        .then((translationResult) => {
          sendTranslationResult(input.tabId, translationResult);
        })
        .catch((error: unknown) => {
          console.error(
            '[Talkient.SW] Translation request failed with an unknown error',
            error,
          );
          const message =
            error instanceof Error
              ? error.message
              : 'An unknown error occurred during translation.';
          sendTranslationError(input.tabId, 'UNKNOWN_ERROR', message);
        });
    },
  );
}
