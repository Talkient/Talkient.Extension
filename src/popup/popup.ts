import { initAuth } from '../features/auth/popup/auth-ui';

console.log('Popup for Talkient Extension');

// Add event listener for the "Go to my settings" link
document.addEventListener('DOMContentLoaded', () => {
  // Initialize auth UI (elements, state check, button listeners)
  initAuth();

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
        url: 'https://github.com/Talkient/talkient-public/issues/new',
      });
    });
  }
});
