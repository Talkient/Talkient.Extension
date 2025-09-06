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
    speak: jest.fn().mockImplementation((text, options) => {
      // Mock successful speak operation
      if (options && options.onEvent) {
        // Return some simulated events if needed in tests
        //options.onEvent({ type: 'start' });
      }
    }),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    getVoices: jest.fn((callback) =>
      callback([
        {
          voiceName: 'Google UK English Male',
          lang: 'en-GB',
        },
      ])
    ),
  },
  tabs: {
    sendMessage: jest.fn(),
    query: jest.fn(),
    onActivated: {
      addListener: jest.fn(),
    },
    onRemoved: {
      addListener: jest.fn(),
    },
    onUpdated: {
      addListener: jest.fn(),
    },
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    openOptionsPage: jest.fn(),
    lastError: undefined,
  },
};
