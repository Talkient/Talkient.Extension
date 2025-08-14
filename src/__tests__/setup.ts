// Mock Chrome API for testing
(global as any).chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    lastError: null,
  },
};

// Mock console methods to reduce noise in tests
(global as any).console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock requestAnimationFrame
(global as any).requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  return setTimeout(callback, 0);
});

// Mock cancelAnimationFrame
(global as any).cancelAnimationFrame = jest.fn((id: number) => {
  clearTimeout(id);
}); 