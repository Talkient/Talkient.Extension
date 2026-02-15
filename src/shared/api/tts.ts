/// <reference types="chrome" />

/**
 * Type-safe wrapper for chrome.tts API
 */

/**
 * Get all available TTS voices
 * @returns Promise resolving to array of available voices
 */
export async function getVoices(): Promise<chrome.tts.TtsVoice[]> {
  return new Promise((resolve, reject) => {
    if (!chrome.tts) {
      reject(new Error('Chrome TTS API is not available'));
      return;
    }

    chrome.tts.getVoices((voices) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(voices || []);
      }
    });
  });
}

/**
 * Speak text using TTS
 * @param text - Text to speak
 * @param options - TTS options
 * @returns Promise resolving when speech starts
 */
export async function speak(
  text: string,
  options?: chrome.tts.TtsOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!chrome.tts) {
      reject(new Error('Chrome TTS API is not available'));
      return;
    }

    chrome.tts.speak(text, options || {}, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Stop current speech
 */
export function stop(): void {
  if (chrome.tts) {
    chrome.tts.stop();
  }
}

/**
 * Pause current speech
 */
export function pause(): void {
  if (chrome.tts) {
    chrome.tts.pause();
  }
}

/**
 * Resume paused speech
 */
export function resume(): void {
  if (chrome.tts) {
    chrome.tts.resume();
  }
}

/**
 * Check if speech is currently speaking
 * @returns Promise resolving to true if speaking
 */
export async function isSpeaking(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!chrome.tts) {
      resolve(false);
      return;
    }

    chrome.tts.isSpeaking((speaking) => {
      resolve(speaking);
    });
  });
}
