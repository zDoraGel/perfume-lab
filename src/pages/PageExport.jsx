import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { S } from '../constants/theme'
import { Card, Btn } from '../components/ui'
import {
  exportFormulasToExcel, exportMaterialsToExcel,
  exportFormulaToPDF,   exportMaterialsToPDF,
} from '../lib/exportUtils'

export default function PageExport() {
  const [formulas,   setFormulas]   = useState([])
  const [materials,  setMaterials]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [exporting,  setExporting]  = useState('')

  useEffect(() => {
    Promise.all([db.getFormulas(), db.getMaterials()])
      .then(([f, m]) => { setFormulas(f); setMaterials(m); setLoading(false) })
  }, [])

  // helper — fetch versions + items for all formulas
  async function getAllVersionsAndItems(formulaId) {
    const versions = await db.getVersions(formulaId)
    const itemsByVersion = {}
    for (const v of versions) {
      itemsByVersion[v.id] = await db.getItems(v.id)
    }
    return { versions, itemsByVersion }
  }

  async function handleExport(type) {
    setExporting(type)
    try {
      if (type === 'formulas-excel') {
        await exportFormulasToExcel(formulas, getAllVersionsAndItems)
      } else if (type === 'materials-excel') {
        exportMaterialsToExcel(materials)
      } else if (type === 'formulas-pdf') {
        // export all formulas as separate PDFs
        for (const f of formulas) {
          const { versions, itemsByVersion } = await getAllVersionsAndItems(f.id)
          if (versions.length > 0) {
            await exportFormulaToPDF(f, versions, itemsByVersion)
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

  // ── Export อย. CSV ──────────────────────────────────────────────────────────
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
          rows.push([
            i + 1,
            m.name || '',
            '',                          // ปริมาณที่ใช้ต่อสูตร — กรอกเอง
            m.stock || 0,
            m.supplier || '',
            m.notes || '',
          ])
        })

      const csv = rows.map(r =>
        r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')
      ).join('\n')

      const bom  = '\uFEFF'  // UTF-8 BOM สำหรับ Excel ภาษาไทย
      const blob = new Blob([bom + csv], { type:'text/csv;charset=utf-8;' })
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
    <Card style={{ marginBottom:16 }}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:14 }}>
        <span style={{ fontSize:24 }}>{icon}</span>
        <div>
          <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18,
            fontStyle:'italic', color:S.ink }}>{title}</div>
          <div style={{ fontSize:12, color:S.textMid, marginTop:2 }}>{desc}</div>
          {items !== undefined && (
            <div style={{ fontSize:11, color:S.textLt, marginTop:2 }}>{items} รายการ</div>
          )}
        </div>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onExcel}
          disabled={!!exporting}
          style={{ flex:1, padding:'10px 0', borderRadius:10, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
            border:`1.5px solid ${S.green}`, background: S.greenBg, color:S.green,
            opacity: exporting ? 0.5 : 1 }}>
          {exporting === excelLabel ? '⏳ Exporting...' : '📊 Excel / CSV'}
        </button>
        <button onClick={onPdf}
          disabled={!!exporting}
          style={{ flex:1, padding:'10px 0', borderRadius:10, cursor:'pointer',
            fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
            border:`1.5px solid ${S.gold}`, background: S.goldLt, color:S.gold,
            opacity: exporting ? 0.5 : 1 }}>
          {exporting === pdfLabel ? '⏳ Exporting...' : '📄 PDF'}
        </button>
      </div>
    </Card>
  )

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28,
          color:S.ink, fontStyle:'italic', lineHeight:1 }}>Export</div>
        <div style={{ fontSize:13, color:S.textLt, marginTop:4 }}>
          ดาวน์โหลดข้อมูลเพื่อดูแบบออฟไลน์
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:S.textLt }}>Loading...</div>
      ) : (
        <>
          <ExportCard
            icon="◈"
            title="Formulas & Versions"
            desc="ทุก formula พร้อม ingredients, versions, notes และ DNA"
            items={formulas.length}
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
          <Card style={{ marginBottom:16 }}>
            <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:14 }}>
              <span style={{ fontSize:24 }}>📋</span>
              <div>
                <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18,
                  fontStyle:'italic', color:S.ink }}>รายการวัตถุดิบ สำหรับ อย.</div>
                <div style={{ fontSize:12, color:S.textMid, marginTop:2 }}>
                  ชื่อ material · ปริมาณ stock · ผู้จำหน่าย — เฉพาะที่มี stock
                </div>
                <div style={{ fontSize:11, color:S.textLt, marginTop:2 }}>
                  {materials.filter(m=>(m.stock||0)>0).length} รายการที่มี stock
                </div>
              </div>
            </div>
            <button onClick={exportFdaCsv} disabled={!!exporting}
              style={{ width:'100%', padding:'10px 0', borderRadius:10, cursor:'pointer',
                fontFamily:'Inter,sans-serif', fontSize:12, fontWeight:600,
                border:`1.5px solid ${S.green}`, background:S.greenBg, color:S.green,
                opacity: exporting ? 0.5 : 1 }}>
              {exporting === 'fda-csv' ? '⏳ Exporting...' : '📋 Export CSV สำหรับ อย.'}
            </button>
            <div style={{ fontSize:10, color:S.textLt, marginTop:8, lineHeight:1.6 }}>
              💡 ช่องปริมาณต่อสูตรเว้นว่างไว้ให้กรอกเองก่อนส่งค่ะ
            </div>
          </Card>
          <div style={{ padding:'12px 16px', background:S.goldLt, borderRadius:12,
            border:`1px solid ${S.goldBd}`, fontSize:11, color:S.textMid, lineHeight:1.8 }}>
            <div style={{ fontWeight:600, color:S.gold, marginBottom:4 }}>📌 หมายเหตุ</div>
            Excel — เปิดได้ใน Numbers, Google Sheets, Excel ค่ะ<br/>
            PDF — พิมพ์ได้ ดูได้ทุกที่ไม่ต้องมี internet ค่ะ<br/>
            Formula Card (สวยงาม) — ทำได้ตอน formula complete แล้วค่ะ
          </div>
        </>
      )}
    </div>
  )
}
