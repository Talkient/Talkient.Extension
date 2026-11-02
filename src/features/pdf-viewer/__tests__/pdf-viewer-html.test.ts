import fs from 'node:fs';
import path from 'node:path';

const viewerDir = path.resolve(__dirname, '../viewer');

function loadViewerDocument(): Document {
  const html = fs.readFileSync(path.join(viewerDir, 'pdf-viewer.html'), 'utf8');
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('pdf-viewer.html', () => {
  it('loads the viewer script as a module and its stylesheet', () => {
    const doc = loadViewerDocument();

    const script = doc.querySelector('script[src="pdf-viewer.js"]');
    expect(script?.getAttribute('type')).toBe('module');
    expect(doc.querySelector('link[href="pdf-viewer.css"]')).not.toBeNull();
  });

  it('has the elements the viewer script needs', () => {
    const doc = loadViewerDocument();

    [
      'tk-pdf-title',
      'tk-pdf-page-indicator',
      'tk-pdf-status',
      'tk-pdf-scroll',
      'tk-pdf-pages',
      'tk-pdf-password',
      'tk-pdf-password-input',
      'tk-pdf-password-label',
      'tk-pdf-play',
      'tk-pdf-previous',
      'tk-pdf-next',
    ].forEach((id) => expect(doc.getElementById(id)).not.toBeNull());
  });

  it('keeps the playback controls disabled until the PDF is ready', () => {
    const doc = loadViewerDocument();

    ['tk-pdf-play', 'tk-pdf-previous', 'tk-pdf-next'].forEach((id) => {
      const button = doc.getElementById(id) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.getAttribute('aria-label')).toBeTruthy();
    });
    expect(doc.getElementById('tk-pdf-password')?.hidden).toBe(true);
  });

  it('positions pdf.js text runs inside the reading blocks', () => {
    const css = fs.readFileSync(path.join(viewerDir, 'pdf-viewer.css'), 'utf8');

    expect(css).toMatch(/\.textLayer \.tk-pdf-block\s*{\s*display: contents;/);
    expect(css).toContain('.textLayer .tk-pdf-block > span');
  });
});

describe('manifest.json and the PDF viewer', () => {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '../../../../manifest.json'),
      'utf8',
    ),
  ) as {
    permissions: string[];
    web_accessible_resources?: Array<{ resources: string[] }>;
  };

  it('can keep large PDFs in the redirect cache', () => {
    expect(manifest.permissions).toContain('unlimitedStorage');
  });

  it('does not expose the viewer to web pages', () => {
    const resources = (manifest.web_accessible_resources ?? []).flatMap(
      (entry) => entry.resources,
    );
    expect(
      resources.some((resource) => resource.startsWith('pdf-viewer')),
    ).toBe(false);
  });
});
