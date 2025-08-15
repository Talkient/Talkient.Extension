console.log('Popup for Talkient Extension');

// Add event listener for the "Go to my settings" link
document.addEventListener('DOMContentLoaded', () => {
  const optionsLink = document.getElementById('options-link');

  if (optionsLink) {
    optionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open the options page
      chrome.runtime.openOptionsPage();
    });
  }
});
