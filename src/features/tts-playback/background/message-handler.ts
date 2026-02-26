import {
  checkTtsAvailability,
  getIsPaused,
  getCurrentText,
  isTtsAvailable,
  getAvailableVoices,
  setIsPaused,
  setCurrentText,
  resetSpeechState,
} from './tts-engine';
import { setActiveTabId } from '../../../background/tab-manager';
import type {
  SpeakTextMessage,
  PauseSpeechMessage,
} from '../../../shared/types/messages';

export function handleSpeakText(
  request: SpeakTextMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
): void {
  console.log('[Talkient.SW] Starting to speak... ');

  if (sender.tab?.id) {
    setActiveTabId(sender.tab.id);
  }

  if (getCurrentText() !== '' && getCurrentText() !== request.text) {
    console.log('[Talkient.SW] Playing new audio, stopping current speech...');
    chrome.tts.stop();
    setIsPaused(false);
  }

  if (!isTtsAvailable()) {
    console.error('[Talkient.SW] TTS is not available');
    checkTtsAvailability();
    if (!isTtsAvailable()) {
      sendResponse({ success: false, error: 'TTS is not available' });
      if (sender.tab?.id) {
        void chrome.tabs.sendMessage(sender.tab.id, {
          type: 'SPEECH_ERROR',
          error: 'TTS is not available',
        });
      }
      return;
    }
  }

  if (getIsPaused() && getCurrentText() === request.text) {
    console.log('[Talkient.SW] Resuming paused speech...');
    chrome.tts.resume();
    if (chrome.runtime.lastError) {
      console.error(
        '[Talkient.SW] Error resuming speech:',
        chrome.runtime.lastError,
      );
    }
    setIsPaused(false);
  } else {
    setCurrentText(request.text);

    // TODO: Comunicate the settings directly between service-worker and options scripts without need to fetch from storage
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
            console.log('[Talkient.SW] tts.speak event: ', event);

            switch (event.type) {
              case 'error':
                console.error('[Talkient.SW] TTS Error:', event);
                setIsPaused(false);
                setCurrentText('');
                if (sender.tab?.id) {
                  void chrome.tabs.sendMessage(sender.tab.id, {
                    type: 'SPEECH_ERROR',
                    error: event,
                  });
                }
                break;
              case 'end':
                chrome.storage.local.get(['autoPlayNext'], (storageResult) => {
                  if (chrome.runtime.lastError) {
                    console.error(
                      '[Talkient.SW] Error getting autoPlayNext setting:',
                      JSON.stringify(chrome.runtime.lastError),
                    );
                    return;
                  }
                  const autoPlayNext = storageResult.autoPlayNext !== false;
                  if (sender.tab?.id) {
                    void chrome.tabs.sendMessage(sender.tab.id, {
                      type: 'SPEECH_ENDED',
                      autoPlayNext: autoPlayNext,
                    });
                    if (chrome.runtime.lastError) {
                      console.error(
                        '[Talkient.SW] Error sending message to content script:',
                        chrome.runtime.lastError,
                      );
                    }
                  } else {
                    console.error(
                      '[Talkient.SW] Cannot send SPEECH_ENDED: No tab ID',
                    );
                  }
                });
                setIsPaused(false);
                setCurrentText('');
                break;
              case 'pause':
                setIsPaused(true);
                break;
              case 'cancelled':
                console.warn('[Talkient.SW] Speech was cancelled:', event);
                setIsPaused(false);
                setCurrentText('');
                if (sender.tab?.id) {
                  void chrome.tabs.sendMessage(sender.tab.id, {
                    type: 'SPEECH_CANCELLED',
                  });
                }
                break;
              case 'resume':
                setIsPaused(false);
                break;
              case 'interrupted':
                chrome.tts.stop();
                if (chrome.runtime.lastError) {
                  console.error(
                    '[Talkient.SW] Error stopping TTS:',
                    JSON.stringify(chrome.runtime.lastError),
                  );
                }
                break;
              default:
                console.warn(
                  '[Talkient.SW] not handled tts.speak event: ',
                  JSON.stringify(event),
                );
                break;
            }
          },
        };

        if (
          !request.text ||
          typeof request.text !== 'string' ||
          request.text.trim() === ''
        ) {
          console.error('[Talkient.SW] Error: Empty or invalid text provided');
          sendResponse({ success: false, error: 'Empty or invalid text' });
          return;
        }

        console.log(
          '[Talkient.SW] Speaking text (length: ' + request.text.length + '):',
          request.text.substring(0, 50) +
            (request.text.length > 50 ? '...' : ''),
        );

        if (
          ttsOptions.voiceName &&
          !getAvailableVoices().some(
            (v) => v.voiceName === ttsOptions.voiceName,
          )
        ) {
          console.warn(
            '[Talkient.SW] Selected voice not found in available voices, using default',
          );
          delete ttsOptions.voiceName;
        }

        void chrome.tts.speak(request.text, ttsOptions);
        if (chrome.runtime.lastError) {
          console.error(
            '[Talkient.SW] Error speaking text:',
            chrome.runtime.lastError,
          );
        }
      },
    );
  }

  sendResponse({ success: true });
}

export function handlePauseSpeech(
  request: PauseSpeechMessage,
  sendResponse: (response: unknown) => void,
): void {
  console.log('[Talkient.SW] Pausing the speak...');
  setIsPaused(true);

  if (request.isPageUnload) {
    console.log(
      '[Talkient.SW] Page is unloading, stopping speech completely...',
    );
    chrome.tts.stop();
    resetSpeechState();
  } else {
    chrome.tts.pause();
  }

  if (chrome.runtime.lastError) {
    console.error(
      '[Talkient.SW] Error pausing/stopping speech:',
      chrome.runtime.lastError,
    );
  }

  sendResponse({ success: true });
}
