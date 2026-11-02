/// <reference types="chrome" />

export const PDF_VIEWER_PATH = 'pdf-viewer/pdf-viewer.html';

const SUPPORTED_PROTOCOLS = ['http:', 'https:', 'file:'];

/**
 * Only plain web or local documents may be opened in the viewer. This keeps
 * other schemes (chrome:, data:, javascript:, ...) out of the `file` param.
 */
export function isSupportedPdfUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  try {
    return SUPPORTED_PROTOCOLS.includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

export function stripUrlHash(url: string): string {
  const hashIndex = url.indexOf('#');
  return hashIndex === -1 ? url : url.slice(0, hashIndex);
}

export function buildPdfViewerUrl(fileUrl: string, autoplay = false): string {
  const params = `?file=${encodeURIComponent(fileUrl)}${autoplay ? '&autoplay=1' : ''}`;
  return chrome.runtime.getURL(PDF_VIEWER_PATH) + params;
}

/**
 * Human readable file name for a PDF URL, used as the viewer title.
 */
export function getPdfFileName(fileUrl: string): string {
  try {
    const segments = new URL(fileUrl).pathname.split('/');
    const lastSegment = decodeURIComponent(segments[segments.length - 1] || '');
    if (lastSegment.trim() === '') {
      return 'document.pdf';
    }
    return /\.pdf$/i.test(lastSegment) ? lastSegment : `${lastSegment}.pdf`;
  } catch {
    return 'document.pdf';
  }
}
