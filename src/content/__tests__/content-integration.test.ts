/// <reference lib="dom" />
/// <reference types="chrome" />

import { highlightText } from '../content-lib';
import { getSvgIcon, isSvgPlayIcon } from '../icons';

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
      get: jest.fn((keys, callback) => {
        // Mock implementation with default values
        if (Array.isArray(keys) && keys.includes('followHighlight')) {
          callback({ followHighlight: false });
        } else if (Array.isArray(keys) && keys.includes('highlightStyle')) {
          callback({ highlightStyle: 'default' });
        } else if (Array.isArray(keys) && keys.includes('minimumWords')) {
          callback({ minimumWords: 3 });
        } else if (Array.isArray(keys) && keys.includes('maxNodesProcessed')) {
          callback({ maxNodesProcessed: 1000 });
        } else if (
          keys === 'playButtonsEnabled' ||
          (Array.isArray(keys) && keys.includes('playButtonsEnabled'))
        ) {
          callback({ playButtonsEnabled: true });
        } else {
          callback({});
        }
      }),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
};

// Assign mock to global chrome
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

describe('Content Script Element Processing Integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('should not add play buttons to code elements during processing', () => {
    // Create an article tag to wrap the content
    const article = document.createElement('article');

    // Create a mixed content scenario with regular text and code
    const paragraph = document.createElement('p');
    paragraph.textContent =
      'Here is some regular text that should get a play button.';
    article.appendChild(paragraph);

    const codeBlock = document.createElement('code');
    codeBlock.textContent = 'console.log("this code should not get a button");';
    article.appendChild(codeBlock);

    const preWithCode = document.createElement('pre');
    const nestedCode = document.createElement('code');
    nestedCode.textContent = 'function test() {\n  return "nested code";\n}';
    preWithCode.appendChild(nestedCode);
    article.appendChild(preWithCode);

    const anotherParagraph = document.createElement('p');
    anotherParagraph.textContent =
      'More regular text that should also get a play button.';
    article.appendChild(anotherParagraph);

    container.appendChild(article);

    // Import the processTextElements function and test it
    const { processTextElements } = require('../content-lib');

    // Mock requestAnimationFrame for synchronous processing
    const originalRAF = global.requestAnimationFrame;
    global.requestAnimationFrame = jest.fn((callback) => {
      callback(0);
      return 1;
    });

    // Process all text elements
    processTextElements();

    // Restore original requestAnimationFrame
    global.requestAnimationFrame = originalRAF;

    // Check that regular paragraphs have play buttons
    const processedParagraphs = container.querySelectorAll(
      'p .talkient-play-button',
    );
    expect(processedParagraphs.length).toBe(2); // Two paragraphs should have buttons

    // Check that code elements do NOT have play buttons
    const codePlayButtons = container.querySelectorAll(
      'code .talkient-play-button',
    );
    expect(codePlayButtons.length).toBe(0); // No code elements should have buttons

    // Check that pre elements do NOT have play buttons
    const prePlayButtons = container.querySelectorAll(
      'pre .talkient-play-button',
    );
    expect(prePlayButtons.length).toBe(0); // No pre elements should have buttons

    // Verify code content is still intact
    expect(codeBlock.textContent).toBe(
      'console.log("this code should not get a button");',
    );
    expect(nestedCode.textContent).toBe(
      'function test() {\n  return "nested code";\n}',
    );
  });
});

describe('Content Script Auto-Play Integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    // Reset mocks
    jest.clearAllMocks();
    mockChrome.runtime.onMessage.addListener.mockClear();
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.resetModules();
  });

  test('should auto-play next text when SPEECH_ENDED message includes autoPlayNext=true', async () => {
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

    // Highlight the first element to simulate it being played
    highlightText(textSpan1);

    // Import content script to trigger message listener registration
    require('../content');

    // Verify that the message listener was registered
    expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();

    // Get the registered message listener
    const messageListener =
      mockChrome.runtime.onMessage.addListener.mock.calls[0][0];

    // Mock button click behavior
    const clickSpy = jest.spyOn(button2, 'click');

    // Simulate SPEECH_ENDED message with autoPlayNext=true
    const message = { type: 'SPEECH_ENDED', autoPlayNext: true };
    const sender = {};
    const sendResponse = jest.fn();

    messageListener(message, sender, sendResponse);

    // Wait for the setTimeout to complete
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Check that the next play button was clicked
    expect(clickSpy).toHaveBeenCalled();

    // Check that all play buttons have the play icon
    const svg = button1.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(isSvgPlayIcon(svg as SVGElement)).toBe(true);
  });

  test('should not auto-play next text when SPEECH_ENDED message includes autoPlayNext=false', async () => {
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

    // Highlight the first element to simulate it being played
    highlightText(textSpan1);

    // Import content script to trigger message listener registration
    require('../content');

    // Get the registered message listener
    const messageListener =
      mockChrome.runtime.onMessage.addListener.mock.calls[0][0];

    // Mock button click behavior
    const clickSpy = jest.spyOn(button2, 'click');

    // Simulate SPEECH_ENDED message with autoPlayNext=false
    const message = { type: 'SPEECH_ENDED', autoPlayNext: false };
    const sender = {};
    const sendResponse = jest.fn();

    messageListener(message, sender, sendResponse);

    // Wait for any potential setTimeout to complete
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Check that the next play button was NOT clicked
    expect(clickSpy).not.toHaveBeenCalled();

    // Check that all play buttons have the play icon
    const svg1 = button1.querySelector('svg');
    expect(svg1).not.toBeNull();
    expect(isSvgPlayIcon(svg1 as SVGElement)).toBe(true);

    const svg2 = button2.querySelector('svg');
    expect(svg2).not.toBeNull();
    expect(isSvgPlayIcon(svg2 as SVGElement)).toBe(true);
  });
});
