import { useState, useEffect } from 'react'
import { S, FC } from '../constants/theme'
import { getStockRecommendations } from '../constants/stockRecommendations'
import { getFamilyWeights, getRelevantFamiliesByWeight } from '../lib/familyWeights'

export default function StockRecommendations({ vibe = '', materials = [], compact = false, formulaId = null }) {
  const [expanded,  setExpanded]  = useState(false)
  const [showAll,   setShowAll]   = useState(false)
  const [families,  setFamilies]  = useState([])
  const [recs,      setRecs]      = useState([])
  const [loading,   setLoading]   = useState(false)
  const [weights,   setWeights]   = useState(null)

  useEffect(() => {
    if (!vibe.trim()) return
    setLoading(true)

    getFamilyWeights(formulaId, vibe).then(w => {
      setWeights(w)
      const fams = getRelevantFamiliesByWeight(w, 3)
      setFamilies(fams)

      const ownedNames = materials.filter(m => (m.stock || 0) > 0).map(m => m.name)
      // รวม families จาก materials ที่มี stock เพื่อให้รู้ว่ามีอะไรอยู่แล้ว
      const ownedFamilies = [...new Set(
        materials.filter(m => (m.stock || 0) > 0).flatMap(m => {
          try {
            const f = Array.isArray(m.families) ? m.families : JSON.parse(m.families || '[]')
            return f.length ? f : (m.family ? [m.family] : [])
          } catch { return m.family ? [m.family] : [] }
        }).filter(Boolean)
      )]
      const allFamilies = [...new Set([...fams, ...ownedFamilies])]
      const r = getStockRecommendations(vibe, ownedNames, allFamilies)
      setRecs(r)
      setLoading(false)
    })
  }, [vibe, formulaId])

  if (!vibe.trim()) return null
  if (loading) return (
    <div style={{ padding:'10px 14px', borderRadius:12, background:S.goldLt,
      border:`1px solid ${S.goldBd}`, marginBottom: compact ? 12 : 20,
      fontSize:11, color:S.gold }}>
      ✦ วิเคราะห์ vibe...
    </div>
  )
  if (recs.length === 0) return null

  const needBuyNow = recs.filter(r => !r.alreadyOwned && !r.substituteOwned && r.priority === 'must')
  const hasSub     = recs.filter(r => !r.alreadyOwned && r.substituteOwned)
  const buyLater   = recs.filter(r => !r.alreadyOwned && !r.substituteOwned && r.priority === 'nice')
  const owned      = recs.filter(r => r.alreadyOwned)

  const headerColor  = needBuyNow.length > 0 ? S.red  : hasSub.length > 0 ? S.amber : S.green
  const headerBg     = needBuyNow.length > 0 ? '#fdf0ee' : hasSub.length > 0 ? S.amberBg : S.greenBg
  const headerBorder = needBuyNow.length > 0 ? S.red+'33' : hasSub.length > 0 ? S.goldBd : '#c5dfc8'
  const headerIcon   = needBuyNow.length > 0 ? '🛒' : hasSub.length > 0 ? '🔄' : '✅'
  const headerMsg    = needBuyNow.length > 0
    ? `ต้องซื้อก่อน blend ${needBuyNow.length} ตัว`
    : hasSub.length > 0
      ? `ใช้ตัวแทนได้ก่อน ${hasSub.length} ตัว — ซื้อเพิ่มในอนาคต`
      : 'มีวัตถุดิบพร้อม blend แล้ว 🎉'

  return (
    <div style={{ marginBottom: compact ? 12 : 20 }}>
      <div onClick={() => setExpanded(p => !p)}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          cursor:'pointer', padding:'10px 14px',
          background: headerBg,
          borderRadius: expanded ? '12px 12px 0 0' : 12,
          border: `1px solid ${headerBorder}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:14 }}>{headerIcon}</span>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color: headerColor, fontFamily:'Inter,sans-serif' }}>
              วัตถุดิบแนะนำ
              {families.length > 0 && (
                <span style={{ fontWeight:400, color:S.textMid, marginLeft:6 }}>
                  ({families.slice(0,3).join(', ')})
                </span>
              )}
            </div>
            <div style={{ fontSize:11, color:S.textMid, marginTop:1 }}>{headerMsg}</div>
          </div>
        </div>
        <span style={{ color:S.textLt, fontSize:14 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ border:`1px solid ${S.border}`, borderTop:'none',
          borderRadius:'0 0 12px 12px', background:S.white, padding:'14px 14px 10px' }}>

          {/* Family weight bar */}
          {weights && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, color:S.textLt, letterSpacing:.8,
                textTransform:'uppercase', marginBottom:6 }}>Vibe Match</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {Object.entries(weights)
                  .filter(([,s]) => s >= 2)
                  .sort((a,b) => b[1]-a[1])
                  .map(([fam, score]) => {
                    const fc      = FC[fam] || { c:S.textMid, bg:S.border }
                    const opacity = Math.max(0.3, score / 10)
                    return (
                      <div key={fam} style={{ display:'flex', alignItems:'center', gap:4,
                        padding:'2px 8px', borderRadius:20,
                        background: fc.bg, opacity }}>
                        <span style={{ fontSize:9, fontWeight:600, color:fc.c }}>{fam}</span>
                        <span style={{ fontSize:9, color:fc.c, fontWeight:700 }}>{score}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {needBuyNow.length > 0 && (
            <Section label="🛒 ต้องซื้อก่อน blend" labelColor={S.red}>
              {needBuyNow.map((rec, i) => <RecItem key={i} rec={rec} state="buy-now"/>)}
            </Section>
          )}

          {hasSub.length > 0 && (
            <Section label="🔄 ใช้ตัวแทนได้ก่อน — ซื้อในอนาคต" labelColor={S.amber}>
              {hasSub.map((rec, i) => <RecItem key={i} rec={rec} state="has-sub"/>)}
            </Section>
          )}

          {!compact && buyLater.length > 0 && (
            <Section label="⭐ Future Buy — elevate สูตร" labelColor={S.textMid}>
              {(showAll ? buyLater : buyLater.slice(0, 2)).map((rec, i) => (
                <RecItem key={i} rec={rec} state="buy-later"/>
              ))}
              {buyLater.length > 2 && !showAll && (
                <button onClick={() => setShowAll(true)}
                  style={{ fontSize:12, color:S.gold, background:'none', border:'none',
                    cursor:'pointer', fontFamily:'Inter,sans-serif', fontWeight:500, padding:'4px 0' }}>
                  + ดูอีก {buyLater.length - 2} ตัว
                </button>
              )}
            </Section>
          )}

          {owned.length > 0 && (
            <Section label="✓ มีใน stock แล้ว" labelColor={S.green}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {owned.map((rec, i) => (
                  <span key={i} style={{ fontSize:11, color:S.green, fontWeight:500,
                    background:S.greenBg, padding:'3px 10px', borderRadius:20,
                    fontFamily:'Cormorant Garamond,serif', fontStyle:'italic' }}>
                    ✓ {rec.name}
                  </span>
                ))}
              </div>
            </Section>
          )}

          <div style={{ marginTop:10, padding:'8px 12px', background:S.goldLt,
            borderRadius:8, fontSize:11, color:S.textMid, lineHeight:1.6 }}>
            💡 เริ่มจากตัวที่ "ต้องซื้อ" ก่อน ซื้อขนาดเล็ก 10–30g เพื่อทดสอบก่อนค่ะ
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ label, labelColor, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10, fontWeight:700, color: labelColor, letterSpacing:.8,
        textTransform:'uppercase', marginBottom:8, fontFamily:'Inter,sans-serif' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function RecItem({ rec, state }) {
  const [showDetail, setShowDetail] = useState(false)
  const fc        = FC[rec.family] || { c: S.textMid, bg: S.border }
  const roleColor = { top:'#3d6b4a', heart:'#8a3a68', base:'#7a5c2e' }[rec.role] || S.textMid
  const roleBg    = { top:'#eef5f0', heart:'#fceef7', base:'#f5ede0' }[rec.role]  || S.bg
  const bgColor   = state === 'buy-now' ? '#fffbf8' : state === 'has-sub' ? '#fffdf5' : S.bg
  const borderCol = state === 'buy-now' ? S.red+'44' : state === 'has-sub' ? S.goldBd : S.border
  const hasDetail = rec.future_value || rec.unlocks?.length > 0

  return (
    <div style={{ marginBottom:8, borderRadius:10, border:`1px solid ${borderCol}`,
      background: bgColor, overflow:'hidden' }}>
      <div style={{ padding:'9px 12px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
          <span style={{ fontSize:9, fontWeight:600, padding:'2px 7px', borderRadius:20,
            color: roleColor, background: roleBg, flexShrink:0, marginTop:3,
            letterSpacing:.5, textTransform:'uppercase' }}>
            {rec.role}
          </span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:15,
                fontStyle:'italic', color:S.ink }}>{rec.name}</span>
              <span style={{ fontSize:9, fontWeight:500, padding:'1px 7px', borderRadius:20,
                color: fc.c, background: fc.bg }}>{rec.family}</span>
              {state === 'buy-now' && (
                <span style={{ fontSize:9, fontWeight:700, color:S.red,
                  background:'#fdf0ee', padding:'1px 7px', borderRadius:20 }}>ต้องซื้อ</span>
              )}
            </div>
            <div style={{ fontSize:11, color:S.textMid, marginTop:2, lineHeight:1.5 }}>
              {rec.reason}
            </div>
            {state === 'has-sub' && rec.substituteOwned && (
              <div style={{ marginTop:5, padding:'4px 9px', background:S.amberBg,
                borderRadius:7, fontSize:11, color:S.amber, fontWeight:500 }}>
                🔄 ใช้ <strong>{rec.substituteOwned}</strong> แทนได้ก่อน
              </div>
            )}
          </div>
          {hasDetail && (
            <button onClick={() => setShowDetail(p => !p)}
              style={{ fontSize:10, color: showDetail ? S.gold : S.textLt,
                background:'none', border:`1px solid ${showDetail ? S.goldBd : S.border}`,
                borderRadius:20, padding:'2px 8px', cursor:'pointer',
                fontFamily:'Inter,sans-serif', fontWeight:500, flexShrink:0, marginTop:2,
                whiteSpace:'nowrap' }}>
              {showDetail ? '▲' : 'มีแล้วดียังไง?'}
            </button>
          )}
        </div>
      </div>
      {showDetail && (
        <div style={{ borderTop:`1px solid ${S.border}`, padding:'10px 12px', background:'#fdfcfa' }}>
          {rec.future_value && (
            <div style={{ fontSize:12, color:S.ink, lineHeight:1.7, marginBottom:10,
              paddingLeft:10, borderLeft:`3px solid ${S.gold}` }}>
              {rec.future_value}
            </div>
          )}
          {rec.unlocks?.length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:S.gold, letterSpacing:.8,
                textTransform:'uppercase', marginBottom:8 }}>✦ ทำอะไรได้บ้าง</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {rec.unlocks.map((u, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8,
                    padding:'7px 10px', borderRadius:8,
                    background: u.type === 'accord' ? '#f0eef8' : S.goldLt,
                    border: `1px solid ${u.type === 'accord' ? '#d0cce8' : S.goldBd}` }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20,
                      flexShrink:0, marginTop:1,
                      color:   u.type === 'accord' ? '#5a4a8a' : S.gold,
                      background: u.type === 'accord' ? '#e0ddf5' : '#fff' }}>
                      {u.type === 'accord' ? '◎ Accord' : '◈ Formula'}
                    </span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:S.ink,
                        fontFamily:'Cormorant Garamond,serif', fontStyle:'italic' }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize:11, color:S.textMid, marginTop:1 }}>{u.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {rec.substitutes?.length > 0 && (
            <div style={{ marginTop:10, fontSize:11, color:S.textLt }}>
              ตัวแทน: {rec.substitutes.join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
