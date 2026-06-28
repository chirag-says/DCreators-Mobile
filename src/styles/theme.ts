/**
 * DCreators Design System — Figma Theme Tokens
 * ==============================================
 * Centralized design tokens extracted from the Figma design file.
 * All screens should import from this file to maintain visual consistency.
 *
 * Key design principles from Figma (canonical source: claudereferfigma/):
 * - Light lavender / off-white screen background (#F4F4F8 → #EDF1F5)
 * - Navy primary (#1B3A5C) with deep-indigo titles (#21317A)
 * - Orange accent (#E8854A) — Sales Dashboard title, highlights, badges
 * - Teal accent (#3D9B8F) — "Submit for review" CTAs
 * - White cards (radius ~16, soft shadow); off-white inputs (radius ~12, 1px border)
 * - Primary button: navy fill, pill/rounded, white text. Secondary: navy outline.
 */

import { Platform } from 'react-native';

// ─── Color Palette ───────────────────────────────────────────
export const colors = {
  // Primary brand colors (canonical navy, from claudereferfigma)
  primary: '#1B3A5C',        // Navy — buttons, icons, accents, most titles
  primaryDark: '#13293F',    // Hover/pressed state
  primaryLight: '#2C5278',   // Lighter variant
  indigo: '#21317A',         // Deep indigo — some screen titles

  // Secondary / Accent
  teal: '#3D9B8F',           // Teal — "Submit for review" CTAs
  tealDark: '#2D8B7F',       // Darker teal for borders
  orange: '#E8854A',         // Orange accent — Sales Dashboard, highlights, badges
  orangeDark: '#E87B35',     // Pressed/darker orange

  // Backgrounds
  screenBg: '#F4F4F8',       // Figma screen background (light lavender/off-white)
  screenBgAlt: '#EDF1F5',    // Alternate cooler background
  cardBg: '#FFFFFF',         // Card backgrounds
  inputBg: '#F5F5F5',        // Input field backgrounds (off-white)
  sectionBg: '#F8F9FB',      // Section/panel backgrounds

  // Text hierarchy
  textPrimary: '#1B3A5C',    // Headings, primary text (navy)
  textBody: '#1F2937',       // Dark neutral body text
  textSecondary: '#6B7280',  // Descriptions, subtitles
  textTertiary: '#9CA3AF',   // Placeholders, meta text
  textOnPrimary: '#FFFFFF',  // Text on primary buttons
  textLink: '#1B3A5C',       // Links (matches navy primary)

  // Borders & Dividers
  border: '#E5E7EB',         // Default border
  borderLight: '#F3F4F6',    // Subtle separator
  borderInput: '#D1D5DB',    // Input field borders
  borderCard: 'rgba(0,0,0,0.06)', // Card borders

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Overlays
  overlay: 'rgba(0,0,0,0.45)',
  overlayLight: 'rgba(0,0,0,0.06)',

  // Dashboard section backgrounds (matching Figma B1.x)
  sectionDark: '#4D4D4D',
  sectionBlack: '#1A1A1A',
  sectionBrown: '#4E3F30',

  // Figma button variants
  btnPrimary: '#1B3A5C',
  btnPrimaryText: '#FFFFFF',
  btnOutline: 'transparent',
  btnOutlineText: '#1B3A5C',
  btnOutlineBorder: '#1B3A5C',
  btnDisabled: '#9CA3AF',
  btnDanger: '#EF4444',
  btnSuccess: '#10B981',

  // Back button bar at bottom (Figma screens show a dark bar)
  bottomBar: '#2D2D2D',
} as const;


// ─── Typography ──────────────────────────────────────────────
export const fonts = {
  heavy: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'sans-serif',
  medium: Platform.OS === 'ios' ? 'Avenir-Medium' : 'sans-serif-medium',
  body: Platform.OS === 'ios' ? 'Avenir-Book' : 'sans-serif-light',
  light: Platform.OS === 'ios' ? 'Avenir-Light' : 'sans-serif-thin',
} as const;

export const fontSizes = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 30,
  '5xl': 36,
} as const;

export const lineHeights = {
  tight: 18,
  base: 22,
  relaxed: 28,
  loose: 34,
} as const;


// ─── Spacing ─────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 60,
} as const;


// ─── Border Radius ───────────────────────────────────────────
export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 16,
  '2xl': 20,
  full: 999,
} as const;


// ─── Shadows ─────────────────────────────────────────────────
export const shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
    android: { elevation: 1 },
  }),
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
    android: { elevation: 3 },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
    android: { elevation: 6 },
  }),
  card: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    android: { elevation: 2 },
  }),
} as const;


// ─── Common Style Presets ────────────────────────────────────

/** Standard input field style matching Figma's rounded off-white inputs */
export const inputStyle = {
  backgroundColor: colors.inputBg,
  borderRadius: radii.xl,
  paddingHorizontal: spacing.xl,
  paddingVertical: spacing.lg,
  fontSize: fontSizes.lg,
  fontFamily: fonts.body,
  color: colors.textPrimary,
} as const;

/** Primary filled button (deep indigo) */
export const btnPrimaryStyle = {
  backgroundColor: colors.btnPrimary,
  paddingVertical: spacing.lg,
  paddingHorizontal: spacing['3xl'],
  borderRadius: radii.full,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
} as const;

/** Outline button */
export const btnOutlineStyle = {
  backgroundColor: colors.btnOutline,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing['2xl'],
  borderRadius: radii.full,
  borderWidth: 1.5,
  borderColor: colors.btnOutlineBorder,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
} as const;

/** Screen background wrapper (preserves bg-texture.png) */
export const screenBackground = {
  flex: 1,
  backgroundColor: colors.screenBg,
} as const;
