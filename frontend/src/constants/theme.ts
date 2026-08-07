// ─── MaternalCare Premium Design System ─────────────────────────────────────
// Soft White + Pink + Lavender + Teal palette — light background, premium feel

export const Colors = {
  // ── Primary Brand ─────────────────────────────────────────────────────────
  primary: '#D4589A',           // Deep rose pink
  primaryLight: '#F2A8CB',      // Soft pink
  primaryDark: '#A8307A',       // Dark rose
  primaryGradient: ['#D4589A', '#9B5DE5'],  // Pink → Purple

  // ── Accent Colors ─────────────────────────────────────────────────────────
  lavender: '#9B5DE5',          // Lavender purple
  lavenderLight: '#C9AAEE',     // Soft lavender
  lavenderBg: '#F3EEFF',        // Lavender background tint

  teal: '#0BC4B5',              // Teal accent
  tealLight: '#7FE5DF',         // Soft teal
  tealBg: '#E6FFFE',            // Teal background tint

  skyBlue: '#4A9FF5',           // Sky blue
  skyBlueBg: '#EBF5FF',         // Sky blue bg tint

  gold: '#F5A623',              // Amber gold
  goldBg: '#FFF7E6',            // Gold bg tint

  coral: '#FF6B6B',             // Coral for danger/SOS
  coralBg: '#FFF0F0',           // Coral bg

  danger: '#FF4757',            // Danger red
  error: '#FF4757',             // Error red
  errorLight: '#FFD0D0',        // Error red light
  warning: '#F5A623',           // Warning amber
  warningLight: '#FFF7E6',      // Warning light bg

  mint: '#00C9A7',              // Mint green success
  mintBg: '#E8FFF9',            // Mint bg

  // ── Backgrounds ───────────────────────────────────────────────────────────
  background: '#F8F6FF',        // Soft white with lavender tint (main bg)
  backgroundAlt: '#FFFFFF',     // Pure white
  surface: '#FFFFFF',           // Card surface
  surfaceSecondary: '#F3EFF8',  // Secondary surface with lavender tint
  surfaceElevated: '#FAF7FF',   // Elevated surface

  // ── Sidebar ───────────────────────────────────────────────────────────────
  sidebarBg: '#FFFFFF',         // Sidebar background
  sidebarActive: '#F8EEF8',     // Active item bg
  sidebarActiveBorder: '#D4589A', // Active item border/accent

  // ── Text ──────────────────────────────────────────────────────────────────
  textPrimary: '#1A0A2E',       // Deep purple-black
  textSecondary: '#5A4A7A',     // Medium purple-grey
  textMuted: '#9B8CB0',         // Muted lavender-grey
  textOnAccent: '#FFFFFF',      // White text on colored backgrounds
  textOnLight: '#1A0A2E',       // Dark text for light cards

  // ── Borders ───────────────────────────────────────────────────────────────
  border: 'rgba(180, 150, 210, 0.2)',        // Soft lavender border
  borderLight: 'rgba(180, 150, 210, 0.12)',  // Lighter border
  borderMedium: 'rgba(180, 150, 210, 0.35)', // More visible border

  // ── Status Colors ─────────────────────────────────────────────────────────
  success: '#00C9A7',
  info: '#4A9FF5',

  // ── Mood Colors ───────────────────────────────────────────────────────────
  moodExcellent: '#F5A623',
  moodGood: '#00C9A7',
  moodOkay: '#4A9FF5',
  moodLow: '#FF8C42',
  moodVeryLow: '#FF4757',

  // ── Glassmorphism ─────────────────────────────────────────────────────────
  glass: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',

  // ── Gradients (as arrays for LinearGradient or manual usage) ──────────────
  gradientPink: ['#FFB3D1', '#D4589A'],
  gradientPurple: ['#C9AAEE', '#9B5DE5'],
  gradientTeal: ['#7FE5DF', '#0BC4B5'],
  gradientBlue: ['#A8CFFF', '#4A9FF5'],
  gradientHero: ['#FBECF8', '#EDE0FF'],
  gradientSOS: ['#FFD0D0', '#FF4757'],
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const Radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
  full: 9999,
};

export const Typography = {
  hero:    { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1 },
  display: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.5 },
  h1:      { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2:      { fontSize: 20, fontWeight: '700' as const },
  h3:      { fontSize: 17, fontWeight: '600' as const },
  h4:      { fontSize: 15, fontWeight: '600' as const },
  body:    { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 },
  bodyMd:  { fontSize: 15, fontWeight: '400' as const },
  bodyBold:{ fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  captionBold: { fontSize: 12, fontWeight: '600' as const },
  label:   { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  micro:   { fontSize: 10, fontWeight: '500' as const },
};

export const Shadows = {
  xs: {
    shadowColor: '#9B5DE5',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sm: {
    shadowColor: '#9B5DE5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#D4589A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  lg: {
    shadowColor: '#9B5DE5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#D4589A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 32,
    elevation: 12,
  },
  sos: {
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const SIDEBAR_WIDTH = 260;
export const TOPBAR_HEIGHT = 60;

// API URL is managed in src/services/api.ts (CORE_API_URL).
// Set EXPO_PUBLIC_CORE_URL in .env to point at your deployed backend.

