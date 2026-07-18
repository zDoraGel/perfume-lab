import { useState, useEffect, useMemo } from 'react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { S } from '../constants/theme'
import { Card, Btn } from '../components/ui'
import LabelGenerator from '../components/LabelGenerator'
import {
  exportFormulasToExcel, exportMaterialsToExcel,
  exportFormulaToPDF,   exportMaterialsToPDF,
} from '../lib/exportUtils'

// ── Formula Selector ──────────────────────────────────────────────────────────
function FormulaSelector({ formulas, selected, onChange }) {
  const [search, setSearch] = useState('')
  const [concFilter, setConcFilter] = useState('all')

  const concentrations = useMemo(() => {
    const vals = [...new Set(formulas.map(f => f.concentration).filter(Boolean))]
    return vals.sort()
  }, [formulas])

  const filtered = useMemo(() => {
    return formulas.filter(f => {
      const matchSearch = !search || f.name?.toLowerCase().includes(search.toLowerCase())
      const matchConc   = concFilter === 'all' || f.concentration === concFilter
      return matchSearch && matchConc
    })
  }, [formulas, search, concFilter])

  const allFilteredSelected = filtered.length > 0 && filtered.every(f => selected.has(f.id))

  function toggleAll() {
    if (allFilteredSelected) {
      const next = new Set(selected)
      filtered.forEach(f => next.delete(f.id))
      onChange(next)
    } else {
      const next = new Set(selected)
      filtered.forEach(f => next.add(f.id))
      onChange(next)
    }
  }

  function toggleOne(id) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange(next)
  }

  return (
    <div style={{ background: S.white, border: `1px solid ${S.border}`,
      borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: S.textMid,
          textTransform: 'uppercase', letterSpacing: .8 }}>
          เลือก Formula
        </div>
        <div style={{ fontSize: 12, color: S.textLt }}>
          เลือก {selected.size} / {formulas.length}
        </div>
      </div>

      {/* search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="ค้นหาชื่อ formula..."
        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
          border: `1px solid ${S.border}`, outline: 'none', color: S.ink,
          background: S.white, boxSizing: 'border-box', marginBottom: 10 }}
      />

      {/* concentration filter pills */}
      {concentrations.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {['all', ...concentrations].map(c => (
            <button key={c} onClick={() => setConcFilter(c)}
              style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif',
                border: `1.5px solid ${concFilter === c ? S.gold : S.border}`,
                background: concFilter === c ? S.goldLt : S.white,
                color: concFilter === c ? S.gold : S.textMid }}>
              {c === 'all' ? 'ทั้งหมด' : c}
            </button>
          ))}
        </div>
      )}

      {/* select all row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 8, marginBottom: 6,
        background: S.goldLt, border: `1px solid ${S.goldBd || S.border}` }}>
        <input type="checkbox" checked={allFilteredSelected}
          onChange={toggleAll} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: S.gold }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: S.gold, fontFamily: 'Inter,sans-serif' }}>
          {allFilteredSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
          {search || concFilter !== 'all' ? ` (${filtered.length} รายการที่กรองไว้)` : ''}
        </span>
      </div>

      {/* formula list */}
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: S.textLt }}>
            ไม่พบ formula
          </div>
        )}
        {filtered.map(f => (
          <div key={f.id} onClick={() => toggleOne(f.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
              marginBottom: 4,
              background: selected.has(f.id) ? '#fdf8f0' : 'transparent',
              border: `1px solid ${selected.has(f.id) ? S.goldBd || '#e8d9b8' : 'transparent'}` }}>
            <input type="checkbox" checked={selected.has(f.id)}
              onChange={() => toggleOne(f.id)}
              onClick={e => e.stopPropagation()}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: S.gold, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: S.ink, fontWeight: selected.has(f.id) ? 600 : 400,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.name}
              </div>
              {f.concentration && (
                <div style={{ fontSize: 11, color: S.textLt, marginTop: 1 }}>{f.concentration}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PageExport() {
  const [formulas,      setFormulas]      = useState([])
  const [materials,     setMaterials]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [exporting,     setExporting]     = useState('')
  const [showLabel,     setShowLabel]     = useState(false)
  const [shareMode,     setShareMode]     = useState(false)
  const [selectedIds,   setSelectedIds]   = useState(null) // null = ยังไม่ได้ init

  useEffect(() => {
    Promise.all([db.getFormulas(), db.getMaterials()])
      .then(([f, m]) => {
        setFormulas(f)
        setMaterials(m)
        setSelectedIds(new Set(f.map(x => x.id))) // default = เลือกทั้งหมด
        setLoading(false)
      })
  }, [])

  const selectedFormulas = useMemo(
    () => formulas.filter(f => selectedIds?.has(f.id)),
    [formulas, selectedIds]
  )

  async function getAllVersionsAndItems(formulaId) {
    const versions = await db.getVersions(formulaId)
    const itemsByVersion = {}
    for (const v of versions) {
      itemsByVersion[v.id] = await db.getItems(v.id)
    }
    return { versions, itemsByVersion }
  }

  async function handleExport(type) {
    if (selectedFormulas.length === 0) {
      alert('กรุณาเลือก formula ก่อนนะคะ')
      return
    }
    setExporting(type)
    try {
      if (type === 'formulas-excel') {
        await exportFormulasToExcel(selectedFormulas, getAllVersionsAndItems, shareMode)
      } else if (type === 'materials-excel') {
        exportMaterialsToExcel(materials)
      } else if (type === 'formulas-pdf') {
        for (const f of selectedFormulas) {
          const { versions, itemsByVersion } = await getAllVersionsAndItems(f.id)
          if (versions.length > 0) {
            await exportFormulaToPDF(f, versions, itemsByVersion, shareMode)
          }
        }
      } else if (type === 'materials-pdf') {
        await exportMaterialsToPDF(materials)
      }
    } catch (e) {
      console.error('[export error]', e)
      alert('Export failed: ' + e.message)
    }
    setExporting('')
  }

  function exportFdaCsv() {
    setExporting('fda-csv')
    try {
      const rows = [
        ['ลำดับ', 'ชื่อวัตถุดิบ (INCI/Common)', 'ปริมาณ (g)', 'Stock คงเหลือ (g)', 'ผู้จำหน่าย/บริษัทที่ซื้อ', 'หมายเหตุ']
      ]
      materials
        .filter(m => (m.stock || 0) > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((m, i) => {
          rows.push([i + 1, m.name || '', '', m.stock || 0, m.supplier || '', m.notes || ''])
        })
      const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `linen-theory-materials-fda-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch(e) {
      alert('Export failed: ' + e.message)
    }
    setExporting('')
  }

  const ExportCard = ({ title, desc, icon, items, onExcel, onPdf, excelLabel, pdfLabel }) => (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <div>
          <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 18,
            fontStyle: 'italic', color: S.ink }}>{title}</div>
          <div style={{ fontSize: 12, color: S.textMid, marginTop: 2 }}>{desc}</div>
          {items !== undefined && (
            <div style={{ fontSize: 11, color: S.textLt, marginTop: 2 }}>{items} รายการ</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onExcel} disabled={!!exporting}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
            fontFamily: 'Inter,sans-serif', fontSize: 12, fontWeight: 600,
            border: `1.5px solid ${S.green}`, background: S.greenBg, color: S.green,
            opacity: exporting ? 0.5 : 1 }}>
          {exporting === excelLabel ? '⏳ Exporting...' : '📊 Excel / CSV'}
        </button>
        <button onClick={onPdf} disabled={!!exporting}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
            fontFamily: 'Inter,sans-serif', fontSize: 12, fontWeight: 600,
            border: `1.5px solid ${S.gold}`, background: S.goldLt, color: S.gold,
            opacity: exporting ? 0.5 : 1 }}>
          {exporting === pdfLabel ? '⏳ Exporting...' : '📄 PDF'}
        </button>
      </div>
    </Card>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 28,
          color: S.ink, fontStyle: 'italic', lineHeight: 1 }}>Export</div>
        <div style={{ fontSize: 13, color: S.textLt, marginTop: 4 }}>
          ดาวน์โหลดข้อมูลเพื่อดูแบบออฟไลน์
        </div>
      </div>

      {/* Label Generator shortcut */}
      <button onClick={() => setShowLabel(true)}
        style={{ width: '100%', padding: '14px 16px', borderRadius: 12, marginBottom: 20,
          border: `1.5px solid ${S.gold}`, background: S.goldLt,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
        <span style={{ fontSize: 22 }}>🏷</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: S.gold, fontFamily: 'Inter,sans-serif' }}>
            Print Label
          </div>
          <div style={{ fontSize: 11, color: S.textMid, marginTop: 2 }}>
            พิมพ์เองหรือเลือกจาก formula ในระบบ
          </div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 16, color: S.gold }}>→</span>
      </button>

      {showLabel && <LabelGenerator onClose={() => setShowLabel(false)} />}

      {/* Share Mode Toggle */}
      <div style={{ background: S.white, border: `1px solid ${S.border}`,
        borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: S.textMid,
          textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10 }}>
          Export Mode
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { v: false, l: '🔒 เก็บส่วนตัว',    sub: 'แสดงชื่อวัตถุดิบจริง' },
            { v: true,  l: '👁 แชร์ให้คนอื่น', sub: 'ใช้ alias / family แทน' },
          ].map(m => (
            <button key={String(m.v)} onClick={() => setShareMode(m.v)}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${shareMode === m.v ? S.gold : S.border}`,
                background: shareMode === m.v ? S.goldLt : S.white, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600,
                color: shareMode === m.v ? S.gold : S.ink }}>{m.l}</div>
              <div style={{ fontSize: 11, color: S.textMid, marginTop: 2 }}>{m.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: S.textLt }}>Loading...</div>
      ) : (
        <>
          {/* Formula Selector */}
          {selectedIds !== null && (
            <FormulaSelector
              formulas={formulas}
              selected={selectedIds}
              onChange={setSelectedIds}
            />
          )}

          {/* Formulas Export Card */}
          <ExportCard
            icon="◈"
            title="Formulas & Versions"
            desc={
              selectedFormulas.length === formulas.length
                ? `ทุก formula พร้อม ingredients, versions, notes และ DNA`
                : `เฉพาะ formula ที่เลือก — ingredients, versions, notes และ DNA`
            }
            items={selectedFormulas.length}
            excelLabel="formulas-excel"
            pdfLabel="formulas-pdf"
            onExcel={() => handleExport('formulas-excel')}
            onPdf={() => handleExport('formulas-pdf')}
          />

          <ExportCard
            icon="⬡"
            title="Materials Stock List"
            desc="รายการวัตถุดิบทั้งหมด ราคา stock และ supplier"
            items={materials.length}
            excelLabel="materials-excel"
            pdfLabel="materials-pdf"
            onExcel={() => handleExport('materials-excel')}
            onPdf={() => handleExport('materials-pdf')}
          />

          {/* อย. CSV */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
              <span style={{ fontSize: 24 }}>📋</span>
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 18,
                  fontStyle: 'italic', color: S.ink }}>รายการวัตถุดิบ สำหรับ อย.</div>
                <div style={{ fontSize: 12, color: S.textMid, marginTop: 2 }}>
                  ชื่อ material · ปริมาณ stock · ผู้จำหน่าย — เฉพาะที่มี stock
                </div>
                <div style={{ fontSize: 11, color: S.textLt, marginTop: 2 }}>
                  {materials.filter(m => (m.stock || 0) > 0).length} รายการที่มี stock
                </div>
              </div>
            </div>
            <button onClick={exportFdaCsv} disabled={!!exporting}
              style={{ width: '100%', padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'Inter,sans-serif', fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${S.green}`, background: S.greenBg, color: S.green,
                opacity: exporting ? 0.5 : 1 }}>
              {exporting === 'fda-csv' ? '⏳ Exporting...' : '📋 Export CSV สำหรับ อย.'}
            </button>
            <div style={{ fontSize: 10, color: S.textLt, marginTop: 8, lineHeight: 1.6 }}>
              💡 ช่องปริมาณต่อสูตรเว้นว่างไว้ให้กรอกเองก่อนส่งค่ะ
            </div>
          </Card>

          <div style={{ padding: '12px 16px', background: S.goldLt, borderRadius: 12,
            border: `1px solid ${S.goldBd}`, fontSize: 11, color: S.textMid, lineHeight: 1.8 }}>
            <div style={{ fontWeight: 600, color: S.gold, marginBottom: 4 }}>📌 หมายเหตุ</div>
            Excel — เปิดได้ใน Numbers, Google Sheets, Excel ค่ะ<br/>
            PDF — พิมพ์ได้ ดูได้ทุกที่ไม่ต้องมี internet ค่ะ<br/>
            Formula Card (สวยงาม) — ทำได้ตอน formula complete แล้วค่ะ
          </div>
        </>
      )}
    </div>
  )
}
