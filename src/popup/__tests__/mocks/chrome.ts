// Jest mock for Chrome APIs used in popup.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

(global as any).chrome = {
  runtime: {
    openOptionsPage: jest.fn(),
  },
  tabs: {
    create: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn(
        (
          _keys: string[],
          callback: (result: Record<string, unknown>) => void,
        ) => {
          callback({});
        },
      ),
      set: jest.fn(),
    },
  },
  tts: {
    getVoices: jest.fn((callback: (voices: chrome.tts.TtsVoice[]) => void) => {
      callback([]);
    }),
  },
};
