/* eslint-disable @typescript-eslint/no-explicit-any */
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
(global as any).requestAnimationFrame = jest.fn(
  (callback: FrameRequestCallback) => {
    return setTimeout(callback, 0);
  },
);

// Mock cancelAnimationFrame
(global as any).cancelAnimationFrame = jest.fn((id: number) => {
  clearTimeout(id);
});

// Mock window.scrollTo (not implemented in jsdom)
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn((options?: ScrollToOptions | number, y?: number) => {
    // Handle both object form: scrollTo({ top, left, behavior })
    // and legacy form: scrollTo(x, y)
    if (typeof options === 'object' && options !== null) {
      // Object form - update scroll position if needed for tests
      if (options.top !== undefined) {
        window.scrollY = options.top;
      }
      if (options.left !== undefined) {
        window.scrollX = options.left;
      }
    } else if (typeof options === 'number') {
      // Legacy form
      window.scrollX = options;
      if (typeof y === 'number') {
        window.scrollY = y;
      }
    }
  }),
  writable: true,
  configurable: true,
});
