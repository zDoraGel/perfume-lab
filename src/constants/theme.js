// ── Design Tokens ─────────────────────────────────────────────────────────────
export const S = {
  bg:      '#f8f6f2',
  white:   '#ffffff',
  border:  '#e8e4dc',
  text:    '#1a1814',
  textMid: '#6b6560',
  textLt:  '#b0aba4',
  gold:    '#8a6f3e',
  goldLt:  '#f0e8d8',
  goldBd:  '#d4b896',
  green:   '#3d6b4a',
  greenBg: '#eef5f0',
  red:     '#8b3a2e',
  redBg:   '#fdf0ee',
  amber:   '#7a5c20',
  amberBg: '#fdf5e6',
  ink:     '#2c2820',
}

// Fragrance family colors
export const FC = {
  Woody:    { c: '#7a5c2e', bg: '#f5ede0' },
  Floral:   { c: '#8a3a68', bg: '#fceef7' },
  Citrus:   { c: '#4a7a28', bg: '#eef7e8' },
  Ambery:   { c: '#8a5820', bg: '#fdf0e0' },
  Musk:     { c: '#5a4a8a', bg: '#f0eef8' },
  Fresh:    { c: '#1a6a8a', bg: '#e8f5f8' },
  Spicy:    { c: '#8a2a1e', bg: '#fdeee8' },
  Gourmand: { c: '#7a4a18', bg: '#f8ede0' },
}

// Version status colors
export const SC = {
  Success: { c: '#3d6b4a', bg: '#eef5f0', label: 'Success' },
  Failed:  { c: '#8b3a2e', bg: '#fdf0ee', label: 'Failed'  },
  Pending: { c: '#7a5c20', bg: '#fdf5e6', label: 'Pending' },
}

export const FAMILIES = ['Woody','Floral','Citrus','Ambery','Musk','Fresh','Spicy','Gourmand']
export const EVAP     = ['Top','Heart','Base']

export const inputStyle = {
  width: '100%',
  background: '#ffffff',
  border: '1px solid #e8e4dc',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 16,
  fontFamily: 'Inter,sans-serif',
  color: '#1a1814',
  outline: 'none',
  boxSizing: 'border-box',
}
