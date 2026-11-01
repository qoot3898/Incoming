/**
 * Qoot identity palette (Qoot brand guide, "Brand colors"):
 *   #004949 deep teal · #FFF0DA cream · #9BE05E leaf green.
 * Every other UI tone below is derived from those three so surfaces, lines and
 * accents stay on-brand. Components must use these tokens instead of hex literals.
 */
export const brand = {
  // Core identity colors
  teal: '#004949',
  cream: '#FFF0DA',
  leaf: '#9BE05E',

  // Derived teal tones
  tealDark: '#003333',
  tealLight: '#2E6E6E',
  tealSoft: '#E6EFEE',

  // Derived leaf tones
  leafDark: '#4E8A1E',
  leafSoft: '#EEF8E4',

  // Derived cream tones (warm neutrals)
  canvas: '#FFF9F0', // app background — cream at ~40%
  creamSoft: '#FFF5E6', // note blocks, code, search field
  creamLine: '#F3E2C2', // borders on cream surfaces
  surfaceHead: '#FFFAF3', // table / grid headers
  surfaceDisabled: '#F5F0E6', // non-editable cells

  // Text & lines
  ink: '#16211F',
  muted: '#5B6B68',
  line: '#EAE3D6',
  inputLine: '#D9D2C4',
  iconMuted: '#B7C2BF',
} as const;

/** Colors used on the dark teal sidebar / login panel. */
export const onTeal = {
  text: 'rgba(255,240,218,0.88)',
  textMuted: 'rgba(255,240,218,0.62)',
  textFaint: 'rgba(255,240,218,0.5)',
  divider: 'rgba(255,240,218,0.12)',
  hover: 'rgba(255,240,218,0.08)',
  selected: 'rgba(155,224,94,0.22)',
  selectedHover: 'rgba(155,224,94,0.3)',
} as const;
