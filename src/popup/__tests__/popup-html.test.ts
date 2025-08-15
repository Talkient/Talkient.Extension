/**
 * @jest-environment jsdom
 */

import './mocks/chrome';

describe('popup.ts - using actual HTML', () => {
  let optionsLink: HTMLAnchorElement;

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

      const status = document.getElementById('status');
      expect(status).toBeTruthy();
    });

    it('should have options link in the DOM', () => {
      expect(optionsLink).toBeTruthy();
      expect(optionsLink.textContent).toBe('Go to my settings');
      expect(optionsLink.id).toBe('options-link');
      expect(optionsLink.classList.contains('options-link')).toBe(true);
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
  });
});
