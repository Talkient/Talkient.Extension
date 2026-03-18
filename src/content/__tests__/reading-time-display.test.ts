/// <reference lib="dom" />
/// <reference types="chrome" />

// Mocks are hoisted — define before imports
jest.mock('../../shared/api/messaging', () => ({
  safeSendMessage: jest.fn((message, callback) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mc = (global as any).chrome;
    if (mc?.runtime?.sendMessage) mc.runtime.sendMessage(message, callback);
    return true;
  }),
  isExtensionContextValid: jest.fn(() => true),
}));

jest.mock('../../features/control-panel/content/panel-ui', () => ({
  createControlPanel: jest.fn(),
  removeControlPanel: jest.fn(),
  isControlPanelVisible: jest.fn(() => false),
}));

jest.mock('../../features/control-panel/content/panel-visibility', () => ({
  initPanelHideDuration: jest.fn(),
}));

// Chrome mock — must be set before content.ts is require()'d
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).chrome = mockChrome;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).requestAnimationFrame = jest.fn((cb: () => void) => {
  setTimeout(cb, 0);
  return 1;
});

Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

// Average chars per second constant (mirrors content.ts)
const CHARS_PER_SECOND_AT_1X = 14;

/**
 * Build a minimal panel DOM with a .talkient-remaining-value span.
 * Returns { panel, el }.
 */
function buildPanel() {
  const panel = document.createElement('div');
  panel.id = 'talkient-control-panel';
  const el = document.createElement('span');
  el.className = 'talkient-remaining-value';
  el.textContent = '—';
  panel.appendChild(el);
  document.body.appendChild(panel);
  return { panel, el };
}

/**
 * Load a fresh content.ts (after jest.resetModules) and return:
 * - messageListener: the chrome.runtime.onMessage listener
 * - storageChangeListener: the chrome.storage.onChanged listener
 * - counters: fresh require of text-processor counters (same module instance as content.ts)
 */

function loadContent(): {
  messageListener: any;
  storageChangeListener: any;
  counters: any;
} {
  const counters = require('../../features/tts-playback/content/index');
  counters.resetEstimateCounters();

  // Load content.ts — it registers listeners against mockChrome
  require('../content');

  const onMessageCalls = mockChrome.runtime.onMessage.addListener.mock.calls;
  const messageListener = onMessageCalls[onMessageCalls.length - 1]?.[0];
  const onChangedCalls = mockChrome.storage.onChanged.addListener.mock.calls;
  const storageChangeListener = onChangedCalls[onChangedCalls.length - 1]?.[0];

  return { messageListener, storageChangeListener, counters };
}

function loadContentWithMockedCurrentPlayingChars(playedChars: number): {
  messageListener: any;
  storageChangeListener: any;
  counters: any;
} {
  jest.doMock('../../features/tts-playback/content/index', () => {
    const actual = jest.requireActual(
      '../../features/tts-playback/content/index',
    );
    return {
      ...actual,
      getCurrentPlayingChars: jest.fn(() => playedChars),
    };
  });

  const counters = require('../../features/tts-playback/content/index');
  counters.resetEstimateCounters();

  require('../content');

  const onMessageCalls = mockChrome.runtime.onMessage.addListener.mock.calls;
  const messageListener = onMessageCalls[onMessageCalls.length - 1]?.[0];
  const onChangedCalls = mockChrome.storage.onChanged.addListener.mock.calls;
  const storageChangeListener = onChangedCalls[onChangedCalls.length - 1]?.[0];

  return { messageListener, storageChangeListener, counters };
}

describe('updateRemainingTimeDisplay — via content.ts listeners', () => {
  let panel: HTMLDivElement;
  let el: HTMLSpanElement;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    // Reset chrome mock implementations after resetModules
    mockChrome.storage.local.get.mockImplementation(
      (_keys: unknown, callback: (r: Record<string, unknown>) => void) =>
        callback({}),
    );

    ({ panel, el } = buildPanel() as {
      panel: HTMLDivElement;
      el: HTMLSpanElement;
    });
  });

  afterEach(() => {
    if (panel.parentNode) document.body.removeChild(panel);
    jest.dontMock('../../features/tts-playback/content/index');
    jest.resetModules();
  });

  // ── Shows '—' when no nodes are processed ─────────────────────────────────

  it('keeps "—" on SPEECH_ENDED when no nodes have been processed', () => {
    const { messageListener } = loadContent();

    messageListener({ type: 'SPEECH_ENDED' }, {}, jest.fn());

    expect(el.textContent).toBe('—');
  });

  it('keeps "—" on SPEECH_ENDED when remainingChars is still -1', () => {
    const { messageListener, counters } = loadContent();

    // totalProcessedChars = 0, remainingChars = -1 (initial)
    counters.resetEstimateCounters();

    messageListener({ type: 'SPEECH_ENDED' }, {}, jest.fn());

    expect(el.textContent).toBe('—');
  });

  // ── Correct M:SS format from remainingChars ───────────────────────────────

  it('shows "1:00" for 840 remaining chars at rate 1.0', () => {
    const { messageListener, counters } = loadContent();

    counters.setRemainingChars(CHARS_PER_SECOND_AT_1X * 60); // 840

    messageListener({ type: 'SPEECH_ENDED' }, {}, jest.fn());

    expect(el.textContent).toBe('1:00');
  });

  it('shows "0:01" for 14 remaining chars at rate 1.0', () => {
    const { messageListener, counters } = loadContent();

    counters.setRemainingChars(CHARS_PER_SECOND_AT_1X); // 14 → 1 second

    messageListener({ type: 'SPEECH_ENDED' }, {}, jest.fn());

    expect(el.textContent).toBe('0:01');
  });

  it('shows "0:00" when remainingChars reaches 0', () => {
    const { messageListener, counters } = loadContent();

    counters.setRemainingChars(0);

    messageListener({ type: 'SPEECH_ENDED' }, {}, jest.fn());

    expect(el.textContent).toBe('0:00');
  });

  it('shows "10:00" for 8400 remaining chars at rate 1.0', () => {
    const { messageListener, counters } = loadContent();

    counters.setRemainingChars(CHARS_PER_SECOND_AT_1X * 600); // 10 minutes

    messageListener({ type: 'SPEECH_ENDED' }, {}, jest.fn());

    expect(el.textContent).toBe('10:00');
  });

  it('pads seconds with leading zero (e.g. "1:05")', () => {
    const { messageListener, counters } = loadContent();

    counters.setRemainingChars(CHARS_PER_SECOND_AT_1X * 65); // 1 min 5 sec

    messageListener({ type: 'SPEECH_ENDED' }, {}, jest.fn());

    expect(el.textContent).toBe('1:05');
  });

  // ── SPEECH_ENDED subtracts currentPlayingChars ────────────────────────────

  it('subtracts currentPlayingChars from remainingChars on SPEECH_ENDED', () => {
    const playedChars = CHARS_PER_SECOND_AT_1X * 30;

    const { messageListener, counters } =
      loadContentWithMockedCurrentPlayingChars(playedChars);
    counters.setRemainingChars(CHARS_PER_SECOND_AT_1X * 120);

    messageListener({ type: 'SPEECH_ENDED' }, {}, jest.fn());

    expect(el.textContent).toBe('1:30');
  });

  // ── Rate change updates display ────────────────────────────────────────────

  it('recalculates remaining time when speechRate storage changes to 2.0', () => {
    const { storageChangeListener, counters } = loadContent();

    counters.setRemainingChars(CHARS_PER_SECOND_AT_1X * 60); // 840 chars = 1 min at 1x

    // Simulate storage change to 2.0x speed — should halve the time to 0:30
    storageChangeListener(
      { speechRate: { oldValue: 1.0, newValue: 2.0 } },
      'local',
    );

    expect(el.textContent).toBe('0:30');
  });

  it('recalculates remaining time when speechRate changes to 0.5', () => {
    const { storageChangeListener, counters } = loadContent();

    counters.setRemainingChars(CHARS_PER_SECOND_AT_1X * 60); // 840 chars = 1 min at 1x

    // 0.5x speed → doubles the time to 2:00
    storageChangeListener(
      { speechRate: { oldValue: 1.0, newValue: 0.5 } },
      'local',
    );

    expect(el.textContent).toBe('2:00');
  });

  it('ignores speechRate changes from non-local storage namespaces', () => {
    const { storageChangeListener, counters } = loadContent();

    counters.setRemainingChars(CHARS_PER_SECOND_AT_1X * 60);

    // Sync namespace change should be ignored
    storageChangeListener(
      { speechRate: { oldValue: 1.0, newValue: 2.0 } },
      'sync',
    );

    // Still shows 1:00 because listener ignores 'sync'
    expect(el.textContent).toBe('—'); // display not updated for sync changes
  });

  it('does not update display when panel is absent', () => {
    // Remove panel before triggering update
    document.body.removeChild(panel);

    const { messageListener, counters } = loadContent();
    counters.setRemainingChars(840);

    // Should not throw even without the panel in the DOM
    expect(() => {
      messageListener({ type: 'SPEECH_ENDED' }, {}, jest.fn());
    }).not.toThrow();

    // Put it back so afterEach doesn't throw
    document.body.appendChild(panel);
  });

  // ── Before playback: uses totalProcessedChars as fallback ─────────────────

  it('shows total estimate before any playback when totalProcessedChars is known via remainingChars', () => {
    const { messageListener, counters } = loadContent();

    // Simulate: processing done (set remaining = total, not yet started)
    counters.setRemainingChars(CHARS_PER_SECOND_AT_1X * 300); // 5 min

    messageListener({ type: 'SPEECH_ENDED' }, {}, jest.fn());

    expect(el.textContent).toBe('5:00');
  });
});
