/// <reference lib="dom" />

/**
 * Tests for print behavior - ensuring Talkient UI elements are removed
 * when the user opens the print dialog and restored after closing it.
 */

import {
  createControlPanel,
  isControlPanelVisible,
} from '../../features/control-panel/content/panel-ui';

import {
  processTextElements,
  clearHighlight,
  setButtonPosition,
  setMinimumWords,
  setMaxNodesProcessed,
} from '../content-lib';

// Mock icons (used by panel-controller)
jest.mock('../../features/assets/content/icons', () => ({
  getSvgIcon: jest.fn((name: string) => `<svg data-icon="${name}"></svg>`),
  isSvgPlayIcon: jest.fn(() => false),
  isSvgPauseIcon: jest.fn(() => false),
}));

// Mock runtime-utils
const mockSafeSendMessage = jest.fn((message, callback) => {
  if (callback) {
    callback({ success: true });
  }
  return true;
});

jest.mock('../runtime-utils', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  safeSendMessage: (message: any, callback?: any) =>
    mockSafeSendMessage(message, callback),
  isExtensionContextValid: jest.fn(() => true),
}));

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn((message, callback) => {
      if (callback) {
        callback({ success: true });
      }
    }),
    lastError: null,
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        // Return default values for all settings
        callback({
          highlightStyle: 'default',
          minimumWords: 3,
          maxNodesProcessed: 1000,
          buttonPosition: 'left',
          playButtonsEnabled: true,
          speechRate: 1.0,
        });
      }),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
};

// @ts-expect-error - Mocking Chrome API
global.chrome = mockChrome;

// Mock requestAnimationFrame to be synchronous for testing
global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  callback(0);
  return 1;
});

/**
 * Simulates the beforeprint event handler from content.ts
 * This is what the actual content.ts does when the print dialog opens
 */
function simulateBeforePrint(): void {
  // Stop any ongoing speech
  mockSafeSendMessage({ type: 'PAUSE_SPEECH' }, undefined);

  // Remove control panel
  const controlPanel = document.getElementById('talkient-control-panel');
  if (controlPanel) {
    controlPanel.remove();
  }

  // Remove all play buttons
  document.querySelectorAll('.talkient-play-button').forEach((button) => {
    button.remove();
  });

  // Remove processed markers so elements can be re-processed after print
  document.querySelectorAll('.talkient-processed').forEach((el) => {
    el.classList.remove('talkient-processed');
  });

  // Clear any highlights
  clearHighlight();
}

/**
 * Simulates the afterprint event handler from content.ts
 * This is what the actual content.ts does when the print dialog closes
 */
async function simulateAfterPrint(): Promise<void> {
  // Re-create control panel
  createControlPanel();

  // Check if play buttons are enabled before re-processing
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockChrome.storage.local.get(['playButtonsEnabled'], (result: any) => {
      const isEnabled = result.playButtonsEnabled !== false;
      if (isEnabled) {
        processTextElements();
      }
      resolve();
    });
  });
}

describe('Print Behavior', () => {
  beforeEach(async () => {
    // Reset DOM with article element
    document.body.innerHTML = `
      <article>
        <p id="para1">This is a test paragraph with enough words to be processed.</p>
        <p id="para2">Another paragraph with sufficient content for testing purposes.</p>
        <p id="para3">Third paragraph to ensure we have multiple elements to work with.</p>
      </article>
    `;

    // Reset mocks
    jest.clearAllMocks();
    mockSafeSendMessage.mockClear();

    // Reset storage mock to default enabled state
    mockChrome.storage.local.get.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (keys: any, callback: any) => {
        callback({
          highlightStyle: 'default',
          minimumWords: 3,
          maxNodesProcessed: 1000,
          buttonPosition: 'left',
          playButtonsEnabled: true,
          speechRate: 1.0,
        });
      },
    );

    // Initialize settings directly (synchronous)
    setMinimumWords(3);
    setMaxNodesProcessed(1000);
    setButtonPosition('left');
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  describe('beforeprint event handler', () => {
    test('should remove control panel when print dialog opens', () => {
      // Create control panel
      createControlPanel();
      expect(isControlPanelVisible()).toBe(true);

      // Simulate beforeprint event handler
      simulateBeforePrint();

      // Control panel should be removed
      expect(isControlPanelVisible()).toBe(false);
    });

    test('should remove all play buttons when print dialog opens', () => {
      // Process text elements to add play buttons
      processTextElements();

      // Verify play buttons exist
      const playButtonsBefore = document.querySelectorAll(
        '.talkient-play-button',
      );
      expect(playButtonsBefore.length).toBeGreaterThan(0);

      // Simulate beforeprint event handler
      simulateBeforePrint();

      // Play buttons should be removed
      const playButtonsAfter = document.querySelectorAll(
        '.talkient-play-button',
      );
      expect(playButtonsAfter.length).toBe(0);
    });

    test('should clear highlights when print dialog opens', () => {
      // Create a test element and highlight it directly
      const testElement = document.createElement('span');
      testElement.textContent = 'Test highlighted text';
      testElement.classList.add('talkient-highlighted');
      document.body.appendChild(testElement);

      // Verify highlight class exists
      const highlightBefore = document.querySelector('.talkient-highlighted');
      expect(highlightBefore).not.toBeNull();

      // Simulate beforeprint event handler
      simulateBeforePrint();

      // Highlight should be cleared (clearHighlight removes the class)
      const highlightAfter = document.querySelector('.talkient-highlighted');
      expect(highlightAfter).toBeNull();
    });

    test('should send PAUSE_SPEECH message when print dialog opens', () => {
      // Simulate beforeprint event handler
      simulateBeforePrint();

      // Should have sent PAUSE_SPEECH message
      expect(mockSafeSendMessage).toHaveBeenCalledWith(
        { type: 'PAUSE_SPEECH' },
        undefined,
      );
    });
  });

  describe('afterprint event handler', () => {
    test('should restore control panel after print dialog closes', async () => {
      // Create control panel first
      createControlPanel();
      expect(isControlPanelVisible()).toBe(true);

      // Simulate print dialog opening
      simulateBeforePrint();
      expect(isControlPanelVisible()).toBe(false);

      // Simulate print dialog closing
      await simulateAfterPrint();

      // Control panel should be restored
      expect(isControlPanelVisible()).toBe(true);
    });

    test('should restore play buttons after print dialog closes when enabled', async () => {
      // Process text elements first
      processTextElements();
      const initialButtonCount = document.querySelectorAll(
        '.talkient-play-button',
      ).length;
      expect(initialButtonCount).toBeGreaterThan(0);

      // Simulate print dialog opening (removes buttons AND processed markers)
      simulateBeforePrint();
      expect(document.querySelectorAll('.talkient-play-button').length).toBe(0);
      expect(document.querySelectorAll('.talkient-processed').length).toBe(0);

      // Simulate print dialog closing
      createControlPanel();
      processTextElements();

      // Play buttons should be restored
      const restoredButtonCount = document.querySelectorAll(
        '.talkient-play-button',
      ).length;
      expect(restoredButtonCount).toBeGreaterThan(0);
    });

    test('should not restore play buttons after print if they were disabled', async () => {
      // Mock storage to return playButtonsEnabled: false
      mockChrome.storage.local.get.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (keys: any, callback: any) => {
          callback({
            highlightStyle: 'default',
            minimumWords: 3,
            maxNodesProcessed: 1000,
            buttonPosition: 'left',
            playButtonsEnabled: false,
            speechRate: 1.0,
          });
        },
      );

      // Simulate print dialog opening and closing
      simulateBeforePrint();
      await simulateAfterPrint();

      // Play buttons should NOT be restored when disabled
      const restoredButtonCount = document.querySelectorAll(
        '.talkient-play-button',
      ).length;
      expect(restoredButtonCount).toBe(0);
    });
  });

  describe('complete print workflow', () => {
    test('should handle complete print workflow: open -> close -> UI restored', async () => {
      // Setup: Create control panel and process text elements
      createControlPanel();
      processTextElements();

      // Verify initial state
      expect(isControlPanelVisible()).toBe(true);
      const initialPlayButtons = document.querySelectorAll(
        '.talkient-play-button',
      ).length;
      expect(initialPlayButtons).toBeGreaterThan(0);

      // Step 1: User opens print dialog (beforeprint)
      simulateBeforePrint();

      // Verify UI is removed (including processed markers)
      expect(isControlPanelVisible()).toBe(false);
      expect(document.querySelectorAll('.talkient-play-button').length).toBe(0);
      expect(document.querySelectorAll('.talkient-processed').length).toBe(0);

      // Step 2: User closes print dialog (afterprint)
      createControlPanel();
      processTextElements();

      // Verify UI is restored
      expect(isControlPanelVisible()).toBe(true);
      expect(
        document.querySelectorAll('.talkient-play-button').length,
      ).toBeGreaterThan(0);
    });

    test('should handle multiple print dialog open/close cycles', async () => {
      // Setup
      createControlPanel();
      processTextElements();

      // First cycle
      simulateBeforePrint();
      expect(isControlPanelVisible()).toBe(false);

      await simulateAfterPrint();
      expect(isControlPanelVisible()).toBe(true);

      // Second cycle
      simulateBeforePrint();
      expect(isControlPanelVisible()).toBe(false);

      await simulateAfterPrint();
      expect(isControlPanelVisible()).toBe(true);

      // Third cycle
      simulateBeforePrint();
      expect(isControlPanelVisible()).toBe(false);

      await simulateAfterPrint();
      expect(isControlPanelVisible()).toBe(true);
    });

    test('should preserve article content during print workflow', async () => {
      // Setup
      createControlPanel();
      processTextElements();

      // Get original article text content (without Talkient elements)
      const para1Text =
        'This is a test paragraph with enough words to be processed.';
      const para2Text =
        'Another paragraph with sufficient content for testing purposes.';
      const para3Text =
        'Third paragraph to ensure we have multiple elements to work with.';

      // Run print workflow
      simulateBeforePrint();
      await simulateAfterPrint();

      // Verify article content is still intact
      const article = document.querySelector('article');
      expect(article).not.toBeNull();
      expect(article?.textContent).toContain(para1Text);
      expect(article?.textContent).toContain(para2Text);
      expect(article?.textContent).toContain(para3Text);
    });
  });

  describe('edge cases', () => {
    test('should handle beforeprint when no UI elements exist', () => {
      // Don't create any UI elements
      expect(isControlPanelVisible()).toBe(false);
      expect(document.querySelectorAll('.talkient-play-button').length).toBe(0);

      // Should not throw when simulating beforeprint
      expect(() => simulateBeforePrint()).not.toThrow();
    });

    test('should handle afterprint on page without article element', async () => {
      // Remove article element
      document.body.innerHTML = '<div><p>No article here</p></div>';

      // Should not throw when simulating afterprint
      await expect(simulateAfterPrint()).resolves.not.toThrow();

      // Control panel should NOT be created (no article)
      expect(isControlPanelVisible()).toBe(false);
    });
  });
});
