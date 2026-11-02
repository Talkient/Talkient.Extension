/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  PDF_LAUNCHER_ID,
  getPdfLauncher,
  mountPdfLauncher,
  openInViewer,
} from '../content/pdf-launcher';
import { getPdfCacheKey } from '../pdf-cache';

const PDF_URL = 'https://example.com/report.pdf';

let storage: Record<string, unknown>;

beforeEach(() => {
  document.body.innerHTML = '';
  storage = {};
  (global as any).chrome.runtime.id = 'talkient';
  (global as any).chrome.runtime.sendMessage = jest.fn();
  (global as any).chrome.storage = {
    local: {
      get: jest.fn(async () => ({})),
      set: jest.fn(async (items: Record<string, unknown>) => {
        Object.assign(storage, items);
      }),
      remove: jest.fn(async () => undefined),
    },
  };
});

afterEach(() => {
  delete (global as any).fetch;
});

describe('PDF launcher', () => {
  it('adds a single Listen button in a shadow root', () => {
    const host = mountPdfLauncher();
    mountPdfLauncher();

    expect(document.querySelectorAll(`#${PDF_LAUNCHER_ID}`)).toHaveLength(1);
    expect(getPdfLauncher()).toBe(host);
    const listen = host.shadowRoot?.querySelector('.listen');
    expect(listen?.textContent).toBe('Listen with Talkient');
  });

  it('can be dismissed', () => {
    const host = mountPdfLauncher();
    (host.shadowRoot?.querySelector('.close') as HTMLButtonElement).click();

    expect(getPdfLauncher()).toBeNull();
  });

  it('ignores synthetic clicks from page scripts', () => {
    (global as any).fetch = jest.fn();
    const host = mountPdfLauncher();

    (host.shadowRoot?.querySelector('.listen') as HTMLButtonElement).click();

    expect((global as any).fetch).not.toHaveBeenCalled();
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('caches the PDF and asks to open the viewer', async () => {
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([37, 80, 68, 70]).buffer,
    }));
    const button = document.createElement('button');

    await openInViewer(button, PDF_URL);

    expect((global as any).fetch).toHaveBeenCalledWith(PDF_URL, {
      credentials: 'include',
      cache: 'force-cache',
    });
    expect(storage[getPdfCacheKey(PDF_URL)]).toEqual({
      data: 'JVBERg==',
      ts: expect.any(Number),
    });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'OPEN_PDF_VIEWER', url: PDF_URL, autoplay: true },
      expect.any(Function),
    );
    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('Preparing…');
  });

  it('still opens the viewer when the download fails', async () => {
    (global as any).fetch = jest.fn(async () => ({ ok: false, status: 403 }));

    await openInViewer(document.createElement('button'), PDF_URL);

    expect(storage[getPdfCacheKey(PDF_URL)]).toBeUndefined();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'OPEN_PDF_VIEWER', url: PDF_URL }),
      expect.any(Function),
    );
  });

  it('asks for a refresh when the extension was reloaded', async () => {
    (global as any).fetch = jest.fn(async () => ({ ok: false, status: 500 }));
    (global as any).chrome.runtime.id = undefined;
    const button = document.createElement('button');

    await openInViewer(button, PDF_URL);

    expect(button.textContent).toBe('Refresh the page to continue');
  });
});
