/// <reference lib="dom" />
/// <reference types="chrome" />

import { highlightText } from '../content-lib';

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
};

// Assign mock to global chrome
(global as any).chrome = mockChrome;

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
    button1.innerHTML = '⏸️'; // Currently playing
    element1.appendChild(button1);
    container.appendChild(element1);

    const element2 = document.createElement('span');
    element2.classList.add('talkient-processed');
    const textSpan2 = document.createElement('span');
    textSpan2.textContent = 'Second text';
    element2.appendChild(textSpan2);
    const button2 = document.createElement('button');
    button2.classList.add('talkient-play-button');
    button2.innerHTML = '▶️'; // Not playing
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

    // Check that all play buttons are reset
    expect(button1.innerHTML).toBe('▶️');
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
    button1.innerHTML = '⏸️'; // Currently playing
    element1.appendChild(button1);
    container.appendChild(element1);

    const element2 = document.createElement('span');
    element2.classList.add('talkient-processed');
    const textSpan2 = document.createElement('span');
    textSpan2.textContent = 'Second text';
    element2.appendChild(textSpan2);
    const button2 = document.createElement('button');
    button2.classList.add('talkient-play-button');
    button2.innerHTML = '▶️'; // Not playing
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

    // Check that all play buttons are reset
    expect(button1.innerHTML).toBe('▶️');
    expect(button2.innerHTML).toBe('▶️');
  });
});
