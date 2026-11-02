/// <reference types="chrome" />

import {
  GlobalWorkerOptions,
  PasswordResponses,
  getDocument,
  type PDFDocumentProxy,
} from 'pdfjs-dist';
import { takePdfBytes } from '../pdf-cache';

export type PasswordPrompt = (incorrect: boolean) => Promise<string>;

export function configurePdfWorker(): void {
  GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
    'pdf-viewer/pdf.worker.min.mjs',
  );
}

/**
 * Uses the bytes left by the launcher when available, otherwise downloads the
 * PDF from the extension page.
 */
export async function loadPdfBytes(url: string): Promise<ArrayBuffer> {
  const cached = await takePdfBytes(url).catch((error: unknown) => {
    console.warn('[Talkient.PDF] Could not read the cached PDF:', error);
    return null;
  });
  if (cached) {
    return cached;
  }

  const response = await fetch(url, {
    credentials: 'include',
    cache: 'force-cache',
  });
  if (!response.ok) {
    throw new Error(`Failed to download the PDF (HTTP ${response.status})`);
  }
  return response.arrayBuffer();
}

export function openPdfDocument(
  data: ArrayBuffer,
  promptPassword: PasswordPrompt,
): Promise<PDFDocumentProxy> {
  const loadingTask = getDocument({
    data: new Uint8Array(data),
    cMapUrl: chrome.runtime.getURL('pdf-viewer/cmaps/'),
    cMapPacked: true,
    iccUrl: chrome.runtime.getURL('pdf-viewer/iccs/'),
  });

  loadingTask.onPassword = (
    updatePassword: (password: string) => void,
    reason: number,
  ): void => {
    void promptPassword(reason === PasswordResponses.INCORRECT_PASSWORD).then(
      updatePassword,
    );
  };

  return loadingTask.promise;
}
