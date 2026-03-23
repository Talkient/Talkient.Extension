import { initAuth } from '../features/auth/popup/auth-ui';

console.log('Popup for Talkient Extension');

// Add event listener for the "Go to my settings" link
document.addEventListener('DOMContentLoaded', () => {
  // Initialize auth UI (elements, state check, button listeners)
  initAuth();

  // Initialize voice selector
  const voiceSelect = document.getElementById(
    'voice-select',
  ) as HTMLSelectElement | null;
  if (voiceSelect) {
    chrome.storage.local.get(['selectedVoice'], (result) => {
      const selectedVoice =
        typeof result.selectedVoice === 'string'
          ? result.selectedVoice
          : 'default';
      populateVoices(voiceSelect, selectedVoice);
    });

    voiceSelect.addEventListener('change', () => {
      const selectedVoice = voiceSelect.value;
      void chrome.storage.local.set({ selectedVoice });
    });
  }

  const optionsLink = document.getElementById('options-link');
  const reportIssueLink = document.getElementById('report-issue-link');

  if (optionsLink) {
    optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open the options page
      void chrome.runtime.openOptionsPage();
    });
  }

  if (reportIssueLink) {
    reportIssueLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open the GitHub issues page in a new tab
      void chrome.tabs.create({
        url: 'https://github.com/Talkient/Talkient.Extension/issues/new',
      });
    });
  }
});

function populateVoices(
  voiceSelect: HTMLSelectElement,
  selectedVoice: string,
): void {
  voiceSelect.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = 'default';
  defaultOption.textContent = 'Default Voice';
  voiceSelect.appendChild(defaultOption);

  chrome.tts.getVoices((voices) => {
    voices.forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.voiceName || '';
      option.textContent = `${voice.voiceName} (${voice.lang})`;
      if (voice.voiceName === selectedVoice) {
        option.selected = true;
      }
      voiceSelect.appendChild(option);
    });
    if (!voiceSelect.value || voiceSelect.value !== selectedVoice) {
      voiceSelect.value = selectedVoice || 'default';
    }
  });
}
