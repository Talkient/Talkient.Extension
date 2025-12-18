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

describe('options.ts', () => {
  let voiceSelect: HTMLSelectElement;
  let rateSlider: HTMLInputElement;
  let pitchSlider: HTMLInputElement;
  let highlightStyleSelect: HTMLSelectElement;
  let rateValue: HTMLSpanElement;
  let pitchValue: HTMLSpanElement;
  let autoPlayNextToggle: HTMLInputElement;
  let followHighlightToggle: HTMLInputElement;
  let buttonPositionSelect: HTMLSelectElement;
  let minimumWordsInput: HTMLInputElement;
  let panelHideDurationInput: HTMLInputElement;

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
    highlightStyleSelect = document.getElementById(
      'highlight-style-select'
    ) as HTMLSelectElement;
    rateValue = document.getElementById('rate-value') as HTMLSpanElement;
    pitchValue = document.getElementById('pitch-value') as HTMLSpanElement;
    autoPlayNextToggle = document.getElementById(
      'auto-play-next-toggle'
    ) as HTMLInputElement;
    followHighlightToggle = document.getElementById(
      'follow-highlight-toggle'
    ) as HTMLInputElement;
    buttonPositionSelect = document.getElementById(
      'button-position-select'
    ) as HTMLSelectElement;
    minimumWordsInput = document.getElementById(
      'minimum-words-input'
    ) as HTMLInputElement;
    panelHideDurationInput = document.getElementById(
      'panel-hide-duration-input'
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
          followHighlight: true,
          buttonPosition: 'left',
          minimumWords: 3,
          maxNodesProcessed: 1000,
          panelHideDuration: 30,
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
      expect(highlightStyleSelect).toBeTruthy();
      expect(rateValue).toBeTruthy();
      expect(pitchValue).toBeTruthy();
      expect(minimumWordsInput).toBeTruthy();
      expect(panelHideDurationInput).toBeTruthy();
    });

    it('should have correct slider attributes from HTML', () => {
      // Check that sliders have the correct min/max from actual HTML
      expect(rateSlider.min).toBe('0.5');
      expect(rateSlider.max).toBe('2');
      expect(rateSlider.step).toBe('0.05');

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

    it('should have highlight style options in select', () => {
      // The HTML should have highlight style options
      const options = Array.from(highlightStyleSelect.options);
      const optionValues = options.map((option) => option.value);
      const optionTexts = options.map((option) => option.textContent);

      expect(optionValues).toEqual(['default', 'minimal', 'bold', 'elegant']);
      expect(optionTexts).toEqual(['Default', 'Minimal', 'Bold', 'Elegant']);
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
          'followHighlight',
          'buttonPosition',
          'minimumWords',
          'maxNodesProcessed',
          'panelHideDuration',
        ],
        expect.any(Function)
      );

      expect(rateSlider.value).toBe('1.1');
      expect(rateValue.textContent).toBe('1.10x');
      expect(pitchSlider.value).toBe('1.2');
      expect(pitchValue.textContent).toBe('1.2x');
      expect(highlightStyleSelect.value).toBe('default');
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
      expect(rateValue.textContent).toBe('1.00x');
      expect(pitchSlider.value).toBe('1');
      expect(pitchValue.textContent).toBe('1.0x');
      expect(highlightStyleSelect.value).toBe('default');
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

      expect(rateValue.textContent).toBe('0.50x');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        speechRate: 0.5,
      });
    });

    it('should handle maximum rate value (2.0 from HTML)', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      rateSlider.value = '2.0';
      const inputEvent = new Event('input');
      rateSlider.dispatchEvent(inputEvent);

      expect(rateValue.textContent).toBe('2.00x');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        speechRate: 2.0,
      });
    });

    it('should update rate value display when slider changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      rateSlider.value = '1.5';
      const inputEvent = new Event('input');
      rateSlider.dispatchEvent(inputEvent);

      expect(rateValue.textContent).toBe('1.50x');
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

    it('should enforce 0.05 step increment by rounding values', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Test values that should be rounded to nearest 0.05
      const testCases = [
        { input: '1.23', expected: 1.25 }, // Should round up to 1.25
        { input: '1.27', expected: 1.25 }, // Should round down to 1.25
        { input: '1.30', expected: 1.3 }, // Should stay at 1.30
        { input: '0.52', expected: 0.5 }, // Should round down to 0.50
        { input: '0.53', expected: 0.55 }, // Should round up to 0.55
      ];

      for (const testCase of testCases) {
        rateSlider.value = testCase.input;
        const inputEvent = new Event('input');
        rateSlider.dispatchEvent(inputEvent);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          speechRate: testCase.expected,
        });
        expect(rateSlider.value).toBe(testCase.expected.toString());
        expect(rateValue.textContent).toBe(`${testCase.expected.toFixed(2)}x`);
      }
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

  describe('highlight style functionality', () => {
    beforeEach(() => {
      // Load the options script
      require('../options');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should restore highlight style from storage', async () => {
      // Mock storage with specific highlight style
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys, callback) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1.0,
            speechPitch: 1.0,
            highlightStyle: 'bold',
          });
        }
      );

      // Reload the module and trigger DOMContentLoaded
      jest.resetModules();
      require('../options');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(highlightStyleSelect.value).toBe('bold');
    });

    it('should save highlight style to storage when changed', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Change highlight style selection
      highlightStyleSelect.value = 'elegant';
      const changeEvent = new Event('change');
      highlightStyleSelect.dispatchEvent(changeEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        highlightStyle: 'elegant',
      });
    });

    it('should support all highlight style options', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const styles = ['default', 'minimal', 'bold', 'elegant'];

      for (const style of styles) {
        highlightStyleSelect.value = style;
        const changeEvent = new Event('change');
        highlightStyleSelect.dispatchEvent(changeEvent);

        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          highlightStyle: style,
        });
      }
    });

    it('should default to "default" style when none is stored', async () => {
      // Mock storage with missing highlight style
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys, callback) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1.0,
            speechPitch: 1.0,
            // highlightStyle is missing
          });
        }
      );

      // Reload the module and trigger DOMContentLoaded
      jest.resetModules();
      require('../options');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(highlightStyleSelect.value).toBe('default');
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
      const expectedValues = ['2.00', '0.50', '2.00']; // Values clamped to HTML range

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
      const highlightLabel = document.querySelector(
        '.setting-row:has(#highlight-style-select) .setting-label'
      );

      expect(voiceLabel?.textContent).toBe('Voice');
      expect(rateLabel?.textContent).toBe('Speaking Rate');
      expect(pitchLabel?.textContent).toBe('Pitch');
      expect(highlightLabel?.textContent).toBe('Highlight Style');
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

    it('should restore auto play next setting from storage', async () => {
      // Mock storage with specific auto play next setting
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys, callback) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1.0,
            speechPitch: 1.0,
            highlightStyle: 'default',
            autoPlayNext: true,
          });
        }
      );

      // Reload the module and trigger DOMContentLoaded
      jest.resetModules();
      require('../options');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(autoPlayNextToggle.checked).toBe(true);
    });

    it('should default to true when auto play next is not stored', async () => {
      // Mock storage with missing auto play next setting
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys, callback) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1.0,
            speechPitch: 1.0,
            highlightStyle: 'default',
            // autoPlayNext is missing
          });
        }
      );

      // Reload the module and trigger DOMContentLoaded
      jest.resetModules();
      require('../options');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(autoPlayNextToggle.checked).toBe(true);
    });

    it('should save auto play next setting to storage when changed', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Change auto play next setting
      autoPlayNextToggle.checked = true;
      const changeEvent = new Event('change');
      autoPlayNextToggle.dispatchEvent(changeEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        autoPlayNext: true,
      });
    });

    it('should save false when toggled off', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Change auto play next setting to false
      autoPlayNextToggle.checked = false;
      const changeEvent = new Event('change');
      autoPlayNextToggle.dispatchEvent(changeEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        autoPlayNext: false,
      });
    });
  });

  describe('follow highlight functionality', () => {
    beforeEach(() => {
      // Load the options script
      require('../options');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should restore follow highlight setting from storage', async () => {
      // Mock storage with specific follow highlight setting
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys, callback) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1.0,
            speechPitch: 1.0,
            highlightStyle: 'default',
            followHighlight: true,
          });
        }
      );

      // Reload the module and trigger DOMContentLoaded
      jest.resetModules();
      require('../options');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(followHighlightToggle.checked).toBe(true);
    });

    it('should default to true when follow highlight is not stored', async () => {
      // Mock storage with missing follow highlight setting
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys, callback) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1.0,
            speechPitch: 1.0,
            highlightStyle: 'default',
            // followHighlight is missing
          });
        }
      );

      // Reload the module and trigger DOMContentLoaded
      jest.resetModules();
      require('../options');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(followHighlightToggle.checked).toBe(true);
    });

    it('should save follow highlight setting to storage when changed', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Change follow highlight setting
      followHighlightToggle.checked = false;
      const changeEvent = new Event('change');
      followHighlightToggle.dispatchEvent(changeEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        followHighlight: false,
      });
    });

    it('should save true when toggled on', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Change follow highlight setting to true
      followHighlightToggle.checked = true;
      const changeEvent = new Event('change');
      followHighlightToggle.dispatchEvent(changeEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        followHighlight: true,
      });
    });
  });

  describe('button position functionality', () => {
    beforeEach(() => {
      // Load the options script
      require('../options');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should restore button position setting from storage', async () => {
      // Mock storage with specific button position setting
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys, callback) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1.0,
            speechPitch: 1.0,
            highlightStyle: 'default',
            buttonPosition: 'right',
          });
        }
      );

      // Reload the module and trigger DOMContentLoaded
      jest.resetModules();
      require('../options');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(buttonPositionSelect.value).toBe('right');
    });

    it('should default to left when button position is not stored', async () => {
      // Mock storage with missing button position setting
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys, callback) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1.0,
            speechPitch: 1.0,
            highlightStyle: 'default',
            // buttonPosition is missing
          });
        }
      );

      // Reload the module and trigger DOMContentLoaded
      jest.resetModules();
      require('../options');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(buttonPositionSelect.value).toBe('left');
    });

    it('should save button position setting to storage when changed', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Change button position setting
      buttonPositionSelect.value = 'right';
      const changeEvent = new Event('change');
      buttonPositionSelect.dispatchEvent(changeEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        buttonPosition: 'right',
      });
    });

    it('should save left when changed back', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Change button position setting to left
      buttonPositionSelect.value = 'left';
      const changeEvent = new Event('change');
      buttonPositionSelect.dispatchEvent(changeEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        buttonPosition: 'left',
      });
    });
  });

  describe('real-time synchronization', () => {
    let storageChangeListener:
      | ((changes: any, namespace: string) => void)
      | null = null;

    beforeEach(() => {
      // Mock the storage change listener
      (chrome.storage.onChanged.addListener as jest.Mock).mockImplementation(
        (listener) => {
          storageChangeListener = listener;
        }
      );

      // Load the options script
      require('../options');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should update speech rate slider when storage changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Verify the listener was set up
      expect(chrome.storage.onChanged.addListener).toHaveBeenCalled();

      // Simulate a storage change from control panel
      if (storageChangeListener) {
        storageChangeListener(
          {
            speechRate: {
              newValue: 1.5,
              oldValue: 1.0,
            },
          },
          'local'
        );

        // Check that the UI was updated
        expect(rateSlider.value).toBe('1.5');
        expect(rateValue.textContent).toBe('1.50x');
      }
    });

    it('should update speech pitch slider when storage changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate a storage change from control panel
      if (storageChangeListener) {
        storageChangeListener(
          {
            speechPitch: {
              newValue: 0.8,
              oldValue: 1.0,
            },
          },
          'local'
        );

        // Check that the UI was updated
        expect(pitchSlider.value).toBe('0.8');
        expect(pitchValue.textContent).toBe('0.8x');
      }
    });

    it('should update highlight style when storage changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate a storage change from control panel
      if (storageChangeListener) {
        storageChangeListener(
          {
            highlightStyle: {
              newValue: 'minimal',
              oldValue: 'default',
            },
          },
          'local'
        );

        // Check that the UI was updated
        expect(highlightStyleSelect.value).toBe('minimal');
      }
    });

    it('should update auto play next toggle when storage changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate a storage change from control panel
      if (storageChangeListener) {
        storageChangeListener(
          {
            autoPlayNext: {
              newValue: true,
              oldValue: false,
            },
          },
          'local'
        );

        // Check that the UI was updated
        expect(autoPlayNextToggle.checked).toBe(true);
      }
    });

    it('should update minimum words input when storage changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate a storage change from control panel
      if (storageChangeListener) {
        storageChangeListener(
          {
            minimumWords: {
              newValue: 5,
              oldValue: 3,
            },
          },
          'local'
        );

        // Check that the UI was updated
        expect(minimumWordsInput.value).toBe('5');
      }
    });

    it('should not update UI for non-local namespace changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const originalValue = rateSlider.value;

      // Simulate a storage change from sync namespace
      if (storageChangeListener) {
        storageChangeListener(
          {
            speechRate: {
              newValue: 2.0,
              oldValue: 1.0,
            },
          },
          'sync'
        );

        // Check that the UI was NOT updated
        expect(rateSlider.value).toBe(originalValue);
      }
    });

    it('should handle invalid storage change values gracefully', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const originalValue = rateSlider.value;

      // Simulate a storage change with invalid value
      if (storageChangeListener) {
        storageChangeListener(
          {
            speechRate: {
              newValue: 'invalid',
              oldValue: 1.0,
            },
          },
          'local'
        );

        // Check that the UI was NOT updated
        expect(rateSlider.value).toBe(originalValue);
      }
    });
  });

  describe('panel hide duration functionality', () => {
    beforeEach(() => {
      // Load the options script
      require('../options');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should have correct input attributes from HTML', () => {
      expect(panelHideDurationInput.type).toBe('number');
      expect(panelHideDurationInput.min).toBe('0');
      expect(panelHideDurationInput.max).toBe('9999');
    });

    it('should restore panel hide duration from storage', async () => {
      // Mock storage with specific duration
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys, callback) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1.0,
            speechPitch: 1.0,
            highlightStyle: 'default',
            panelHideDuration: 60,
          });
        }
      );

      // Reload the module and trigger DOMContentLoaded
      jest.resetModules();
      require('../options');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(panelHideDurationInput.value).toBe('60');
    });

    it('should save panel hide duration to storage when input changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      panelHideDurationInput.value = '45';
      const inputEvent = new Event('input');
      panelHideDurationInput.dispatchEvent(inputEvent);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        panelHideDuration: 45,
      });
    });

    it('should clamp value to 0 when negative is entered', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      panelHideDurationInput.value = '-10';
      const inputEvent = new Event('input');
      panelHideDurationInput.dispatchEvent(inputEvent);

      expect(panelHideDurationInput.value).toBe('0');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        panelHideDuration: 0,
      });
    });

    it('should clamp value to 9999 when exceeding maximum', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      panelHideDurationInput.value = '10000';
      const inputEvent = new Event('input');
      panelHideDurationInput.dispatchEvent(inputEvent);

      expect(panelHideDurationInput.value).toBe('9999');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        panelHideDuration: 9999,
      });
    });

    it('should handle NaN by defaulting to 0', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      panelHideDurationInput.value = 'abc';
      const inputEvent = new Event('input');
      panelHideDurationInput.dispatchEvent(inputEvent);

      expect(panelHideDurationInput.value).toBe('0');
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        panelHideDuration: 0,
      });
    });

    it('should update input when storage changes externally', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Get the storage change listener that was registered
      const storageChangeListener = (
        chrome.storage.onChanged.addListener as jest.Mock
      ).mock.calls[0][0];

      // Simulate a storage change
      if (storageChangeListener) {
        storageChangeListener(
          {
            panelHideDuration: {
              newValue: 120,
              oldValue: 30,
            },
          },
          'local'
        );

        expect(panelHideDurationInput.value).toBe('120');
      }
    });

    it('should use default value of 30 when not set in storage', async () => {
      // Mock storage with no panelHideDuration
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

      expect(panelHideDurationInput.value).toBe('30');
    });
  });
});
