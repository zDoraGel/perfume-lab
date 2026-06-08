import { useState, useEffect } from 'react'
import { S } from '../constants/theme'
import { CONCENTRATIONS, PACKAGE_SIZES, buildBottleFills } from '../constants/packageSystem'

/**
 * PackageSelector — คู่มือเติมขวด
 * Props:
 *   items        {Object[]} - formula_items with grams
 *   batchBaseMl  {number}   - batch size ที่ blend มา
 *   materials    {Object[]} - for cost calculation
 *   formulaName  {string}
 */
export default function PackageSelector({ items = [], batchBaseMl = 15, materials = [], formulaName = '' }) {
  const [selectedVariant, setSelectedVariant] = useState('EdP_Signature')
  const [selectedMl,      setSelectedMl]      = useState(15)
  const [fills,           setFills]           = useState(null)

  // คำนวณ concentrate total และ cost
  const concentrateGrams = items.reduce((s, i) => s + parseFloat(i.grams || 0), 0)
  const concentrateCost  = items.reduce((s, i) => {
    const mat = materials.find(m =>
      m.id === i.material_id || m.id === i.material?.id
    )
    return s + (parseFloat(i.grams || 0) * (mat?.cost || 0))
  }, 0)

  useEffect(() => {
    if (items.length === 0) return
    setFills(buildBottleFills(concentrateGrams, selectedMl, concentrateCost))
  }, [items, selectedMl, concentrateGrams, concentrateCost])

  if (items.length === 0) return null

  const variantKeys   = ['soft', 'signature', 'deep']
  const variantIcons  = { soft:'○', signature:'◎', deep:'◈' }
  const variantLabels = { soft:'Soft', signature:'Signature', deep:'Deep' }
  const selectedKey   = selectedVariant === 'EdP_Soft' ? 'soft'
    : selectedVariant === 'EdP_Deep' ? 'deep' : 'signature'
  const current = fills?.[selectedKey]

  // จาก concentrate batch นี้ทำขวดได้กี่ขวด
  const bottlesFromBatch = current
    ? Math.floor(concentrateGrams / current.concInBottle)
    : 0

  return (
    <div style={{ marginBottom:20 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ height:1, flex:1, background:S.goldBd+'55' }}/>
        <span style={{ fontSize:11, fontWeight:600, color:S.gold, letterSpacing:1.5,
          textTransform:'uppercase', fontFamily:'Inter,sans-serif' }}>คู่มือเติมขวด</span>
        <div style={{ height:1, flex:1, background:S.goldBd+'55' }}/>
      </div>

      {/* Concentrate info */}
      <div style={{ background:S.goldLt, borderRadius:10, padding:'10px 14px',
        marginBottom:12, border:`1px solid ${S.goldBd}` }}>
        <div style={{ fontSize:11, color:S.textMid, marginBottom:2 }}>
          Concentrate batch นี้
        </div>
        <div style={{ fontSize:14, fontWeight:600, color:S.ink, fontFamily:'Inter,sans-serif' }}>
          {concentrateGrams.toFixed(3)}g
          {concentrateCost > 0 && (
            <span style={{ fontSize:12, color:S.textMid, fontWeight:400, marginLeft:8 }}>
              ต้นทุน ฿{concentrateCost.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Bottle size */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, color:S.textMid, fontWeight:500, letterSpacing:.5,
          textTransform:'uppercase', marginBottom:8 }}>ขนาดขวด</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {PACKAGE_SIZES.map(ml => (
            <button key={ml} onClick={() => setSelectedMl(ml)}
              style={{ padding:'6px 14px', borderRadius:20, cursor:'pointer',
                fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:500,
                border:`1.5px solid ${selectedMl === ml ? S.gold : S.goldBd}`,
                background: selectedMl === ml ? S.gold : 'transparent',
                color: selectedMl === ml ? '#fff' : S.gold }}>
              {ml}ml
            </button>
          ))}
        </div>
      </div>

      {/* Variant picker */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
        {variantKeys.map(key => {
          const vKey    = key === 'soft' ? 'EdP_Soft' : key === 'deep' ? 'EdP_Deep' : 'EdP_Signature'
          const conc    = CONCENTRATIONS[vKey]
          const isActive = selectedVariant === vKey
          return (
            <button key={key} onClick={() => setSelectedVariant(vKey)}
              style={{ padding:'12px 8px', borderRadius:12, cursor:'pointer', textAlign:'center',
                border:`2px solid ${isActive ? S.gold : S.border}`,
                background: isActive ? S.goldLt : S.white }}>
              <div style={{ fontSize:16, color: isActive ? S.gold : S.textLt, marginBottom:3 }}>
                {variantIcons[key]}
              </div>
              <div style={{ fontSize:12, fontWeight:600, color: isActive ? S.gold : S.ink,
                fontFamily:'Inter,sans-serif', marginBottom:2 }}>
                {variantLabels[key]}
              </div>
              <div style={{ fontSize:10, color:S.textMid }}>
                {Math.round(conc.concentration * 100)}%
              </div>
              <div style={{ fontSize:10, color:S.textLt, marginTop:1 }}>{conc.longevity}</div>
            </button>
          )
        })}
      </div>

      {/* Fill guide card */}
      {current && (
        <div style={{ background:S.goldLt, borderRadius:14, border:`1px solid ${S.goldBd}`,
          padding:'16px 18px' }}>

          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18,
                fontStyle:'italic', color:S.ink }}>{formulaName}</div>
              <div style={{ fontSize:11, color:S.textMid, marginTop:2 }}>
                {variantLabels[selectedKey]} · {selectedMl}ml · {current.concentrationPct}%
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:16, fontWeight:600, color:S.gold }}>
                ฿{current.costs.total.toFixed(0)}
              </div>
              <div style={{ fontSize:10, color:S.textMid }}>ต้นทุน/ขวด</div>
            </div>
          </div>

          {/* เติมขวดนี้ */}
          <div style={{ background:S.white, borderRadius:10, padding:'12px 14px',
            marginBottom:12, border:`1px solid ${S.border}` }}>
            <div style={{ fontSize:10, fontWeight:700, color:S.gold, letterSpacing:1,
              textTransform:'uppercase', marginBottom:10 }}>สิ่งที่ต้องเตรียมต่อขวด</div>

            {[
              { label:'Concentrate', val:`${current.concInBottle}g`, color:S.gold,
                sub:`จาก batch ${concentrateGrams.toFixed(2)}g` },
              { label:'Alcohol (Ethanol)', val:`${current.alcoholInBottle}ml`, color:S.green,
                sub:`${(current.alcoholInBottle / selectedMl * 100).toFixed(0)}% ของขวด` },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between',
                alignItems:'center', marginBottom:10,
                paddingBottom:10, borderBottom:`1px solid ${S.border}` }}>
                <div>
                  <div style={{ fontSize:13, color:S.ink, fontWeight:500 }}>{r.label}</div>
                  <div style={{ fontSize:11, color:S.textLt }}>{r.sub}</div>
                </div>
                <div style={{ fontSize:16, fontWeight:600, color:r.color,
                  fontFamily:'Inter,sans-serif' }}>{r.val}</div>
              </div>
            ))}

            {/* จาก batch นี้ทำได้กี่ขวด */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:12, color:S.textMid }}>
                จาก batch นี้ทำได้
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:S.ink }}>
                ~{bottlesFromBatch} ขวด
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div style={{ background:S.white, borderRadius:10, padding:'10px 14px',
            border:`1px solid ${S.border}` }}>
            <div style={{ fontSize:10, fontWeight:600, color:S.textMid, letterSpacing:.5,
              textTransform:'uppercase', marginBottom:8 }}>ต้นทุนต่อขวด</div>
            {[
              { label:'Concentrate',   val:`฿${current.costs.concentrate.toFixed(2)}` },
              { label:'Alcohol',       val:`฿${current.costs.alcohol.toFixed(2)}` },
              { label:'ขวด+บรรจุภัณฑ์', val:`฿${current.costs.bottle}` },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between',
                fontSize:12, marginBottom:4 }}>
                <span style={{ color:S.textMid }}>{r.label}</span>
                <span style={{ color:S.text }}>{r.val}</span>
              </div>
            ))}
            <div style={{ borderTop:`1px solid ${S.border}`, marginTop:8, paddingTop:8,
              display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, fontWeight:600, color:S.ink }}>รวม</span>
              <span style={{ fontSize:13, fontWeight:600, color:S.gold }}>
                ฿{current.costs.total.toFixed(2)}
              </span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
              <span style={{ fontSize:12, color:S.textMid }}>ราคาขายแนะนำ (3.5×)</span>
              <span style={{ fontSize:12, color:S.green, fontWeight:600 }}>
                ฿{current.costs.suggested}
              </span>
            </div>
          </div>

          <div style={{ marginTop:10, fontSize:11, color:S.textMid, textAlign:'center' }}>
            ⏱ ติดทน {current.longevity} · {current.description}
          </div>
        </div>
      )}
    </div>
  )
}
