import fs from 'node:fs';
import path from 'node:path';

describe('manifest.json', () => {
  it('does not define a top-level title attribute', () => {
    const manifestPath = path.resolve(__dirname, '../../manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent) as Record<string, unknown>;

    expect(manifest).not.toHaveProperty('title');
  });

  it('does not include loopback host permissions in production', () => {
    const manifestPath = path.resolve(__dirname, '../../manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent) as {
      host_permissions?: string[];
    };

    expect(manifest.host_permissions).not.toEqual(
      expect.arrayContaining([
        'http://localhost:*/*',
        'http://127.0.0.1:*/*',
        'https://localhost:*/*',
        'https://127.0.0.1:*/*',
      ]),
    );
  });
});
