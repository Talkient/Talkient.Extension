// TTS state management
let isPaused = false;
let currentText = '';
let availableVoices: chrome.tts.TtsVoice[] = [];
let ttsAvailable = false;

export function checkTtsAvailability(): void {
  if (!chrome.tts) {
    console.error('[Talkient.SW] Chrome TTS API is not available');
    ttsAvailable = false;
    return;
  }

  chrome.tts.getVoices((voices) => {
    if (chrome.runtime.lastError) {
      console.error(
        '[Talkient.SW] Error getting voices:',
        chrome.runtime.lastError,
      );
      ttsAvailable = false;
      return;
    }

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

export function getIsPaused(): boolean {
  return isPaused;
}

export function getCurrentText(): string {
  return currentText;
}

export function isTtsAvailable(): boolean {
  return ttsAvailable;
}

export function getAvailableVoices(): chrome.tts.TtsVoice[] {
  return availableVoices;
}

export function setIsPaused(value: boolean): void {
  isPaused = value;
}

export function setCurrentText(value: string): void {
  currentText = value;
}

export function resetSpeechState(): void {
  isPaused = false;
  currentText = '';
}
