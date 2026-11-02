/// <reference lib="dom" />

/**
 * Detects a tab showing a PDF in Chrome's built-in viewer. From a content
 * script that document reports the PDF content type and wraps the plugin in
 * an <embed type="application/pdf">.
 */
export function isPdfDocument(doc: Document = document): boolean {
  if (doc.contentType === 'application/pdf') {
    return true;
  }

  return doc.querySelector('body > embed[type="application/pdf"]') !== null;
}
