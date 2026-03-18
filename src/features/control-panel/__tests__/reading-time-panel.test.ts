/// <reference lib="dom" />

import { createControlPanel, removeControlPanel } from '../content/panel-ui';

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
    local: {
      get: jest.fn(
        (_keys: unknown, callback: (r: Record<string, unknown>) => void) =>
          callback({}),
      ),
      set: jest.fn(),
    },
    onChanged: { addListener: jest.fn() },
  },
};

// @ts-expect-error Mock chrome global
global.chrome = mockChrome;

global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 0);
  return 0;
});

describe('Control Panel — Reading Time Display Element', () => {
  beforeEach(() => {
    document.body.innerHTML = '<article><p>Test content</p></article>';
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('panel contains a .talkient-remaining-value element', () => {
    createControlPanel();

    const panel = document.getElementById('talkient-control-panel');
    const el = panel?.querySelector('.talkient-remaining-value');

    expect(el).toBeTruthy();
  });

  it('.talkient-remaining-value initially shows an em dash', () => {
    createControlPanel();

    const panel = document.getElementById('talkient-control-panel');
    const el = panel?.querySelector('.talkient-remaining-value');

    expect(el?.textContent).toBe('—');
  });

  it('panel has a "Remaining" label next to the remaining-value element', () => {
    createControlPanel();

    const panel = document.getElementById('talkient-control-panel');
    // Find the .talkient-rate-display that contains the remaining value
    const rateDisplays = panel?.querySelectorAll('.talkient-rate-display');
    const remainingSection = Array.from(rateDisplays ?? []).find(
      (el) => el.querySelector('.talkient-remaining-value') !== null,
    );
    const label = remainingSection?.querySelector('.talkient-rate-label');

    expect(label?.textContent).toBe('Remaining');
  });

  it('remaining-value element is inside .talkient-panel-content', () => {
    createControlPanel();

    const panel = document.getElementById('talkient-control-panel');
    const content = panel?.querySelector('.talkient-panel-content');
    const el = content?.querySelector('.talkient-remaining-value');

    expect(el).toBeTruthy();
  });

  it('remaining-value persists after panel is toggled', () => {
    createControlPanel();

    const panel = document.getElementById('talkient-control-panel');
    const toggleBtn = panel?.querySelector(
      '.talkient-panel-toggle',
    ) as HTMLButtonElement;

    // Expand
    toggleBtn.click();
    // Collapse
    toggleBtn.click();

    const el = panel?.querySelector('.talkient-remaining-value');
    expect(el).toBeTruthy();
    expect(el?.textContent).toBe('—');
  });

  it('panel structure includes both Speech Rate and Remaining sections', () => {
    createControlPanel();

    const panel = document.getElementById('talkient-control-panel');
    const rateValue = panel?.querySelector('.talkient-rate-value');
    const remainingValue = panel?.querySelector('.talkient-remaining-value');

    expect(rateValue).toBeTruthy();
    expect(remainingValue).toBeTruthy();
  });

  it('remaining-value element is removed when panel is removed', () => {
    createControlPanel();
    removeControlPanel();

    const el = document.querySelector('.talkient-remaining-value');
    expect(el).toBeFalsy();
  });
});
