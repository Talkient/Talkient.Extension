import '../__tests__/mocks/chrome';
import {
  getActiveTabId,
  setActiveTabId,
  setupTabListeners,
} from '../tab-manager';

jest.mock('../../features/tts-playback/background/tts-engine', () => ({
  resetSpeechState: jest.fn(),
}));

import { resetSpeechState } from '../../features/tts-playback/background/tts-engine';

describe('tab-manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setActiveTabId(null);
  });

  describe('getActiveTabId / setActiveTabId', () => {
    it('should return null by default', () => {
      expect(getActiveTabId()).toBeNull();
    });

    it('should return the value that was set', () => {
      setActiveTabId(42);
      expect(getActiveTabId()).toBe(42);
    });

    it('should allow resetting to null', () => {
      setActiveTabId(99);
      setActiveTabId(null);
      expect(getActiveTabId()).toBeNull();
    });
  });

  describe('setupTabListeners', () => {
    let onActivatedHandler: (activeInfo: { tabId: number }) => void;
    let onRemovedHandler: (tabId: number) => void;
    let onUpdatedHandler: (
      tabId: number,
      changeInfo: { status?: string },
    ) => void;

    beforeEach(() => {
      (chrome.tabs.onActivated.addListener as jest.Mock).mockClear();
      (chrome.tabs.onRemoved.addListener as jest.Mock).mockClear();
      (chrome.tabs.onUpdated.addListener as jest.Mock).mockClear();

      setupTabListeners();

      onActivatedHandler = (chrome.tabs.onActivated.addListener as jest.Mock)
        .mock.calls[0][0];
      onRemovedHandler = (chrome.tabs.onRemoved.addListener as jest.Mock).mock
        .calls[0][0];
      onUpdatedHandler = (chrome.tabs.onUpdated.addListener as jest.Mock).mock
        .calls[0][0];
    });

    describe('onActivated', () => {
      it('should register an onActivated listener', () => {
        expect(chrome.tabs.onActivated.addListener).toHaveBeenCalledTimes(1);
      });

      it('should update activeTabId when a tab is activated', () => {
        onActivatedHandler({ tabId: 7 });
        expect(getActiveTabId()).toBe(7);
      });

      it('should overwrite the previous activeTabId on successive activations', () => {
        onActivatedHandler({ tabId: 1 });
        onActivatedHandler({ tabId: 2 });
        expect(getActiveTabId()).toBe(2);
      });
    });

    describe('onRemoved', () => {
      it('should register an onRemoved listener', () => {
        expect(chrome.tabs.onRemoved.addListener).toHaveBeenCalledTimes(1);
      });

      it('should stop TTS and reset state when the active tab is removed', () => {
        setActiveTabId(5);
        onRemovedHandler(5);

        expect(chrome.tts.stop).toHaveBeenCalledTimes(1);
        expect(resetSpeechState).toHaveBeenCalledTimes(1);
        expect(getActiveTabId()).toBeNull();
      });

      it('should not stop TTS when a non-active tab is removed', () => {
        setActiveTabId(5);
        onRemovedHandler(99);

        expect(chrome.tts.stop).not.toHaveBeenCalled();
        expect(resetSpeechState).not.toHaveBeenCalled();
        expect(getActiveTabId()).toBe(5);
      });

      it('should not stop TTS when no active tab is tracked', () => {
        onRemovedHandler(5);

        expect(chrome.tts.stop).not.toHaveBeenCalled();
        expect(resetSpeechState).not.toHaveBeenCalled();
      });

      it('should not double-stop if the same tabId is removed twice', () => {
        setActiveTabId(5);
        onRemovedHandler(5);

        (chrome.tts.stop as jest.Mock).mockClear();
        (resetSpeechState as jest.Mock).mockClear();

        onRemovedHandler(5);

        expect(chrome.tts.stop).not.toHaveBeenCalled();
        expect(resetSpeechState).not.toHaveBeenCalled();
      });
    });

    describe('onUpdated', () => {
      it('should register an onUpdated listener', () => {
        expect(chrome.tabs.onUpdated.addListener).toHaveBeenCalledTimes(1);
      });

      it('should stop TTS when the active tab starts loading (refresh)', () => {
        setActiveTabId(5);
        onUpdatedHandler(5, { status: 'loading' });

        expect(chrome.tts.stop).toHaveBeenCalledTimes(1);
        expect(resetSpeechState).toHaveBeenCalledTimes(1);
      });

      it('should not stop TTS when a non-active tab starts loading', () => {
        setActiveTabId(5);
        onUpdatedHandler(99, { status: 'loading' });

        expect(chrome.tts.stop).not.toHaveBeenCalled();
        expect(resetSpeechState).not.toHaveBeenCalled();
      });

      it('should not stop TTS when the active tab finishes loading (complete)', () => {
        setActiveTabId(5);
        onUpdatedHandler(5, { status: 'complete' });

        expect(chrome.tts.stop).not.toHaveBeenCalled();
        expect(resetSpeechState).not.toHaveBeenCalled();
      });

      it('should not stop TTS when changeInfo has no status', () => {
        setActiveTabId(5);
        onUpdatedHandler(5, {});

        expect(chrome.tts.stop).not.toHaveBeenCalled();
        expect(resetSpeechState).not.toHaveBeenCalled();
      });

      it('should not reset activeTabId after a refresh (tab still exists)', () => {
        setActiveTabId(5);
        onUpdatedHandler(5, { status: 'loading' });

        expect(getActiveTabId()).toBe(5);
      });
    });
  });
});
