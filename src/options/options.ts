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
  const autoPlayNextToggle = document.getElementById(
    'auto-play-next-toggle'
  ) as HTMLInputElement;
  const minimumWordsInput = document.getElementById(
    'minimum-words-input'
  ) as HTMLInputElement;
  const maxNodesInput = document.getElementById(
    'max-nodes-input'
  ) as HTMLInputElement;

  if (
    !voiceSelect ||
    !rateSlider ||
    !pitchSlider ||
    !highlightStyleSelect ||
    !rateValue ||
    !pitchValue ||
    !autoPlayNextToggle ||
    !minimumWordsInput ||
    !maxNodesInput
  )
    return;

  // Restore settings from storage
  chrome.storage.local.get(
    [
      'selectedVoice',
      'speechRate',
      'speechPitch',
      'highlightStyle',
      'autoPlayNext',
      'minimumWords',
      'maxNodesProcessed',
    ],
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
      const autoPlayNext =
        typeof result.autoPlayNext === 'boolean' ? result.autoPlayNext : false;
      const minimumWords =
        typeof result.minimumWords === 'number' ? result.minimumWords : 3;
      const maxNodesProcessed =
        typeof result.maxNodesProcessed === 'number'
          ? result.maxNodesProcessed
          : 1000;

      populateVoices(selectedVoice);

      // Set rate slider and display value (enforce 0.05 step increment)
      const roundedRate = Math.round(speechRate * 20) / 20;
      rateSlider.value = roundedRate.toString();
      rateValue.textContent = `${roundedRate.toFixed(2)}x`;

      // Set pitch slider and display value
      pitchSlider.value = speechPitch.toString();
      pitchValue.textContent = `${speechPitch.toFixed(1)}x`;

      // Set highlight style select
      highlightStyleSelect.value = highlightStyle;

      // Set auto play next toggle
      autoPlayNextToggle.checked = autoPlayNext;

      // Set minimum words input
      minimumWordsInput.value = minimumWords.toString();

      // Set maximum nodes input
      maxNodesInput.value = maxNodesProcessed.toString();
    }
  );

  // Listen for storage changes to update UI in real-time
  if (chrome.storage?.onChanged?.addListener) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        // Update speech rate if changed
        if (changes.speechRate) {
          const newRate = changes.speechRate.newValue;
          if (typeof newRate === 'number') {
            // Enforce 0.05 step increment by rounding to nearest 0.05
            const roundedRate = Math.round(newRate * 20) / 20;
            rateSlider.value = roundedRate.toString();
            rateValue.textContent = `${roundedRate.toFixed(2)}x`;
          }
        }

        // Update speech pitch if changed
        if (changes.speechPitch) {
          const newPitch = changes.speechPitch.newValue;
          if (typeof newPitch === 'number') {
            pitchSlider.value = newPitch.toString();
            pitchValue.textContent = `${newPitch.toFixed(1)}x`;
          }
        }

        // Update highlight style if changed
        if (changes.highlightStyle) {
          const newStyle = changes.highlightStyle.newValue;
          if (typeof newStyle === 'string') {
            highlightStyleSelect.value = newStyle;
          }
        }

        // Update auto play next if changed
        if (changes.autoPlayNext) {
          const newAutoPlay = changes.autoPlayNext.newValue;
          if (typeof newAutoPlay === 'boolean') {
            autoPlayNextToggle.checked = newAutoPlay;
          }
        }

        // Update minimum words if changed
        if (changes.minimumWords) {
          const newMinWords = changes.minimumWords.newValue;
          if (typeof newMinWords === 'number') {
            minimumWordsInput.value = newMinWords.toString();
          }
        }

        // Update maximum nodes if changed
        if (changes.maxNodesProcessed) {
          const newMaxNodes = changes.maxNodesProcessed.newValue;
          if (typeof newMaxNodes === 'number') {
            maxNodesInput.value = newMaxNodes.toString();
          }
        }

        // Update voice selection if changed
        if (changes.selectedVoice) {
          const newVoice = changes.selectedVoice.newValue;
          if (typeof newVoice === 'string') {
            voiceSelect.value = newVoice;
          }
        }
      }
    });
  }

  // Save selected voice to storage
  voiceSelect.addEventListener('change', () => {
    const selectedVoice = voiceSelect.value;
    chrome.storage.local.set({ selectedVoice });

    // Show a brief status message
    showStatus('Voice selection saved!', 'success');
  });

  // Save rate to storage and update display
  rateSlider.addEventListener('input', () => {
    // Enforce 0.05 step increment by rounding to nearest 0.05
    const rawValue = parseFloat(rateSlider.value);
    const speechRate = Math.round(rawValue * 20) / 20; // Round to nearest 0.05

    // Update the slider value to the rounded value
    rateSlider.value = speechRate.toString();
    rateValue.textContent = `${speechRate.toFixed(2)}x`;
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

  // Save auto play next setting to storage
  autoPlayNextToggle.addEventListener('change', () => {
    const autoPlayNext = autoPlayNextToggle.checked;
    chrome.storage.local.set({ autoPlayNext });

    // Show a brief status message
    showStatus('Auto play next item setting saved!', 'success');
  });

  // Save minimum words setting to storage
  minimumWordsInput.addEventListener('input', () => {
    let minimumWords = parseInt(minimumWordsInput.value);
    // Ensure minimumWords is at least 1
    if (isNaN(minimumWords) || minimumWords < 1) {
      minimumWords = 1;
      minimumWordsInput.value = minimumWords.toString();
    }
    chrome.storage.local.set({ minimumWords });

    // Show a brief status message
    showStatus('Minimum words setting saved!', 'success');
  });

  // Save maximum nodes setting to storage
  maxNodesInput.addEventListener('input', () => {
    let maxNodesProcessed = parseInt(maxNodesInput.value);
    // Ensure maxNodesProcessed is at least 0
    if (isNaN(maxNodesProcessed) || maxNodesProcessed < 0) {
      maxNodesProcessed = 0;
      maxNodesInput.value = maxNodesProcessed.toString();
    }
    chrome.storage.local.set({ maxNodesProcessed });

    // Show a brief status message
    showStatus('Maximum nodes setting saved!', 'success');
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
