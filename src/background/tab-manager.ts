import { resetSpeechState } from '../features/tts-playback/background/tts-engine';

let activeTabId: number | null = null;

export function getActiveTabId(): number | null {
  return activeTabId;
}

export function setActiveTabId(id: number | null): void {
  activeTabId = id;
}

export function setupTabListeners(): void {
  chrome.tabs.onActivated.addListener((activeInfo) => {
    activeTabId = activeInfo.tabId;
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === activeTabId) {
      console.log('[Talkient.SW] Active tab closed, stopping speech...');
      chrome.tts.stop();
      resetSpeechState();
      activeTabId = null;
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId === activeTabId && changeInfo.status === 'loading') {
      console.log('[Talkient.SW] Active tab refreshed, stopping speech...');
      chrome.tts.stop();
      resetSpeechState();
    }
  });
}
