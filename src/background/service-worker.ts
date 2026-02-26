import {
  isSpeakTextMessage,
  isPauseSpeechMessage,
  isOpenOptionsMessage,
  isReloadPlayButtonsMessage,
  isSignInMessage,
  isSignOutMessage,
  isGetAuthStateMessage,
  type ExtendedServiceWorkerMessage,
} from '../shared/types/messages';
import {
  handleSignIn,
  handleSignOut,
  handleGetAuthState,
} from '../features/auth/background/message-handler';
import { checkTtsAvailability } from '../features/tts-playback/background/tts-engine';
import {
  handleSpeakText,
  handlePauseSpeech,
} from '../features/tts-playback/background/message-handler';
import {
  setupContextMenu,
  setupContextMenuClickHandler,
} from '../features/tts-playback/background/context-menu';
import { setupTabListeners } from './tab-manager';

console.log('Service Worker for Talkient Extension');

// Check TTS availability on startup
checkTtsAvailability();

// Initialize context menu
setupContextMenu();
setupContextMenuClickHandler();

// Initialize tab lifecycle listeners
setupTabListeners();

chrome.runtime.onMessage.addListener(
  (request: ExtendedServiceWorkerMessage, sender, sendResponse) => {
    console.log('[Talkient.SW] Firing a request type of ', request.type);

    // Handle authentication messages
    if (isSignInMessage(request)) {
      console.log('[Talkient.SW] Processing sign-in request...');
      void handleSignIn(request.interactive !== false, sendResponse);
      return true; // Keep channel open for async response
    }

    if (isSignOutMessage(request)) {
      console.log('[Talkient.SW] Processing sign-out request...');
      void handleSignOut(sendResponse);
      return true;
    }

    if (isGetAuthStateMessage(request)) {
      console.log('[Talkient.SW] Getting auth state...');
      void handleGetAuthState(sendResponse);
      return true;
    }

    if (isSpeakTextMessage(request)) {
      handleSpeakText(request, sender, sendResponse);
    } else if (isPauseSpeechMessage(request)) {
      handlePauseSpeech(request, sendResponse);
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
