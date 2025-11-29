/// <reference types="chrome" />

// Icons
const ICONS = {
  play: `<svg class="talkient-control-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg class="talkient-control-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
};

// State
let currentSpeechRate = 1.0;
let isPlaying = false;

// Elements
const playButton = document.querySelector('.talkient-control-btn.primary') as HTMLButtonElement;
const settingsButton = document.querySelector('.talkient-control-btn.settings') as HTMLButtonElement;
const scriptToggle = document.querySelector('.talkient-toggle-input') as HTMLInputElement;
const rateSlider = document.querySelector('.talkient-rate-slider') as HTMLInputElement;
const rateValue = document.querySelector('.talkient-rate-value') as HTMLSpanElement;

// Initialize
function init() {
  setupEventListeners();
  loadState();
  
  // Listen for storage changes to update UI
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.speechRate) {
        updateSpeechRateUI(changes.speechRate.newValue);
      }
      if (changes.playButtonsEnabled) {
        scriptToggle.checked = changes.playButtonsEnabled.newValue;
      }
    }
  });

  // Listen for messages (e.g. from background/content about playback state)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'PLAYBACK_STATE_CHANGED') {
      isPlaying = message.isPlaying;
      updatePlayButton();
    }
  });
}

function setupEventListeners() {
  // Play/Pause
  playButton?.addEventListener('click', () => {
    togglePlayback();
  });

  // Settings
  settingsButton?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Script Toggle
  scriptToggle?.addEventListener('change', () => {
    const isEnabled = scriptToggle.checked;
    chrome.storage.local.set({ playButtonsEnabled: isEnabled });
    
    // Notify active tab to reload buttons
    sendMessageToActiveTab({ type: 'RELOAD_PLAY_BUTTONS' });
  });

  // Speech Rate
  rateSlider?.addEventListener('input', () => {
    const rawValue = parseFloat(rateSlider.value);
    const rate = Math.round(rawValue * 20) / 20; // Round to nearest 0.05
    
    updateSpeechRateUI(rate);
    chrome.storage.local.set({ speechRate: rate });
    
    // Notify active tab/background
    sendMessageToActiveTab({ type: 'UPDATE_SPEECH_RATE', rate });
  });
}

function loadState() {
  chrome.storage.local.get(['speechRate', 'playButtonsEnabled'], (result) => {
    // Speech Rate
    const rate = typeof result.speechRate === 'number' ? result.speechRate : 1.0;
    updateSpeechRateUI(rate);
    
    // Script Toggle
    const scriptsEnabled = result.playButtonsEnabled !== false; // Default true
    if (scriptToggle) scriptToggle.checked = scriptsEnabled;
    
    // Enable controls
    if (playButton) playButton.disabled = false;
    if (rateSlider) rateSlider.disabled = false;
  });
}

function updateSpeechRateUI(rate: number) {
  currentSpeechRate = rate;
  if (rateSlider) rateSlider.value = rate.toString();
  if (rateValue) rateValue.textContent = `${rate.toFixed(2)}x`;
}

function updatePlayButton() {
  if (!playButton) return;
  playButton.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
}

function togglePlayback() {
  if (isPlaying) {
    sendMessageToActiveTab({ type: 'PAUSE_SPEECH' });
    isPlaying = false;
    updatePlayButton();
  } else {
    // To play, we usually need a selection. 
    // If we want to resume, we might need a RESUME message or similar.
    // For now, let's assume we want to trigger play on selection or resume.
    // However, the original control panel only supported PAUSE if playing, 
    // and showed an alert if not playing (saying "select text").
    
    // Let's check if we can resume or if we should alert.
    // Since we don't track "paused" state vs "stopped" state easily here without more complex logic,
    // we'll try to send a PLAY/RESUME message.
    // But per original code:
    /*
      if (isPlaying) { ... pause ... } 
      else { alert(...) }
    */
    
    // We'll replicate that behavior for now, but we need to know if we are playing.
    // We rely on `isPlaying` state.
    
    // Wait, the original code checked the ICON to determine state.
    // We should probably ask the background/content for status, but for now let's assume stopped.
    
    alert('Please select text on the page to speak, or use the play buttons next to paragraphs.');
  }
}

function sendMessageToActiveTab(message: any) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, message).catch(err => {
        console.log('Could not send message to active tab:', err);
      });
    }
  });
}

// Start
init();
