import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { S } from '../constants/theme'

const TABLES = [
  'formulas', 'formula_versions', 'materials', 'material_aliases',
  'production_batches', 'aging_logs',
  'customers', 'orders', 'order_items'
]

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
  const [selectedTables, setSelectedTables] = useState({})
  const [format, setFormat] = useState('sql')
  const [exporting, setExporting] = useState(false)
  const [status, setStatus] = useState('')

  const handleSelectAll = (checked) => {
    const newSelected = {}
    TABLES.forEach(t => newSelected[t] = checked)
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

      // Query ทุก table
      for (const table of tablesToExport) {
        const { data, error } = await supabase.from(table).select('*')
        if (error) throw error

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

      setStatus(`✓ Export สำเร็จ — ${tablesToExport.length} table`)
    } catch (err) {
      setStatus(`✗ Error: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const isAllSelected = TABLES.every(t => selectedTables[t])
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

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, color: S.ink }}>
        💾 Backup Database
      </div>

      {/* Select Tables */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
          color: S.textMid, letterSpacing: .6, marginBottom: 12 }}>
          เลือก Table ({selectedCount}/{TABLES.length})
        </div>

        <label style={labelStyle}>
          <input type="checkbox" checked={isAllSelected}
            onChange={e => handleSelectAll(e.target.checked)}
            style={checkboxStyle} />
          <strong>เลือกทั้งหมด</strong>
        </label>

        <div style={{ marginLeft: 24, marginTop: 8 }}>
          {TABLES.map(table => (
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
