/// <reference lib="dom" />
/// <reference types="chrome" />

import { safeSendMessage } from './runtime-utils';
import type { MessageResponse } from '../shared/types/messages';

/**
 * Control Panel Module
 * Handles the creation and management of the Talkient control panel UI
 */

// Cookie name for hiding the control panel
const PANEL_HIDDEN_COOKIE_NAME = 'talkient_panel_hidden';

// Default duration to hide the panel in minutes
const DEFAULT_PANEL_HIDDEN_DURATION_MINUTES = 30;

// Cached duration value (updated from storage)
let cachedPanelHideDuration = DEFAULT_PANEL_HIDDEN_DURATION_MINUTES;

/**
 * Initializes the cached panel hide duration from storage
 * Should be called when the content script loads
 */
export function initPanelHideDuration(): void {
  chrome.storage.local.get(['panelHideDuration'], (result) => {
    if (typeof result.panelHideDuration === 'number') {
      cachedPanelHideDuration = result.panelHideDuration;
    }
  });

  // Listen for storage changes to keep cache in sync
  if (chrome.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.panelHideDuration) {
        const newDuration = changes.panelHideDuration.newValue;
        if (typeof newDuration === 'number') {
          cachedPanelHideDuration = newDuration;
        }
      }
    });
  }
}

/**
 * Gets the current panel hide duration in minutes
 * @returns The duration in minutes (0-9999, default 30)
 */
export function getPanelHideDuration(): number {
  return cachedPanelHideDuration;
}

/**
 * Gets the cookie name used to track if the panel is hidden for this domain
 * @returns The cookie name
 */
export function getDomainHideCookieName(): string {
  return PANEL_HIDDEN_COOKIE_NAME;
}

/**
 * Checks if the control panel should be hidden for the current domain
 * @returns true if the panel should be hidden (cookie exists and is not expired)
 */
export function isPanelHiddenForDomain(): boolean {
  const cookieName = getDomainHideCookieName();
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === cookieName && value === 'true') {
      return true;
    }
  }

  return false;
}

/**
 * Sets a cookie to hide the control panel for the configured duration
 * The cookie will automatically expire after the duration
 * If duration is 0, no cookie is set (panel can always be closed but won't stay hidden)
 */
export function setDomainHideCookie(): void {
  const duration = getPanelHideDuration();

  // If duration is 0, don't set a cookie (panel won't stay hidden)
  if (duration === 0) {
    return;
  }

  const cookieName = getDomainHideCookieName();
  const expires = new Date(Date.now() + duration * 60 * 1000);
  document.cookie = `${cookieName}=true; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Clears the cookie that hides the control panel
 * This allows the panel to be shown again before the expiration time
 */
export function clearDomainHideCookie(): void {
  const cookieName = getDomainHideCookieName();
  document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

// Function to create and inject the control panel
export function createControlPanel(): void {
  // Check if control panel already exists
  if (document.getElementById('talkient-control-panel')) {
    return;
  }

  // Check if the panel is hidden for this domain (via cookie)
  if (isPanelHiddenForDomain()) {
    console.log(
      '[Talkient.ControlPanel] Control panel is hidden for this domain. Will be available again after cookie expires.',
    );
    return;
  }

  // Check if there's an article element in the DOM
  const articleElement = document.querySelector('article');
  if (!articleElement) {
    console.log(
      '[Talkient.ControlPanel] No article element found in DOM. Control panel will not be created.',
    );
    return;
  }

  // Create the control panel container
  const panel = document.createElement('div');
  panel.id = 'talkient-control-panel';

  // Create panel content
  panel.innerHTML = `
    <div class="talkient-panel-header">
      <h3 class="talkient-panel-title">Talkient</h3>
      <div class="talkient-header-controls">
        <button class="talkient-panel-toggle" title="Expand panel">+</button>
        <button class="talkient-panel-close" title="Close panel">×</button>
      </div>
    </div>
    
    <div class="talkient-panel-content">
      <div class="talkient-control-section">
        <div class="talkient-main-controls">
          <button class="talkient-control-btn primary" title="Play/Pause" disabled>
            <svg class="talkient-control-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <button class="talkient-control-btn settings" title="Settings">
            <svg class="talkient-control-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="talkient-control-section">
        <div class="talkient-section-title">Talkient Scripts</div>
        <div class="talkient-script-controls">
          <label class="talkient-toggle-switch">
            <input type="checkbox" class="talkient-toggle-input" checked>
            <span class="talkient-toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="talkient-control-section">
        <div class="talkient-section-title">Speech Rate</div>
        <div class="talkient-speech-rate">
          <div class="talkient-rate-display">
            <span class="talkient-rate-label">Speed</span>
            <span class="talkient-rate-value">1.0x</span>
          </div>
          <input 
            type="range" 
            class="talkient-rate-slider" 
            min="0.5" 
            max="2.0" 
            step="0.05" 
            value="1.0"
            disabled
          />
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  setupControlPanelEventListeners(panel);

  // Set panel to collapsed state by default
  const content = panel.querySelector('.talkient-panel-content') as HTMLElement;
  if (content) {
    content.style.display = 'none';
    panel.classList.add('talkient-collapsed');
  }

  // Add the panel to the document
  document.body.appendChild(panel);
}

/**
 * Sets up all event listeners for the control panel
 */
function setupControlPanelEventListeners(panel: HTMLElement): void {
  setupCloseButton(panel);
  setupToggleButton(panel);
  setupSettingsButton(panel);
  setupScriptControlButtons(panel);
  setupSpeechRateSlider(panel);
  setupMainControlButton(panel);
  setupDragFunctionality(panel);
}

/**
 * Sets up the close button functionality
 * When the close button is clicked, sets a cookie to hide the panel for the configured duration
 */
function setupCloseButton(panel: HTMLElement): void {
  const closeButton = panel.querySelector(
    '.talkient-panel-close',
  ) as HTMLButtonElement;

  closeButton?.addEventListener('click', () => {
    const duration = getPanelHideDuration();
    // Set cookie to hide panel on this domain
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
    // Send message to background script to open the options page
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
  // Setup toggle switch
  const toggleInput = panel.querySelector(
    '.talkient-toggle-input',
  ) as HTMLInputElement;

  // Load the current state from storage
  chrome.storage.local.get(['playButtonsEnabled'], (result) => {
    // Default to true if not set
    const isEnabled = result.playButtonsEnabled !== false;
    toggleInput.checked = isEnabled;

    // Apply initial state
    if (!isEnabled) {
      removeAllPlayButtons();
    }
  });

  toggleInput?.addEventListener('change', () => {
    const isEnabled = toggleInput.checked;

    // Save the state to storage
    void chrome.storage.local.set({ playButtonsEnabled: isEnabled });

    if (isEnabled) {
      // Remove existing buttons and re-add them
      removeAllPlayButtons();

      // Re-process text elements to add new play buttons
      safeSendMessage({ type: 'RELOAD_PLAY_BUTTONS' }, (_response) => {
        console.log(
          '[Talkient.Content] Play buttons enabled and loaded successfully',
        );
      });
    } else {
      // Remove all play buttons without re-adding them
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

  // Load the current rate from storage
  chrome.storage.local.get(['speechRate'], (result) => {
    const speechRate =
      typeof result.speechRate === 'number' ? result.speechRate : 1.0;

    // Enforce 0.05 step increment by rounding to nearest 0.05
    const roundedRate = Math.round(speechRate * 20) / 20;

    // Set rate slider and display value
    rateSlider.value = roundedRate.toString();
    rateValue.textContent = `${roundedRate.toFixed(2)}x`;
  });

  // Save rate to storage and update display on change
  rateSlider.addEventListener('input', () => {
    // Enforce 0.05 step increment by rounding to nearest 0.05
    const rawValue = parseFloat(rateSlider.value);
    const speechRate = Math.round(rawValue * 20) / 20; // Round to nearest 0.05

    // Update the slider value to the rounded value
    rateSlider.value = speechRate.toString();
    rateValue.textContent = `${speechRate.toFixed(2)}x`;
    void chrome.storage.local.set({ speechRate });

    // Enable the play button if it's disabled
    const playButton = panel.querySelector(
      '.talkient-control-btn.primary',
    ) as HTMLButtonElement;
    if (playButton && playButton.disabled) {
      playButton.disabled = false;
    }

    // Update content-lib cache for sync
    void import('./content-lib').then(({ setSpeechRate }) => {
      setSpeechRate(speechRate);
    });

    console.log('[Talkient.Content] Speech rate updated to:', speechRate);
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

  // Import the required icons
  void import('../features/assets/content/icons').then(
    ({ getSvgIcon, isSvgPlayIcon: _isSvgPlayIcon, isSvgPauseIcon }) => {
      // Set the initial icon to play
      mainButton.innerHTML = getSvgIcon('play');

      // Keep the button disabled by default
      // mainButton.disabled = false; // Removed to keep button disabled

      // Enable the speech rate slider when the play button is enabled
      const rateSlider = panel.querySelector(
        '.talkient-rate-slider',
      ) as HTMLInputElement;
      if (rateSlider) {
        rateSlider.disabled = false;
      }

      mainButton.addEventListener('click', () => {
        const isPlaying = isSvgPauseIcon(
          mainButton.querySelector('svg') as SVGElement,
        );

        if (isPlaying) {
          // Pause the speech
          safeSendMessage({ type: 'PAUSE_SPEECH' }, (_response) => {
            // Set play icon
            mainButton.innerHTML = getSvgIcon('play');

            // Import and use the clearHighlight function
            void import('./highlight').then(({ clearHighlight }) => {
              clearHighlight();
            });
          });
        } else {
          // Currently, we can't play from the control panel because we don't have a text selection
          // Show a notification or hint to the user
          alert(
            'Please select text on the page to speak, or use the play buttons next to paragraphs.',
          );
        }
      });
    },
  );
}

/**
 * Removes all play buttons from the page
 */
function removeAllPlayButtons(): void {
  // Remove all processed elements
  const processedElements = document.querySelectorAll('.talkient-processed');
  processedElements.forEach((element) => {
    // Get the text content
    const textContent = element.textContent || '';

    // Create a text node with the original content
    const textNode = document.createTextNode(textContent.replace(/\s*$/, ''));

    // Replace the processed element with the original text node
    if (element.parentNode) {
      element.parentNode.insertBefore(textNode, element);
      element.remove();
    }
  });

  // Remove all play buttons that might not be in processed elements
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

  // Make the header draggable
  header.style.cursor = 'grab';
  header.title = 'Drag to move panel';

  header.addEventListener('mousedown', (e) => {
    // Don't start dragging if clicking on buttons
    if ((e.target as HTMLElement).tagName === 'BUTTON') {
      return;
    }

    isDragging = true;
    header.style.cursor = 'grabbing';

    startX = e.clientX;
    startY = e.clientY;

    // Get current position
    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    // Change to absolute positioning
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

    // Keep panel within viewport bounds
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

/**
 * Removes the control panel from the DOM if it exists
 */
export function removeControlPanel(): void {
  const panel = document.getElementById('talkient-control-panel');
  if (panel) {
    panel.remove();
  }
}

/**
 * Checks if the control panel is currently visible
 */
export function isControlPanelVisible(): boolean {
  const panel = document.getElementById('talkient-control-panel');
  return panel !== null;
}

/**
 * Toggles the visibility of the control panel
 */
export function toggleControlPanel(): void {
  if (isControlPanelVisible()) {
    removeControlPanel();
  } else {
    createControlPanel();
  }
}
