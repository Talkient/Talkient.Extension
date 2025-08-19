/// <reference lib="dom" />
/// <reference types="chrome" />

/**
 * Control Panel Module
 * Handles the creation and management of the Talkient control panel UI
 */

// Function to create and inject the control panel
export function createControlPanel(): void {
  // Check if control panel already exists
  if (document.getElementById('talkient-control-panel')) {
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
          <button class="talkient-control-btn primary" disabled title="Play/Pause">
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
            step="0.1" 
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
  setupDragFunctionality(panel);
}

/**
 * Sets up the close button functionality
 */
function setupCloseButton(panel: HTMLElement): void {
  const closeButton = panel.querySelector(
    '.talkient-panel-close'
  ) as HTMLButtonElement;

  closeButton?.addEventListener('click', () => {
    panel.remove();
  });
}

/**
 * Sets up the collapse/expand functionality
 */
function setupToggleButton(panel: HTMLElement): void {
  const toggleButton = panel.querySelector(
    '.talkient-panel-toggle'
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
    '.talkient-control-btn.settings'
  ) as HTMLButtonElement;

  settingsButton?.addEventListener('click', () => {
    // Send message to background script to open the options page
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          '[Talkient.Content] Error sending OPEN_OPTIONS message:',
          chrome.runtime.lastError
        );
      } else if (!response?.success) {
        console.error(
          '[Talkient.Content] Failed to open options page:',
          response?.error
        );
      }
    });
  });
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
