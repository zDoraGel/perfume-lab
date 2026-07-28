import { useState, useRef, Fragment } from 'react'

const CARD_W = 400
const CARD_H = 560
const BG   = '#f8f5f0'
const INK  = '#2a1f14'
const GOLD = '#8a6f4e'
const MID  = '#b0a090'
const LIGHT= '#d4c4b0'

// ── ไอคอนเรียบๆ (สไตล์เดียวกับ FormulaCard.jsx) ──────────────────────────────
const IconLeaf = ({ size=18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 21C12 21 5 15 5 9C5 5.7 8.1 3 12 3C15.9 3 19 5.7 19 9C19 15 12 21 12 21Z"
      stroke={GOLD} strokeWidth="1.2" fill="none"/>
    <line x1="12" y1="21" x2="12" y2="9" stroke={GOLD} strokeWidth=".8" strokeDasharray="2 2"/>
  </svg>
)
const IconFlower = ({ size=18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {[0,72,144,216,288].map(a => (
      <circle key={a} cx={12 + 5*Math.cos(a*Math.PI/180)} cy={12 + 5*Math.sin(a*Math.PI/180)}
        r="3.4" stroke={GOLD} strokeWidth="1" fill="none"/>
    ))}
    <circle cx="12" cy="12" r="1.6" stroke={GOLD} strokeWidth="1" fill="none"/>
  </svg>
)
const IconWave = ({ size=18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 12 Q6 8 9 12 Q12 16 15 12 Q18 8 21 12" stroke={GOLD} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    <path d="M3 16 Q6 12 9 16 Q12 20 15 16 Q18 12 21 16" stroke={GOLD} strokeWidth=".8" strokeLinecap="round" fill="none" opacity=".5"/>
  </svg>
)
const IconDrop = ({ size=18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3C12 3 6 9.5 6 14a6 6 0 0012 0C18 9.5 12 3 12 3Z" stroke={GOLD} strokeWidth="1.2" fill="none"/>
  </svg>
)
const IconCircles = ({ size=18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={GOLD} strokeWidth="1.2" fill="none"/>
    <circle cx="12" cy="12" r="5.5" stroke={GOLD} strokeWidth=".9" fill="none"/>
    <circle cx="12" cy="12" r="2" stroke={GOLD} strokeWidth=".8" fill="none"/>
  </svg>
)
const IconHeart = ({ size=22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 20s-7-4.5-9.3-9C1.2 7.8 3 4.5 6.4 4.5c2 0 3.6 1.2 4.6 2.7 1-1.5 2.6-2.7 4.6-2.7C19 4.5 20.8 7.8 21.3 11 19 15.5 12 20 12 20Z"
      stroke={GOLD} strokeWidth="1.2" fill="none"/>
  </svg>
)
const IconLeafSprig = ({ size=40 }) => (
  <svg width={size} height={size*0.6} viewBox="0 0 60 36" fill="none">
    <path d="M2 30 Q30 10 58 6" stroke={GOLD} strokeWidth="1" fill="none"/>
    {[10,20,30,40,50].map(x => (
      <ellipse key={x} cx={x} cy={30 - x*0.42} rx="4" ry="2"
        transform={`rotate(-30 ${x} ${30 - x*0.42})`} stroke={GOLD} strokeWidth=".8" fill="none"/>
    ))}
  </svg>
)

const ICON_CYCLE = [IconLeaf, IconFlower, IconWave, IconDrop, IconCircles]

// ── ดึงคำอธิบายสั้นๆ (Tea · Clean · Soft) จาก vibe/name_meaning ─────────────────
function deriveTags(formula) {
  const src = (formula?.vibe || formula?.name_meaning || '').trim()
  if (!src) return ['Clean', 'Soft', 'Quiet']
  const words = src
    .replace(/[.,;:!?"']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && /^[A-Za-zก-๙]+$/.test(w))
  const picked = words.slice(0, 3).map(w => w[0].toUpperCase() + w.slice(1))
  return picked.length ? picked : ['Clean', 'Soft', 'Quiet']
}

// ── ดึงคำอธิบายไทยสั้นๆ สำหรับหน้าหลัง ───────────────────────────────────────
function deriveThaiDesc(formula) {
  const src = (formula?.name_meaning || formula?.vibe || '').trim()
  if (!src) return 'กลิ่นเฉพาะตัว สะอาด อบอุ่น'
  if (src.length <= 42) return src
  const cut = src.slice(0, 42)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 15 ? cut.slice(0, lastSpace) : cut) + '…'
}

// ── Front Card ───────────────────────────────────────────────────────────────
function FrontCard({ discoverySet, cardRef }) {
  const items = discoverySet.items || []
  return (
    <div ref={cardRef} style={{
      width: CARD_W, height: CARD_H, background: BG, position: 'relative',
      border: `1px solid ${LIGHT}`, boxSizing: 'border-box',
      padding: '36px 32px', fontFamily: 'Inter,sans-serif', color: INK,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ textAlign:'center', fontSize:11, letterSpacing:4, color:GOLD, fontWeight:600 }}>
        LINEN THEORY
      </div>
      <div style={{ textAlign:'center', fontFamily:'"Cormorant Garamond",serif', fontStyle:'italic',
        fontSize:34, fontWeight:600, color:INK, marginTop:10 }}>
        Discovery Set
      </div>
      <div style={{ textAlign:'center', fontSize:11, letterSpacing:2, color:MID, marginTop:4,
        fontStyle:'italic' }}>
        {discoverySet.description || 'the art of scent'}
      </div>
      <div style={{ textAlign:'center', marginTop:14 }}><IconHeart/></div>

      <div style={{ marginTop:22, flex:1 }}>
        {items.map((it, i) => {
          const tags = deriveTags(it.formula)
          return (
            <div key={it.id} style={{ display:'flex', gap:14, alignItems:'baseline',
              paddingBottom:12, marginBottom:12,
              borderBottom: i < items.length-1 ? `1px solid ${LIGHT}` : 'none' }}>
              <div style={{ fontSize:12, color:MID, fontWeight:600, width:20 }}>
                {String(i+1).padStart(2,'0')}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, letterSpacing:.5 }}>
                  {(it.formula?.name || '').toUpperCase()}
                </div>
                <div style={{ fontSize:11, color:MID, marginTop:2 }}>
                  {tags.join(' · ')}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ textAlign:'center', marginTop:'auto', paddingTop:14 }}>
        <div style={{ fontFamily:'"Cormorant Garamond",serif', fontStyle:'italic',
          fontSize:15, color:GOLD, lineHeight:1.5 }}>
          Thank you for discovering<br/>Linen Theory
        </div>
      </div>
    </div>
  )
}

// ── Back Card ────────────────────────────────────────────────────────────────
function BackCard({ discoverySet, shopUrl, handle, cardRef }) {
  const items = discoverySet.items || []
  const qrSrc = shopUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(shopUrl)}`
    : null

  return (
    <div ref={cardRef} style={{
      width: CARD_W, height: CARD_H, background: BG, position: 'relative',
      border: `1px solid ${LIGHT}`, boxSizing: 'border-box',
      padding: '30px 28px', fontFamily: 'Inter,sans-serif', color: INK,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ textAlign:'center', fontSize:12, letterSpacing:3, color:GOLD, fontWeight:700 }}>
        ABOUT OUR SCENTS
      </div>
      <div style={{ height:1, background:LIGHT, margin:'10px 0 14px' }}/>

      {items.map((it, i) => {
        const Icon = ICON_CYCLE[i % ICON_CYCLE.length]
        return (
          <div key={it.id} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:9 }}>
            <div style={{ width:26, height:26, borderRadius:'50%', border:`1px solid ${LIGHT}`,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={14}/>
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:11.5, fontWeight:700, letterSpacing:.4 }}>
                {(it.formula?.name || '').toUpperCase()}
              </div>
              <div style={{ fontSize:10.5, color:MID, marginTop:1 }}>
                {deriveThaiDesc(it.formula)}
              </div>
            </div>
          </div>
        )
      })}

      <div style={{ height:1, background:LIGHT, margin:'8px 0 10px' }}/>
      <div style={{ textAlign:'center', fontSize:11, letterSpacing:2, color:GOLD, fontWeight:700, marginBottom:8 }}>
        SCENT PASSPORT
      </div>
      <div style={{ fontSize:8.5, display:'grid',
        gridTemplateColumns: '1.5fr .6fr .6fr .6fr .6fr', rowGap:5, color:MID }}>
        <div></div>
        <div style={{ textAlign:'center' }}>LOVE</div>
        <div style={{ textAlign:'center' }}>LIKE</div>
        <div style={{ textAlign:'center' }}>MAYBE</div>
        <div style={{ textAlign:'center' }}>NOT ME</div>
        {items.map(it => (
          <Fragment key={it.id}>
            <div style={{ fontSize:9, color:INK, alignSelf:'center' }}>
              {(it.formula?.name || '').toUpperCase()}
            </div>
            {[0,1,2,3].map(c => (
              <div key={it.id+'c'+c} style={{ textAlign:'center' }}>
                <span style={{ display:'inline-block', width:9, height:9, borderRadius:'50%',
                  border:`1px solid ${MID}` }}/>
              </div>
            ))}
          </Fragment>
        ))}
      </div>

      <div style={{ marginTop:12, padding:'8px 10px', border:`1px solid ${LIGHT}`, borderRadius:6,
        fontSize:9.5, color:MID }}>
        MY FAVORITE
      </div>

      <div style={{ marginTop:'auto', paddingTop:14, display:'flex',
        justifyContent:'space-between', alignItems:'flex-end' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:8.5, letterSpacing:1.5, color:MID, marginBottom:4 }}>SCAN TO SHOP</div>
          {qrSrc
            ? <img src={qrSrc} alt="QR" width={64} height={64} crossOrigin="anonymous"/>
            : <div style={{ width:64, height:64, border:`1px dashed ${LIGHT}` }}/>
          }
          <div style={{ fontSize:8.5, color:MID, marginTop:4 }}>{handle}</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'"Cormorant Garamond",serif', fontStyle:'italic',
            fontSize:13, color:GOLD }}>Thank you</div>
          <div style={{ fontSize:8.5, color:MID, marginTop:2 }}>for being part of our story.</div>
          <div style={{ marginTop:6 }}><IconLeafSprig/></div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DiscoveryCard({ discoverySet, onClose }) {
  const [side,    setSide]    = useState('front')
  const [shopUrl, setShopUrl] = useState('')
  const [handle,  setHandle]  = useState('@linentheory.official')
  const [saving,  setSaving]  = useState(false)
  const frontRef = useRef()
  const backRef  = useRef()

  async function saveOne(ref, filename) {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(ref.current, { scale:3, useCORS:true, backgroundColor:BG })
    const link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function saveAll() {
    setSaving(true)
    try {
      const safe = discoverySet.name.replace(/\s+/g, '-')
      setSide('front'); await new Promise(r => setTimeout(r, 250))
      await saveOne(frontRef, `${safe}-card-front.png`)
      setSide('back'); await new Promise(r => setTimeout(r, 300))
      await saveOne(backRef, `${safe}-card-back.png`)
      setSide('front')
    } catch(e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:200,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:24,
        maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontFamily:'"Cormorant Garamond",serif', fontSize:22, fontStyle:'italic', color:INK }}>
            🎴 Discovery Set Card — {discoverySet.name}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:MID }}>✕</button>
        </div>

        {/* Side toggle */}
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          {['front','back'].map(s => (
            <button key={s} onClick={() => setSide(s)}
              style={{ flex:1, padding:'8px 0', borderRadius:10, cursor:'pointer', fontSize:12,
                border:`1.5px solid ${side===s ? GOLD : LIGHT}`,
                background: side===s ? GOLD : 'transparent',
                color: side===s ? '#fff' : MID, fontWeight:600 }}>
              {s === 'front' ? 'หน้า' : 'หลัง'}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div style={{ display:'flex', justifyContent:'center', marginBottom:16,
          border:`1px solid ${LIGHT}`, borderRadius:8, overflow:'hidden' }}>
          <div style={{ transform:'scale(0.82)', transformOrigin:'top center', margin:'-40px 0' }}>
            {side === 'front'
              ? <FrontCard discoverySet={discoverySet} cardRef={frontRef}/>
              : <BackCard discoverySet={discoverySet} shopUrl={shopUrl} handle={handle} cardRef={backRef}/>}
          </div>
        </div>

        {/* Hidden render of the other side, so html2canvas has something to grab even before toggling */}
        <div style={{ position:'absolute', left:-9999, top:0 }}>
          {side !== 'front' && <FrontCard discoverySet={discoverySet} cardRef={frontRef}/>}
          {side !== 'back'  && <BackCard discoverySet={discoverySet} shopUrl={shopUrl} handle={handle} cardRef={backRef}/>}
        </div>

        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:MID, letterSpacing:.6, textTransform:'uppercase', marginBottom:5 }}>
            ลิงก์ QR (Scan to Shop)
          </div>
          <input value={shopUrl} onChange={e => setShopUrl(e.target.value)}
            placeholder="https://... ลิงก์ร้าน/โปรไฟล์ที่อยากให้สแกนแล้วไป"
            style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:`1.5px solid ${LIGHT}`,
              fontSize:13, boxSizing:'border-box', outline:'none' }}/>
        </div>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:MID, letterSpacing:.6, textTransform:'uppercase', marginBottom:5 }}>
            Handle / ชื่อบัญชี
          </div>
          <input value={handle} onChange={e => setHandle(e.target.value)}
            style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:`1.5px solid ${LIGHT}`,
              fontSize:13, boxSizing:'border-box', outline:'none' }}/>
        </div>

        <button onClick={saveAll} disabled={saving}
          style={{ width:'100%', padding:'12px 0', borderRadius:12, cursor: saving?'not-allowed':'pointer',
            fontSize:13, fontWeight:600, background: saving ? LIGHT : INK, border:'none',
            color:'#fff', opacity: saving?0.7:1 }}>
          {saving ? '⏳ กำลัง export...' : '⬇ Download หน้า + หลัง (PNG)'}
        </button>
      </div>
    </div>
  )
}
