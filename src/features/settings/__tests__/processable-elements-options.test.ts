/**
 * @jest-environment jsdom
 */

import './mocks/chrome';
import {
  DEFAULT_PROCESSABLE_ELEMENTS,
  PROCESSABLE_ELEMENTS_CATALOG,
} from '../storage-schema';

describe('Processable elements options UI', () => {
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
          processableElements: [...DEFAULT_PROCESSABLE_ELEMENTS],
        });
      },
    );

    (chrome.storage.local.set as jest.Mock).mockImplementation(
      (_obj: Record<string, unknown>, callback?: () => void) => {
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
    it('should have processable elements search and multi-select controls', () => {
      const search = document.getElementById(
        'processable-elements-search',
      ) as HTMLInputElement;
      const select = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;

      expect(search).toBeTruthy();
      expect(search.type).toBe('search');
      expect(select).toBeTruthy();
      expect(select.multiple).toBe(true);
    });
  });

  describe('storage restoration', () => {
    beforeEach(() => {
      require('../options/options-ui');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should include processableElements in storage get call', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        expect.arrayContaining(['processableElements']),
        expect.any(Function),
      );
    });

    it('should render expanded options catalog in order', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const select = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;
      const values = Array.from(select.options).map((option) => option.value);

      expect(values).toEqual([...PROCESSABLE_ELEMENTS_CATALOG]);
    });

    it('should select only default tags by default', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const select = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;
      const selected = Array.from(select.selectedOptions).map(
        (option) => option.value,
      );

      expect(selected).toEqual([...DEFAULT_PROCESSABLE_ELEMENTS]);
    });

    it('should normalize unknown tags from storage and keep known ones', async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (
          keys: string[],
          callback: (result: Record<string, unknown>) => void,
        ) => {
          callback({
            selectedVoice: 'default',
            speechRate: 1,
            speechPitch: 1,
            processableElements: ['article', 'unknown', 'h2'],
          });
        },
      );

      jest.resetModules();
      require('../options/options-ui');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 0));

      const select = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;
      const selected = Array.from(select.selectedOptions).map(
        (option) => option.value,
      );

      expect(selected).toEqual(['article', 'h2']);
    });
  });

  describe('search and save behavior', () => {
    beforeEach(() => {
      require('../options/options-ui');
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should filter options by case-insensitive substring', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const search = document.getElementById(
        'processable-elements-search',
      ) as HTMLInputElement;
      const select = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;

      search.value = 'head';
      search.dispatchEvent(new Event('input', { bubbles: true }));

      const visible = Array.from(select.options)
        .filter((option) => !option.hidden)
        .map((option) => option.value);

      expect(visible).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    });

    it('should not change selection when only filtering', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const search = document.getElementById(
        'processable-elements-search',
      ) as HTMLInputElement;
      const select = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;

      const before = Array.from(select.selectedOptions).map((o) => o.value);

      search.value = 'block';
      search.dispatchEvent(new Event('input', { bubbles: true }));

      const after = Array.from(select.selectedOptions).map((o) => o.value);
      expect(after).toEqual(before);
      expect(chrome.storage.local.set).not.toHaveBeenCalledWith(
        expect.objectContaining({ processableElements: expect.any(Array) }),
      );
    });

    it('should save updated array when selection changes', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const select = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;

      for (const option of Array.from(select.options)) {
        option.selected = ['article', 'p', 'blockquote'].includes(option.value);
      }
      select.dispatchEvent(new Event('change', { bubbles: true }));

      const calls = (chrome.storage.local.set as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.processableElements).toEqual([
        'article',
        'p',
        'blockquote',
      ]);

      const statusDiv = document.getElementById('status') as HTMLDivElement;
      expect(statusDiv.textContent).toBe('Processable elements saved!');
      expect(statusDiv.classList.contains('visible')).toBe(true);
    });

    it('should toggle options on click without requiring modifier keys', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const select = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;
      const h4Option = select.querySelector(
        'option[value="h4"]',
      ) as HTMLOptionElement;
      const articleOption = select.querySelector(
        'option[value="article"]',
      ) as HTMLOptionElement;

      expect(h4Option.selected).toBe(false);
      expect(articleOption.selected).toBe(true);

      h4Option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      articleOption.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );

      const calls = (chrome.storage.local.set as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.processableElements).toContain('h4');
      expect(lastCall.processableElements).not.toContain('article');
    });

    it('should keep search query while applying external storage updates', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const listener = (chrome.storage.onChanged.addListener as jest.Mock).mock
        .calls[0][0] as (
        changes: Record<string, { newValue: unknown }>,
        namespace: string,
      ) => void;
      const search = document.getElementById(
        'processable-elements-search',
      ) as HTMLInputElement;
      const select = document.getElementById(
        'processable-elements-select',
      ) as HTMLSelectElement;

      search.value = 'head';
      search.dispatchEvent(new Event('input', { bubbles: true }));

      listener(
        {
          processableElements: {
            newValue: ['article', 'h4'],
          },
        },
        'local',
      );

      const visible = Array.from(select.options)
        .filter((option) => !option.hidden)
        .map((option) => option.value);
      const selected = Array.from(select.selectedOptions).map(
        (option) => option.value,
      );

      expect(search.value).toBe('head');
      expect(visible).toEqual(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
      expect(selected).toContain('h4');
      expect(selected).toContain('article');
    });
  });
});
