/// <reference lib="dom" />
/// <reference types="chrome" />

import { safeSendMessage } from '../../../shared/api/messaging';
import { storePdfBytes } from '../pdf-cache';
import { stripUrlHash } from '../pdf-url';

export const PDF_LAUNCHER_ID = 'talkient-pdf-launcher';

const LAUNCHER_STYLES = `
  :host { all: initial; }
  .launcher {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border-radius: 999px;
    background: #1f2937;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  }
  button {
    border: none;
    cursor: pointer;
    color: #ffffff;
    background: transparent;
    font: inherit;
  }
  .listen {
    padding: 8px 16px;
    border-radius: 999px;
    background: #2563eb;
    font-size: 14px;
    font-weight: 600;
  }
  .listen:hover { background: #1d4ed8; }
  .listen:disabled { cursor: progress; opacity: 0.8; }
  .close {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 16px;
    line-height: 1;
  }
  .close:hover { background: rgba(255, 255, 255, 0.15); }
`;

/**
 * Fetches the PDF from the page itself, so the request carries the site's
 * cookies, and leaves the bytes for the viewer in the redirect cache.
 */
async function cachePdfForViewer(url: string): Promise<void> {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'force-cache',
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  await storePdfBytes(url, await response.arrayBuffer());
}

export async function openInViewer(
  listenButton: HTMLButtonElement,
  url: string,
): Promise<void> {
  listenButton.disabled = true;
  listenButton.textContent = 'Preparing…';

  try {
    await cachePdfForViewer(url);
  } catch (error) {
    // The viewer will try to download the PDF itself
    console.warn('[Talkient] Could not prefetch the PDF:', error);
  }

  const sent = safeSendMessage({
    type: 'OPEN_PDF_VIEWER',
    url,
    autoplay: true,
  });
  if (!sent) {
    listenButton.textContent = 'Refresh the page to continue';
  }
}

export function getPdfLauncher(): HTMLElement | null {
  return document.getElementById(PDF_LAUNCHER_ID);
}

export function mountPdfLauncher(): HTMLElement {
  const existing = getPdfLauncher();
  if (existing) {
    return existing;
  }

  const host = document.createElement('div');
  host.id = PDF_LAUNCHER_ID;
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = LAUNCHER_STYLES;

  const launcher = document.createElement('div');
  launcher.className = 'launcher';

  const listenButton = document.createElement('button');
  listenButton.className = 'listen';
  listenButton.type = 'button';
  listenButton.textContent = 'Listen with Talkient';
  listenButton.title = 'Listen to this PDF with Talkient';

  const closeButton = document.createElement('button');
  closeButton.className = 'close';
  closeButton.type = 'button';
  closeButton.textContent = '×';
  closeButton.title = 'Hide the Talkient Listen button';
  closeButton.setAttribute('aria-label', 'Hide the Talkient Listen button');

  listenButton.addEventListener('click', (event) => {
    // Only real user clicks: page scripts must not trigger the fetch
    if (!event.isTrusted || listenButton.disabled) {
      return;
    }
    void openInViewer(listenButton, stripUrlHash(window.location.href));
  });
  closeButton.addEventListener('click', () => host.remove());

  launcher.append(listenButton, closeButton);
  shadow.append(style, launcher);
  (document.body || document.documentElement).appendChild(host);
  return host;
}
