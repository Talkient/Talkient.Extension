import {
  checkTtsAvailability,
  isTtsAvailable,
  getAvailableVoices,
  getCurrentText,
  setCurrentText,
  setIsPaused,
} from './tts-engine';
import { setActiveTabId } from '../../../background/tab-manager';

export function setupContextMenu(): void {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'talkient-play-text',
      title: 'Play text',
      contexts: ['selection'],
      documentUrlPatterns: ['<all_urls>'],
    });
    console.log('[Talkient.SW] Context menu created');
  });
}

export function setupContextMenuClickHandler(): void {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'talkient-play-text' && info.selectionText) {
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
  });
}
