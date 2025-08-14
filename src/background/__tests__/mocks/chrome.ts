// Jest mock for Chrome APIs used in service-worker.ts

(global as any).chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
    session: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  tts: {
    speak: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    getVoices: jest.fn((callback) => callback([])),
  },
  tabs: {
    sendMessage: jest.fn(),
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
  },
};
