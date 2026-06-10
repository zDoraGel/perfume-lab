import { useState } from 'react'
import { S } from '../constants/theme'

const DPI  = 300
const W_PX_15 = Math.round(50 / 25.4 * DPI)  // 591 — 50×80mm
const H_PX_15 = Math.round(80 / 25.4 * DPI)  // 945
const W_PX_30 = Math.round(55 / 25.4 * DPI)  // 650 — 55×80mm
const H_PX_30 = Math.round(80 / 25.4 * DPI)  // 945

const CONC_OPTIONS = ['EAU DE PARFUM','EAU DE TOILETTE','PARFUM','BODY MIST']
const ML_OPTIONS   = [5,10,15,20,30,50,100]
const TIER_OPTIONS = ['SIGNATURE','SOFT','DEEP','LIMITED','RESERVE']

function flOz(ml) { return (ml * 0.033814).toFixed(1) }

function wrapText(ctx, text, maxW) {
  const words = text.split(' ')
  let line = '', lines = []
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w }
    else line = test
  }
  lines.push(line)
  return lines
}

function baseSetup(canvas) {
  const ctx = canvas.getContext('2d')
  const w = canvas.width, h = canvas.height
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  const bw = Math.round(w * 0.009)
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = bw
  ctx.strokeRect(bw/2, bw/2, w-bw, h-bw)
  ctx.fillStyle = '#1a1a1a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  return { ctx, w, h }
}

// ── 15ml layout ───────────────────────────────────────────────────────────────
// LINEN THEORY · name · SIGNATURE · EAU DE PARFUM · volume · tagline
function draw15(canvas, { name, tier, concentration, bottleMl, tagline }) {
  const { ctx, w, h } = baseSetup(canvas)
  const pad = w * 0.1

  // LINEN THEORY
  ctx.font = `${Math.round(w*0.072)}px "Inter","Helvetica Neue",Arial,sans-serif`
  ctx.letterSpacing = `${Math.round(w*0.018)}px`
  ctx.fillText('LINEN THEORY', w/2, h*0.10)
  ctx.letterSpacing = '0px'

  // name — Courier bold largest
  const nameSize = Math.round(w * 0.100)
  ctx.font = `bold ${nameSize}px "Courier New",Courier,monospace`
  const nameLines = wrapText(ctx, name, w - pad*2)
  const lineH = nameSize * 1.28
  const nameCenterY = h * 0.43
  nameLines.forEach((l, i) => {
    ctx.fillText(l, w/2, nameCenterY + (i - (nameLines.length-1)/2) * lineH)
  })

  // SIGNATURE — small gap under name
  const nameBottomY = nameCenterY + (nameLines.length * lineH * 0.5)
  const tierSize = Math.round(w * 0.048)
  ctx.font = `${tierSize}px "Inter","Helvetica Neue",Arial,sans-serif`
  ctx.letterSpacing = `${Math.round(w*0.022)}px`
  ctx.fillText(tier, w/2, nameBottomY + tierSize * 1.8)
  ctx.letterSpacing = '0px'

  // EAU DE PARFUM
  ctx.font = `${Math.round(w*0.056)}px "Inter","Helvetica Neue",Arial,sans-serif`
  ctx.letterSpacing = `${Math.round(w*0.008)}px`
  ctx.fillText(concentration, w/2, h*0.68)
  ctx.letterSpacing = '0px'

  // volume
  ctx.font = `${Math.round(w*0.054)}px "Inter","Helvetica Neue",Arial,sans-serif`
  ctx.fillText(`${bottleMl} ml / ${flOz(bottleMl)} fl.oz`, w/2, h*0.68 + Math.round(w*0.054)*1.8)

  // tagline — Courier italic bottom
  if (tagline) {
    ctx.font = `italic ${Math.round(w*0.050)}px "Courier New",Courier,monospace`
    ctx.fillText(tagline, w/2, h*0.91)
  }
}

// ── 30ml layout ───────────────────────────────────────────────────────────────
// LINEN THEORY · name · tagline · EAU DE PARFUM · volume · SIGNATURE
function draw30(canvas, { name, tier, concentration, bottleMl, tagline }) {
  const { ctx, w, h } = baseSetup(canvas)
  const pad = w * 0.1

  // LINEN THEORY
  ctx.font = `${Math.round(w*0.072)}px "Inter","Helvetica Neue",Arial,sans-serif`
  ctx.letterSpacing = `${Math.round(w*0.018)}px`
  ctx.fillText('LINEN THEORY', w/2, h*0.10)
  ctx.letterSpacing = '0px'

  // name — Courier bold largest
  const nameSize = Math.round(w * 0.100)
  ctx.font = `bold ${nameSize}px "Courier New",Courier,monospace`
  const nameLines = wrapText(ctx, name, w - pad*2)
  const lineH = nameSize * 1.28
  const nameCenterY = h * 0.40
  nameLines.forEach((l, i) => {
    ctx.fillText(l, w/2, nameCenterY + (i - (nameLines.length-1)/2) * lineH)
  })

  // tagline — Courier italic, small gap under name
  if (tagline) {
    const tagSize = Math.round(w*0.052)
    ctx.font = `italic ${tagSize}px "Courier New",Courier,monospace`
    const nameBottomY = nameCenterY + (nameLines.length * lineH * 0.5)
    ctx.fillText(tagline, w/2, nameBottomY + tagSize * 1.8)
  }

  // EAU DE PARFUM
  ctx.font = `${Math.round(w*0.056)}px "Inter","Helvetica Neue",Arial,sans-serif`
  ctx.letterSpacing = `${Math.round(w*0.008)}px`
  ctx.fillText(concentration, w/2, h*0.68)
  ctx.letterSpacing = '0px'

  // volume
  ctx.font = `${Math.round(w*0.054)}px "Inter","Helvetica Neue",Arial,sans-serif`
  ctx.fillText(`${bottleMl} ml / ${flOz(bottleMl)} fl.oz`, w/2, h*0.68 + Math.round(w*0.054)*1.8)

  // SIGNATURE — Inter spaced bottom
  const tierSize = Math.round(w * 0.050)
  ctx.font = `${tierSize}px "Inter","Helvetica Neue",Arial,sans-serif`
  ctx.letterSpacing = `${Math.round(w*0.022)}px`
  ctx.fillText(tier, w/2, h*0.91)
  ctx.letterSpacing = '0px'
}

function drawLabel(canvas, params) {
  if (params.bottleMl <= 20) draw15(canvas, params)
  else draw30(canvas, params)
}

function getSize(bottleMl) {
  return bottleMl <= 20
    ? { w: W_PX_15, h: H_PX_15 }
    : { w: W_PX_30, h: H_PX_30 }
}

// ── Preview ───────────────────────────────────────────────────────────────────
function LabelPreview({ params }) {
  const { w, h } = getSize(params.bottleMl)
  const ref = (el) => {
    if (!el) return
    el.width  = w
    el.height = h
    drawLabel(el, params)
  }
  return <canvas ref={ref} style={{ width:'100%', height:'auto', display:'block' }}/>
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LabelGenerator({ formula, latestVersion, onClose }) {
  const [concentration, setConcentration] = useState('EAU DE PARFUM')
  const [bottleMl,      setBottleMl]      = useState(latestVersion?.bottle_ml || 15)
  const [tier,          setTier]          = useState('SIGNATURE')
  const [tagline,       setTagline]       = useState('the art of clean')
  const [exporting,     setExporting]     = useState(false)

  const params = {
    name: (formula?.name || 'UNTITLED').toUpperCase(),
    tier, concentration, bottleMl, tagline,
  }

  const layoutLabel = bottleMl <= 20 ? '15ml layout' : '30ml layout'

  function handleExport() {
    setExporting(true)
    try {
      const { w, h } = getSize(bottleMl)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      drawLabel(canvas, params)
      const link = document.createElement('a')
      link.download = `label_${(formula?.name||'label').replace(/\s+/g,'_')}_${bottleMl}ml.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch(e) { alert('Export ล้มเหลว') }
    finally { setExporting(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:S.white, borderRadius:20, padding:24,
        maxWidth:380, width:'100%', maxHeight:'90vh', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'center', marginBottom:16 }}>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:22,
            fontStyle:'italic', color:S.ink }}>🏷 Label Generator</div>
          <button onClick={onClose} style={{ background:'none', border:'none',
            fontSize:20, cursor:'pointer', color:S.textLt }}>✕</button>
        </div>

        {/* layout badge */}
        <div style={{ fontSize:11, color:S.textMid, textAlign:'center',
          marginBottom:10, letterSpacing:.4 }}>
          {bottleMl <= 20 ? '50×80mm' : '55×80mm'} · <strong>{layoutLabel}</strong>
        </div>

        {/* Preview */}
        <div style={{ border:`1px solid ${S.border}`, borderRadius:8,
          overflow:'hidden', marginBottom:16, background:'#fff' }}>
          <LabelPreview params={params}/>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          <div>
            <div style={{ fontSize:11, color:S.textMid, letterSpacing:.6,
              textTransform:'uppercase', marginBottom:5 }}>Collection / Tier</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {TIER_OPTIONS.map(t => (
                <button key={t} onClick={() => setTier(t)}
                  style={{ padding:'5px 11px', borderRadius:20, cursor:'pointer',
                    fontSize:11, fontFamily:'Inter,sans-serif',
                    border:`1.5px solid ${tier===t ? S.ink : S.border}`,
                    background: tier===t ? S.ink : 'transparent',
                    color: tier===t ? '#fff' : S.textMid }}>{t}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize:11, color:S.textMid, letterSpacing:.6,
              textTransform:'uppercase', marginBottom:5 }}>Concentration</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {CONC_OPTIONS.map(c => (
                <button key={c} onClick={() => setConcentration(c)}
                  style={{ padding:'5px 10px', borderRadius:20, cursor:'pointer',
                    fontSize:10, fontFamily:'Inter,sans-serif',
                    border:`1.5px solid ${concentration===c ? S.ink : S.border}`,
                    background: concentration===c ? S.ink : 'transparent',
                    color: concentration===c ? '#fff' : S.textMid }}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize:11, color:S.textMid, letterSpacing:.6,
              textTransform:'uppercase', marginBottom:5 }}>ขนาดขวด (ml)</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {ML_OPTIONS.map(ml => (
                <button key={ml} onClick={() => setBottleMl(ml)}
                  style={{ padding:'5px 11px', borderRadius:20, cursor:'pointer',
                    fontSize:11, fontFamily:'Inter,sans-serif',
                    border:`1.5px solid ${bottleMl===ml ? S.gold : S.border}`,
                    background: bottleMl===ml ? S.gold : 'transparent',
                    color: bottleMl===ml ? '#fff' : S.textMid }}>{ml}ml</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize:11, color:S.textMid, letterSpacing:.6,
              textTransform:'uppercase', marginBottom:5 }}>Tagline</div>
            <input value={tagline} onChange={e => setTagline(e.target.value)}
              placeholder="the art of clean"
              style={{ width:'100%', padding:'8px 12px', borderRadius:10,
                border:`1.5px solid ${S.border}`, fontSize:13,
                fontFamily:'"Courier New",monospace', color:S.ink,
                background:S.bg, outline:'none', boxSizing:'border-box' }}/>
          </div>

        </div>

        <button onClick={handleExport} disabled={exporting}
          style={{ width:'100%', marginTop:16, padding:'12px 0', borderRadius:12,
            cursor: exporting?'not-allowed':'pointer',
            fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:600,
            background: exporting?S.border:S.ink,
            border:'none', color:'#fff', opacity: exporting?0.6:1 }}>
          {exporting ? '⏳...' : '⬇ Download PNG'}
        </button>

        <div style={{ fontSize:11, color:S.textLt, textAlign:'center', marginTop:6 }}>
          {bottleMl <= 20 ? '50×80mm' : '55×80mm'} · 300dpi · Niimbot
        </div>
      </div>
    </div>
  )
}
