/**
 * @jest-environment jsdom
 */

import './mocks/chrome';

describe('popup.ts', () => {
  let optionsLink: HTMLAnchorElement;

  beforeEach(() => {
    // Setup a basic DOM
    document.body.innerHTML = `
      <a href="#" id="options-link" class="options-link">Go to my settings</a>
    `;

    // Get references to elements
    optionsLink = document.getElementById('options-link') as HTMLAnchorElement;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    jest.resetModules();
  });

  describe('options link functionality', () => {
    beforeEach(() => {
      // Load the popup script
      require('../popup');

      // Trigger DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    it('should attach click handler to options link', () => {
      // Verify that event listener is attached by triggering click
      optionsLink.click();
      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });

    it('should prevent default action when options link is clicked', () => {
      // Create a click event with preventDefault spy
      const clickEvent = new MouseEvent('click');
      const preventDefaultSpy = jest.spyOn(clickEvent, 'preventDefault');

      // Dispatch the event
      optionsLink.dispatchEvent(clickEvent);

      // Verify preventDefault was called
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should not throw if options link is not found', () => {
      // Clear the DOM
      document.body.innerHTML = '';

      // No error should be thrown when loading the script
      expect(() => {
        require('../popup');
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
      }).not.toThrow();
    });
  });
});
