console.log('Service Worker for Talkient Extension');

// State management for TTS
let isPaused = false;
let currentText = '';
let availableVoices: chrome.tts.TtsVoice[] = [];
let ttsAvailable = false;
let activeTabId: number | null = null;

// Function to check if TTS is available
function checkTtsAvailability() {
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
        chrome.runtime.lastError
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Talkient.SW] Firing a request type of ', request.type);

  if (request.type === 'SPEAK_TEXT') {
    console.log('[Talkient.SW] Starting to speak... ');

    // Store the tab ID that started speech
    if (sender.tab?.id) {
      activeTabId = sender.tab.id;
    }

    // Always stop current speech when starting a new one with different text
    if (currentText !== '' && currentText !== request.text) {
      console.log(
        '[Talkient.SW] Playing new audio, stopping current speech...'
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
          chrome.tabs.sendMessage(sender.tab.id, {
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
          chrome.runtime.lastError
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
              chrome.runtime.lastError
            );
            return;
          }

          const selectedVoice = result.selectedVoice;
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
                    chrome.tabs.sendMessage(sender.tab.id, {
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
                        JSON.stringify(chrome.runtime.lastError)
                      );
                      return;
                    }
                    const autoPlayNext = result.autoPlayNext || false;
                    // Notify content script that speech has ended
                    if (sender.tab?.id) {
                      chrome.tabs.sendMessage(sender.tab.id, {
                        type: 'SPEECH_ENDED',
                        autoPlayNext: autoPlayNext,
                      });
                      if (chrome.runtime.lastError) {
                        console.error(
                          '[Talkient.SW] Error sending message to content script:',
                          chrome.runtime.lastError
                        );
                      }
                    } else {
                      console.error(
                        '[Talkient.SW] Cannot send SPEECH_ENDED: No tab ID'
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
                    chrome.tabs.sendMessage(sender.tab.id, {
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
                      JSON.stringify(chrome.runtime.lastError)
                    );
                  }
                  break;
                default:
                  console.warn(
                    '[Talkient.SW] not handled tts.speak event: ',
                    JSON.stringify(event)
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
              '[Talkient.SW] Error: Empty or invalid text provided'
            );
            sendResponse({ success: false, error: 'Empty or invalid text' });
            return;
          }

          console.log(
            '[Talkient.SW] Speaking text (length: ' +
              request.text.length +
              '):',
            request.text.substring(0, 50) +
              (request.text.length > 50 ? '...' : '')
          );

          // Ensure we have a valid voice before attempting to speak
          if (
            ttsOptions.voiceName &&
            !availableVoices.some((v) => v.voiceName === ttsOptions.voiceName)
          ) {
            console.warn(
              '[Talkient.SW] Selected voice not found in available voices, using default'
            );
            delete ttsOptions.voiceName; // Let the browser use default voice
          }

          chrome.tts.speak(request.text, ttsOptions);
          if (chrome.runtime.lastError) {
            console.error(
              '[Talkient.SW] Error speaking text:',
              chrome.runtime.lastError
            );
          }
        }
      );
    }
    sendResponse({ success: true });
  } else if (request.type === 'PAUSE_SPEECH') {
    console.log('[Talkient.SW] Pausing the speak...');
    isPaused = true;

    // If this is coming from a page unload event, we should stop completely rather than pause
    if (request.isPageUnload) {
      console.log(
        '[Talkient.SW] Page is unloading, stopping speech completely...'
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
        chrome.runtime.lastError
      );
    }
    sendResponse({ success: true });
  } else if (request.type === 'OPEN_OPTIONS') {
    console.log('[Talkient.SW] Opening options page...');
    chrome.runtime.openOptionsPage();
    if (chrome.runtime.lastError) {
      console.error(
        '[Talkient.SW] Error opening options page:',
        chrome.runtime.lastError
      );
      sendResponse({ success: false, error: chrome.runtime.lastError });
    } else {
      sendResponse({ success: true });
    }
  } else if (request.type === 'RELOAD_PLAY_BUTTONS') {
    console.log('[Talkient.SW] Reloading play buttons...');
    // Forward the request to the content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'RELOAD_PLAY_BUTTONS' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                '[Talkient.SW] Error sending reload message:',
                chrome.runtime.lastError
              );
              sendResponse({ success: false, error: chrome.runtime.lastError });
            } else {
              sendResponse({ success: true });
            }
          }
        );
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
  } else console.warn(`[Talkient.SW] Event ${request.type} not implemented`);

  return true;
});

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
