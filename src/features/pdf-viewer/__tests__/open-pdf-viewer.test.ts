/* eslint-disable @typescript-eslint/no-explicit-any */
import { handleOpenPdfViewer } from '../background/open-pdf-viewer';
import { isOpenPdfViewerMessage } from '../../../shared/types/messages';

const VIEWER = 'chrome-extension://talkient/pdf-viewer/pdf-viewer.html';

beforeEach(() => {
  (global as any).chrome.runtime.lastError = null;
  (global as any).chrome.runtime.getURL = jest.fn(
    (path: string) => `chrome-extension://talkient/${path}`,
  );
  (global as any).chrome.tabs = {
    update: jest.fn((_tabId: number, _props: unknown, callback: () => void) =>
      callback(),
    ),
  };
});

describe('isOpenPdfViewerMessage', () => {
  it('recognizes the message', () => {
    expect(
      isOpenPdfViewerMessage({ type: 'OPEN_PDF_VIEWER', url: 'https://a.b' }),
    ).toBe(true);
    expect(isOpenPdfViewerMessage({ type: 'OPEN_PDF_VIEWER' })).toBe(false);
    expect(isOpenPdfViewerMessage(null)).toBe(false);
  });
});

describe('handleOpenPdfViewer', () => {
  it('navigates the sender tab to the viewer', () => {
    const sendResponse = jest.fn();

    handleOpenPdfViewer(
      {
        type: 'OPEN_PDF_VIEWER',
        url: 'https://example.com/a.pdf#page=3',
        autoplay: true,
      },
      { tab: { id: 7 } as chrome.tabs.Tab },
      sendResponse,
    );

    expect(chrome.tabs.update).toHaveBeenCalledWith(
      7,
      {
        url: `${VIEWER}?file=${encodeURIComponent('https://example.com/a.pdf')}&autoplay=1`,
      },
      expect.any(Function),
    );
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  it('refuses unsupported URLs', () => {
    const sendResponse = jest.fn();

    handleOpenPdfViewer(
      { type: 'OPEN_PDF_VIEWER', url: 'javascript:alert(1)' },
      { tab: { id: 7 } as chrome.tabs.Tab },
      sendResponse,
    );

    expect(chrome.tabs.update).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: 'Unsupported PDF URL',
    });
  });

  it('needs a sender tab', () => {
    const sendResponse = jest.fn();

    handleOpenPdfViewer(
      { type: 'OPEN_PDF_VIEWER', url: 'https://example.com/a.pdf' },
      {},
      sendResponse,
    );

    expect(chrome.tabs.update).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it('reports navigation errors', () => {
    const sendResponse = jest.fn();
    (chrome.tabs.update as jest.Mock).mockImplementation(
      (_tabId: number, _props: unknown, callback: () => void) => {
        (global as any).chrome.runtime.lastError = { message: 'No tab' };
        callback();
      },
    );

    handleOpenPdfViewer(
      { type: 'OPEN_PDF_VIEWER', url: 'https://example.com/a.pdf' },
      { tab: { id: 7 } as chrome.tabs.Tab },
      sendResponse,
    );

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: { message: 'No tab' },
    });
  });
});
