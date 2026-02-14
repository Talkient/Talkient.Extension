import {
  isSpeakTextMessage,
  isPauseSpeechMessage,
  isOpenOptionsMessage,
  isReloadPlayButtonsMessage,
  isSignInMessage,
  isSignOutMessage,
  isGetAuthStateMessage,
  type ExtendedServiceWorkerMessage,
} from '../types/messages';
import {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  isAuthenticated,
} from '../auth';

console.log('Service Worker for Talkient Extension');

// State management for TTS
let isPaused = false;
let currentText = '';
let availableVoices: chrome.tts.TtsVoice[] = [];
let ttsAvailable = false;
let activeTabId: number | null = null;

// Function to check if TTS is available
function checkTtsAvailability(): void {
  // First check if the TTS API exists
  if (!chrome.tts) {
    console.error('[Talkient.SW] Chrome TTS API is not available');
    ttsAvailable = false;
    return;
  }

  // Then check if we can get voices
  chrome.tts.getVoices((voices) => {
    if (chrome.runtime.lastError) {
      console.error(
        '[Talkient.SW] Error getting voices:',
        chrome.runtime.lastError,
      );
      ttsAvailable = false;
      return;
    }

    // Check if we have any voices available
    if (!voices || voices.length === 0) {
      console.error('[Talkient.SW] No voices available for TTS');
      ttsAvailable = false;
      return;
    }

    availableVoices = voices;
    ttsAvailable = true;
    console.log('[Talkient.SW] Available voices:', voices);
  });
}

// Check TTS availability on startup
checkTtsAvailability();

// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'talkient-play-text',
    title: 'Play text',
    contexts: ['selection'],
    documentUrlPatterns: ['<all_urls>'],
  });
  console.log('[Talkient.SW] Context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'talkient-play-text' && info.selectionText) {
    console.log(
      '[Talkient.SW] Context menu clicked with text:',
      info.selectionText,
    );

    // Store the tab ID that started speech
    if (tab?.id) {
      activeTabId = tab.id;
    }

    // Stop any current speech
    if (currentText !== '') {
      console.log(
        '[Talkient.SW] Stopping current speech for context menu selection...',
      );
      chrome.tts.stop();
      isPaused = false;
    }

    // Check if TTS is available
    if (!ttsAvailable) {
      console.error('[Talkient.SW] TTS is not available');
      checkTtsAvailability();
      if (!ttsAvailable) {
        return;
      }
    }

    currentText = info.selectionText;

    // Get speech settings and speak
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
                isPaused = false;
                currentText = '';
                if (tab?.id) {
                  void chrome.tabs.sendMessage(tab.id, {
                    type: 'SPEECH_ERROR',
                    error: event,
                  });
                }
                break;
              case 'end':
                console.log('[Talkient.SW] Context menu speech ended');
                isPaused = false;
                currentText = '';
                break;
              case 'cancelled':
                console.warn('[Talkient.SW] Context menu speech cancelled');
                isPaused = false;
                currentText = '';
                break;
              case 'interrupted':
                chrome.tts.stop();
                break;
            }
          },
        };

        // Ensure we have a valid voice
        if (
          ttsOptions.voiceName &&
          !availableVoices.some((v) => v.voiceName === ttsOptions.voiceName)
        ) {
          console.warn('[Talkient.SW] Selected voice not found, using default');
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

chrome.runtime.onMessage.addListener(
  (request: ExtendedServiceWorkerMessage, sender, sendResponse) => {
    console.log('[Talkient.SW] Firing a request type of ', request.type);

    // Handle authentication messages
    if (isSignInMessage(request)) {
      console.log('[Talkient.SW] Processing sign-in request...');
      void signInWithGoogle(request.interactive !== false).then((result) => {
        if (result.success) {
          sendResponse({ success: true, user: result.user });
        } else {
          sendResponse({ success: false, error: result.error });
        }
      });
      return true; // Keep channel open for async response
    }

    if (isSignOutMessage(request)) {
      console.log('[Talkient.SW] Processing sign-out request...');
      void signOut().then((result) => {
        sendResponse(result);
      });
      return true;
    }

    if (isGetAuthStateMessage(request)) {
      console.log('[Talkient.SW] Getting auth state...');
      void Promise.all([isAuthenticated(), getCurrentUser()]).then(
        ([authenticated, user]) => {
          sendResponse({
            success: true,
            isAuthenticated: authenticated,
            user: user,
          });
        },
      );
      return true;
    }

    if (isSpeakTextMessage(request)) {
      console.log('[Talkient.SW] Starting to speak... ');

      // Store the tab ID that started speech
      if (sender.tab?.id) {
        activeTabId = sender.tab.id;
      }

      // Always stop current speech when starting a new one with different text
      if (currentText !== '' && currentText !== request.text) {
        console.log(
          '[Talkient.SW] Playing new audio, stopping current speech...',
        );
        chrome.tts.stop();
        isPaused = false;
      }

      // Check if TTS is available
      if (!ttsAvailable) {
        console.error('[Talkient.SW] TTS is not available');
        // Try to check availability again
        checkTtsAvailability();
        if (!ttsAvailable) {
          sendResponse({ success: false, error: 'TTS is not available' });
          // Notify content script that TTS is not available
          if (sender.tab?.id) {
            void chrome.tabs.sendMessage(sender.tab.id, {
              type: 'SPEECH_ERROR',
              error: 'TTS is not available',
            });
          }
          return true;
        }
      }

      if (isPaused && currentText === request.text) {
        // Resume paused speech
        console.log('[Talkient.SW] Resuming paused speech...');
        chrome.tts.resume();
        if (chrome.runtime.lastError) {
          console.error(
            '[Talkient.SW] Error resuming speech:',
            chrome.runtime.lastError,
          );
        }
        isPaused = false;
      } else {
        currentText = request.text;

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
                    isPaused = false;
                    currentText = '';
                    // Notify content script about the error so it can reset UI
                    if (sender.tab?.id) {
                      void chrome.tabs.sendMessage(sender.tab.id, {
                        type: 'SPEECH_ERROR',
                        error: event,
                      });
                    }
                    break;
                  case 'end':
                    // Check if auto play next is enabled
                    chrome.storage.local.get(['autoPlayNext'], (result) => {
                      if (chrome.runtime.lastError) {
                        console.error(
                          '[Talkient.SW] Error getting autoPlayNext setting:',
                          JSON.stringify(chrome.runtime.lastError),
                        );
                        return;
                      }
                      const autoPlayNext = result.autoPlayNext !== false;
                      // Notify content script that speech has ended
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
                    isPaused = false;
                    currentText = '';
                    break;
                  case 'pause':
                    isPaused = true;
                    break;
                  case 'cancelled':
                    console.warn('[Talkient.SW] Speech was cancelled:', event);
                    isPaused = false; // Reset to false since we're not actually paused
                    currentText = '';

                    // Notify content script that speech was cancelled so it can reset UI
                    if (sender.tab?.id) {
                      void chrome.tabs.sendMessage(sender.tab.id, {
                        type: 'SPEECH_CANCELLED',
                      });
                    }
                    break;
                  case 'resume':
                    isPaused = false;
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
            // Check if text is valid before attempting to speak
            if (
              !request.text ||
              typeof request.text !== 'string' ||
              request.text.trim() === ''
            ) {
              console.error(
                '[Talkient.SW] Error: Empty or invalid text provided',
              );
              sendResponse({ success: false, error: 'Empty or invalid text' });
              return;
            }

            console.log(
              '[Talkient.SW] Speaking text (length: ' +
                request.text.length +
                '):',
              request.text.substring(0, 50) +
                (request.text.length > 50 ? '...' : ''),
            );

            // Ensure we have a valid voice before attempting to speak
            if (
              ttsOptions.voiceName &&
              !availableVoices.some((v) => v.voiceName === ttsOptions.voiceName)
            ) {
              console.warn(
                '[Talkient.SW] Selected voice not found in available voices, using default',
              );
              delete ttsOptions.voiceName; // Let the browser use default voice
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
    } else if (isPauseSpeechMessage(request)) {
      console.log('[Talkient.SW] Pausing the speak...');
      isPaused = true;

      // If this is coming from a page unload event, we should stop completely rather than pause
      if (request.isPageUnload) {
        console.log(
          '[Talkient.SW] Page is unloading, stopping speech completely...',
        );
        chrome.tts.stop();
        isPaused = false;
        currentText = '';
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
    } else if (isOpenOptionsMessage(request)) {
      console.log('[Talkient.SW] Opening options page...');
      void chrome.runtime.openOptionsPage();
      if (chrome.runtime.lastError) {
        console.error(
          '[Talkient.SW] Error opening options page:',
          chrome.runtime.lastError,
        );
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        sendResponse({ success: true });
      }
    } else if (isReloadPlayButtonsMessage(request)) {
      console.log('[Talkient.SW] Reloading play buttons...');
      // Forward the request to the content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { type: 'RELOAD_PLAY_BUTTONS' },
            (_response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  '[Talkient.SW] Error sending reload message:',
                  chrome.runtime.lastError,
                );
                sendResponse({
                  success: false,
                  error: chrome.runtime.lastError,
                });
              } else {
                sendResponse({ success: true });
              }
            },
          );
        } else {
          sendResponse({ success: false, error: 'No active tab found' });
        }
      });
    } else {
      // Exhaustive check - this should never be reached if all message types are handled
      const _exhaustiveCheck: never = request;
      console.warn(
        `[Talkient.SW] Event ${(_exhaustiveCheck as ExtendedServiceWorkerMessage).type} not implemented`,
      );
    }

    return true;
  },
);

// Track active tab for managing speech
chrome.tabs.onActivated.addListener((activeInfo) => {
  activeTabId = activeInfo.tabId;
});

// Stop speech when tab is refreshed or closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    console.log('[Talkient.SW] Active tab closed, stopping speech...');
    chrome.tts.stop();
    isPaused = false;
    currentText = '';
    activeTabId = null;
  }
});

// Also stop speech when tab is updated (refreshed)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId === activeTabId && changeInfo.status === 'loading') {
    console.log('[Talkient.SW] Active tab refreshed, stopping speech...');
    chrome.tts.stop();
    isPaused = false;
    currentText = '';
  }
});
