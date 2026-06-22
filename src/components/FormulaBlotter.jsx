import { useState, useRef, useEffect } from 'react'

// ── Physical size @ 300dpi — blotter strip มาตรฐาน ~1.5×12cm ───────────────────
const DPI       = 300
const PX_PER_CM = DPI / 2.54
const STRIP_W_CM = 2.5
const STRIP_H_CM = 12

const STRIP_W = Math.round(STRIP_W_CM * PX_PER_CM)
const STRIP_H = Math.round(STRIP_H_CM * PX_PER_CM)

const BG   = '#fdfbf7'
const INK  = '#2a1f14'
const GOLD = '#8a6f4e'

// ── หา URL หน้า public ของแอปนี้ ─────────────────────────────────────────────────
function getPublicUrl(formulaId) {
  return `${window.location.origin}/scent/${formulaId}`
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

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

export default function FormulaBlotter({ formula, onClose }) {
  const canvasRef = useRef()
  const [saving, setSaving] = useState(false)
  const [ready,  setReady]  = useState(false)
  const [error,  setError]  = useState('')

  const publicUrl = getPublicUrl(formula.id)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(publicUrl)}`

  useEffect(() => {
    let cancelled = false
    async function render() {
      try {
        await Promise.all([
          document.fonts.load(`italic 400 40px "Cormorant Garamond"`),
          document.fonts.load(`500 20px "Inter"`),
        ])
        await document.fonts.ready
      } catch {}

      let qrImg = null
      try {
        qrImg = await loadImage(qrSrc)
      } catch {
        setError('โหลด QR ไม่ได้ — เช็คอินเทอร์เน็ต แล้วลองใหม่')
      }
      if (cancelled) return

      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width  = STRIP_W
      canvas.height = STRIP_H
      canvas.style.width  = `${STRIP_W_CM}cm`
      canvas.style.height = `${STRIP_H_CM}cm`

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = BG
      ctx.fillRect(0, 0, STRIP_W, STRIP_H)

      const cx = STRIP_W / 2

      // ── โลโก้ร้าน — เด่น ใหญ่ อยู่บนสุด ──────────────────────────────────────
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `700 ${STRIP_W*0.105}px "Inter", sans-serif`
      ctx.fillStyle = INK
      drawTracked(ctx, 'LINEN THEORY', cx, STRIP_H*0.085, STRIP_W*0.012)

      ctx.font = `500 ${STRIP_W*0.04}px "Inter", sans-serif`
      ctx.fillStyle = GOLD
      drawTracked(ctx, 'EAU DE PARFUM', cx, STRIP_H*0.115, STRIP_W*0.018)

      // เส้นแบ่ง
      ctx.beginPath()
      ctx.moveTo(cx - STRIP_W*0.12, STRIP_H*0.15)
      ctx.lineTo(cx + STRIP_W*0.12, STRIP_H*0.15)
      ctx.strokeStyle = GOLD
      ctx.lineWidth = Math.max(1, STRIP_W*0.006)
      ctx.stroke()

      // ── ชื่อสูตร ──────────────────────────────────────────────────────────
      const fontSize = formula.name.length > 12 ? STRIP_W*0.13 : STRIP_W*0.155
      ctx.font = `italic 400 ${fontSize}px "Cormorant Garamond", serif`
      ctx.fillStyle = INK
      ctx.fillText(formula.name, cx, STRIP_H*0.24)

      // ── QR code กลางแท่ง ─────────────────────────────────────────────────
      if (qrImg) {
        const qrSize = STRIP_W * 0.62
        ctx.drawImage(qrImg, cx - qrSize/2, STRIP_H*0.34, qrSize, qrSize)
      }

      // ── คำโปรย ───────────────────────────────────────────────────────────
      ctx.font = `italic 400 ${STRIP_W*0.058}px "Cormorant Garamond", serif`
      ctx.fillStyle = '#7a6f60'
      ctx.fillText('Discover the scent', cx, STRIP_H*0.34 + STRIP_W*0.62 + STRIP_W*0.07)

      setReady(true)
    }
    render()
    return () => { cancelled = true }
  }, [formula.id, formula.name])

  function savePNG() {
    setSaving(true)
    try {
      const a = document.createElement('a')
      a.download = `${formula.name.replace(/\s+/g,'-')}-blotter.png`
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
      const cols = 6, rows = 2
      const gapCm = 0.4, marginCm = 1
      for (let col=0; col<cols; col++) {
        for (let row=0; row<rows; row++) {
          pdf.addImage(dataUrl, 'PNG',
            marginCm + col*(STRIP_W_CM+gapCm),
            marginCm + row*(STRIP_H_CM+gapCm),
            STRIP_W_CM, STRIP_H_CM)
        }
      }
      pdf.save(`${formula.name.replace(/\s+/g,'-')}-blotters.pdf`)
    } catch(e) { alert('PDF failed: '+e.message) }
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', zIndex:100, gap:18 }}>

      <div style={{ filter: ready ? 'none' : 'opacity(0)', transition:'filter .15s',
        background:'#fff', padding:8, borderRadius:4 }}>
        <canvas ref={canvasRef}/>
      </div>
      {!ready && !error && (
        <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12 }}>⏳ กำลังสร้าง QR + วาด blotter...</div>
      )}
      {error && (
        <div style={{ color:'#f5a3a3', fontSize:12 }}>{error}</div>
      )}

      <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.5)', fontFamily:'Inter,sans-serif',
        textAlign:'center', maxWidth:280 }}>
        {STRIP_W_CM}×{STRIP_H_CM} cm · QR ลิงก์ไปหน้า public ของกลิ่นนี้ · PDF ใส่ได้ 12 แท่ง/แผ่น A4
        <div style={{ marginTop:4, wordBreak:'break-all' }}>{publicUrl}</div>
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
          {saving?'⏳...':'📄 PDF (12 แท่ง/A4)'}
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
