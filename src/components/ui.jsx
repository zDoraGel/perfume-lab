import { useState, useEffect } from 'react'
import { S, FC, SC, inputStyle } from '../constants/theme'

// ── Status + Family Badges ─────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const s = SC[status] || SC.Pending
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11,
      fontFamily:'Inter,sans-serif', fontWeight:500, padding:'3px 10px', borderRadius:20,
      color:s.c, background:s.bg }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.c }}/>
      {s.label}
    </span>
  )
}

export function FamilyBadge({ family }) {
  const f = FC[family] || { c: S.textMid, bg: S.border }
  return (
    <span style={{ fontSize:10, fontFamily:'Inter,sans-serif', fontWeight:500,
      padding:'2px 8px', borderRadius:20, color:f.c, background:f.bg }}>
      {family}
    </span>
  )
}

// ── Rating Bar ─────────────────────────────────────────────────────────────────
export function RatingBar({ rating }) {
  if (!rating) return <span style={{ color:S.textLt, fontSize:12 }}>—</span>
  return (
    <div style={{ display:'flex', gap:2, alignItems:'center' }}>
      {Array.from({ length:10 }, (_, i) => (
        <div key={i} style={{ width:14, height:4, borderRadius:2,
          background: i < rating ? S.gold : S.border }}/>
      ))}
      <span style={{ fontSize:12, color:S.gold, fontFamily:'Inter,sans-serif',
        fontWeight:500, marginLeft:6 }}>{rating}/10</span>
    </div>
  )
}

// ── Card ───────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background:S.white, borderRadius:14, border:`1px solid ${S.border}`,
        padding:18, marginBottom:12, cursor:onClick ? 'pointer' : 'default', ...style }}>
      {children}
    </div>
  )
}

// ── Button ─────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', disabled = false, style = {} }) {
  const vs = {
    primary: { bg: S.gold,         color: '#fff',      border: 'none' },
    outline: { bg: 'transparent',  color: S.gold,      border: `1.5px solid ${S.goldBd}` },
    ghost:   { bg: 'transparent',  color: S.textMid,   border: `1px solid ${S.border}` },
  }
  const v = vs[variant] || vs.primary
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background:v.bg, color:v.color, border:v.border, padding:'12px 20px',
        borderRadius:12, cursor:disabled ? 'not-allowed' : 'pointer',
        fontFamily:'Inter,sans-serif', fontSize:14, fontWeight:500,
        opacity:disabled ? 0.4 : 1, transition:'opacity .15s', ...style }}>
      {children}
    </button>
  )
}

// ── Form Primitives ────────────────────────────────────────────────────────────
export function Field({ label, sub, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && (
        <div style={{ fontSize:12, fontFamily:'Inter,sans-serif', fontWeight:500,
          color:S.textMid, letterSpacing:.5, textTransform:'uppercase', marginBottom:4 }}>
          {label}
          {sub && <span style={{ fontWeight:400, textTransform:'none', marginLeft:6, color:S.textLt }}>{sub}</span>}
        </div>
      )}
      {children}
    </div>
  )
}

export function TextInput({ label, sub, value, onChange, placeholder, type = 'text' }) {
  return (
    <Field label={label} sub={sub}>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={inputStyle}/>
    </Field>
  )
}

export function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <Field label={label}>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} rows={rows}
        style={{ ...inputStyle, resize: 'none' }}/>
    </Field>
  )
}

export function SelectInput({ label, value, onChange, children }) {
  return (
    <Field label={label}>
      <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
        {children}
      </select>
    </Field>
  )
}

// ── Back Button ────────────────────────────────────────────────────────────────
export function BackBtn({ onClick }) {
  return (
    <button onClick={onClick}
      style={{ background:'none', border:'none', color:S.gold, cursor:'pointer',
        fontSize:24, marginBottom:20, padding:0, display:'block' }}>
      ‹ Back
    </button>
  )
}

// ── Token Counter ──────────────────────────────────────────────────────────────
export function TokenCounter() {
  const [tokens, setTokens] = useState({ input: 0, output: 0, calls: 0 })
  useEffect(() => {
    window._tokenUpdate = t => setTokens({ ...t })
    return () => { delete window._tokenUpdate }
  }, [])
  if (tokens.calls === 0) return null
  const cost = ((tokens.input * 3 + tokens.output * 15) / 1_000_000).toFixed(4)
  return (
    <div style={{ position:'fixed', bottom:12, right:12, zIndex:50,
      background:'rgba(255,255,255,0.9)', border:`1px solid ${S.border}`,
      borderRadius:8, padding:'5px 10px', backdropFilter:'blur(4px)' }}>
      <div style={{ fontSize:10, color:S.textLt, fontFamily:'Inter,sans-serif',
        textAlign:'right', letterSpacing:.3 }}>
        AI calls: <span style={{ color:S.text }}>{tokens.calls}</span>
        &nbsp;·&nbsp;~${cost}
      </div>
      <div style={{ fontSize:9, color:S.textLt, fontFamily:'Inter,sans-serif',
        textAlign:'right', marginTop:1 }}>
        {tokens.input + tokens.output} tokens this session
      </div>
    </div>
  )
}
