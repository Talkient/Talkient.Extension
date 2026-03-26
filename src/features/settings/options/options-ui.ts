import {
  DEFAULT_SETTINGS,
  DEFAULT_PROCESSABLE_ELEMENTS,
  PROCESSABLE_ELEMENTS_CATALOG,
  normalizeIgnoredDomainEntry,
  normalizeIgnoredDomains,
  normalizeProcessableElements,
} from '../storage-schema';
import type { StorageSchema } from '../storage-schema';

function formatElementTag(tag: string): string {
  return `<${tag}>`;
}

function getSearchableTagText(tag: string): string {
  if (/^h[1-6]$/.test(tag)) {
    return `${tag} heading`;
  }
  return tag;
}

document.addEventListener('DOMContentLoaded', () => {
  const voiceSelect = document.getElementById(
    'voice-select',
  ) as HTMLSelectElement;
  const rateSlider = document.getElementById('rate-slider') as HTMLInputElement;
  const pitchSlider = document.getElementById(
    'pitch-slider',
  ) as HTMLInputElement;
  const highlightStyleSelect = document.getElementById(
    'highlight-style-select',
  ) as HTMLSelectElement;
  const rateValue = document.getElementById('rate-value') as HTMLSpanElement;
  const pitchValue = document.getElementById('pitch-value') as HTMLSpanElement;
  const autoPlayNextToggle = document.getElementById(
    'auto-play-next-toggle',
  ) as HTMLInputElement;
  const followHighlightToggle = document.getElementById(
    'follow-highlight-toggle',
  ) as HTMLInputElement;
  const buttonPositionSelect = document.getElementById(
    'button-position-select',
  ) as HTMLSelectElement;
  const minimumWordsInput = document.getElementById(
    'minimum-words-input',
  ) as HTMLInputElement;
  const maxNodesInput = document.getElementById(
    'max-nodes-input',
  ) as HTMLInputElement;
  const panelHideDurationInput = document.getElementById(
    'panel-hide-duration-input',
  ) as HTMLInputElement;
  const translationTargetLanguageSelect = document.getElementById(
    'translation-target-language-select',
  ) as HTMLSelectElement;

  const processableElementsSearch = document.getElementById(
    'processable-elements-search',
  ) as HTMLInputElement;
  const processableElementsSelect = document.getElementById(
    'processable-elements-select',
  ) as HTMLSelectElement;
  const processableElementsSelectedCount = document.getElementById(
    'processable-elements-selected-count',
  ) as HTMLParagraphElement;
  const ignoredDomainInput = document.getElementById(
    'ignored-domain-input',
  ) as HTMLInputElement;
  const ignoredDomainAddButton = document.getElementById(
    'ignored-domain-add-button',
  ) as HTMLButtonElement;
  const ignoredDomainCancelButton = document.getElementById(
    'ignored-domain-cancel-button',
  ) as HTMLButtonElement;
  const ignoredDomainsValidation = document.getElementById(
    'ignored-domains-validation',
  ) as HTMLParagraphElement;
  const ignoredDomainsEmpty = document.getElementById(
    'ignored-domains-empty',
  ) as HTMLParagraphElement;
  const ignoredDomainsList = document.getElementById(
    'ignored-domains-list',
  ) as HTMLUListElement;
  const resetDefaultSettingsButton = document.getElementById(
    'reset-default-settings-button',
  ) as HTMLButtonElement;

  if (
    !voiceSelect ||
    !rateSlider ||
    !pitchSlider ||
    !highlightStyleSelect ||
    !rateValue ||
    !pitchValue ||
    !autoPlayNextToggle ||
    !followHighlightToggle ||
    !buttonPositionSelect ||
    !minimumWordsInput ||
    !maxNodesInput ||
    !panelHideDurationInput ||
    !translationTargetLanguageSelect ||
    !processableElementsSearch ||
    !processableElementsSelect ||
    !processableElementsSelectedCount ||
    !ignoredDomainInput ||
    !ignoredDomainAddButton ||
    !ignoredDomainCancelButton ||
    !ignoredDomainsValidation ||
    !ignoredDomainsEmpty ||
    !ignoredDomainsList ||
    !resetDefaultSettingsButton
  )
    return;

  processableElementsSelect.innerHTML = '';
  PROCESSABLE_ELEMENTS_CATALOG.forEach((tag) => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = formatElementTag(tag);
    option.addEventListener('mousedown', (event) => {
      event.preventDefault();
      option.selected = !option.selected;
      processableElementsSelect.dispatchEvent(
        new Event('change', { bubbles: true }),
      );
    });
    processableElementsSelect.appendChild(option);
  });

  let processableElementsSet = new Set<string>(DEFAULT_PROCESSABLE_ELEMENTS);
  let ignoredDomains: string[] = [];
  let editingIgnoredDomainIndex: number | null = null;

  const clearIgnoredDomainsValidation = (): void => {
    ignoredDomainsValidation.textContent = '';
  };

  const setIgnoredDomainsValidation = (message: string): void => {
    ignoredDomainsValidation.textContent = message;
  };

  const resetIgnoredDomainEditor = (): void => {
    editingIgnoredDomainIndex = null;
    ignoredDomainInput.value = '';
    ignoredDomainAddButton.textContent = 'Add';
    ignoredDomainCancelButton.hidden = true;
  };

  const renderIgnoredDomains = (): void => {
    ignoredDomainsList.innerHTML = '';
    ignoredDomainsEmpty.hidden = ignoredDomains.length > 0;

    ignoredDomains.forEach((domain, index) => {
      const item = document.createElement('li');
      item.className = 'ignored-domains-item';

      const text = document.createElement('span');
      text.className = 'ignored-domains-item-text';
      text.textContent = domain;

      const actions = document.createElement('div');
      actions.className = 'ignored-domains-item-actions';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'secondary-button';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => {
        editingIgnoredDomainIndex = index;
        ignoredDomainInput.value = domain;
        ignoredDomainAddButton.textContent = 'Save';
        ignoredDomainCancelButton.hidden = false;
        clearIgnoredDomainsValidation();
        ignoredDomainInput.focus();
      });

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'secondary-button danger-button';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        ignoredDomains = ignoredDomains.filter(
          (_, itemIndex) => itemIndex !== index,
        );
        if (editingIgnoredDomainIndex === index) {
          resetIgnoredDomainEditor();
        } else if (
          editingIgnoredDomainIndex !== null &&
          editingIgnoredDomainIndex > index
        ) {
          editingIgnoredDomainIndex -= 1;
        }

        void chrome.storage.local.set({ ignoredDomains });
        renderIgnoredDomains();
        clearIgnoredDomainsValidation();
        showStatus('Ignored domain removed!', 'success');
      });

      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
      item.appendChild(text);
      item.appendChild(actions);
      ignoredDomainsList.appendChild(item);
    });
  };

  const updateSelectedCount = (): void => {
    processableElementsSelectedCount.textContent = `${processableElementsSet.size} selected`;
  };

  const applyProcessableElementsSearchFilter = (): void => {
    const query = processableElementsSearch.value.trim().toLowerCase();
    Array.from(processableElementsSelect.options).forEach((option) => {
      const searchable = getSearchableTagText(option.value).toLowerCase();
      option.hidden = !searchable.includes(query);
    });
  };

  const syncProcessableElementsSelect = (elements: string[]): void => {
    processableElementsSet = new Set(elements);
    Array.from(processableElementsSelect.options).forEach((option) => {
      option.selected = processableElementsSet.has(option.value);
    });
    updateSelectedCount();
  };

  const applySettingsToUi = (result: Partial<StorageSchema>): void => {
    const selectedVoice =
      typeof result.selectedVoice === 'string'
        ? result.selectedVoice
        : DEFAULT_SETTINGS.selectedVoice;
    const speechRate =
      typeof result.speechRate === 'number'
        ? result.speechRate
        : DEFAULT_SETTINGS.speechRate;
    const speechPitch =
      typeof result.speechPitch === 'number'
        ? result.speechPitch
        : DEFAULT_SETTINGS.speechPitch;
    const highlightStyle =
      typeof result.highlightStyle === 'string'
        ? result.highlightStyle
        : DEFAULT_SETTINGS.highlightStyle;
    const autoPlayNext =
      typeof result.autoPlayNext === 'boolean'
        ? result.autoPlayNext
        : DEFAULT_SETTINGS.autoPlayNext;
    const followHighlight =
      typeof result.followHighlight === 'boolean'
        ? result.followHighlight
        : DEFAULT_SETTINGS.followHighlight;
    const buttonPosition =
      typeof result.buttonPosition === 'string'
        ? result.buttonPosition
        : DEFAULT_SETTINGS.buttonPosition;
    const minimumWords =
      typeof result.minimumWords === 'number'
        ? result.minimumWords
        : DEFAULT_SETTINGS.minimumWords;
    const maxNodesProcessed =
      typeof result.maxNodesProcessed === 'number'
        ? result.maxNodesProcessed
        : DEFAULT_SETTINGS.maxNodesProcessed;
    const panelHideDuration =
      typeof result.panelHideDuration === 'number'
        ? result.panelHideDuration
        : DEFAULT_SETTINGS.panelHideDuration;
    const translationTargetLanguage =
      typeof result.translationTargetLanguage === 'string'
        ? result.translationTargetLanguage
        : DEFAULT_SETTINGS.translationTargetLanguage;
    const processableElements = normalizeProcessableElements(
      result.processableElements,
    );
    ignoredDomains = normalizeIgnoredDomains(result.ignoredDomains);

    populateVoices(selectedVoice);

    const roundedRate = Math.round(speechRate * 20) / 20;
    rateSlider.value = roundedRate.toString();
    rateValue.textContent = `${roundedRate.toFixed(2)}x`;

    pitchSlider.value = speechPitch.toString();
    pitchValue.textContent = `${speechPitch.toFixed(1)}x`;

    highlightStyleSelect.value = highlightStyle;
    autoPlayNextToggle.checked = autoPlayNext;
    followHighlightToggle.checked = followHighlight;
    buttonPositionSelect.value = buttonPosition;
    minimumWordsInput.value = minimumWords.toString();
    maxNodesInput.value = maxNodesProcessed.toString();
    panelHideDurationInput.value = panelHideDuration.toString();

    const hasLanguageOption = Array.from(
      translationTargetLanguageSelect.options,
    ).some((option) => option.value === translationTargetLanguage);
    translationTargetLanguageSelect.value = hasLanguageOption
      ? translationTargetLanguage
      : DEFAULT_SETTINGS.translationTargetLanguage;

    syncProcessableElementsSelect(processableElements);
    applyProcessableElementsSearchFilter();
    renderIgnoredDomains();
    resetIgnoredDomainEditor();
    clearIgnoredDomainsValidation();
  };

  // Restore settings from storage
  chrome.storage.local.get(
    [
      'selectedVoice',
      'speechRate',
      'speechPitch',
      'highlightStyle',
      'autoPlayNext',
      'followHighlight',
      'buttonPosition',
      'minimumWords',
      'maxNodesProcessed',
      'panelHideDuration',
      'translationTargetLanguage',
      'processableElements',
      'ignoredDomains',
    ],
    (result) => {
      applySettingsToUi(result as Partial<StorageSchema>);
    },
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

        // Update follow highlight if changed
        if (changes.followHighlight) {
          const newFollowHighlight = changes.followHighlight.newValue;
          if (typeof newFollowHighlight === 'boolean') {
            followHighlightToggle.checked = newFollowHighlight;
          }
        }

        // Update button position if changed
        if (changes.buttonPosition) {
          const newButtonPosition = changes.buttonPosition.newValue;
          if (typeof newButtonPosition === 'string') {
            buttonPositionSelect.value = newButtonPosition;
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

        // Update panel hide duration if changed
        if (changes.panelHideDuration) {
          const newDuration = changes.panelHideDuration.newValue;
          if (typeof newDuration === 'number') {
            panelHideDurationInput.value = newDuration.toString();
          }
        }

        // Update translation target language if changed
        if (changes.translationTargetLanguage) {
          const newLanguage = changes.translationTargetLanguage.newValue;
          if (typeof newLanguage === 'string') {
            const hasLanguageOption = Array.from(
              translationTargetLanguageSelect.options,
            ).some((option) => option.value === newLanguage);
            translationTargetLanguageSelect.value = hasLanguageOption
              ? newLanguage
              : 'en';
          }
        }

        // Update voice selection if changed
        if (changes.selectedVoice) {
          const newVoice = changes.selectedVoice.newValue;
          if (typeof newVoice === 'string') {
            voiceSelect.value = newVoice;
          }
        }

        // Update processable elements multi-select if changed
        if (changes.processableElements) {
          const newElements = normalizeProcessableElements(
            changes.processableElements.newValue,
          );
          syncProcessableElementsSelect(newElements);
          applyProcessableElementsSearchFilter();
        }

        if (changes.ignoredDomains) {
          ignoredDomains = normalizeIgnoredDomains(
            changes.ignoredDomains.newValue,
          );
          renderIgnoredDomains();
        }
      }
    });
  }

  // Save selected voice to storage
  voiceSelect.addEventListener('change', () => {
    const selectedVoice = voiceSelect.value;
    void chrome.storage.local.set({ selectedVoice });

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
    void chrome.storage.local.set({ speechRate });

    // Show a brief status message
    showStatus('Speech rate saved!', 'success');
  });

  // Save pitch to storage and update display
  pitchSlider.addEventListener('input', () => {
    const speechPitch = parseFloat(pitchSlider.value);
    pitchValue.textContent = `${speechPitch.toFixed(1)}x`;
    void chrome.storage.local.set({ speechPitch });

    // Show a brief status message
    showStatus('Speech pitch saved!', 'success');
  });

  // Save highlight style to storage
  highlightStyleSelect.addEventListener('change', () => {
    const highlightStyle = highlightStyleSelect.value;
    void chrome.storage.local.set({ highlightStyle });

    // Show a brief status message
    showStatus('Highlight style saved!', 'success');
  });

  // Save auto play next setting to storage
  autoPlayNextToggle.addEventListener('change', () => {
    const autoPlayNext = autoPlayNextToggle.checked;
    void chrome.storage.local.set({ autoPlayNext });

    // Show a brief status message
    showStatus('Auto play next item setting saved!', 'success');
  });

  // Save follow highlight setting to storage
  followHighlightToggle.addEventListener('change', () => {
    const followHighlight = followHighlightToggle.checked;
    void chrome.storage.local.set({ followHighlight });

    // Show a brief status message
    showStatus('Follow highlight setting saved!', 'success');
  });

  // Save button position setting to storage
  buttonPositionSelect.addEventListener('change', () => {
    const buttonPosition = buttonPositionSelect.value;
    void chrome.storage.local.set({ buttonPosition });

    // Show a brief status message
    showStatus('Button position setting saved!', 'success');
  });

  // Save minimum words setting to storage
  minimumWordsInput.addEventListener('input', () => {
    let minimumWords = parseInt(minimumWordsInput.value);
    // Ensure minimumWords is at least 1
    if (isNaN(minimumWords) || minimumWords < 1) {
      minimumWords = 1;
      minimumWordsInput.value = minimumWords.toString();
    }
    void chrome.storage.local.set({ minimumWords });

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
    void chrome.storage.local.set({ maxNodesProcessed });

    // Show a brief status message
    showStatus('Maximum nodes setting saved!', 'success');
  });

  // Save panel hide duration setting to storage
  panelHideDurationInput.addEventListener('input', () => {
    let panelHideDuration = parseInt(panelHideDurationInput.value);
    // Ensure panelHideDuration is between 0 and 9999
    if (isNaN(panelHideDuration) || panelHideDuration < 0) {
      panelHideDuration = 0;
      panelHideDurationInput.value = panelHideDuration.toString();
    } else if (panelHideDuration > 9999) {
      panelHideDuration = 9999;
      panelHideDurationInput.value = panelHideDuration.toString();
    }
    void chrome.storage.local.set({ panelHideDuration });

    // Show a brief status message
    showStatus('Panel hide duration setting saved!', 'success');
  });

  // Save translation target language to storage
  translationTargetLanguageSelect.addEventListener('change', () => {
    const translationTargetLanguage = translationTargetLanguageSelect.value;
    void chrome.storage.local.set({ translationTargetLanguage });

    // Show a brief status message
    showStatus('Translation output language saved!', 'success');
  });

  processableElementsSearch.addEventListener('input', () => {
    applyProcessableElementsSearchFilter();
  });

  processableElementsSelect.addEventListener('change', () => {
    const selectedValues = new Set<string>(
      Array.from(processableElementsSelect.selectedOptions).map(
        (option) => option.value,
      ),
    );
    const processableElements = PROCESSABLE_ELEMENTS_CATALOG.filter((tag) =>
      selectedValues.has(tag),
    );

    syncProcessableElementsSelect(processableElements);
    void chrome.storage.local.set({ processableElements });

    // Show a brief status message
    showStatus('Processable elements saved!', 'success');
  });

  ignoredDomainAddButton.addEventListener('click', () => {
    const normalizedDomain = normalizeIgnoredDomainEntry(
      ignoredDomainInput.value,
    );
    if (!normalizedDomain) {
      setIgnoredDomainsValidation(
        'Please enter a valid domain (e.g., example.com).',
      );
      showStatus('Invalid ignored domain.', 'error');
      return;
    }

    const duplicateIndex = ignoredDomains.findIndex(
      (domain) => domain === normalizedDomain,
    );

    if (
      duplicateIndex !== -1 &&
      (editingIgnoredDomainIndex === null ||
        duplicateIndex !== editingIgnoredDomainIndex)
    ) {
      setIgnoredDomainsValidation(
        'That domain is already in the ignored list.',
      );
      showStatus('Duplicate ignored domain.', 'warning');
      return;
    }

    if (editingIgnoredDomainIndex === null) {
      ignoredDomains = [...ignoredDomains, normalizedDomain];
      showStatus('Ignored domain added!', 'success');
    } else {
      ignoredDomains = ignoredDomains.map((domain, index) =>
        index === editingIgnoredDomainIndex ? normalizedDomain : domain,
      );
      showStatus('Ignored domain updated!', 'success');
    }

    void chrome.storage.local.set({ ignoredDomains });
    renderIgnoredDomains();
    resetIgnoredDomainEditor();
    clearIgnoredDomainsValidation();
  });

  ignoredDomainCancelButton.addEventListener('click', () => {
    resetIgnoredDomainEditor();
    clearIgnoredDomainsValidation();
  });

  ignoredDomainInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      ignoredDomainAddButton.click();
    }
  });

  resetDefaultSettingsButton.addEventListener('click', () => {
    const userConfirmed = window.confirm(
      'Reset all Talkient settings to default values? This cannot be undone.',
    );

    if (!userConfirmed) {
      showStatus('Reset to default settings canceled.', 'warning');
      return;
    }

    const resetDefaults: Partial<StorageSchema> = {
      selectedVoice: DEFAULT_SETTINGS.selectedVoice,
      speechRate: DEFAULT_SETTINGS.speechRate,
      speechPitch: DEFAULT_SETTINGS.speechPitch,
      highlightStyle: DEFAULT_SETTINGS.highlightStyle,
      autoPlayNext: DEFAULT_SETTINGS.autoPlayNext,
      followHighlight: DEFAULT_SETTINGS.followHighlight,
      buttonPosition: DEFAULT_SETTINGS.buttonPosition,
      minimumWords: DEFAULT_SETTINGS.minimumWords,
      maxNodesProcessed: DEFAULT_SETTINGS.maxNodesProcessed,
      panelHideDuration: DEFAULT_SETTINGS.panelHideDuration,
      translationTargetLanguage: DEFAULT_SETTINGS.translationTargetLanguage,
      processableElements: [...DEFAULT_SETTINGS.processableElements],
      ignoredDomains: [...DEFAULT_SETTINGS.ignoredDomains],
    };

    void chrome.storage.local.set(resetDefaults, () => {
      applySettingsToUi(resetDefaults);
      showStatus('Settings reset to defaults!', 'success');
    });
  });
});

function showStatus(
  message: string,
  type: 'success' | 'error' | 'warning' = 'success',
): void {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;

  statusDiv.textContent = message;
  statusDiv.className = `visible ${type}`;

  // Hide after 3 seconds
  setTimeout(() => {
    statusDiv.classList.remove('visible');
  }, 3000);
}

function populateVoices(selectedVoice: string): void {
  const voiceSelect = document.getElementById(
    'voice-select',
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
