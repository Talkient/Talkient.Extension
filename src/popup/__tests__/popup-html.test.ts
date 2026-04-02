/**
 * @jest-environment jsdom
 */

import './mocks/chrome';

describe('popup.ts - using actual HTML', () => {
  let optionsLink: HTMLAnchorElement;
  let reportIssueLink: HTMLAnchorElement;
  let signInBtn: HTMLButtonElement;
  let signOutBtn: HTMLButtonElement;
  let userProfile: HTMLElement;
  let authLoading: HTMLElement;
  let userAvatar: HTMLImageElement;
  let userName: HTMLElement;
  let userEmail: HTMLElement;

  beforeEach(async () => {
    // Reset DOM
    document.body.innerHTML = '';

    // Load the actual popup.html content
    const fs = require('fs');
    const path = require('path');
    const htmlPath = path.join(__dirname, '../popup.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Parse the HTML and extract the body content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;

    // Get references to elements
    optionsLink = document.getElementById('options-link') as HTMLAnchorElement;
    reportIssueLink = document.getElementById(
      'report-issue-link',
    ) as HTMLAnchorElement;
    signInBtn = document.getElementById('sign-in-btn') as HTMLButtonElement;
    signOutBtn = document.getElementById('sign-out-btn') as HTMLButtonElement;
    userProfile = document.getElementById('user-profile') as HTMLElement;
    authLoading = document.getElementById('auth-loading') as HTMLElement;
    userAvatar = document.getElementById('user-avatar') as HTMLImageElement;
    userName = document.getElementById('user-name') as HTMLElement;
    userEmail = document.getElementById('user-email') as HTMLElement;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('DOM structure from actual HTML', () => {
    it('should load the complete HTML structure', () => {
      // Check that the main elements exist
      const header = document.querySelector('.header');
      expect(header).toBeTruthy();

      const title = document.querySelector('.title');
      expect(title?.textContent).toBe('Talkient');

      const tagline = document.querySelector('.tagline');
      expect(tagline?.textContent).toBe('Text-to-Speech');
    });

    it('should have options link in the DOM', () => {
      expect(optionsLink).toBeTruthy();
      expect(optionsLink.textContent).toContain('Settings');
      expect(optionsLink.id).toBe('options-link');
      expect(optionsLink.classList.contains('settings-link')).toBe(true);
    });

    it('should have report issue link in the DOM', () => {
      expect(reportIssueLink).toBeTruthy();
      expect(reportIssueLink.textContent).toBe('Report an issue');
      expect(reportIssueLink.id).toBe('report-issue-link');
      expect(reportIssueLink.classList.contains('report-link')).toBe(true);
    });

    it('should have popup container wrapping all content', () => {
      const container = document.querySelector('.popup-container');
      expect(container).toBeTruthy();
      expect(container?.querySelector('.header')).toBeTruthy();
      expect(container?.querySelector('.settings-link')).toBeTruthy();
      expect(container?.querySelector('.footer')).toBeTruthy();
    });

    it('should have settings icon SVG in the options link', () => {
      const settingsIcon = optionsLink.querySelector('.settings-icon');
      expect(settingsIcon).toBeTruthy();
      expect(settingsIcon?.tagName.toLowerCase()).toBe('svg');
    });

    it('should have footer containing report issue link', () => {
      const footer = document.querySelector('.footer');
      expect(footer).toBeTruthy();
      expect(footer?.contains(reportIssueLink)).toBe(true);
    });

    it('should have correct link attributes for accessibility', () => {
      // Both links should have href="#" for accessibility
      expect(optionsLink.getAttribute('href')).toBe('#');
      expect(reportIssueLink.getAttribute('href')).toBe('#');
    });
  });

  describe('options link functionality', () => {
    beforeEach(() => {
      // Load the popup script
      require('../popup');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should open options page when options link is clicked', () => {
      // Simulate click on options link
      const clickEvent = new MouseEvent('click');
      optionsLink.dispatchEvent(clickEvent);

      // Verify that chrome.runtime.openOptionsPage was called
      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });

    it('should open GitHub issues page when report issue link is clicked', () => {
      // Simulate click on report issue link
      const clickEvent = new MouseEvent('click');
      reportIssueLink.dispatchEvent(clickEvent);

      // Verify that chrome.tabs.create was called with the correct URL
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://github.com/Talkient/Talkient.Extension/issues/new',
      });
    });

    it('should prevent default link behavior when options link is clicked', () => {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      optionsLink.dispatchEvent(clickEvent);

      expect(clickEvent.defaultPrevented).toBe(true);
    });

    it('should prevent default link behavior when report issue link is clicked', () => {
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      reportIssueLink.dispatchEvent(clickEvent);

      expect(clickEvent.defaultPrevented).toBe(true);
    });
  });

  describe('voice selector', () => {
    beforeEach(() => {
      jest.resetModules();
      // Re-require the mock so its side-effect re-runs and global.chrome
      // gets fresh jest.fn() instances after resetModules.
      require('./mocks/chrome');
    });

    it('should render the voice selector in the DOM', () => {
      const voiceSelect = document.getElementById('voice-select');
      expect(voiceSelect).toBeTruthy();
      expect(voiceSelect?.tagName.toLowerCase()).toBe('select');
    });

    it('should have a voice label', () => {
      const label = document.querySelector('label[for="voice-select"]');
      expect(label).toBeTruthy();
    });

    it('should populate voices from chrome.tts.getVoices on DOMContentLoaded', () => {
      (chrome.tts.getVoices as jest.Mock).mockImplementation(
        (callback: (voices: chrome.tts.TtsVoice[]) => void) => {
          callback([
            { voiceName: 'Google US English', lang: 'en-US' },
            { voiceName: 'Google Deutsch', lang: 'de-DE' },
          ]);
        },
      );
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (
          _keys: string[],
          callback: (result: Record<string, unknown>) => void,
        ) => {
          callback({});
        },
      );

      require('../popup');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      const voiceSelect = document.getElementById(
        'voice-select',
      ) as HTMLSelectElement;
      const options = Array.from(voiceSelect.options).map((o) => o.value);
      expect(options).toContain('default');
      expect(options).toContain('Google US English');
      expect(options).toContain('Google Deutsch');
    });

    it('should pre-select the saved voice from storage', () => {
      (chrome.tts.getVoices as jest.Mock).mockImplementation(
        (callback: (voices: chrome.tts.TtsVoice[]) => void) => {
          callback([
            { voiceName: 'Google US English', lang: 'en-US' },
            { voiceName: 'Google Deutsch', lang: 'de-DE' },
          ]);
        },
      );
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (
          _keys: string[],
          callback: (result: Record<string, unknown>) => void,
        ) => {
          callback({ selectedVoice: 'Google Deutsch' });
        },
      );

      require('../popup');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      const voiceSelect = document.getElementById(
        'voice-select',
      ) as HTMLSelectElement;
      expect(voiceSelect.value).toBe('Google Deutsch');
    });

    it('should select "default" when no voice is saved in storage', () => {
      (chrome.tts.getVoices as jest.Mock).mockImplementation(
        (callback: (voices: chrome.tts.TtsVoice[]) => void) => {
          callback([{ voiceName: 'Google US English', lang: 'en-US' }]);
        },
      );
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (
          _keys: string[],
          callback: (result: Record<string, unknown>) => void,
        ) => {
          callback({});
        },
      );

      require('../popup');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      const voiceSelect = document.getElementById(
        'voice-select',
      ) as HTMLSelectElement;
      expect(voiceSelect.value).toBe('default');
    });

    it('should fallback to "default" when saved voice is not in the returned voices list', () => {
      (chrome.tts.getVoices as jest.Mock).mockImplementation(
        (callback: (voices: chrome.tts.TtsVoice[]) => void) => {
          callback([{ voiceName: 'Google US English', lang: 'en-US' }]);
        },
      );
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (
          _keys: string[],
          callback: (result: Record<string, unknown>) => void,
        ) => {
          callback({ selectedVoice: 'Voice That No Longer Exists' });
        },
      );

      require('../popup');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      const voiceSelect = document.getElementById(
        'voice-select',
      ) as HTMLSelectElement;
      expect(voiceSelect.value).toBe('default');
    });

    it('should persist voice to storage when selection changes', () => {
      (chrome.tts.getVoices as jest.Mock).mockImplementation(
        (callback: (voices: chrome.tts.TtsVoice[]) => void) => {
          callback([{ voiceName: 'Google US English', lang: 'en-US' }]);
        },
      );
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (
          _keys: string[],
          callback: (result: Record<string, unknown>) => void,
        ) => {
          callback({});
        },
      );

      require('../popup');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      const voiceSelect = document.getElementById(
        'voice-select',
      ) as HTMLSelectElement;
      voiceSelect.value = 'Google US English';
      voiceSelect.dispatchEvent(new Event('change'));

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        selectedVoice: 'Google US English',
      });
    });

    it('should keep only the default option when no voices are returned', () => {
      (chrome.tts.getVoices as jest.Mock).mockImplementation(
        (callback: (voices: chrome.tts.TtsVoice[]) => void) => {
          callback([]);
        },
      );
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (
          _keys: string[],
          callback: (result: Record<string, unknown>) => void,
        ) => {
          callback({});
        },
      );

      require('../popup');
      document.dispatchEvent(new Event('DOMContentLoaded'));

      const voiceSelect = document.getElementById(
        'voice-select',
      ) as HTMLSelectElement;
      const options = Array.from(voiceSelect.options).map((o) => ({
        value: o.value,
        label: o.textContent,
      }));

      expect(options).toEqual([{ value: 'default', label: 'Default Voice' }]);
      expect(voiceSelect.value).toBe('default');
    });
  });

  describe('auth UI', () => {
    const authenticatedUser = {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      picture: 'https://example.com/ada.png',
    };
    let runPopupDOMContentLoaded: (() => void) | null = null;

    beforeEach(() => {
      jest.resetModules();
      require('./mocks/chrome');
      (chrome.storage.local.get as jest.Mock).mockImplementation(
        (
          _keys: string[],
          callback: (result: Record<string, unknown>) => void,
        ) => {
          callback({});
        },
      );

      runPopupDOMContentLoaded = null;
      const originalAddEventListener = document.addEventListener.bind(document);
      jest
        .spyOn(document, 'addEventListener')
        .mockImplementation(
          (
            type: string,
            listener: EventListenerOrEventListenerObject,
            options?: boolean | AddEventListenerOptions,
          ) => {
            if (type === 'DOMContentLoaded' && typeof listener === 'function') {
              runPopupDOMContentLoaded = () => {
                listener(new Event('DOMContentLoaded'));
              };
              return;
            }

            originalAddEventListener(type, listener, options);
          },
        );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    function loadPopup(): void {
      require('../popup');
      runPopupDOMContentLoaded?.();
    }

    it('should request auth state when the popup loads', async () => {
      (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue({
        success: false,
      });

      loadPopup();
      await Promise.resolve();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_AUTH_STATE',
      });
    });

    it('should show the signed-out state when the user is not authenticated', async () => {
      (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        isAuthenticated: false,
      });

      loadPopup();
      await Promise.resolve();

      expect(signInBtn.classList.contains('hidden')).toBe(false);
      expect(userProfile.classList.contains('hidden')).toBe(true);
      expect(authLoading.classList.contains('hidden')).toBe(true);
    });

    it('should show the signed-in profile when auth state includes a user', async () => {
      (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        isAuthenticated: true,
        user: authenticatedUser,
      });

      loadPopup();
      await Promise.resolve();

      expect(userProfile.classList.contains('hidden')).toBe(false);
      expect(signInBtn.classList.contains('hidden')).toBe(true);
      expect(authLoading.classList.contains('hidden')).toBe(true);
      expect(userName.textContent).toBe(authenticatedUser.name);
      expect(userEmail.textContent).toBe(authenticatedUser.email);
      expect(userAvatar.src).toBe(authenticatedUser.picture);
    });

    it('should show a loading state during sign-in and then render the user profile', async () => {
      let resolveSignIn!: (value: {
        success: boolean;
        user: typeof authenticatedUser;
      }) => void;
      (chrome.runtime.sendMessage as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          isAuthenticated: false,
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveSignIn = resolve;
            }),
        );

      loadPopup();
      await Promise.resolve();

      signInBtn.click();

      expect(authLoading.classList.contains('hidden')).toBe(false);
      expect(signInBtn.classList.contains('hidden')).toBe(true);
      expect(userProfile.classList.contains('hidden')).toBe(true);

      resolveSignIn({
        success: true,
        user: authenticatedUser,
      });
      await Promise.resolve();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SIGN_IN',
        interactive: true,
      });
      expect(authLoading.classList.contains('hidden')).toBe(true);
      expect(userProfile.classList.contains('hidden')).toBe(false);
      expect(userName.textContent).toBe(authenticatedUser.name);
    });

    it('should return to the signed-out state when sign-in fails', async () => {
      (chrome.runtime.sendMessage as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          isAuthenticated: false,
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'popup-blocked',
        });

      loadPopup();
      await Promise.resolve();

      signInBtn.click();
      await Promise.resolve();

      expect(userProfile.classList.contains('hidden')).toBe(true);
      expect(signInBtn.classList.contains('hidden')).toBe(false);
      expect(authLoading.classList.contains('hidden')).toBe(true);
    });

    it('should return to the signed-out state when auth state check rejects', async () => {
      (chrome.runtime.sendMessage as jest.Mock).mockRejectedValue(
        new Error('background unavailable'),
      );

      loadPopup();
      await Promise.resolve();

      expect(userProfile.classList.contains('hidden')).toBe(true);
      expect(signInBtn.classList.contains('hidden')).toBe(false);
      expect(authLoading.classList.contains('hidden')).toBe(true);
    });

    it('should sign out and show the signed-out state again', async () => {
      (chrome.runtime.sendMessage as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          isAuthenticated: true,
          user: authenticatedUser,
        })
        .mockResolvedValueOnce({
          success: true,
        });

      loadPopup();
      await Promise.resolve();

      signOutBtn.click();
      await Promise.resolve();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SIGN_OUT',
      });
      expect(userProfile.classList.contains('hidden')).toBe(true);
      expect(signInBtn.classList.contains('hidden')).toBe(false);
      expect(authLoading.classList.contains('hidden')).toBe(true);
    });

    it('should still show the signed-out state when sign-out fails', async () => {
      (chrome.runtime.sendMessage as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          isAuthenticated: true,
          user: authenticatedUser,
        })
        .mockRejectedValueOnce(new Error('network error'));

      loadPopup();
      await Promise.resolve();

      signOutBtn.click();
      await Promise.resolve();

      expect(userProfile.classList.contains('hidden')).toBe(true);
      expect(signInBtn.classList.contains('hidden')).toBe(false);
      expect(authLoading.classList.contains('hidden')).toBe(true);
    });
  });

  describe('graceful handling of missing elements', () => {
    beforeEach(() => {
      // Reset modules to clear cached popup script
      jest.resetModules();
    });

    it('should not throw if options link is missing', () => {
      document.getElementById('options-link')?.remove();

      expect(() => {
        require('../popup');
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
      }).not.toThrow();
    });

    it('should not throw if report issue link is missing', () => {
      document.getElementById('report-issue-link')?.remove();

      expect(() => {
        require('../popup');
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
      }).not.toThrow();
    });
  });
});
