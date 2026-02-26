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

  // Auth state (managed by auth feature)
  talkient_auth_state?: {
    isAuthenticated: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-redundant-type-constituents
    user: any | null;
    lastUpdated: number;
  };
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
};
