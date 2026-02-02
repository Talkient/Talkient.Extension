/// <reference lib="dom" />
/// <reference types="chrome" />

import {
  findNextTextElement,
  autoPlayNextText,
  highlightText,
  clearHighlight,
} from '../content-lib';

import { getSvgIcon } from '../icons';

// Mock chrome runtime
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
    lastError: null as chrome.runtime.LastError | null,
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
  tts: {
    speak: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    stop: jest.fn(),
    getVoices: jest.fn(),
  },
  tabs: {
    sendMessage: jest.fn(),
  },
};

// Assign mock to global chrome
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

describe('Auto-play functionality', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    // Reset mocks
    jest.clearAllMocks();
    mockChrome.runtime.sendMessage.mockClear();
    mockChrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({
        selectedVoice: 'default',
        speechRate: 1.0,
        speechPitch: 1.0,
        highlightStyle: 'default',
        autoPlayNext: true,
      });
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
    clearHighlight();
    jest.resetModules();
  });

  describe('findNextTextElement', () => {
    it('should find the next text element in document order', () => {
      // Create multiple text elements
      const element1 = document.createElement('span');
      element1.classList.add('talkient-processed');
      element1.textContent = 'First text';
      container.appendChild(element1);

      const element2 = document.createElement('span');
      element2.classList.add('talkient-processed');
      element2.textContent = 'Second text';
      container.appendChild(element2);

      const element3 = document.createElement('span');
      element3.classList.add('talkient-processed');
      element3.textContent = 'Third text';
      container.appendChild(element3);

      // Test finding next element
      const nextElement = findNextTextElement(element1);
      expect(nextElement).toBe(element2);

      const nextElement2 = findNextTextElement(element2);
      expect(nextElement2).toBe(element3);
    });

    it('should return null if current element is the last one', () => {
      const element1 = document.createElement('span');
      element1.classList.add('talkient-processed');
      element1.textContent = 'Only text';
      container.appendChild(element1);

      const nextElement = findNextTextElement(element1);
      expect(nextElement).toBeNull();
    });

    it('should return null if current element is not found', () => {
      const element1 = document.createElement('span');
      element1.classList.add('talkient-processed');
      element1.textContent = 'Text in DOM';
      container.appendChild(element1);

      const elementNotInDOM = document.createElement('span');
      elementNotInDOM.classList.add('talkient-processed');

      const nextElement = findNextTextElement(elementNotInDOM);
      expect(nextElement).toBeNull();
    });
  });

  describe('autoPlayNextText', () => {
    it('should auto-play the next text element when current element is highlighted', () => {
      // Create two text elements with play buttons
      const element1 = document.createElement('span');
      element1.classList.add('talkient-processed');
      const textSpan1 = document.createElement('span');
      textSpan1.textContent = 'First text';
      element1.appendChild(textSpan1);
      const button1 = document.createElement('button');
      button1.classList.add('talkient-play-button');
      button1.innerHTML = getSvgIcon('pause'); // Pause icon (currently playing)
      element1.appendChild(button1);
      container.appendChild(element1);

      const element2 = document.createElement('span');
      element2.classList.add('talkient-processed');
      const textSpan2 = document.createElement('span');
      textSpan2.textContent = 'Second text';
      element2.appendChild(textSpan2);
      const button2 = document.createElement('button');
      button2.classList.add('talkient-play-button');
      button2.innerHTML = getSvgIcon('play'); // Play icon (not playing)
      element2.appendChild(button2);
      container.appendChild(element2);

      // Actually highlight the text element using the real highlighting system
      highlightText(textSpan1);

      // Mock button click behavior
      const clickSpy = jest.spyOn(button2, 'click');

      // Call autoPlayNextText
      autoPlayNextText();

      // Verify the next button was clicked
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should not auto-play if there is no highlighted element', () => {
      const element1 = document.createElement('span');
      element1.classList.add('talkient-processed');
      const button1 = document.createElement('button');
      button1.classList.add('talkient-play-button');
      button1.innerHTML = getSvgIcon('play'); // Play icon
      element1.appendChild(button1);
      container.appendChild(element1);

      // Don't highlight anything - getCurrentHighlightedElement should return null
      const clickSpy = jest.spyOn(button1, 'click');

      autoPlayNextText();

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should not auto-play if there is no next element', () => {
      const element1 = document.createElement('span');
      element1.classList.add('talkient-processed');
      const textSpan1 = document.createElement('span');
      textSpan1.textContent = 'Only text';
      element1.appendChild(textSpan1);
      const button1 = document.createElement('button');
      button1.classList.add('talkient-play-button');
      button1.innerHTML = getSvgIcon('play'); // Play icon
      element1.appendChild(button1);
      container.appendChild(element1);

      // Highlight the only element
      highlightText(textSpan1);

      const clickSpy = jest.spyOn(button1, 'click');

      autoPlayNextText();

      // Should not click anything since there's no next element
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should not auto-play if next button is already playing', () => {
      // Create two text elements with play buttons
      const element1 = document.createElement('span');
      element1.classList.add('talkient-processed');
      const textSpan1 = document.createElement('span');
      textSpan1.textContent = 'First text';
      element1.appendChild(textSpan1);
      const button1 = document.createElement('button');
      button1.classList.add('talkient-play-button');
      button1.innerHTML = getSvgIcon('pause'); // Pause icon (currently playing)
      element1.appendChild(button1);
      container.appendChild(element1);

      const element2 = document.createElement('span');
      element2.classList.add('talkient-processed');
      const textSpan2 = document.createElement('span');
      textSpan2.textContent = 'Second text';
      element2.appendChild(textSpan2);
      const button2 = document.createElement('button');
      button2.classList.add('talkient-play-button');
      button2.innerHTML = getSvgIcon('pause'); // Already playing (pause icon)
      element2.appendChild(button2);
      container.appendChild(element2);

      // Highlight the first element
      highlightText(textSpan1);

      const clickSpy = jest.spyOn(button2, 'click');

      autoPlayNextText();

      // Should not click the already playing button
      expect(clickSpy).not.toHaveBeenCalled();
    });
  });
});
