import { useState, useRef, useEffect } from 'react'
import { S, FC } from '../constants/theme'

/**
 * MaterialPicker — search autocomplete แทน dropdown
 * Props:
 *   materials  {Object[]} - all materials
 *   value      {string}   - selected material id
 *   onChange   {fn}       - (id, material) => void
 *   placeholder {string}
 */
export default function MaterialPicker({ materials = [], value, onChange, placeholder = 'ค้นหา ingredient...' }) {
  const [query,    setQuery]    = useState('')
  const [open,     setOpen]     = useState(false)
  const [focused,  setFocused]  = useState(false)
  const inputRef = useRef()
  const wrapRef  = useRef()

  const selected = materials.find(m => m.id === parseInt(value))

  // filter
  const filtered = query.trim()
    ? materials.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        (m.family || '').toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : materials.slice(0, 8)

  // close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(mat) {
    onChange(String(mat.id), mat)
    setQuery('')
    setOpen(false)
  }

  function handleFocus() {
    setFocused(true)
    setOpen(true)
  }

  const evapColor = { Top: S.green, Heart: '#8a3a68', Base: '#7a5c2e' }

  return (
    <div ref={wrapRef} style={{ position:'relative', flex:3 }}>
      {/* Selected display / search input */}
      {selected && !open ? (
        // แสดง selected item — กดเพื่อเปลี่ยน
        <div onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
            background:S.white, border:`1.5px solid ${S.goldBd}`,
            borderRadius:10, cursor:'pointer', minHeight:46 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:15,
              fontStyle:'italic', color:S.ink, whiteSpace:'nowrap',
              overflow:'hidden', textOverflow:'ellipsis' }}>
              {selected.name}
            </div>
            <div style={{ display:'flex', gap:6, marginTop:2 }}>
              {selected.family && (
                <span style={{ fontSize:9, fontWeight:500, padding:'1px 6px', borderRadius:20,
                  color:(FC[selected.family]||{c:S.textMid}).c,
                  background:(FC[selected.family]||{bg:S.border}).bg }}>
                  {selected.family}
                </span>
              )}
              {selected.evaporation && (
                <span style={{ fontSize:9, fontWeight:600,
                  color: evapColor[selected.evaporation] || S.textLt }}>
                  {selected.evaporation}
                </span>
              )}
              {selected.stock != null && (
                <span style={{ fontSize:9, color: selected.stock < 10 ? S.red : S.green }}>
                  {selected.stock}g
                </span>
              )}
            </div>
          </div>
          <span style={{ fontSize:11, color:S.textLt, flexShrink:0 }}>✎</span>
        </div>
      ) : (
        // Search input
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={handleFocus}
          placeholder={selected ? selected.name : placeholder}
          style={{ width:'100%', background:S.white,
            border:`1.5px solid ${open ? S.gold : S.border}`,
            borderRadius: open ? '10px 10px 0 0' : 10,
            padding:'12px 14px', fontSize:14,
            fontFamily:'Cormorant Garamond,serif', fontStyle:'italic',
            color:S.ink, outline:'none', boxSizing:'border-box',
            transition:'border-color .15s' }}
        />
      )}

      {/* Dropdown */}
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50,
          background:S.white, border:`1.5px solid ${S.gold}`,
          borderTop: selected && !query ? `1px solid ${S.border}` : 'none',
          borderRadius:'0 0 12px 12px',
          boxShadow:'0 8px 24px rgba(0,0,0,0.08)',
          maxHeight:260, overflowY:'auto' }}>

          {filtered.length === 0 ? (
            <div style={{ padding:'14px 16px', fontSize:13, color:S.textLt,
              fontStyle:'italic', textAlign:'center' }}>
              ไม่พบ "{query}"
            </div>
          ) : (
            filtered.map(mat => {
              const isSelected = mat.id === parseInt(value)
              const fc = FC[mat.family] || { c:S.textMid, bg:S.border }
              return (
                <div key={mat.id}
                  onMouseDown={() => select(mat)}
                  style={{ padding:'10px 14px', cursor:'pointer',
                    background: isSelected ? S.goldLt : 'transparent',
                    borderBottom:`1px solid ${S.border}`,
                    transition:'background .1s' }}
                  onMouseEnter={e => !isSelected && (e.currentTarget.style.background = S.bg)}
                  onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:15,
                        fontStyle:'italic', color: isSelected ? S.gold : S.ink }}>
                        {mat.name}
                      </div>
                      <div style={{ display:'flex', gap:6, marginTop:3 }}>
                        {mat.family && (
                          <span style={{ fontSize:9, fontWeight:500, padding:'1px 6px',
                            borderRadius:20, color:fc.c, background:fc.bg }}>
                            {mat.family}
                          </span>
                        )}
                        {mat.evaporation && (
                          <span style={{ fontSize:9, fontWeight:600,
                            color: evapColor[mat.evaporation] || S.textLt }}>
                            {mat.evaporation}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      {mat.stock != null && (
                        <div style={{ fontSize:11, fontWeight:500,
                          color: mat.stock < 10 ? S.red : S.green }}>
                          {mat.stock}g
                        </div>
                      )}
                      {mat.cost != null && (
                        <div style={{ fontSize:10, color:S.textLt }}>
                          ฿{mat.cost}/g
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
