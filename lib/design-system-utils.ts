/**
 * Design System Utilities
 * 
 * Helper functions and utilities for working with the design system
 */

import { designTokens, colors, spacing, typography, borderRadius, shadows } from './design-system';

/**
 * Get a color value from the design system
 * @example getColor('primary', 500) // returns '#6366f1'
 */
export function getColor(
  palette: 'primary' | 'secondary' | 'accent' | 'gray' | 'slate' | 'success' | 'error' | 'warning' | 'info',
  shade: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
): string {
  return colors[palette][shade];
}

/**
 * Get a spacing value from the design system
 * @example getSpacing(4) // returns '1rem'
 */
export function getSpacing(scale: keyof typeof spacing): string {
  return spacing[scale];
}

/**
 * Get a border radius value from the design system
 * @example getBorderRadius('lg') // returns '0.5rem'
 */
export function getBorderRadius(scale: keyof typeof borderRadius): string {
  return borderRadius[scale];
}

/**
 * Get a shadow value from the design system
 * @example getShadow('lg') // returns '0 10px 15px -3px rgba(0, 0, 0, 0.1)...'
 */
export function getShadow(scale: keyof typeof shadows): string {
  return shadows[scale];
}

/**
 * Get a typography font size
 * @example getFontSize('lg') // returns '1.125rem'
 */
export function getFontSize(scale: keyof typeof typography.fontSize): string {
  return typography.fontSize[scale];
}

/**
 * Generate CSS variable name for a color
 * @example getColorVar('primary', 500) // returns 'var(--color-primary-500)'
 */
export function getColorVar(
  palette: 'primary' | 'secondary' | 'accent' | 'gray' | 'slate' | 'success' | 'error' | 'warning' | 'info',
  shade: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
): string {
  return `var(--color-${palette}-${shade})`;
}

/**
 * Generate CSS variable name for spacing
 * @example getSpacingVar(4) // returns 'var(--spacing-4)'
 */
export function getSpacingVar(scale: keyof typeof spacing): string {
  return `var(--spacing-${scale})`;
}

/**
 * Generate CSS variable name for border radius
 * @example getRadiusVar('lg') // returns 'var(--radius-lg)'
 */
export function getRadiusVar(scale: keyof typeof borderRadius): string {
  return `var(--radius-${scale})`;
}

/**
 * Generate CSS variable name for shadow
 * @example getShadowVar('lg') // returns 'var(--shadow-lg)'
 */
export function getShadowVar(scale: keyof typeof shadows): string {
  return `var(--shadow-${scale})`;
}

/**
 * Common color combinations for components
 */
export const colorSchemes = {
  primary: {
    bg: getColorVar('primary', 500),
    hover: getColorVar('primary', 600),
    text: '#ffffff',
    light: getColorVar('primary', 100),
    dark: getColorVar('primary', 900),
  },
  secondary: {
    bg: getColorVar('secondary', 500),
    hover: getColorVar('secondary', 600),
    text: '#ffffff',
    light: getColorVar('secondary', 100),
    dark: getColorVar('secondary', 900),
  },
  success: {
    bg: getColorVar('success', 500),
    hover: getColorVar('success', 600),
    text: '#ffffff',
    light: getColorVar('success', 100),
    dark: getColorVar('success', 900),
  },
  error: {
    bg: getColorVar('error', 500),
    hover: getColorVar('error', 600),
    text: '#ffffff',
    light: getColorVar('error', 100),
    dark: getColorVar('error', 900),
  },
} as const;

/**
 * Export design tokens for direct access
 */
export { designTokens, colors, spacing, typography, borderRadius, shadows };

