// Jest mock for Chrome APIs used in options.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

(global as any).chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
  tts: {
    getVoices: jest.fn(),
  },
};
