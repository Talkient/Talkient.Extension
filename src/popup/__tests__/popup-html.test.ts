/**
 * @jest-environment jsdom
 */

import './mocks/chrome';

describe('popup.ts - using actual HTML', () => {
  let optionsLink: HTMLAnchorElement;
  let reportIssueLink: HTMLAnchorElement;

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
