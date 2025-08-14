document.addEventListener('DOMContentLoaded', () => {
  const voiceSelect = document.getElementById(
    'voice-select'
  ) as HTMLSelectElement;
  const rateSlider = document.getElementById('rate-slider') as HTMLInputElement;
  const pitchSlider = document.getElementById(
    'pitch-slider'
  ) as HTMLInputElement;
  const highlightStyleSelect = document.getElementById(
    'highlight-style-select'
  ) as HTMLSelectElement;
  const rateValue = document.getElementById('rate-value') as HTMLSpanElement;
  const pitchValue = document.getElementById('pitch-value') as HTMLSpanElement;

  if (
    !voiceSelect ||
    !rateSlider ||
    !pitchSlider ||
    !highlightStyleSelect ||
    !rateValue ||
    !pitchValue
  )
    return;

  // Restore settings from storage
  chrome.storage.local.get(
    ['selectedVoice', 'speechRate', 'speechPitch', 'highlightStyle'],
    (result) => {
      const selectedVoice =
        typeof result.selectedVoice === 'string'
          ? result.selectedVoice
          : 'default';
      const speechRate =
        typeof result.speechRate === 'number' ? result.speechRate : 1.0;
      const speechPitch =
        typeof result.speechPitch === 'number' ? result.speechPitch : 1.0;
      const highlightStyle =
        typeof result.highlightStyle === 'string'
          ? result.highlightStyle
          : 'default';

      populateVoices(selectedVoice);

      // Set rate slider and display value
      rateSlider.value = speechRate.toString();
      rateValue.textContent = `${speechRate.toFixed(1)}x`;

      // Set pitch slider and display value
      pitchSlider.value = speechPitch.toString();
      pitchValue.textContent = `${speechPitch.toFixed(1)}x`;

      // Set highlight style select
      highlightStyleSelect.value = highlightStyle;
    }
  );

  // Save selected voice to storage
  voiceSelect.addEventListener('change', () => {
    const selectedVoice = voiceSelect.value;
    chrome.storage.local.set({ selectedVoice });

    // Show a brief status message
    showStatus('Voice selection saved!', 'success');
  });

  // Save rate to storage and update display
  rateSlider.addEventListener('input', () => {
    const speechRate = parseFloat(rateSlider.value);
    rateValue.textContent = `${speechRate.toFixed(1)}x`;
    chrome.storage.local.set({ speechRate });

    // Show a brief status message
    showStatus('Speech rate saved!', 'success');
  });

  // Save pitch to storage and update display
  pitchSlider.addEventListener('input', () => {
    const speechPitch = parseFloat(pitchSlider.value);
    pitchValue.textContent = `${speechPitch.toFixed(1)}x`;
    chrome.storage.local.set({ speechPitch });

    // Show a brief status message
    showStatus('Speech pitch saved!', 'success');
  });

  // Save highlight style to storage
  highlightStyleSelect.addEventListener('change', () => {
    const highlightStyle = highlightStyleSelect.value;
    chrome.storage.local.set({ highlightStyle });

    // Show a brief status message
    showStatus('Highlight style saved!', 'success');
  });
});

function showStatus(
  message: string,
  type: 'success' | 'error' | 'warning' = 'success'
) {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;

  statusDiv.textContent = message;
  statusDiv.className = `visible ${type}`;

  // Hide after 3 seconds
  setTimeout(() => {
    statusDiv.classList.remove('visible');
  }, 3000);
}

function populateVoices(selectedVoice: string) {
  const voiceSelect = document.getElementById(
    'voice-select'
  ) as HTMLSelectElement;
  if (!voiceSelect) return;

  // Clear existing options except the default
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
    // If no match, select default
    if (!voiceSelect.value || voiceSelect.value !== selectedVoice) {
      voiceSelect.value = selectedVoice || 'default';
    }
  });
}
