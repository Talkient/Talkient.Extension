// Jest mock for Chrome APIs used in popup.ts

(global as any).chrome = {
  runtime: {
    openOptionsPage: jest.fn(),
  },
  tabs: {
    create: jest.fn(),
  },
};
