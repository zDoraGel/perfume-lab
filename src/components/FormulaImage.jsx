import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { S } from '../constants/theme'

// Generate prompt จาก vibe
function buildPrompt(name, vibe) {
  const keywords = vibe
    .replace(/[^\w\sก-๙]/g, ' ')
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 6)
    .join(', ')
  return `mood photography, ${keywords}, soft natural light, minimalist, no people, no text, perfume aesthetic, muted tones, editorial style`
}

export default function FormulaImage({ formula, onImageUpdated }) {
  const [uploading,    setUploading]    = useState(false)
  const [showPrompt,   setShowPrompt]   = useState(false)
  const [copied,       setCopied]       = useState(false)
  const [savedPrompt,  setSavedPrompt]  = useState(formula.image_prompt || '')
  const [saving,       setSaving]       = useState(false)
  const fileRef = useRef()

  const prompt      = buildPrompt(formula.name, formula.vibe || '')
  const displayPrompt = savedPrompt || prompt
  const shortHint   = displayPrompt.split(',').slice(0, 3).join(',') + '...'

  async function handleSavePrompt() {
    setSaving(true)
    await supabase.from('formulas').update({ image_prompt: prompt }).eq('id', formula.id)
    setSavedPrompt(prompt)
    setSaving(false)
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${formula.id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('formula-images')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('formula-images')
        .getPublicUrl(path)
      await supabase.from('formulas').update({ image_url: publicUrl }).eq('id', formula.id)
      onImageUpdated && onImageUpdated(publicUrl)
    }
    setUploading(false)
  }

  function copyPrompt() {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ marginBottom:20 }}>

      {/* Image area */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{ position:'relative', width:'100%', height: formula.image_url ? 200 : 100,
          borderRadius:14, overflow:'hidden', cursor:'pointer',
          background: formula.image_url ? 'transparent' : S.goldLt,
          border:`1.5px dashed ${formula.image_url ? 'transparent' : S.goldBd}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all .2s' }}>

        {formula.image_url ? (
          <>
            <img src={formula.image_url} alt={formula.name}
              style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.35)',
              display:'flex', alignItems:'center', justifyContent:'center',
              opacity: uploading ? 1 : 0, transition:'opacity .2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity=1}
              onMouseLeave={e => !uploading && (e.currentTarget.style.opacity=0)}>
              <span style={{ color:'#fff', fontSize:12, fontWeight:500,
                fontFamily:'Inter,sans-serif' }}>
                {uploading ? '⏳ กำลัง upload...' : '🖼 เปลี่ยนรูป'}
              </span>
            </div>
          </>
        ) : (
          <div style={{ textAlign:'center' }}>
            {uploading ? (
              <>
                <div style={{ fontSize:22, marginBottom:6 }}>⏳</div>
                <div style={{ fontSize:12, color:S.gold, fontWeight:600,
                  fontFamily:'Inter,sans-serif' }}>กำลัง upload...</div>
                <div style={{ fontSize:10, color:S.textLt, marginTop:2 }}>รอสักครู่นะคะ</div>
              </>
            ) : (
              <>
                <div style={{ fontSize:22, marginBottom:4 }}>🖼</div>
                <div style={{ fontSize:12, color:S.gold, fontWeight:500,
                  fontFamily:'Inter,sans-serif' }}>+ เพิ่มรูป mood</div>
                <div style={{ fontSize:10, color:S.textLt, marginTop:2 }}>
                  Generate ด้วย Gemini แล้ว upload
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*"
        style={{ display:'none' }} onChange={handleUpload}/>

      {/* Prompt section */}
      <div style={{ marginTop:8 }}>
        <div
          onClick={() => setShowPrompt(p => !p)}
          style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            cursor:'pointer', padding:'7px 12px',
            background:S.bg, borderRadius: showPrompt ? '8px 8px 0 0' : 8,
            border:`1px solid ${S.border}` }}>
          <div style={{ flex:1, minWidth:0 }}>
            <span style={{ fontSize:10, color:S.gold, fontWeight:600,
              textTransform:'uppercase', letterSpacing:.8, marginRight:8 }}>✦ Prompt</span>
            <span style={{ fontSize:11, color:S.textLt,
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              display:'inline-block', maxWidth:'80%', verticalAlign:'middle' }}>
              {shortHint}
            </span>
          </div>
          <span style={{ fontSize:12, color:S.textLt, flexShrink:0, marginLeft:8 }}>
            {showPrompt ? '▲' : '▼'}
          </span>
        </div>

        {showPrompt && (
          <div style={{ border:`1px solid ${S.border}`, borderTop:'none',
            borderRadius:'0 0 8px 8px', background:S.white, padding:'10px 12px' }}>
            <div style={{ fontSize:12, color:S.text, lineHeight:1.8,
              fontFamily:'Inter,sans-serif', marginBottom:10 }}>
              {displayPrompt}
              {savedPrompt && (
                <div style={{ fontSize:10, color:S.green, marginTop:4 }}>✓ บันทึกไว้แล้ว</div>
              )}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:10 }}>
              <button onClick={() => { navigator.clipboard.writeText(displayPrompt); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                style={{ fontSize:11, fontWeight:600, padding:'6px 16px', borderRadius:20,
                  cursor:'pointer', fontFamily:'Inter,sans-serif', border:'none',
                  background: copied ? S.green : S.gold, color:'#fff',
                  transition:'background .2s' }}>
                {copied ? '✓ Copied!' : 'Copy Prompt'}
              </button>
              <button onClick={handleSavePrompt} disabled={saving || savedPrompt === prompt}
                style={{ fontSize:11, fontWeight:600, padding:'6px 16px', borderRadius:20,
                  cursor: savedPrompt === prompt ? 'default' : 'pointer',
                  fontFamily:'Inter,sans-serif',
                  border:`1px solid ${savedPrompt === prompt ? S.green : S.gold}`,
                  background:'transparent',
                  color: savedPrompt === prompt ? S.green : saving ? S.textLt : S.gold }}>
                {saving ? 'Saving...' : savedPrompt === prompt ? '✓ Saved' : '💾 Save Prompt'}
              </button>
            </div>
            <div style={{ fontSize:10, color:S.textLt, marginTop:8, lineHeight:1.6 }}>
              วาง prompt นี้ใน Gemini → ได้รูป → กดรูปด้านบนเพื่อ upload ค่ะ
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
