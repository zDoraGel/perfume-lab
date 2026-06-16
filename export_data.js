// export_data.js
// รันด้วย: node export_data.js
// ต้องมี .env ในโฟลเดอร์เดียวกัน หรือ set VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY

const https = require('https')
const fs    = require('fs')

// ── Load env ──────────────────────────────────────────────────────────────────
let SUPABASE_URL  = process.env.VITE_SUPABASE_URL
let SUPABASE_KEY  = process.env.VITE_SUPABASE_ANON_KEY

// try load from .env file
if (!SUPABASE_URL) {
  try {
    const env = fs.readFileSync('.env', 'utf8')
    for (const line of env.split('\n')) {
      const [k, ...v] = line.split('=')
      if (k === 'VITE_SUPABASE_URL')      SUPABASE_URL = v.join('=').trim()
      if (k === 'VITE_SUPABASE_ANON_KEY') SUPABASE_KEY = v.join('=').trim()
    }
  } catch(e) {}
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ไม่พบ VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY')
  console.error('   ใส่ใน .env หรือ export ก่อนรัน script')
  process.exit(1)
}

// ── Fetch helper ──────────────────────────────────────────────────────────────
function fetchTable(table, select = '*', extra = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}?select=${select}${extra}&limit=10000`)
    const options = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept':        'application/json',
      }
    }
    https.get(options, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch(e) { resolve([]) }
      })
    }).on('error', reject)
  })
}

// ── SQL helpers ───────────────────────────────────────────────────────────────
function escStr(val) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'number') return String(val)
  if (Array.isArray(val)) {
    if (val.length === 0) return "ARRAY[]::text[]"
    return `ARRAY[${val.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]`
  }
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
  return `'${String(val).replace(/'/g, "''")}'`
}

function toInsert(table, rows, resetSeq = true) {
  if (!rows || rows.length === 0) return `-- (ไม่มีข้อมูลใน ${table})\n`

  const lines = []
  lines.push(`-- ── ${table} (${rows.length} rows) ──`)

  for (const row of rows) {
    const cols = Object.keys(row)
    const vals = cols.map(c => escStr(row[c]))
    lines.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT (id) DO NOTHING;`)
  }

  // reset sequence
  if (resetSeq) {
    lines.push(`SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${table}), 1));`)
  }
  lines.push('')
  return lines.join('\n')
}

// ── Tables to export (ordered by dependency) ─────────────────────────────────
const TABLES = [
  'materials',
  'material_aliases',
  'material_traits',
  'formulas',
  'formula_versions',
  'formula_version_items',
  'formula_items',
  'production_batches',
  'aging_logs',
  'accords',
  'accord_versions',
  'accord_items',
  'retail_stock',
  'retail_stock_logs',
  'trend_items',
  'quick_notes',
]

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 กำลังดึงข้อมูลจาก Supabase...')

  const lines = []
  lines.push(`-- ============================================================`)
  lines.push(`-- LINEN THEORY — Data Export`)
  lines.push(`-- Generated: ${new Date().toISOString()}`)
  lines.push(`-- ============================================================`)
  lines.push(``)
  lines.push(`-- ปิด triggers ชั่วคราวระหว่าง import`)
  lines.push(`SET session_replication_role = 'replica';`)
  lines.push(``)

  for (const table of TABLES) {
    process.stdout.write(`  → ${table}... `)
    try {
      const rows = await fetchTable(table)
      if (Array.isArray(rows) && rows.length !== undefined) {
        console.log(`${rows.length} rows`)
        lines.push(toInsert(table, rows))
      } else {
        console.log(`skip (error หรือ table ไม่มี)`)
        lines.push(`-- (skip: ${table})\n`)
      }
    } catch(e) {
      console.log(`error: ${e.message}`)
      lines.push(`-- (error: ${table})\n`)
    }
  }

  lines.push(`-- เปิด triggers กลับ`)
  lines.push(`SET session_replication_role = 'origin';`)
  lines.push(``)
  lines.push(`-- ============================================================`)
  lines.push(`-- Import เสร็จแล้ว!`)
  lines.push(`-- ============================================================`)

  const output = lines.join('\n')
  const filename = `linen_theory_data_${new Date().toISOString().slice(0,10)}.sql`
  fs.writeFileSync(filename, output, 'utf8')
  console.log(`\n✅ บันทึกแล้ว: ${filename}`)
  console.log(`   ขนาด: ${(output.length / 1024).toFixed(1)} KB`)
}

main().catch(e => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
