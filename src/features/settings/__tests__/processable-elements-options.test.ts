/**
 * @jest-environment jsdom
 */

import './mocks/chrome';

describe('Processable elements options UI', () => {
  const ELEMENT_IDS = [
    { id: 'elem-article', tag: 'article' },
    { id: 'elem-p', tag: 'p' },
    { id: 'elem-h1', tag: 'h1' },
    { id: 'elem-h2', tag: 'h2' },
    { id: 'elem-h3', tag: 'h3' },
    { id: 'elem-li', tag: 'li' },
  ];

  beforeEach(() => {
    document.body.innerHTML = '';

    const fs = require('fs');
    const path = require('path');
    const htmlPath = path.join(__dirname, '../options/options.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;

    (chrome.storage.local.get as jest.Mock).mockImplementation(
      (keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({
          selectedVoice: 'default',
          speechRate: 1.0,
          speechPitch: 1.0,
          highlightStyle: 'default',
          autoPlayNext: true,
          followHighlight: true,
          buttonPosition: 'left',
          minimumWords: 3,
          maxNodesProcessed: 1000,
          panelHideDuration: 30,
          translationTargetLanguage: 'en',
          processableElements: ['article', 'p', 'h1', 'h2', 'h3', 'li'],
        });
      },
    );

    (chrome.storage.local.set as jest.Mock).mockImplementation(
      (obj: Record<string, unknown>, callback?: () => void) => {
        if (callback) callback();
      },
    );

    (chrome.tts.getVoices as jest.Mock).mockImplementation(
      (callback: (voices: unknown[]) => void) => {
        callback([]);
      },
    );

    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('HTML structure', () => {
    it('should have a Processable Elements section', () => {
      const headings = Array.from(document.querySelectorAll('h2'));
      const heading = headings.find(
        (h) => h.textContent === 'Processable Elements',
      );
      expect(heading).toBeTruthy();
    });

    it('should have all six checkboxes in the DOM', () => {
      ELEMENT_IDS.forEach(({ id }) => {
        const checkbox = document.getElementById(id) as HTMLInputElement;
        expect(checkbox).toBeTruthy();
        expect(checkbox.type).toBe('checkbox');
      });
    });

    it('should have a checkbox-list container', () => {
      const list = document.querySelector('.checkbox-list');
      expect(list).toBeTruthy();
    });
  });

  describe('storage restoration', () => {
    beforeEach(() => {
      require('../options/options-ui');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should include processableElements in the storage get call', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        expect.arrayContaining(['processableElements']),
        expect.any(Function),
      );
    });

    it('should check all six checkboxes when all elements are in storage', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      ELEMENT_IDS.forEach(({ id }) => {
        const checkbox = document.getElementById(id) as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      });
    });

    it('should only check stored elements when partial list is in storage', async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (
          keys: string[],
          callback: (result: Record<string, unknown>) => void,
        ) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1.0,
            speechPitch: 1.0,
            highlightStyle: 'default',
            autoPlayNext: true,
            followHighlight: true,
            buttonPosition: 'left',
            minimumWords: 3,
            maxNodesProcessed: 1000,
            panelHideDuration: 30,
            translationTargetLanguage: 'en',
            processableElements: ['article', 'p'],
          });
        },
      );

      jest.resetModules();
      require('../options/options-ui');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        (document.getElementById('elem-article') as HTMLInputElement).checked,
      ).toBe(true);
      expect(
        (document.getElementById('elem-p') as HTMLInputElement).checked,
      ).toBe(true);
      expect(
        (document.getElementById('elem-h1') as HTMLInputElement).checked,
      ).toBe(false);
      expect(
        (document.getElementById('elem-h2') as HTMLInputElement).checked,
      ).toBe(false);
      expect(
        (document.getElementById('elem-h3') as HTMLInputElement).checked,
      ).toBe(false);
      expect(
        (document.getElementById('elem-li') as HTMLInputElement).checked,
      ).toBe(false);
    });

    it('should use default set when processableElements is not in storage', async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (
          keys: string[],
          callback: (result: Record<string, unknown>) => void,
        ) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1.0,
            speechPitch: 1.0,
          });
        },
      );

      jest.resetModules();
      require('../options/options-ui');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      ELEMENT_IDS.forEach(({ id }) => {
        const checkbox = document.getElementById(id) as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
      });
    });
  });

  describe('save on checkbox change', () => {
    beforeEach(() => {
      require('../options/options-ui');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should save updated array when a checkbox is unchecked', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const h1Checkbox = document.getElementById('elem-h1') as HTMLInputElement;
      h1Checkbox.checked = false;
      h1Checkbox.dispatchEvent(new Event('change', { bubbles: true }));

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        processableElements: expect.not.arrayContaining(['h1']),
      });
    });

    it('should include all checked tags in the saved array', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Uncheck h1, h2, h3
      ['elem-h1', 'elem-h2', 'elem-h3'].forEach((id) => {
        const cb = document.getElementById(id) as HTMLInputElement;
        cb.checked = false;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const calls = (chrome.storage.local.set as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.processableElements).toEqual(
        expect.arrayContaining(['article', 'p', 'li']),
      );
      expect(lastCall.processableElements).not.toContain('h1');
      expect(lastCall.processableElements).not.toContain('h2');
      expect(lastCall.processableElements).not.toContain('h3');
    });

    it('should show status message when a checkbox changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const statusDiv = document.getElementById('status') as HTMLDivElement;
      const articleCheckbox = document.getElementById(
        'elem-article',
      ) as HTMLInputElement;
      articleCheckbox.checked = false;
      articleCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

      expect(statusDiv.textContent).toBe('Processable elements saved!');
      expect(statusDiv.classList.contains('visible')).toBe(true);
      expect(statusDiv.classList.contains('success')).toBe(true);
    });
  });
});
