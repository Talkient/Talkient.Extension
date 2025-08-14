/**
 * @jest-environment jsdom
 */

import './mocks/chrome';

// Type declaration for chrome.tts.getVoices callback
type TtsVoice = {
  voiceName?: string;
  lang?: string;
  gender?: string;
  remote?: boolean;
  extensionId?: string;
  eventTypes?: string[];
};

describe('options.ts - using actual HTML', () => {
  let voiceSelect: HTMLSelectElement;
  let rateSlider: HTMLInputElement;
  let pitchSlider: HTMLInputElement;
  let rateValue: HTMLSpanElement;
  let pitchValue: HTMLSpanElement;
  let autoPlayNextToggle: HTMLInputElement;

  beforeEach(async () => {
    // Reset DOM
    document.body.innerHTML = '';

    // Load the actual options.html content
    const fs = require('fs');
    const path = require('path');
    const htmlPath = path.join(__dirname, '../options.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Parse the HTML and extract the body content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;

    // Get references to elements
    voiceSelect = document.getElementById('voice-select') as HTMLSelectElement;
    rateSlider = document.getElementById('rate-slider') as HTMLInputElement;
    pitchSlider = document.getElementById('pitch-slider') as HTMLInputElement;
    rateValue = document.getElementById('rate-value') as HTMLSpanElement;
    pitchValue = document.getElementById('pitch-value') as HTMLSpanElement;
    autoPlayNextToggle = document.getElementById(
      'auto-play-next-toggle'
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
        });
      }
    );

    (chrome.storage.local.set as jest.Mock).mockImplementation(
      (obj, callback) => {
        if (callback) callback();
      }
    );

    // Mock chrome.tts.getVoices with sample voices
    (chrome.tts.getVoices as jest.Mock).mockImplementation((callback) => {
      const mockVoices: TtsVoice[] = [
        { voiceName: 'Google UK English Male', lang: 'en-GB' },
        { voiceName: 'Google US English Female', lang: 'en-US' },
        { voiceName: 'Google Español', lang: 'es-ES' },
      ];
      callback(mockVoices);
    });

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('DOM structure from actual HTML', () => {
    it('should load the complete HTML structure', () => {
      // Check that the main container exists
      const container = document.querySelector('.container');
      expect(container).toBeTruthy();

      // Check that header exists
      const header = document.querySelector('header h1');
      expect(header?.textContent).toBe('Talkient Settings');

      // Check that setting groups exist
      const settingGroups = document.querySelectorAll('.setting-group');
      expect(settingGroups.length).toBeGreaterThan(0);
    });

    it('should find all required elements in the DOM', () => {
      expect(voiceSelect).toBeTruthy();
      expect(rateSlider).toBeTruthy();
      expect(pitchSlider).toBeTruthy();
      expect(rateValue).toBeTruthy();
      expect(pitchValue).toBeTruthy();
    });

    it('should have correct slider attributes from HTML', () => {
      // Check that sliders have the correct min/max from actual HTML
      expect(rateSlider.min).toBe('0.5');
      expect(rateSlider.max).toBe('2');
      expect(rateSlider.step).toBe('0.1');

      expect(pitchSlider.min).toBe('0.5');
      expect(pitchSlider.max).toBe('2');
      expect(pitchSlider.step).toBe('0.1');
    });

    it('should have default voice option in select', () => {
      // The HTML should have a default option
      const defaultOption = voiceSelect.querySelector(
        'option[value="default"]'
      );
      expect(defaultOption).toBeTruthy();
      expect(defaultOption?.textContent).toBe('Default Voice');
    });
  });

  describe('storage restoration', () => {
    beforeEach(() => {
      // Load the options script
      require('../options');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should restore settings from storage with default values', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        [
          'selectedVoice',
          'speechRate',
          'speechPitch',
          'highlightStyle',
          'autoPlayNext',
        ],
        expect.any(Function)
      );

      expect(rateSlider.value).toBe('1.1');
      expect(rateValue.textContent).toBe('1.1x');
      expect(pitchSlider.value).toBe('1.2');
      expect(pitchValue.textContent).toBe('1.2x');
    });

    it('should handle missing storage values gracefully', async () => {
      // Mock storage with missing values
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys, callback) => {
          callback({});
        }
      );

      // Reload the module and trigger DOMContentLoaded
      jest.resetModules();
      require('../options');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(rateSlider.value).toBe('1');
      expect(rateValue.textContent).toBe('1.0x');
      expect(pitchSlider.value).toBe('1');
      expect(pitchValue.textContent).toBe('1.0x');
    });
  });

  describe('speech rate functionality with actual HTML ranges', () => {
    beforeEach(() => {
      // Load the options script
      require('../options');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should handle minimum rate value (0.5 from HTML)', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      rateSlider.value = '0.5';
      const inputEvent = new Event('input');
      rateSlider.dispatchEvent(inputEvent);

      expect(rateValue.textContent).toBe('0.5x');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        speechRate: 0.5,
      });
    });

    it('should handle maximum rate value (2.0 from HTML)', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      rateSlider.value = '2.0';
      const inputEvent = new Event('input');
      rateSlider.dispatchEvent(inputEvent);

      expect(rateValue.textContent).toBe('2.0x');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        speechRate: 2.0,
      });
    });

    it('should update rate value display when slider changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      rateSlider.value = '1.5';
      const inputEvent = new Event('input');
      rateSlider.dispatchEvent(inputEvent);

      expect(rateValue.textContent).toBe('1.5x');
    });

    it('should save rate to storage when slider changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      rateSlider.value = '1.8';
      const inputEvent = new Event('input');
      rateSlider.dispatchEvent(inputEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        speechRate: 1.8,
      });
    });
  });

  describe('speech pitch functionality with actual HTML ranges', () => {
    beforeEach(() => {
      // Load the options script
      require('../options');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should handle minimum pitch value (0.5 from HTML)', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      pitchSlider.value = '0.5';
      const inputEvent = new Event('input');
      pitchSlider.dispatchEvent(inputEvent);

      expect(pitchValue.textContent).toBe('0.5x');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        speechPitch: 0.5,
      });
    });

    it('should handle maximum pitch value (2.0 from HTML)', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      pitchSlider.value = '2.0';
      const inputEvent = new Event('input');
      pitchSlider.dispatchEvent(inputEvent);

      expect(pitchValue.textContent).toBe('2.0x');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        speechPitch: 2.0,
      });
    });

    it('should update pitch value display when slider changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      pitchSlider.value = '1.3';
      const inputEvent = new Event('input');
      pitchSlider.dispatchEvent(inputEvent);

      expect(pitchValue.textContent).toBe('1.3x');
    });

    it('should save pitch to storage when slider changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      pitchSlider.value = '0.7';
      const inputEvent = new Event('input');
      pitchSlider.dispatchEvent(inputEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        speechPitch: 0.7,
      });
    });
  });

  describe('voice selection functionality', () => {
    beforeEach(() => {
      // Load the options script
      require('../options');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should populate voice options', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(chrome.tts.getVoices).toHaveBeenCalled();

      // Should have default option plus mock voices
      expect(voiceSelect.children.length).toBe(4);
      expect(voiceSelect.children[0].textContent).toBe('Default Voice');
      expect(voiceSelect.children[1].textContent).toBe(
        'Google UK English Male (en-GB)'
      );
      expect(voiceSelect.children[2].textContent).toBe(
        'Google US English Female (en-US)'
      );
      expect(voiceSelect.children[3].textContent).toBe(
        'Google Español (es-ES)'
      );
    });

    it('should save selected voice to storage when changed', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Change voice selection
      voiceSelect.value = 'Google UK English Male';
      const changeEvent = new Event('change');
      voiceSelect.dispatchEvent(changeEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        selectedVoice: 'Google UK English Male',
      });
    });
  });

  describe('extreme values with actual HTML constraints', () => {
    beforeEach(() => {
      // Load the options script
      require('../options');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should handle extreme slider values (clamped to HTML min/max)', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Test extreme values - HTML range inputs clamp to min/max
      // The actual HTML has min="0.5" max="2"
      const testValues = ['100', '0.1', '999.99'];
      const expectedValues = ['2.0', '0.5', '2.0']; // Values clamped to HTML range

      for (let i = 0; i < testValues.length; i++) {
        rateSlider.value = testValues[i];
        const inputEvent = new Event('input');
        rateSlider.dispatchEvent(inputEvent);

        // The display should show the clamped value
        expect(rateValue.textContent).toBe(`${expectedValues[i]}x`);
      }
    });
  });

  describe('CSS classes and structure validation', () => {
    it('should have proper CSS classes on elements', () => {
      expect(voiceSelect.classList.contains('select-input')).toBe(true);

      const rateContainer = rateSlider.closest('.range-container');
      expect(rateContainer).toBeTruthy();

      const pitchContainer = pitchSlider.closest('.range-container');
      expect(pitchContainer).toBeTruthy();
    });

    it('should have setting labels', () => {
      const voiceLabel = document.querySelector(
        '.setting-row:has(#voice-select) .setting-label'
      );
      const rateLabel = document.querySelector(
        '.setting-row:has(#rate-slider) .setting-label'
      );
      const pitchLabel = document.querySelector(
        '.setting-row:has(#pitch-slider) .setting-label'
      );

      expect(voiceLabel?.textContent).toBe('Voice');
      expect(rateLabel?.textContent).toBe('Speaking Rate');
      expect(pitchLabel?.textContent).toBe('Pitch');
    });

    it('should have keyboard shortcuts section', () => {
      const shortcutsSection = Array.from(document.querySelectorAll('h2')).find(
        (h2) => h2.textContent === 'Keyboard Shortcuts'
      );
      expect(shortcutsSection).toBeTruthy();

      const kbdElements = document.querySelectorAll('kbd');
      expect(kbdElements.length).toBeGreaterThan(0);
    });
  });

  describe('auto play next functionality', () => {
    beforeEach(() => {
      // Load the options script
      require('../options');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should have auto play next toggle element', () => {
      expect(autoPlayNextToggle).toBeTruthy();
      expect(autoPlayNextToggle.type).toBe('checkbox');
      expect(autoPlayNextToggle.id).toBe('auto-play-next-toggle');
    });

    it('should restore auto play next setting from storage', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Element should be unchecked based on mock storage (autoPlayNext: false)
      expect(autoPlayNextToggle.checked).toBe(false);
    });

    it('should save auto play next setting when toggled', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Toggle the checkbox
      autoPlayNextToggle.checked = true;
      const changeEvent = new Event('change');
      autoPlayNextToggle.dispatchEvent(changeEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        autoPlayNext: true,
      });
    });
  });
});
