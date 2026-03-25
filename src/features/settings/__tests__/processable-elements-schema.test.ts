/**
 * @jest-environment jsdom
 */

import { DEFAULT_SETTINGS } from '../storage-schema';

describe('DEFAULT_SETTINGS.processableElements', () => {
  it('should equal the expected default set', () => {
    expect(DEFAULT_SETTINGS.processableElements).toEqual([
      'article',
      'p',
      'h1',
      'h2',
      'h3',
      'li',
    ]);
  });

  it('should be an array of strings', () => {
    expect(Array.isArray(DEFAULT_SETTINGS.processableElements)).toBe(true);
    DEFAULT_SETTINGS.processableElements.forEach((el) => {
      expect(typeof el).toBe('string');
    });
  });

  it('should include article for backwards compatibility', () => {
    expect(DEFAULT_SETTINGS.processableElements).toContain('article');
  });

  it('should include common reading content tags', () => {
    const expected = ['p', 'h1', 'h2', 'h3', 'li'];
    expected.forEach((tag) => {
      expect(DEFAULT_SETTINGS.processableElements).toContain(tag);
    });
  });
});
