/// <reference lib="dom" />
/// <reference types="chrome" />

import { isPanelHiddenForDomain } from './panel-visibility';
import { setupControlPanelEventListeners } from './panel-controller';

/**
 * Panel UI Module
 * Handles creation and lifecycle of the Talkient control panel DOM element
 */

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

      <div class="talkient-control-section">
        <div class="talkient-speech-rate">
          <div class="talkient-rate-display">
            <span class="talkient-rate-label">Remaining</span>
            <span class="talkient-remaining-value">—</span>
          </div>
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
