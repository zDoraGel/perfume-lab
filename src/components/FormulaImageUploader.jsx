import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { S } from '../constants/theme'

export default function FormulaImageUploader({ formula, onClose, onUpdated }) {
  const [preview, setPreview] = useState(formula.bottle_image_url || null)
  const [file,     setFile]   = useState(null)
  const [uploading,setUploading] = useState(false)
  const [error,    setError]  = useState('')
  const inputRef = useRef()

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function upload() {
    if (!file) return onClose()
    setUploading(true)
    setError('')
    try {
      const ext  = file.name.split('.').pop()
      const path = `formula-${formula.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('formula-images').upload(path, file, { upsert:true })
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from('formula-images').getPublicUrl(path)
      const imageUrl = pub.publicUrl

      const { error: updErr } = await supabase.from('formulas')
        .update({ bottle_image_url: imageUrl }).eq('id', formula.id)
      if (updErr) throw updErr

      onUpdated?.(imageUrl)
      onClose()
    } catch (e) {
      console.error('[FormulaImageUploader]', e)
      setError('อัปโหลดไม่สำเร็จ — เช็คว่าสร้าง bucket "formula-images" (public) ใน Supabase Storage แล้วหรือยัง')
    }
    setUploading(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:24, width:300 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18,
          fontStyle:'italic', color:S.ink, marginBottom:14, textAlign:'center' }}>
          รูปขวด — {formula.name}
        </div>

        {/* preview ใน aspect ratio 4:5 คงที่ ไม่ว่ารูปต้นฉบับจะอัตราส่วนไหน */}
        <div onClick={() => inputRef.current?.click()}
          style={{ width:'100%', aspectRatio:'4/5', borderRadius:10, overflow:'hidden',
            background:S.bg, border:`1.5px dashed ${S.border}`, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
          {preview ? (
            <img src={preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          ) : (
            <span style={{ fontSize:12, color:S.textLt }}>+ เลือกรูป</span>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile}
          style={{ display:'none' }}/>

        <div style={{ fontSize:10.5, color:S.textLt, textAlign:'center', marginBottom:14 }}>
          ระบบจะ crop ให้เป็นสัดส่วน 4:5 อัตโนมัติเวลาแสดงผล ไม่ต้อง crop เองก่อนอัป
        </div>

        {error && (
          <div style={{ fontSize:11, color:S.red, marginBottom:10, textAlign:'center' }}>{error}</div>
        )}

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:'9px 0', borderRadius:10, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:12,
              background:'transparent', border:`1px solid ${S.border}`, color:S.textMid }}>
            ยกเลิก
          </button>
          <button onClick={upload} disabled={uploading || !file}
            style={{ flex:1, padding:'9px 0', borderRadius:10, cursor:'pointer',
              fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
              background:S.gold, border:'none', color:'#fff',
              opacity:(uploading || !file) ? 0.5 : 1 }}>
            {uploading ? '⏳...' : 'อัปโหลด'}
          </button>
        </div>
      </div>
    </div>
  )
}
