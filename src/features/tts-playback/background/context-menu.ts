import {
  checkTtsAvailability,
  isTtsAvailable,
  getAvailableVoices,
  getCurrentText,
  setCurrentText,
  setIsPaused,
} from './tts-engine';
import { setActiveTabId } from '../../../background/tab-manager';
import { defaultTranslationProvider } from '../../translation/background/provider';

const PLAY_TEXT_MENU_ID = 'talkient-play-text';
const TRANSLATE_TEXT_MENU_ID = 'talkient-translate-text';

type ContextMenuClickHandler = (
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
) => void;

declare global {
  interface Window {
    __talkientOnContextMenuClick?: ContextMenuClickHandler;
  }

  interface WorkerGlobalScope {
    __talkientOnContextMenuClick?: ContextMenuClickHandler;
  }
}

function registerContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: PLAY_TEXT_MENU_ID,
      title: 'Play text',
      contexts: ['selection'],
      documentUrlPatterns: ['<all_urls>'],
    });

    chrome.contextMenus.create({
      id: TRANSLATE_TEXT_MENU_ID,
      title: 'Translate text',
      contexts: ['selection'],
      documentUrlPatterns: ['<all_urls>'],
    });

    console.log('[Talkient.SW] Context menus created');
  });
}

function sendTranslationLoading(tabId: number, originalText: string): void {
  void chrome.tabs.sendMessage(tabId, {
    type: 'TRANSLATION_LOADING',
    originalText,
  });
}

function sendTranslationResult(
  tabId: number,
  result:
    | {
        ok: true;
        originalText: string;
        translatedText: string;
        sourceLanguage: string;
        targetLanguage: string;
        provider: string;
      }
    | {
        ok: false;
        errorCode:
          | 'NETWORK_ERROR'
          | 'TIMEOUT'
          | 'INVALID_RESPONSE'
          | 'EMPTY_TEXT'
          | 'UNKNOWN_ERROR';
        message: string;
      },
): void {
  if (result.ok) {
    void chrome.tabs.sendMessage(tabId, {
      type: 'TRANSLATION_RESULT',
      originalText: result.originalText,
      translatedText: result.translatedText,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      provider: result.provider,
    });
    return;
  }

  void chrome.tabs.sendMessage(tabId, {
    type: 'TRANSLATION_ERROR',
    errorCode: result.errorCode,
    message: result.message,
  });
}

function handleTranslateSelection(
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab | undefined,
): void {
  const tabId = tab?.id;
  if (!tabId) {
    console.warn('[Talkient.SW] Missing tab id for translation request');
    return;
  }

  const selectedText = info.selectionText?.trim() ?? '';
  if (!selectedText) {
    void chrome.tabs.sendMessage(tabId, {
      type: 'TRANSLATION_ERROR',
      errorCode: 'EMPTY_TEXT',
      message: 'Please select text before translating.',
    });
    return;
  }

  sendTranslationLoading(tabId, selectedText);

  chrome.storage.local.get(
    [
      'translationSourceLanguage',
      'translationTargetLanguage',
      'translationProviderEndpoint',
      'translationRequestTimeoutMs',
    ],
    (result) => {
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

      void defaultTranslationProvider
        .translate({
          text: selectedText,
          sourceLanguage,
          targetLanguage,
          endpoint,
          timeoutMs,
        })
        .then((translationResult) => {
          sendTranslationResult(tabId, translationResult);
        });
    },
  );
}

export function setupContextMenu(): void {
  chrome.runtime.onInstalled.addListener(registerContextMenus);
  registerContextMenus();
}

export function setupContextMenuClickHandler(): void {
  const clickHandler: ContextMenuClickHandler = (info, tab) => {
    if (info.menuItemId === TRANSLATE_TEXT_MENU_ID) {
      handleTranslateSelection(info, tab);
      return;
    }

    if (info.menuItemId === PLAY_TEXT_MENU_ID && info.selectionText) {
      console.log(
        '[Talkient.SW] Context menu clicked with text:',
        info.selectionText,
      );

      if (tab?.id) {
        setActiveTabId(tab.id);
      }

      if (getCurrentText() !== '') {
        console.log(
          '[Talkient.SW] Stopping current speech for context menu selection...',
        );
        chrome.tts.stop();
        setIsPaused(false);
      }

      if (!isTtsAvailable()) {
        console.error('[Talkient.SW] TTS is not available');
        checkTtsAvailability();
        if (!isTtsAvailable()) {
          return;
        }
      }

      setCurrentText(info.selectionText);

      chrome.storage.local.get(
        ['selectedVoice', 'speechRate', 'speechPitch'],
        (result) => {
          if (chrome.runtime.lastError) {
            console.error(
              '[Talkient.SW] Error getting storage data:',
              chrome.runtime.lastError,
            );
            return;
          }

          const selectedVoice = result.selectedVoice as string | undefined;
          const speechRate =
            typeof result.speechRate === 'number' ? result.speechRate : 1.0;
          const speechPitch =
            typeof result.speechPitch === 'number' ? result.speechPitch : 1.0;

          const ttsOptions: chrome.tts.TtsOptions = {
            rate: speechRate,
            pitch: speechPitch,
            voiceName: selectedVoice,
            onEvent: (event) => {
              console.log('[Talkient.SW] Context menu TTS event:', event);

              switch (event.type) {
                case 'error':
                  console.error('[Talkient.SW] TTS Error:', event);
                  setIsPaused(false);
                  setCurrentText('');
                  if (tab?.id) {
                    void chrome.tabs.sendMessage(tab.id, {
                      type: 'SPEECH_ERROR',
                      error: event,
                    });
                  }
                  break;
                case 'end':
                  console.log('[Talkient.SW] Context menu speech ended');
                  setIsPaused(false);
                  setCurrentText('');
                  break;
                case 'cancelled':
                  console.warn('[Talkient.SW] Context menu speech cancelled');
                  setIsPaused(false);
                  setCurrentText('');
                  break;
                case 'interrupted':
                  chrome.tts.stop();
                  break;
              }
            },
          };

          if (
            ttsOptions.voiceName &&
            !getAvailableVoices().some(
              (v) => v.voiceName === ttsOptions.voiceName,
            )
          ) {
            console.warn(
              '[Talkient.SW] Selected voice not found, using default',
            );
            delete ttsOptions.voiceName;
          }

          console.log('[Talkient.SW] Speaking selected text from context menu');
          void chrome.tts.speak(info.selectionText!, ttsOptions);
          if (chrome.runtime.lastError) {
            console.error(
              '[Talkient.SW] Error speaking text:',
              chrome.runtime.lastError,
            );
          }
        },
      );
    }
  };

  chrome.contextMenus.onClicked.addListener(clickHandler);
  (
    globalThis as unknown as {
      __talkientOnContextMenuClick?: ContextMenuClickHandler;
    }
  ).__talkientOnContextMenuClick = clickHandler;
}
