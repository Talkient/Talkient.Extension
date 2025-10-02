/// <reference types="jest" />

import { isExtensionContextValid, safeSendMessage } from '../runtime-utils';

// Mock chrome runtime
const mockChrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: jest.fn(),
    lastError: undefined as chrome.runtime.LastError | undefined,
  },
};

// Assign mock to global
(global as any).chrome = mockChrome;

describe('runtime-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChrome.runtime.lastError = undefined;
    mockChrome.runtime.id = 'test-extension-id';
  });

  describe('isExtensionContextValid', () => {
    it('should return true when runtime.id exists', () => {
      expect(isExtensionContextValid()).toBe(true);
    });

    it('should return false when runtime.id is undefined', () => {
      mockChrome.runtime.id = undefined as any;
      expect(isExtensionContextValid()).toBe(false);
    });

    it('should return false when runtime is undefined', () => {
      const originalRuntime = mockChrome.runtime;
      (mockChrome as any).runtime = undefined;
      expect(isExtensionContextValid()).toBe(false);
      mockChrome.runtime = originalRuntime;
    });

    it('should handle errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Make runtime.id throw an error when accessed
      Object.defineProperty(mockChrome.runtime, 'id', {
        get: () => {
          throw new Error('Extension context invalidated');
        },
        configurable: true,
      });

      expect(isExtensionContextValid()).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();

      // Restore
      Object.defineProperty(mockChrome.runtime, 'id', {
        value: 'test-extension-id',
        configurable: true,
        writable: true,
      });
      consoleWarnSpy.mockRestore();
    });
  });

  describe('safeSendMessage', () => {
    it('should send message successfully when context is valid', () => {
      const callback = jest.fn();
      const message = { type: 'TEST_MESSAGE' };

      mockChrome.runtime.sendMessage.mockImplementation((msg, cb) => {
        cb({ success: true });
      });

      const result = safeSendMessage(message, callback);

      expect(result).toBe(true);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        message,
        expect.any(Function)
      );
    });

    it('should not send message when context is invalid', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockChrome.runtime.id = undefined as any;

      const callback = jest.fn();
      const message = { type: 'TEST_MESSAGE' };

      const result = safeSendMessage(message, callback);

      expect(result).toBe(false);
      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
      expect(callback).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
      mockChrome.runtime.id = 'test-extension-id';
    });

    it('should handle chrome.runtime.lastError for context invalidation', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const callback = jest.fn();
      const message = { type: 'TEST_MESSAGE' };

      mockChrome.runtime.sendMessage.mockImplementation((msg, cb) => {
        mockChrome.runtime.lastError = {
          message: 'Extension context invalidated',
        };
        cb(undefined);
      });

      const result = safeSendMessage(message, callback);

      expect(result).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Extension context was invalidated')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle chrome.runtime.lastError for message port closed', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const callback = jest.fn();
      const message = { type: 'TEST_MESSAGE' };

      mockChrome.runtime.sendMessage.mockImplementation((msg, cb) => {
        mockChrome.runtime.lastError = {
          message: 'The message port closed before a response was received',
        };
        cb(undefined);
      });

      const result = safeSendMessage(message, callback);

      expect(result).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Extension context was invalidated')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle other chrome.runtime.lastError types', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const callback = jest.fn();
      const message = { type: 'TEST_MESSAGE' };

      mockChrome.runtime.sendMessage.mockImplementation((msg, cb) => {
        mockChrome.runtime.lastError = {
          message: 'Some other error',
        };
        cb(undefined);
      });

      const result = safeSendMessage(message, callback);

      expect(result).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error sending message'),
        mockChrome.runtime.lastError
      );

      consoleErrorSpy.mockRestore();
    });

    it('should call callback with response when no error', () => {
      const callback = jest.fn();
      const message = { type: 'TEST_MESSAGE' };
      const response = { success: true, data: 'test' };

      mockChrome.runtime.sendMessage.mockImplementation((msg, cb) => {
        cb(response);
      });

      safeSendMessage(message, callback);

      expect(callback).toHaveBeenCalledWith(response);
    });

    it('should work without a callback', () => {
      const message = { type: 'TEST_MESSAGE' };

      mockChrome.runtime.sendMessage.mockImplementation((msg, cb) => {
        cb({ success: true });
      });

      const result = safeSendMessage(message);

      expect(result).toBe(true);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled();
    });

    it('should handle exceptions during sendMessage', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const callback = jest.fn();
      const message = { type: 'TEST_MESSAGE' };

      mockChrome.runtime.sendMessage.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = safeSendMessage(message, callback);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send message'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
