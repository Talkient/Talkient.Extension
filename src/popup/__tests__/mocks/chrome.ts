// Jest mock for Chrome APIs used in popup.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

(global as any).chrome = {
  runtime: {
    openOptionsPage: jest.fn(),
  },
  tabs: {
    create: jest.fn(),
  },
};
