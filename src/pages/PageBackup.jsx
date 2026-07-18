import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { S } from '../constants/theme'

// รายชื่อสำรอง — ใช้เฉพาะกรณี RPC list_public_tables() เรียกไม่ได้
// ปกติจะดึงรายชื่อ table จริงจาก database ทุกครั้งที่เปิดหน้า
const FALLBACK_TABLES = [
  'accord_items', 'accord_versions', 'accords',
  'adaptation_items', 'adaptation_versions', 'adaptations',
  'aging_logs', 'blend_aging_logs', 'blend_giveaway_logs',
  'customer_points_balance', 'customers', 'expenses',
  'formula_items', 'formula_versions', 'formulas',
  'giveaway_logs', 'loyalty_ledger', 'loyalty_points_audit',
  'loyalty_redemptions', 'master_ingredients', 'material_aliases',
  'material_documents', 'material_traits', 'materials',
  'order_items', 'orders', 'product_stock',
  'production_batches', 'quick_notes', 'retail_stock',
  'retail_stock_logs', 'suppliers', 'trend_items',
]

async function fetchTableList() {
  const { data, error } = await supabase.rpc('list_public_tables')
  if (error) {
    console.error('list_public_tables error:', error)
    return { tables: FALLBACK_TABLES, usedFallback: true }
  }
  const names = (data || [])
    .map(r => (typeof r === 'string' ? r : r.table_name))
    .filter(Boolean)
  if (!names.length) return { tables: FALLBACK_TABLES, usedFallback: true }
  return { tables: names, usedFallback: false }
}

function generateTimestamp() {
  const now = new Date()
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5)
}

function generateSQLInserts(tableName, rows) {
  if (!rows || rows.length === 0) return `-- No data in ${tableName}\n`
  
  const columns = Object.keys(rows[0])
  let sql = `-- Table: ${tableName}\n`
  sql += `DELETE FROM ${tableName};\n\n`
  
  rows.forEach(row => {
    const values = columns.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return 'NULL'
      if (typeof val === 'boolean') return val ? 'true' : 'false'
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
      return val
    }).join(', ')
    sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});\n`
  })
  
  return sql + '\n'
}

function generateJSON(tableName, rows) {
  return JSON.stringify({ [tableName]: rows }, null, 2)
}

function generateCSV(tableName, rows) {
  if (!rows || rows.length === 0) return `${tableName}\n\n`
  
  const columns = Object.keys(rows[0])
  let csv = columns.map(c => `"${c}"`).join(',') + '\n'
  
  rows.forEach(row => {
    csv += columns.map(col => {
      const val = row[col]
      if (val === null || val === undefined) return ''
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',') + '\n'
  })
  
  return csv + '\n'
}

export default function PageBackup() {
  const [tables,         setTables]         = useState([])
  const [loadingTables,  setLoadingTables]  = useState(true)
  const [usedFallback,   setUsedFallback]   = useState(false)
  const [selectedTables, setSelectedTables] = useState({})
  const [format,         setFormat]         = useState('sql')
  const [exporting,      setExporting]      = useState(false)
  const [status,         setStatus]         = useState('')

  // โหลดรายชื่อ table จริงจาก database — table ใหม่จะโผล่เองไม่ต้องแก้โค้ด
  useEffect(() => {
    fetchTableList().then(({ tables: t, usedFallback: fb }) => {
      setTables(t)
      setUsedFallback(fb)
      // default: เลือกทั้งหมด เพื่อไม่ให้ลืม backup table ใหม่
      const sel = {}
      t.forEach(name => { sel[name] = true })
      setSelectedTables(sel)
      setLoadingTables(false)
    })
  }, [])

  const handleSelectAll = (checked) => {
    const newSelected = {}
    tables.forEach(t => newSelected[t] = checked)
    setSelectedTables(newSelected)
  }

  const handleSelectTable = (table, checked) => {
    setSelectedTables(prev => ({ ...prev, [table]: checked }))
  }

  const getTablesToExport = () => Object.keys(selectedTables).filter(t => selectedTables[t])

  async function handleExport() {
    const tablesToExport = getTablesToExport()
    if (tablesToExport.length === 0) {
      alert('เลือก table อย่างน้อย 1 อัน')
      return
    }

    setExporting(true)
    setStatus('กำลัง export...')

    try {
      let content = ''
      const timestamp = generateTimestamp()
      let filename = `backup_${timestamp}`
      let totalRows = 0

      // Query ทุก table
      for (const table of tablesToExport) {
        setStatus(`กำลัง export... (${table})`)
        const { data, error } = await supabase.from(table).select('*')
        if (error) throw new Error(`${table}: ${error.message}`)
        totalRows += (data?.length || 0)

        if (format === 'sql') {
          content += generateSQLInserts(table, data)
        } else if (format === 'json') {
          content += (content ? ',\n' : '') + generateJSON(table, data)
        } else if (format === 'csv') {
          content += `\n=== ${table} ===\n` + generateCSV(table, data)
        }
      }

      // Wrap JSON in object
      if (format === 'json' && tablesToExport.length > 1) {
        content = '{\n' + content + '\n}'
      }

      // Download
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.${format === 'sql' ? 'sql' : format === 'json' ? 'json' : 'csv'}`
      link.click()
      URL.revokeObjectURL(url)

      setStatus(`✓ Export สำเร็จ — ${tablesToExport.length} table · ${totalRows.toLocaleString()} แถว`)
    } catch (err) {
      setStatus(`✗ Error: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const isAllSelected = tables.length > 0 && tables.every(t => selectedTables[t])
  const selectedCount = getTablesToExport().length

  const labelStyle = {
    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    fontSize: 13, color: S.ink, padding: '6px 0'
  }

  const checkboxStyle = {
    width: 16, height: 16, cursor: 'pointer'
  }

  const buttonStyle = (active) => ({
    padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
    border: `1.5px solid ${active ? S.gold : S.border}`,
    background: active ? S.gold : 'transparent',
    color: active ? '#fff' : S.textMid,
    fontSize: 12, fontWeight: 500,
    transition: 'all 0.2s'
  })

  if (loadingTables) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, color: S.ink }}>
          💾 Backup Database
        </div>
        <div style={{ textAlign:'center', padding:40, color:S.textLt, fontSize:13 }}>
          กำลังโหลดรายชื่อ table…
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, color: S.ink }}>
        💾 Backup Database
      </div>

      {usedFallback && (
        <div style={{ marginBottom:16, padding:12, borderRadius:8,
          background:'#fdf4e3', border:'1px solid #e0cda0',
          fontSize:12, color:'#8a6f4e', lineHeight:1.5 }}>
          ⚠️ ดึงรายชื่อ table จาก database ไม่สำเร็จ — ใช้รายชื่อสำรองแทน
          อาจไม่ครบทุก table กรุณาตรวจสอบ RPC <code>list_public_tables()</code>
        </div>
      )}

      {/* Select Tables */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
          color: S.textMid, letterSpacing: .6, marginBottom: 12 }}>
          เลือก Table ({selectedCount}/{tables.length})
        </div>

        <label style={labelStyle}>
          <input type="checkbox" checked={isAllSelected}
            onChange={e => handleSelectAll(e.target.checked)}
            style={checkboxStyle} />
          <strong>เลือกทั้งหมด</strong>
        </label>

        <div style={{ marginLeft: 24, marginTop: 8 }}>
          {tables.map(table => (
            <label key={table} style={labelStyle}>
              <input type="checkbox" checked={selectedTables[table] || false}
                onChange={e => handleSelectTable(table, e.target.checked)}
                style={checkboxStyle} />
              {table}
            </label>
          ))}
        </div>
      </div>

      {/* Format */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
          color: S.textMid, letterSpacing: .6, marginBottom: 12 }}>
          Format Export
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['sql', 'json', 'csv'].map(fmt => (
            <button key={fmt} onClick={() => setFormat(fmt)}
              style={buttonStyle(format === fmt)}>
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <button onClick={handleExport} disabled={exporting || selectedCount === 0}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 12,
          background: selectedCount === 0 ? S.border : S.ink,
          color: '#fff', border: 'none', fontSize: 14, fontWeight: 600,
          cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
          opacity: exporting ? 0.7 : 1
        }}>
        {exporting ? '⏳ Processing...' : `⬇ Export ${selectedCount > 0 ? selectedCount : 'Tables'}`}
      </button>

      {/* Status */}
      {status && (
        <div style={{
          marginTop: 12, padding: 12, borderRadius: 8,
          background: status.includes('✓') ? '#f0f9f0' : '#f9f0f0',
          color: status.includes('✓') ? '#2d6a2d' : '#8b3a3a',
          fontSize: 12, textAlign: 'center'
        }}>
          {status}
        </div>
      )}

      <div style={{ marginTop: 20, padding: 12, borderRadius: 8,
        background: S.bg, fontSize: 12, color: S.textMid, lineHeight: 1.6 }}>
        <strong>📌 ข้อมูล:</strong>
        <br />• SQL: Restore ได้โดยรัน statement ตรงๆ
        <br />• JSON: อ่านง่าย เหมาะสำหรับ log
        <br />• CSV: เปิดด้วย Excel/Google Sheets
      </div>
    </div>
  )
}
