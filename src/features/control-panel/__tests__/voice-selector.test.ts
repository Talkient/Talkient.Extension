/// <reference lib="dom" />

import { createControlPanel } from '../content/panel-ui';
import { VOICE_SELECT_ID } from '../content/panel-ui';

jest.mock('../../../shared/api/messaging', () => ({
  safeSendMessage: jest.fn(),
  isExtensionContextValid: jest.fn(() => true),
}));

jest.mock('../../../features/assets/content/icons', () => ({
  getSvgIcon: jest.fn((name: string) => `<svg data-icon="${name}"></svg>`),
  isSvgPlayIcon: jest.fn(() => false),
  isSvgPauseIcon: jest.fn(() => false),
}));

jest.mock('../../tts-playback/content/index', () => ({
  setSpeechRate: jest.fn(),
}));

jest.mock('../../tts-playback/content/play-button', () => ({
  safeClickButton: jest.fn(),
}));

jest.mock('../../../content/highlight', () => ({
  clearHighlight: jest.fn(),
}));

const mockStorageGet = jest.fn();
const mockStorageSet = jest.fn();
const mockStorageOnChangedAddListener = jest.fn();

const mockChrome = {
  runtime: {
    onMessage: { addListener: jest.fn() },
    sendMessage: jest.fn(),
    lastError: null,
  },
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
    },
    onChanged: {
      addListener: mockStorageOnChangedAddListener,
    },
  },
};

// @ts-expect-error Mock chrome global
global.chrome = mockChrome;

global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 0);
  return 0;
});

const SAMPLE_VOICES: chrome.tts.TtsVoice[] = [
  { voiceName: 'Google US English', lang: 'en-US' },
  { voiceName: 'Google Deutsch', lang: 'de-DE' },
];

function getVoiceStorageChangeListener(): (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
  namespace: string,
) => void {
  const lastCallIndex = mockStorageOnChangedAddListener.mock.calls.length - 1;
  const listener =
    lastCallIndex >= 0
      ? mockStorageOnChangedAddListener.mock.calls[lastCallIndex][0]
      : undefined;
  expect(listener).toBeDefined();
  return listener as (
    changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
    namespace: string,
  ) => void;
}

function setupDefaultMocks(
  selectedVoice = 'default',
  voices: chrome.tts.TtsVoice[] = SAMPLE_VOICES,
  success = true,
) {
  mockStorageGet.mockImplementation(
    (keys: string[], callback: (result: Record<string, unknown>) => void) => {
      const result: Record<string, unknown> = {};
      if (keys.includes('selectedVoice')) result.selectedVoice = selectedVoice;
      if (keys.includes('playButtonsEnabled')) result.playButtonsEnabled = true;
      if (keys.includes('speechRate')) result.speechRate = 1.0;
      callback(result);
    },
  );

  // Mock safeSendMessage to respond to GET_VOICES
  const { safeSendMessage } = require('../../../shared/api/messaging') as {
    safeSendMessage: jest.Mock;
  };
  safeSendMessage.mockImplementation(
    (
      message: { type: string },
      callback?: (response: {
        success: boolean;
        voices?: chrome.tts.TtsVoice[];
      }) => void,
    ) => {
      if (message.type === 'GET_VOICES' && callback) {
        callback({ success, voices });
      }
      return true;
    },
  );
}

describe('Voice Selector', () => {
  beforeEach(() => {
    document.body.innerHTML = '<article><p>Test content</p></article>';
    document.cookie =
      'talkient_panel_hidden=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.cookie =
      'talkient_panel_hidden=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
  });

  it('3.1: talkient-voice-select is present after createControlPanel()', () => {
    createControlPanel();
    const select = document.getElementById(VOICE_SELECT_ID);
    expect(select).toBeTruthy();
    expect(select?.tagName.toLowerCase()).toBe('select');
  });

  it('3.2: "Default Voice" option (value "default") is always the first option', () => {
    createControlPanel();
    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options[0].value).toBe('default');
    expect(select.options[0].textContent).toBe('Default Voice');
  });

  it('3.3: voices from GET_VOICES response appear with correct label format', () => {
    createControlPanel();
    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;
    const optionTexts = Array.from(select.options).map((o) => o.textContent);
    expect(optionTexts).toContain('Google US English (en-US)');
    expect(optionTexts).toContain('Google Deutsch (de-DE)');
  });

  it('3.3b: duplicate voice names are rendered only once', () => {
    setupDefaultMocks('default', [
      { voiceName: 'Google US English', lang: 'en-US' },
      { voiceName: 'Google US English', lang: 'en-GB' },
    ]);

    createControlPanel();
    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;

    const matchingOptions = Array.from(select.options).filter(
      (option) => option.value === 'Google US English',
    );
    expect(matchingOptions).toHaveLength(1);
  });

  it('3.3c: missing voice name is ignored and missing lang falls back to "Unknown language"', () => {
    setupDefaultMocks('default', [
      { voiceName: '', lang: 'en-US' },
      { voiceName: 'Mystery Voice' },
    ]);

    createControlPanel();
    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;
    const optionTexts = Array.from(select.options).map((o) => o.textContent);

    expect(optionTexts).toContain('Mystery Voice (Unknown language)');
    expect(optionTexts).not.toContain(' (en-US)');
  });

  it('3.4a: stored named voice is pre-selected on panel creation', () => {
    setupDefaultMocks('Google US English');
    createControlPanel();
    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;
    expect(select.value).toBe('Google US English');
  });

  it('3.4b: stored "default" is pre-selected when selectedVoice is "default"', () => {
    setupDefaultMocks('default');
    createControlPanel();
    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;
    expect(select.value).toBe('default');
  });

  it('3.4c: falls back to default when stored voice is not returned by GET_VOICES', () => {
    setupDefaultMocks('Missing Voice');
    createControlPanel();
    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;
    expect(select.value).toBe('default');
  });

  it('3.5: changing the selector calls chrome.storage.local.set with correct selectedVoice', () => {
    createControlPanel();
    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;
    select.value = 'Google US English';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(mockStorageSet).toHaveBeenCalledWith({
      selectedVoice: 'Google US English',
    });
  });

  it('3.5b: selecting default option stores "default"', () => {
    setupDefaultMocks('Google US English');
    createControlPanel();
    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;
    select.value = 'default';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(mockStorageSet).toHaveBeenCalledWith({ selectedVoice: 'default' });
  });

  it('3.6: storage.onChanged event for selectedVoice updates selector value', () => {
    createControlPanel();
    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;

    const changeListener = getVoiceStorageChangeListener();

    changeListener(
      { selectedVoice: { oldValue: 'default', newValue: 'Google US English' } },
      'local',
    );

    expect(select.value).toBe('Google US English');
  });

  it('3.7: falls back to "default" when new selectedVoice is not in option list', () => {
    createControlPanel();
    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;

    const changeListener = getVoiceStorageChangeListener();

    changeListener(
      {
        selectedVoice: {
          oldValue: 'default',
          newValue: 'Nonexistent Voice Name',
        },
      },
      'local',
    );

    expect(select.value).toBe('default');
  });

  it('3.6b: storage.onChanged from sync namespace is ignored', () => {
    setupDefaultMocks('Google US English');
    createControlPanel();
    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;

    const changeListener = getVoiceStorageChangeListener();

    // Change from sync namespace should be ignored
    changeListener(
      {
        selectedVoice: {
          oldValue: 'Google US English',
          newValue: 'Google Deutsch',
        },
      },
      'sync',
    );

    // Value should remain as set by populateVoices (Google US English)
    expect(select.value).toBe('Google US English');
  });

  it('3.8: failed GET_VOICES response leaves only the default option', () => {
    setupDefaultMocks('default', SAMPLE_VOICES, false);
    createControlPanel();

    const select = document.getElementById(
      VOICE_SELECT_ID,
    ) as HTMLSelectElement;

    expect(select.options).toHaveLength(1);
    expect(select.options[0].value).toBe('default');
  });
});
