/// <reference types="chrome" />

/**
 * Shared storage schema for all settings stored in chrome.storage.local
 */

/**
 * Highlight style options
 */
export type HighlightStyle = 'default' | 'minimal' | 'bold' | 'elegant';

/**
 * Button position options
 */
export type ButtonPosition = 'left' | 'right';

/**
 * Complete storage schema for the extension
 */
export interface StorageSchema {
  // Speech settings
  selectedVoice: string;
  speechRate: number;
  speechPitch: number;

  // Highlighting settings
  highlightStyle: HighlightStyle;
  followHighlight: boolean;

  // Content processing settings
  minimumWords: number;
  maxNodesProcessed: number;
  buttonPosition: ButtonPosition;

  // UI behavior settings
  autoPlayNext: boolean;
  playButtonsEnabled: boolean;
  panelHideDuration: number;

  // Translation settings
  translationTargetLanguage: string;

  // Content processing - configurable processable elements
  processableElements: string[];

  // Domain-level processing opt-out
  ignoredDomains: string[];

  // Auth state (managed by auth feature)
  talkient_auth_state?: {
    isAuthenticated: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-redundant-type-constituents
    user: any | null;
    lastUpdated: number;
  };
}

export const PROCESSABLE_ELEMENTS_CATALOG = [
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
] as const;

export const DEFAULT_PROCESSABLE_ELEMENTS = [
  'article',
  'p',
  'h1',
  'h2',
  'h3',
  'li',
] as const;

const PROCESSABLE_ELEMENTS_SET = new Set<string>(PROCESSABLE_ELEMENTS_CATALOG);

export function normalizeProcessableElements(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [...DEFAULT_PROCESSABLE_ELEMENTS];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const tag of tags) {
    if (typeof tag === 'string') {
      const norm = tag.trim().toLowerCase();
      if (PROCESSABLE_ELEMENTS_SET.has(norm) && !seen.has(norm)) {
        seen.add(norm);
        normalized.push(norm);
      }
    }
  }

  return normalized;
}

const DOMAIN_LABEL_PATTERN = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const DOMAIN_PATTERN = new RegExp(
  String.raw`^(?:${DOMAIN_LABEL_PATTERN}\.)+${DOMAIN_LABEL_PATTERN}$`,
);

export function normalizeIgnoredDomainEntry(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  let hostname = trimmed;

  if (trimmed.includes('://')) {
    try {
      hostname = new URL(trimmed).hostname.toLowerCase();
    } catch {
      return null;
    }
  } else if (
    trimmed.includes('/') ||
    trimmed.includes('?') ||
    trimmed.includes('#')
  ) {
    try {
      hostname = new URL(`https://${trimmed}`).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  hostname = hostname.replace(/\.$/, '');

  if (hostname === 'localhost') {
    return hostname;
  }

  if (!hostname.includes('.') || !DOMAIN_PATTERN.test(hostname)) {
    return null;
  }

  return hostname;
}

export function normalizeIgnoredDomains(domains: unknown): string[] {
  if (!Array.isArray(domains)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const domain of domains) {
    const normalizedDomain = normalizeIgnoredDomainEntry(domain);
    if (normalizedDomain && !seen.has(normalizedDomain)) {
      seen.add(normalizedDomain);
      normalized.push(normalizedDomain);
    }
  }

  return normalized;
}

export function isHostnameIgnored(
  hostname: string,
  ignoredDomains: string[],
): boolean {
  const normalizedHostname = normalizeIgnoredDomainEntry(hostname);
  if (!normalizedHostname) {
    return false;
  }

  for (const ignoredDomain of ignoredDomains) {
    if (
      normalizedHostname === ignoredDomain ||
      normalizedHostname.endsWith(`.${ignoredDomain}`)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Default values for all settings
 */
export const DEFAULT_SETTINGS: StorageSchema = {
  // Speech settings
  selectedVoice: 'default',
  speechRate: 1.0,
  speechPitch: 1.0,

  // Highlighting settings
  highlightStyle: 'default',
  followHighlight: true,

  // Content processing settings
  minimumWords: 3,
  maxNodesProcessed: 1000,
  buttonPosition: 'left',

  // UI behavior settings
  autoPlayNext: true,
  playButtonsEnabled: true,
  panelHideDuration: 30,

  // Translation settings
  translationTargetLanguage: 'en',

  // Content processing - configurable processable elements
  processableElements: [...DEFAULT_PROCESSABLE_ELEMENTS],

  // Domain-level processing opt-out
  ignoredDomains: [],
};
