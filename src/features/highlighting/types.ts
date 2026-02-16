/**
 * Available highlighting styles
 */
export type HighlightStyle = 'default' | 'minimal' | 'bold' | 'elegant';

/**
 * Valid highlighting style values for validation
 */
export const VALID_HIGHLIGHT_STYLES: readonly HighlightStyle[] = [
  'default',
  'minimal',
  'bold',
  'elegant',
] as const;
