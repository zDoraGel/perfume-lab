import { useState, useRef, useEffect } from 'react'

// ── Physical size @ 300dpi ──────────────────────────────────────────────────────
const DPI       = 300
const PX_PER_CM = DPI / 2.54
const TAG_W_CM  = 3.5
const TAG_H_CM  = 7
const GAP_CM    = 0.4
const STRING_CM = 0.6   // พื้นที่ด้านบนสำหรับเชือก+ห่วง

const TAG_W   = Math.round(TAG_W_CM  * PX_PER_CM)
const TAG_H   = Math.round(TAG_H_CM  * PX_PER_CM)
const GAP     = Math.round(GAP_CM    * PX_PER_CM)
const STRINGH = Math.round(STRING_CM * PX_PER_CM)

const CANVAS_W = TAG_W * 2 + GAP
const CANVAS_H = STRINGH + TAG_H

const PAIR_W_CM = (CANVAS_W / PX_PER_CM)
const PAIR_H_CM = (CANVAS_H / PX_PER_CM)

const BG     = '#f5ede2'
const INK    = '#2a1f14'
const GOLD   = '#8a6f4e'
const STRING = '#c9a876'

// ── วาดป้าย 1 ใบที่ตำแหน่ง (x, y) ───────────────────────────────────────────────
function drawTagShape(ctx, x, y, w, h) {
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.15)'
  ctx.shadowBlur  = 12
  ctx.shadowOffsetY = 3
  ctx.beginPath()
  ctx.moveTo(x + w*0.28, y)
  ctx.lineTo(x + w*0.72, y)
  ctx.lineTo(x + w,      y + h*0.14)
  ctx.lineTo(x + w,      y + h)
  ctx.lineTo(x,          y + h)
  ctx.lineTo(x,          y + h*0.14)
  ctx.closePath()
  ctx.fillStyle = BG
  ctx.fill()
  ctx.restore()

  // hole
  const holeX = x + w/2, holeY = y + h*0.085, holeR = w*0.045
  ctx.beginPath()
  ctx.arc(holeX, holeY, holeR, 0, Math.PI*2)
  ctx.fillStyle = '#fffdfa'
  ctx.fill()
  ctx.lineWidth = w*0.012
  ctx.strokeStyle = 'rgba(138,111,78,0.5)'
  ctx.stroke()

  return { holeX, holeY, holeR }
}

function drawString(ctx, holeX, holeY, w) {
  const half = w * 0.16
  ctx.beginPath()
  ctx.moveTo(holeX - half, holeY)
  ctx.quadraticCurveTo(holeX, holeY - w*0.32, holeX + half, holeY)
  ctx.strokeStyle = STRING
  ctx.lineWidth = w * 0.018
  ctx.lineCap = 'round'
  ctx.stroke()
}

function drawFrontTag(ctx, x, y, w, h, name) {
  const { holeX, holeY } = drawTagShape(ctx, x, y, w, h)
  drawString(ctx, holeX, holeY, w)

  ctx.save()
  ctx.translate(x + w/2, y + h/2 + h*0.04)
  ctx.rotate(Math.PI/2) // หมุน 90° ให้อ่านจากบนลงล่าง
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const fontSize = name.length > 13 ? w*0.135 : w*0.16
  ctx.font = `italic 400 ${fontSize}px "Cormorant Garamond", serif`
  ctx.fillStyle = INK
  ctx.fillText(name, 0, 0)
  ctx.restore()
}

function drawBackTag(ctx, x, y, w, h) {
  const { holeX, holeY } = drawTagShape(ctx, x, y, w, h)
  drawString(ctx, holeX, holeY, w)

  const cx = x + w/2
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.font = `500 ${w*0.082}px "Inter", sans-serif`
  ctx.fillStyle = INK
  drawTracked(ctx, 'LINEN THEORY', cx, y + h*0.28, w*0.012)

  ctx.beginPath()
  ctx.moveTo(cx - w*0.09, y + h*0.345)
  ctx.lineTo(cx + w*0.09, y + h*0.345)
  ctx.strokeStyle = INK
  ctx.lineWidth = Math.max(1, w*0.008)
  ctx.stroke()

  ctx.font = `500 ${w*0.062}px "Inter", sans-serif`
  ctx.fillStyle = GOLD
  drawTracked(ctx, 'EAU DE PARFUM', cx, y + h*0.4, w*0.01)
}

// วาดข้อความแบบมี letter-spacing (ctx.fillText ปกติไม่รองรับ tracking)
function drawTracked(ctx, text, cx, cy, spacing) {
  const chars = text.split('')
  const widths = chars.map(c => ctx.measureText(c).width)
  const totalW = widths.reduce((a,b)=>a+b,0) + spacing*(chars.length-1)
  let curX = cx - totalW/2
  const prevAlign = ctx.textAlign
  ctx.textAlign = 'left'
  chars.forEach((c,i) => {
    ctx.fillText(c, curX, cy)
    curX += widths[i] + spacing
  })
  ctx.textAlign = prevAlign
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function FormulaSwingTag({ formula, onClose }) {
  const canvasRef = useRef()
  const [saving, setSaving] = useState(false)
  const [ready,  setReady]  = useState(false)

  useEffect(() => {
    let cancelled = false
    async function render() {
      try {
        await Promise.all([
          document.fonts.load(`italic 400 60px "Cormorant Garamond"`),
          document.fonts.load(`500 30px "Inter"`),
        ])
        await document.fonts.ready
      } catch {}
      if (cancelled) return

      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width  = CANVAS_W
      canvas.height = CANVAS_H
      canvas.style.width  = `${PAIR_W_CM}cm`
      canvas.style.height = `${PAIR_H_CM}cm`

      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
      drawFrontTag(ctx, 0,           STRINGH, TAG_W, TAG_H, formula.name)
      drawBackTag (ctx, TAG_W + GAP, STRINGH, TAG_W, TAG_H)
      setReady(true)
    }
    render()
    return () => { cancelled = true }
  }, [formula.name])

  function savePNG() {
    setSaving(true)
    try {
      const a = document.createElement('a')
      a.download = `${formula.name.replace(/\s+/g,'-')}-swing-tag.png`
      a.href = canvasRef.current.toDataURL('image/png')
      a.click()
    } catch(e) { alert('Save failed: '+e.message) }
    setSaving(false)
  }

  async function savePDF() {
    setSaving(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const dataUrl = canvasRef.current.toDataURL('image/png')
      const pdf = new jsPDF({ orientation:'portrait', unit:'cm', format:'a4' })
      const colGapCm = 0.6, rowGapCm = 0.6
      const marginCm = 1.2
      for (let col=0; col<2; col++) {
        for (let row=0; row<3; row++) {
          pdf.addImage(dataUrl, 'PNG',
            marginCm + col*(PAIR_W_CM+colGapCm),
            marginCm + row*(PAIR_H_CM+rowGapCm),
            PAIR_W_CM, PAIR_H_CM)
        }
      }
      pdf.save(`${formula.name.replace(/\s+/g,'-')}-swing-tags.pdf`)
    } catch(e) { alert('PDF failed: '+e.message) }
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', zIndex:100, gap:18 }}>

      <div style={{ filter: ready ? 'none' : 'opacity(0)', transition:'filter .15s' }}>
        <canvas ref={canvasRef}/>
      </div>
      {!ready && (
        <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12 }}>⏳ กำลังวาดป้าย...</div>
      )}

      <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.5)', fontFamily:'Inter,sans-serif' }}>
        คู่ละ {PAIR_W_CM.toFixed(1)}×{PAIR_H_CM.toFixed(1)} cm (ป้ายละ {TAG_W_CM}×{TAG_H_CM}cm) · PDF ใส่ได้ 6 คู่/แผ่น A4 · 300dpi
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
        <button onClick={savePNG} disabled={saving || !ready}
          style={{ padding:'9px 20px', borderRadius:20, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
            background:'#8a6f4e', border:'none', color:'#fff', opacity:(saving||!ready)?0.6:1 }}>
          {saving?'⏳...':'🖼 Save PNG'}
        </button>
        <button onClick={savePDF} disabled={saving || !ready}
          style={{ padding:'9px 20px', borderRadius:20, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
            background:'#5a4a3a', border:'none', color:'#fff', opacity:(saving||!ready)?0.6:1 }}>
          {saving?'⏳...':'📄 PDF (6 คู่/A4)'}
        </button>
        <button onClick={onClose}
          style={{ padding:'9px 14px', borderRadius:20, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12,
            background:'transparent', border:'1px solid rgba(255,255,255,0.25)',
            color:'rgba(255,255,255,0.6)' }}>✕</button>
      </div>
    </div>
  )
}
