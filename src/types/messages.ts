/// <reference types="chrome" />

/**
 * Message types for communication between content scripts and service worker
 */

// Message types sent from content scripts to service worker
export interface SpeakTextMessage {
  type: "SPEAK_TEXT";
  text: string;
}

export interface PauseSpeechMessage {
  type: "PAUSE_SPEECH";
  isPageUnload?: boolean;
}

export interface OpenOptionsMessage {
  type: "OPEN_OPTIONS";
}

export interface ReloadPlayButtonsMessage {
  type: "RELOAD_PLAY_BUTTONS";
}

// Union type for all messages to service worker
export type ServiceWorkerMessage =
  | SpeakTextMessage
  | PauseSpeechMessage
  | OpenOptionsMessage
  | ReloadPlayButtonsMessage;

// Message types sent from service worker to content scripts
export interface SpeechEndedMessage {
  type: "SPEECH_ENDED";
  autoPlayNext: boolean;
}

export interface SpeechCancelledMessage {
  type: "SPEECH_CANCELLED";
}

export interface SpeechErrorMessage {
  type: "SPEECH_ERROR";
  error: string | chrome.tts.TtsEvent;
}

// Union type for all messages from service worker
export type ContentScriptMessage =
  | SpeechEndedMessage
  | SpeechCancelledMessage
  | SpeechErrorMessage
  | ReloadPlayButtonsMessage;

// Response types
export interface SuccessResponse {
  success: true;
}

export interface ErrorResponse {
  success: false;
  error?: string | chrome.runtime.LastError;
  disabled?: boolean;
}

export type MessageResponse = SuccessResponse | ErrorResponse;

// Type guard functions
export function isSpeakTextMessage(
  message: unknown,
): message is SpeakTextMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as SpeakTextMessage).type === "SPEAK_TEXT" &&
    typeof (message as SpeakTextMessage).text === "string"
  );
}

export function isPauseSpeechMessage(
  message: unknown,
): message is PauseSpeechMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as PauseSpeechMessage).type === "PAUSE_SPEECH"
  );
}

export function isOpenOptionsMessage(
  message: unknown,
): message is OpenOptionsMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as OpenOptionsMessage).type === "OPEN_OPTIONS"
  );
}

export function isReloadPlayButtonsMessage(
  message: unknown,
): message is ReloadPlayButtonsMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as ReloadPlayButtonsMessage).type === "RELOAD_PLAY_BUTTONS"
  );
}
