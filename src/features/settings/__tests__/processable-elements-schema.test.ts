/**
 * @jest-environment jsdom
 */

import {
  DEFAULT_PROCESSABLE_ELEMENTS,
  DEFAULT_SETTINGS,
  PROCESSABLE_ELEMENTS_CATALOG,
  isHostnameIgnored,
  normalizeIgnoredDomainEntry,
  normalizeIgnoredDomains,
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

  it('should normalize upper/mixed-case tags to lowercase', () => {
    expect(normalizeProcessableElements(['Article', 'P', 'H1'])).toEqual([
      'article',
      'p',
      'h1',
    ]);
  });

  it('should trim whitespace around tag names before validating', () => {
    expect(normalizeProcessableElements(['  p  ', ' article ', 'h2 '])).toEqual(
      ['p', 'article', 'h2'],
    );
  });

  it('should deduplicate case-insensitive duplicates', () => {
    expect(normalizeProcessableElements(['P', 'p', 'P'])).toEqual(['p']);
  });

  it('should keep empty array as empty list', () => {
    expect(normalizeProcessableElements([])).toEqual([]);
  });

  it('should default ignoredDomains to an empty array', () => {
    expect(DEFAULT_SETTINGS.ignoredDomains).toEqual([]);
  });

  it('should normalize a valid ignored domain entry', () => {
    expect(normalizeIgnoredDomainEntry('  WWW.Example.COM  ')).toBe(
      'www.example.com',
    );
  });

  it('should normalize url-like ignored domain input to hostname', () => {
    expect(normalizeIgnoredDomainEntry('https://blog.example.com/path')).toBe(
      'blog.example.com',
    );
  });

  it('should reject invalid ignored domain entries', () => {
    expect(normalizeIgnoredDomainEntry('')).toBeNull();
    expect(normalizeIgnoredDomainEntry('not a domain')).toBeNull();
    expect(normalizeIgnoredDomainEntry('example')).toBeNull();
  });

  it('should normalize ignored domains list and remove duplicates/invalids', () => {
    expect(
      normalizeIgnoredDomains([
        ' Example.com ',
        'example.com',
        'bad domain',
        1,
      ]),
    ).toEqual(['example.com']);
  });

  it('should match ignored hostnames by exact and subdomain', () => {
    expect(isHostnameIgnored('example.com', ['example.com'])).toBe(true);
    expect(isHostnameIgnored('www.example.com', ['example.com'])).toBe(true);
    expect(isHostnameIgnored('example.org', ['example.com'])).toBe(false);
  });
});
