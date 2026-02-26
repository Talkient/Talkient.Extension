/**
 * @jest-environment jsdom
 */

import './mocks/chrome';

describe('Minimum words setting', () => {
  let minimumWordsInput: HTMLInputElement;

  beforeEach(async () => {
    // Reset DOM
    document.body.innerHTML = '';

    // Load the actual options.html content
    const fs = require('fs');
    const path = require('path');
    const htmlPath = path.join(__dirname, '../options/options.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Parse the HTML and extract the body content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;

    // Get references to elements
    minimumWordsInput = document.getElementById(
      'minimum-words-input',
    ) as HTMLInputElement;

    // Mock Chrome storage with default values
    (chrome.storage.local.get as jest.Mock).mockImplementation(
      (keys, callback) => {
        callback({
          selectedVoice: 'default',
          speechRate: 1.1,
          speechPitch: 1.2,
          highlightStyle: 'default',
          autoPlayNext: false,
          minimumWords: 3, // Default value
          maxNodesProcessed: 1000, // Default value
        });
      },
    );

    (chrome.storage.local.set as jest.Mock).mockImplementation(
      (obj, callback) => {
        if (callback) callback();
      },
    );

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('HTML structure for minimum words', () => {
    it('should have the minimum words input element in DOM', () => {
      expect(minimumWordsInput).toBeTruthy();
      expect(minimumWordsInput.id).toBe('minimum-words-input');
      expect(minimumWordsInput.type).toBe('number');
    });

    it('should have correct attributes for minimum words input', () => {
      expect(minimumWordsInput.min).toBe('1');
      expect(minimumWordsInput.step).toBe('1');
    });

    it('should have setting label for minimum words', () => {
      const minimumWordsLabel = document.querySelector(
        '.setting-row:has(#minimum-words-input) .setting-label',
      );
      expect(minimumWordsLabel).toBeTruthy();
      expect(minimumWordsLabel?.textContent).toBe('Minimum words');
    });
  });

  describe('storage restoration for minimum words', () => {
    beforeEach(() => {
      // Load the options script
      require('../options/options-ui');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should restore minimum words from storage', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        expect.arrayContaining(['minimumWords']),
        expect.any(Function),
      );

      expect(minimumWordsInput.value).toBe('3');
    });

    it('should default to 3 when minimum words is not stored', async () => {
      // Mock storage with missing minimum words setting
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys, callback) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1.0,
            speechPitch: 1.0,
            highlightStyle: 'default',
            autoPlayNext: false,
            // minimumWords is missing
          });
        },
      );

      // Reload the module and trigger DOMContentLoaded
      jest.resetModules();
      require('../options/options-ui');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(minimumWordsInput.value).toBe('3');
    });
  });

  describe('save settings behavior for minimum words', () => {
    beforeEach(() => {
      // Load the options script
      require('../options/options-ui');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should save minimum words to storage when changed', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Change minimum words input
      minimumWordsInput.value = '5';
      const changeEvent = new Event('input');
      minimumWordsInput.dispatchEvent(changeEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        minimumWords: 5,
      });
    });

    it('should handle minimum value (1)', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      minimumWordsInput.value = '1';
      const inputEvent = new Event('input');
      minimumWordsInput.dispatchEvent(inputEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        minimumWords: 1,
      });
    });

    it('should show status message when minimum words is saved', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const statusDiv = document.getElementById('status') as HTMLDivElement;
      expect(statusDiv).toBeTruthy();

      minimumWordsInput.value = '3';
      const inputEvent = new Event('input');
      minimumWordsInput.dispatchEvent(inputEvent);

      expect(statusDiv.textContent).toBe('Minimum words setting saved!');
      expect(statusDiv.classList.contains('visible')).toBe(true);
      expect(statusDiv.classList.contains('success')).toBe(true);
    });
  });
});
