console.log('Popup for Talkient Extension');

// Add event listener for the "Go to my settings" link
document.addEventListener('DOMContentLoaded', () => {
  const optionsLink = document.getElementById('options-link');
  const reportIssueLink = document.getElementById('report-issue-link');

  if (optionsLink) {
    optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open the options page
      chrome.runtime.openOptionsPage();
    });
  }

  if (reportIssueLink) {
    reportIssueLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open the GitHub issues page in a new tab
      chrome.tabs.create({
        url: 'https://github.com/Talkient/talkient-public/issues/new',
      });
    });
  }
});
