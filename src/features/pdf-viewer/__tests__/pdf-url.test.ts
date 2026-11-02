/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  buildPdfViewerUrl,
  getPdfFileName,
  isSupportedPdfUrl,
  stripUrlHash,
} from '../pdf-url';
import { isPdfDocument } from '../content/pdf-detection';

describe('isSupportedPdfUrl', () => {
  it.each([
    'https://example.com/file.pdf',
    'http://example.com/download?id=1',
    'file:///home/user/file.pdf',
  ])('accepts %s', (url) => {
    expect(isSupportedPdfUrl(url)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'data:application/pdf;base64,AAAA',
    'chrome://settings',
    'not a url',
    '',
    null,
    undefined,
    42,
  ])('rejects %p', (url) => {
    expect(isSupportedPdfUrl(url)).toBe(false);
  });
});

describe('PDF viewer URLs', () => {
  beforeEach(() => {
    (global as any).chrome.runtime.getURL = jest.fn(
      (path: string) => `chrome-extension://talkient/${path}`,
    );
  });

  it('encodes the PDF address in the viewer URL', () => {
    expect(buildPdfViewerUrl('https://example.com/a b.pdf?x=1&y=2')).toBe(
      'chrome-extension://talkient/pdf-viewer/pdf-viewer.html?file=https%3A%2F%2Fexample.com%2Fa%20b.pdf%3Fx%3D1%26y%3D2',
    );
  });

  it('adds the autoplay flag when asked', () => {
    expect(buildPdfViewerUrl('https://example.com/a.pdf', true)).toMatch(
      /&autoplay=1$/,
    );
  });

  it('removes the hash of a URL', () => {
    expect(stripUrlHash('https://example.com/a.pdf#page=2')).toBe(
      'https://example.com/a.pdf',
    );
    expect(stripUrlHash('https://example.com/a.pdf')).toBe(
      'https://example.com/a.pdf',
    );
  });

  it.each([
    ['https://example.com/docs/My%20Report.pdf', 'My Report.pdf'],
    ['https://example.com/download/report', 'report.pdf'],
    ['https://example.com/', 'document.pdf'],
    ['not a url', 'document.pdf'],
  ])('names %s as %s', (url, name) => {
    expect(getPdfFileName(url)).toBe(name);
  });
});

describe('isPdfDocument', () => {
  it('detects Chrome built-in PDF viewer documents', () => {
    const doc = document.implementation.createHTMLDocument('pdf');
    doc.body.innerHTML = '<embed type="application/pdf" src="about:blank">';

    expect(isPdfDocument(doc)).toBe(true);
  });

  it('ignores regular pages', () => {
    const doc = document.implementation.createHTMLDocument('page');
    doc.body.innerHTML =
      '<p>Hello</p><div><embed type="application/pdf"></div>';

    expect(isPdfDocument(doc)).toBe(false);
  });
});
