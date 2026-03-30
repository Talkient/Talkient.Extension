/// <reference lib="dom" />

/**
 * Tests for panel icon synchronisation that content.ts triggers via
 * updatePanelPlayIcon when SPEECH_ENDED / SPEECH_CANCELLED / SPEECH_ERROR
 * messages arrive.
 *
 * content.ts cannot be imported directly in unit tests (it registers
 * module-level chrome event listeners and reads storage on load), so these
 * tests exercise updatePanelPlayIcon directly — which is exactly the function
 * content.ts calls in each of those three branches.
 */

import { createControlPanel } from '../content/panel-ui';
import { updatePanelPlayIcon } from '../content/panel-controller';

// ── Mocks ────────────────────────────────────────────────────────────────────

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

const mockChrome = {
  runtime: {
    onMessage: { addListener: jest.fn() },
    sendMessage: jest.fn(),
    lastError: null,
  },
  storage: {
    local: { get: jest.fn(), set: jest.fn() },
    onChanged: { addListener: jest.fn() },
  },
};
// @ts-expect-error Mock chrome global
global.chrome = mockChrome;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPrimaryButton(): HTMLButtonElement {
  const panel = document.getElementById('talkient-control-panel')!;
  return panel.querySelector(
    '.talkient-control-btn.primary',
  ) as HTMLButtonElement;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Panel icon sync — message handler scenarios', () => {
  beforeEach(() => {
    document.body.innerHTML = '<article><p>Test content</p></article>';
    jest.clearAllMocks();
    createControlPanel();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('SPEECH_ENDED: updatePanelPlayIcon("play") resets button to play icon', () => {
    // Simulate icon being in pause state (speech was playing)
    updatePanelPlayIcon('pause');
    expect(getPrimaryButton().innerHTML).toBe('<svg data-icon="pause"></svg>');

    // content.ts SPEECH_ENDED handler calls updatePanelPlayIcon('play')
    updatePanelPlayIcon('play');
    expect(getPrimaryButton().innerHTML).toBe('<svg data-icon="play"></svg>');
  });

  it('SPEECH_CANCELLED: updatePanelPlayIcon("play") resets button to play icon', () => {
    updatePanelPlayIcon('pause');
    expect(getPrimaryButton().innerHTML).toBe('<svg data-icon="pause"></svg>');

    // content.ts SPEECH_CANCELLED handler calls updatePanelPlayIcon('play')
    updatePanelPlayIcon('play');
    expect(getPrimaryButton().innerHTML).toBe('<svg data-icon="play"></svg>');
  });

  it('SPEECH_ERROR: updatePanelPlayIcon("play") resets button to play icon', () => {
    updatePanelPlayIcon('pause');
    expect(getPrimaryButton().innerHTML).toBe('<svg data-icon="pause"></svg>');

    // content.ts SPEECH_ERROR handler calls updatePanelPlayIcon('play')
    updatePanelPlayIcon('play');
    expect(getPrimaryButton().innerHTML).toBe('<svg data-icon="play"></svg>');
  });

  it('updatePanelPlayIcon is a no-op when panel is not present', () => {
    document.getElementById('talkient-control-panel')?.remove();
    expect(() => updatePanelPlayIcon('play')).not.toThrow();
    expect(() => updatePanelPlayIcon('pause')).not.toThrow();
  });
});
