import type { OpenPdfViewerMessage } from '../../../shared/types/messages';
import { buildPdfViewerUrl, isSupportedPdfUrl, stripUrlHash } from '../pdf-url';

/**
 * Navigates the sender tab to the Talkient PDF viewer. The navigation is done
 * here (not by the content script) so the viewer page does not have to be a
 * web accessible resource that any site could frame or open.
 */
export function handleOpenPdfViewer(
  request: OpenPdfViewerMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
): void {
  const tabId = sender.tab?.id;

  if (tabId === undefined) {
    sendResponse({ success: false, error: 'No tab to open the PDF viewer in' });
    return;
  }

  if (!isSupportedPdfUrl(request.url)) {
    console.warn('[Talkient.SW] Refusing to open PDF viewer for', request.url);
    sendResponse({ success: false, error: 'Unsupported PDF URL' });
    return;
  }

  const viewerUrl = buildPdfViewerUrl(
    stripUrlHash(request.url),
    request.autoplay === true,
  );

  chrome.tabs.update(tabId, { url: viewerUrl }, () => {
    if (chrome.runtime.lastError) {
      console.error(
        '[Talkient.SW] Error opening PDF viewer:',
        chrome.runtime.lastError,
      );
      sendResponse({ success: false, error: chrome.runtime.lastError });
      return;
    }
    sendResponse({ success: true });
  });
}
