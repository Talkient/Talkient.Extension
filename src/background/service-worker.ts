console.log('Service Worker for Talkient Extension');

// State management for TTS
let isPaused = false;
let currentText = '';
let availableVoices: chrome.tts.TtsVoice[] = [];

// Get available voices
chrome.tts.getVoices((voices) => {
  availableVoices = voices;
  console.log('[Talkient.SW] Available voices:', voices);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Talkient.SW] Firing a request type of ', request.type);

  if (request.type === 'SPEAK_TEXT') {
    console.log('[Talkient.SW] Starting to speak... ');

    if (isPaused && currentText === request.text) {
      // Resume paused speech
      console.log('[Talkient.SW] Resuming paused speech...');
      chrome.tts.resume();
      isPaused = false;
    } else {
      currentText = request.text;

      // TODO: Comunicate the settings directly between service-worker and options scripts without need to fetch from storage
      chrome.storage.local.get(
        ['selectedVoice', 'speechRate', 'speechPitch'],
        (result) => {
          const selectedVoice = result.selectedVoice;
          const speechRate =
            typeof result.speechRate === 'number' ? result.speechRate : 1.0;
          const speechPitch =
            typeof result.speechPitch === 'number' ? result.speechPitch : 1.0;

          console.log('[Talkient.SW] Selected voice:', selectedVoice);
          console.log('[Talkient.SW] Speech rate:', speechRate);
          console.log('[Talkient.SW] Speech pitch:', speechPitch);

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
                  break;
                case 'end':
                  // Check if auto play next is enabled
                  chrome.storage.local.get(['autoPlayNext'], (result) => {
                    const autoPlayNext = result.autoPlayNext || false;
                    // Notify content script that speech has ended
                    chrome.tabs.sendMessage(sender.tab?.id!, {
                      type: 'SPEECH_ENDED',
                      autoPlayNext: autoPlayNext,
                    });
                  });
                  isPaused = false;
                  currentText = '';
                  break;
                case 'pause':
                  isPaused = true;
                  break;
                case 'cancelled':
                  isPaused = true;
                  break;
                case 'resume':
                  isPaused = false;
                  break;
                case 'interrupted':
                  chrome.tts.stop();
                  break;
                default:
                  console.warn(
                    '[Talkient.SW] not handled tts.speak event: ',
                    event
                  );
                  break;
              }
            },
          };
          chrome.tts.speak(request.text, ttsOptions);
        }
      );
    }
    sendResponse({ success: true });
  } else if (request.type === 'PAUSE_SPEECH') {
    console.log('[Talkient.SW] Pausing the speak...');
    isPaused = true;
    chrome.tts.pause();
    sendResponse({ success: true });
  } else if (request.type === 'GA4_EVENT' && request.event) {
    // TODO: Remove or implement GA4 event tracking
    console.warn('[Talkient.SW] GA4 Event not implemented');
    sendResponse({ success: true });
  }
  return true;
});
