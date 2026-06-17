import { useState, useEffect, useMemo } from 'react'
import { db } from '../lib/db'
import { S } from '../constants/theme'
import { Card } from '../components/ui'

const STATUS_CONFIG = {
  active:  { label: 'Active Lot',  th: 'กำลังขายอยู่',        color: '#3b6d11', bg: '#eaf3de', bd: '#c9dba8' },
  planned: { label: 'Planned',     th: 'รอคิว lot ถัดไป',      color: '#8a6f4e', bg: '#f3ecdc', bd: '#e0cda0' },
  special: { label: 'Special',     th: 'พิเศษ ไม่ผลิตตลอด',    color: '#7a3a6a', bg: '#f5e9f2', bd: '#dbb8d0' },
  retired: { label: 'Retired',     th: 'เลิกขายแล้ว',          color: '#888',    bg: '#f0eee9', bd: '#d8d4cc' },
}

const STATUS_ORDER = ['active', 'planned', 'special', 'retired']

export default function PageLotPlanning({ onSelectFormula }) {
  const [formulas, setFormulas] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(null)

  useEffect(() => {
    db.getFormulas().then(f => { setFormulas(f); setLoading(false) })
  }, [])

  const grouped = useMemo(() => {
    const g = { active: [], planned: [], special: [], retired: [] }
    formulas.forEach(f => {
      const status = f.lot_status || 'planned'
      if (g[status]) g[status].push(f)
      else g.planned.push(f)
    })
    // sort active by lot_number
    g.active.sort((a, b) => (a.lot_number || 0) - (b.lot_number || 0))
    return g
  }, [formulas])

  const lotNumbers = useMemo(() => {
    const nums = [...new Set(formulas.map(f => f.lot_number).filter(Boolean))]
    return nums.sort((a, b) => a - b)
  }, [formulas])

  async function updateStatus(formula, status) {
    setSaving(formula.id)
    try {
      const fields = { lot_status: status }
      // ถ้าเปลี่ยนเป็น active แต่ยังไม่มี lot_number ให้ตั้งเป็น lot ล่าสุด+1 อัตโนมัติ
      if (status === 'active' && !formula.lot_number) {
        const maxLot = lotNumbers.length ? Math.max(...lotNumbers) : 0
        fields.lot_number = maxLot + 1
      }
      await db.updateFormula(formula.id, fields)
      setFormulas(prev => prev.map(f => f.id === formula.id ? { ...f, ...fields } : f))
    } catch (e) {
      alert('อัปเดตล้มเหลว: ' + e.message)
    }
    setSaving(null)
  }

  async function updateLotNumber(formula, lotNum) {
    setSaving(formula.id)
    try {
      const fields = { lot_number: lotNum ? parseInt(lotNum) : null }
      await db.updateFormula(formula.id, fields)
      setFormulas(prev => prev.map(f => f.id === formula.id ? { ...f, ...fields } : f))
    } catch (e) {
      alert('อัปเดตล้มเหลว: ' + e.message)
    }
    setSaving(null)
  }

  if (loading) {
    return <div style={{ textAlign:'center', padding:40, color:S.textLt }}>Loading...</div>
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28,
          color:S.ink, fontStyle:'italic', lineHeight:1 }}>Lot Planning</div>
        <div style={{ fontSize:13, color:S.textLt, marginTop:4 }}>
          จัดการว่ากลิ่นไหนขายอยู่ lot ไหน กลิ่นไหนพิเศษไม่ผลิตตลอด
        </div>
      </div>

      {/* Lot Summary */}
      {lotNumbers.length > 0 && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
          {lotNumbers.map(n => {
            const count = formulas.filter(f => f.lot_number === n && f.lot_status === 'active').length
            return (
              <div key={n} style={{ padding:'8px 14px', borderRadius:10,
                background:S.goldLt, border:`1px solid ${S.goldBd || S.border}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:S.gold }}>Lot {n}</div>
                <div style={{ fontSize:10, color:S.textMid }}>{count} กลิ่น</div>
              </div>
            )
          })}
        </div>
      )}

      {STATUS_ORDER.map(status => {
        const cfg   = STATUS_CONFIG[status]
        const items = grouped[status]
        return (
          <div key={status} style={{ marginBottom: 24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.color }}/>
              <span style={{ fontSize:13, fontWeight:700, color:cfg.color,
                fontFamily:'Inter,sans-serif' }}>{cfg.label}</span>
              <span style={{ fontSize:11, color:S.textLt }}>· {cfg.th}</span>
              <span style={{ fontSize:11, color:S.textLt, marginLeft:'auto' }}>{items.length} กลิ่น</span>
            </div>

            {items.length === 0 ? (
              <div style={{ padding:'16px', textAlign:'center', fontSize:12, color:S.textLt,
                background:S.bg, borderRadius:10, border:`1px dashed ${S.border}` }}>
                ไม่มีกลิ่นในกลุ่มนี้
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {items.map(f => (
                  <Card key={f.id} style={{ padding:'12px 14px',
                    border:`1px solid ${cfg.bd}`, background: status==='retired' ? '#fafafa' : S.white }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                      <div style={{ flex:1, minWidth:0, cursor: onSelectFormula ? 'pointer' : 'default' }}
                        onClick={() => onSelectFormula && onSelectFormula(f)}>
                        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:16,
                          fontStyle:'italic', color:S.ink }}>{f.name}</div>
                        {f.vibe && (
                          <div style={{ fontSize:11, color:S.textLt, marginTop:2,
                            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                            {f.vibe}
                          </div>
                        )}
                      </div>

                      {/* Lot number input — only for active */}
                      {status === 'active' && (
                        <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                          <span style={{ fontSize:10, color:S.textLt }}>Lot</span>
                          <input
                            type="number"
                            value={f.lot_number || ''}
                            onChange={e => updateLotNumber(f, e.target.value)}
                            disabled={saving === f.id}
                            style={{ width:44, padding:'4px 6px', borderRadius:6,
                              border:`1px solid ${S.border}`, fontSize:12, textAlign:'center' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Status switch buttons */}
                    <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                      {STATUS_ORDER.filter(s => s !== status).map(s => {
                        const c = STATUS_CONFIG[s]
                        return (
                          <button key={s} onClick={() => updateStatus(f, s)}
                            disabled={saving === f.id}
                            style={{ padding:'4px 10px', borderRadius:16, cursor:'pointer',
                              fontSize:10, fontFamily:'Inter,sans-serif', fontWeight:600,
                              border:`1px solid ${c.bd}`, background:'transparent', color:c.color,
                              opacity: saving === f.id ? 0.5 : 1 }}>
                            → {c.label}
                          </button>
                        )
                      })}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
