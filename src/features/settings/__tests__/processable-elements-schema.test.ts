/**
 * @jest-environment jsdom
 */

import {
  DEFAULT_PROCESSABLE_ELEMENTS,
  DEFAULT_SETTINGS,
  PROCESSABLE_ELEMENTS_CATALOG,
  normalizeProcessableElements,
} from '../storage-schema';

describe('DEFAULT_SETTINGS.processableElements', () => {
  it('should equal the expected default set', () => {
    expect(DEFAULT_SETTINGS.processableElements).toEqual([
      ...DEFAULT_PROCESSABLE_ELEMENTS,
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

  it('should expose expanded processable element catalog', () => {
    expect(PROCESSABLE_ELEMENTS_CATALOG).toEqual([
      'article',
      'main',
      'section',
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'li',
      'ul',
      'ol',
      'blockquote',
      'pre',
      'code',
      'span',
      'a',
      'em',
      'strong',
      'small',
      'mark',
      'cite',
      'q',
      'figcaption',
      'caption',
      'td',
      'th',
      'label',
      'button',
    ]);
  });

  it('should normalize unknown/invalid values', () => {
    expect(
      normalizeProcessableElements(['article', 'unknown', 1, null]),
    ).toEqual(['article']);
  });

  it('should keep empty array as empty list', () => {
    expect(normalizeProcessableElements([])).toEqual([]);
  });
});
