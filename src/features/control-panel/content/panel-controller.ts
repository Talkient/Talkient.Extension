/// <reference lib="dom" />
/// <reference types="chrome" />

import { safeSendMessage } from '../../../shared/api/messaging';
import type { MessageResponse } from '../../../shared/types/messages';
import { getSvgIcon, isSvgPauseIcon } from '../../assets/content/icons';
import { clearHighlight } from '../../../content/highlight';
import { setSpeechRate } from '../../tts-playback/content/index';
import { safeClickButton } from '../../tts-playback/content/play-button';
import { getPanelHideDuration, setDomainHideCookie } from './panel-visibility';
import { VOICE_SELECT_ID } from './panel-constants';

/**
 * Sets up all event listeners for the control panel
 */
export function setupControlPanelEventListeners(panel: HTMLElement): void {
  setupCloseButton(panel);
  setupToggleButton(panel);
  setupSettingsButton(panel);
  setupScriptControlButtons(panel);
  setupSpeechRateSlider(panel);
  setupVoiceSelector(panel);
  setupMainControlButton(panel);
  setupDragFunctionality(panel);
}

/**
 * Sets up the close button functionality
 */
function setupCloseButton(panel: HTMLElement): void {
  const closeButton = panel.querySelector(
    '.talkient-panel-close',
  ) as HTMLButtonElement;

  closeButton?.addEventListener('click', () => {
    const duration = getPanelHideDuration();
    setDomainHideCookie();
    if (duration > 0) {
      console.log(
        `[Talkient.ControlPanel] Panel closed. Will be hidden for ${duration} minutes on this domain.`,
      );
    } else {
      console.log(
        '[Talkient.ControlPanel] Panel closed. Duration is 0, panel will reappear on next page load.',
      );
    }
    panel.remove();
  });
}

/**
 * Sets up the collapse/expand functionality
 */
function setupToggleButton(panel: HTMLElement): void {
  const toggleButton = panel.querySelector(
    '.talkient-panel-toggle',
  ) as HTMLButtonElement;
  const content = panel.querySelector('.talkient-panel-content') as HTMLElement;
  let isCollapsed = true; // Start collapsed by default

  toggleButton?.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
      content.style.display = 'none';
      toggleButton.innerHTML = '+';
      toggleButton.title = 'Expand panel';
      panel.classList.add('talkient-collapsed');
    } else {
      content.style.display = 'block';
      toggleButton.innerHTML = '−';
      toggleButton.title = 'Collapse panel';
      panel.classList.remove('talkient-collapsed');
    }
  });
}

/**
 * Sets up the settings button functionality
 */
function setupSettingsButton(panel: HTMLElement): void {
  const settingsButton = panel.querySelector(
    '.talkient-control-btn.settings',
  ) as HTMLButtonElement;

  settingsButton?.addEventListener('click', () => {
    safeSendMessage(
      { type: 'OPEN_OPTIONS' },
      (response: MessageResponse | undefined) => {
        if (!response?.success) {
          console.error(
            '[Talkient.Content] Failed to open options page:',
            response && 'error' in response ? response.error : 'Unknown error',
          );
        }
      },
    );
  });
}

/**
 * Sets up the play buttons toggle switch functionality
 */
function setupScriptControlButtons(panel: HTMLElement): void {
  const toggleInput = panel.querySelector(
    '.talkient-toggle-input',
  ) as HTMLInputElement;

  // Load the current state from storage
  chrome.storage.local.get(['playButtonsEnabled'], (result) => {
    const isEnabled = result.playButtonsEnabled !== false;
    toggleInput.checked = isEnabled;

    if (!isEnabled) {
      removeAllPlayButtons();
    }
  });

  toggleInput?.addEventListener('change', () => {
    const isEnabled = toggleInput.checked;

    void chrome.storage.local.set({ playButtonsEnabled: isEnabled });

    if (isEnabled) {
      removeAllPlayButtons();

      safeSendMessage({ type: 'RELOAD_PLAY_BUTTONS' }, (_response) => {
        console.log(
          '[Talkient.Content] Play buttons enabled and loaded successfully',
        );
      });
    } else {
      removeAllPlayButtons();
      console.log('[Talkient.Content] Play buttons disabled and removed');
    }
  });
}

/**
 * Sets up the speech rate slider functionality
 */
function setupSpeechRateSlider(panel: HTMLElement): void {
  const rateSlider = panel.querySelector(
    '.talkient-rate-slider',
  ) as HTMLInputElement;
  const rateValue = panel.querySelector(
    '.talkient-rate-value',
  ) as HTMLSpanElement;

  if (!rateSlider || !rateValue) return;

  rateSlider.disabled = false;

  // Load the current rate from storage
  chrome.storage.local.get(['speechRate'], (result) => {
    const speechRate =
      typeof result.speechRate === 'number' ? result.speechRate : 1.0;

    const roundedRate = Math.round(speechRate * 20) / 20;

    rateSlider.value = roundedRate.toString();
    rateValue.textContent = `${roundedRate.toFixed(2)}x`;
  });

  rateSlider.addEventListener('input', () => {
    const rawValue = parseFloat(rateSlider.value);
    const speechRate = Math.round(rawValue * 20) / 20;

    rateSlider.value = speechRate.toString();
    rateValue.textContent = `${speechRate.toFixed(2)}x`;
    void chrome.storage.local.set({ speechRate });

    setSpeechRate(speechRate);

    console.log('[Talkient.Content] Speech rate updated to:', speechRate);
  });
}

/**
 * Populates the voice selector with available TTS voices
 */
function populateVoices(voiceSelect: HTMLSelectElement): void {
  voiceSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = 'default';
  defaultOption.textContent = 'Default Voice';
  voiceSelect.appendChild(defaultOption);

  safeSendMessage(
    { type: 'GET_VOICES' },
    (response: MessageResponse | undefined) => {
      if (!response?.success) return;
      if (!('voices' in response)) return;

      const voices = response.voices ?? [];
      if (!voices.length) return;

      const usedVoiceNames = new Set<string>();
      voices.forEach((voice) => {
        const name = voice.voiceName;
        if (!name || usedVoiceNames.has(name)) return;
        usedVoiceNames.add(name);

        const option = document.createElement('option');
        option.value = name;
        option.textContent = `${name} (${voice.lang || 'Unknown language'})`;
        voiceSelect.appendChild(option);
      });

      // Re-read selectedVoice from storage to avoid using a stale value
      chrome.storage.local.get(['selectedVoice'], (result) => {
        const latestVoice =
          typeof result.selectedVoice === 'string'
            ? result.selectedVoice
            : 'default';
        const optionExists = Array.from(voiceSelect.options).some(
          (opt) => opt.value === latestVoice,
        );
        voiceSelect.value = optionExists ? latestVoice : 'default';
      });
    },
  );
}

/**
 * Sets up the voice selector functionality
 */
function setupVoiceSelector(panel: HTMLElement): void {
  const voiceSelect = panel.querySelector(
    `#${VOICE_SELECT_ID}`,
  ) as HTMLSelectElement;
  if (!voiceSelect) return;

  populateVoices(voiceSelect);

  voiceSelect.addEventListener('change', () => {
    void chrome.storage.local.set({ selectedVoice: voiceSelect.value });
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local' || !('selectedVoice' in changes)) return;
    const newValue = changes.selectedVoice.newValue as string | undefined;
    const optionExists = Array.from(voiceSelect.options).some(
      (opt) => opt.value === newValue,
    );
    voiceSelect.value = optionExists && newValue ? newValue : 'default';
  });
}

/**
 * Sets up the main play/pause control button
 */
function setupMainControlButton(panel: HTMLElement): void {
  const mainButton = panel.querySelector(
    '.talkient-control-btn.primary',
  ) as HTMLButtonElement;

  if (!mainButton) return;

  // Set the initial icon to play
  mainButton.innerHTML = getSvgIcon('play');

  mainButton.addEventListener('click', () => {
    const isPlaying = isSvgPauseIcon(
      mainButton.querySelector('svg') as SVGElement,
    );

    if (isPlaying) {
      safeSendMessage({ type: 'PAUSE_SPEECH' }, (_response) => {
        mainButton.innerHTML = getSvgIcon('play');
        clearHighlight();
      });
    } else {
      // If speech is paused, the paused play button still shows the pause icon.
      // Find it first so we resume that text instead of starting from the top.
      const pausedButton = Array.from(
        document.querySelectorAll('.talkient-play-button'),
      ).find((btn) =>
        isSvgPauseIcon(btn.querySelector('svg') as SVGElement),
      ) as HTMLElement | undefined;

      if (pausedButton) {
        // Reset to play icon so its click handler sends SPEAK_TEXT (SW resumes)
        pausedButton.innerHTML = getSvgIcon('play');
        safeClickButton(pausedButton);
      } else {
        const playButton = document.querySelector<HTMLElement>(
          '.talkient-play-button',
        );
        if (playButton) {
          safeClickButton(playButton);
        } else {
          console.warn(
            '[Talkient.ControlPanel] No .talkient-play-button found on page.',
          );
        }
      }
    }
  });
}

/**
 * Updates the panel primary play/pause button icon.
 */
export function updatePanelPlayIcon(state: 'play' | 'pause'): void {
  const panel = document.getElementById('talkient-control-panel');
  if (!panel) return;
  const button = panel.querySelector('.talkient-control-btn.primary');
  if (!button) return;
  button.innerHTML = getSvgIcon(state);
}

/**
 * Removes all play buttons from the page
 */
function removeAllPlayButtons(): void {
  const processedElements = document.querySelectorAll('.talkient-processed');
  processedElements.forEach((element) => {
    const textContent = element.textContent || '';
    const textNode = document.createTextNode(textContent.replace(/\s*$/, ''));

    if (element.parentNode) {
      element.parentNode.insertBefore(textNode, element);
      element.remove();
    }
  });

  const playButtons = document.querySelectorAll('.talkient-play-button');
  playButtons.forEach((button) => button.remove());
}

/**
 * Sets up drag functionality for moving the panel
 */
function setupDragFunctionality(panel: HTMLElement): void {
  const header = panel.querySelector('.talkient-panel-header') as HTMLElement;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  header.style.cursor = 'grab';
  header.title = 'Drag to move panel';

  header.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }

    isDragging = true;
    header.style.cursor = 'grabbing';

    startX = e.clientX;
    startY = e.clientY;

    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    panel.style.position = 'fixed';
    panel.style.left = startLeft + 'px';
    panel.style.top = startTop + 'px';
    panel.style.transform = 'none';

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    let newLeft = startLeft + deltaX;
    let newTop = startTop + deltaY;

    const panelRect = panel.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelRect.width));
    newTop = Math.max(0, Math.min(newTop, viewportHeight - panelRect.height));

    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      header.style.cursor = 'grab';
    }
  });
}
