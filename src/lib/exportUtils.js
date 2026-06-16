/**
 * Export Utils — PDF และ CSV/Excel
 * ใช้ jspdf + jspdf-autotable สำหรับ PDF
 * ใช้ xlsx สำหรับ Excel
 */

import * as XLSX from 'xlsx'

// ── Density helper ─────────────────────────────────────────────────────────────
function getDensity(family) {
  if (['Citrus','Fresh'].includes(family)) return 0.88
  if (['Woody','Ambery','Gourmand'].includes(family)) return 1.05
  return 0.95
}


// ── Strip Thai characters ──────────────────────────────────────────────────────
function stripThai(str) {
  if (!str) return ''
  return str.replace(/[\u0E00-\u0E7F]+/g, '').replace(/\s+/g, ' ').trim()
}

// ── CSV/Excel Export ───────────────────────────────────────────────────────────

/**
 * Export Formulas + Versions + Ingredients เป็น Excel
 */
export async function exportFormulasToExcel(formulas, getAllVersionsAndItems) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Formulas summary
  const formulaRows = [
    ['Formula Name', 'Name Meaning', 'Vibe', 'Versions', 'Best Rating', 'Created']
  ]
  for (const f of formulas) {
    const { versions } = await getAllVersionsAndItems(f.id)
    const bestRating = versions.filter(v => v.rating).length
      ? Math.max(...versions.filter(v => v.rating).map(v => v.rating))
      : '-'
    formulaRows.push([
      f.name,
      f.name_meaning || '',
      f.vibe || '',
      versions.length,
      bestRating,
      f.created_at ? f.created_at.slice(0,10) : '',
    ])
  }
  const ws1 = XLSX.utils.aoa_to_sheet(formulaRows)
  ws1['!cols'] = [{ wch:20 },{ wch:30 },{ wch:40 },{ wch:10 },{ wch:12 },{ wch:12 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Formulas')

  // Sheet 2: All versions + ingredients
  const versionRows = [
    ['Formula', 'Version', 'Status', 'Rating', 'Blend Date', 'Batch ml',
     'Notes', 'Projection', 'Longevity', 'Personal Note',
     'Ingredient', 'Family', 'Role', 'Grams', 'ml']
  ]
  for (const f of formulas) {
    const { versions, itemsByVersion } = await getAllVersionsAndItems(f.id)
    for (const v of versions) {
      const items = itemsByVersion[v.id] || []
      if (items.length === 0) {
        versionRows.push([
          f.name, `V${v.ver}`, v.status, v.rating || '',
          v.blend_date || '', v.batch_ml || 15, v.notes || '',
          v.projection_actual || '', v.longevity_actual || '', v.personal_note || '',
          '', '', '', '', ''
        ])
      } else {
        items.forEach((item, idx) => {
          const density = getDensity(item.material?.family)
          const ml = item.ml ? parseFloat(item.ml) : parseFloat(item.grams) / density
          const role = item.material?.evaporation || ''
          versionRows.push([
            idx === 0 ? f.name : '',
            idx === 0 ? `V${v.ver}` : '',
            idx === 0 ? v.status : '',
            idx === 0 ? (v.rating || '') : '',
            idx === 0 ? (v.blend_date || '') : '',
            idx === 0 ? (v.batch_ml || 15) : '',
            idx === 0 ? (v.notes || '') : '',
            idx === 0 ? (v.projection_actual || '') : '',
            idx === 0 ? (v.longevity_actual || '') : '',
            idx === 0 ? (v.personal_note || '') : '',
            item.material?.name || '',
            item.material?.family || '',
            role,
            parseFloat(item.grams).toFixed(4),
            ml.toFixed(2),
          ])
        })
      }
    }
  }
  const ws2 = XLSX.utils.aoa_to_sheet(versionRows)
  ws2['!cols'] = [
    { wch:18 },{ wch:8 },{ wch:10 },{ wch:8 },{ wch:12 },{ wch:10 },
    { wch:30 },{ wch:12 },{ wch:12 },{ wch:25 },
    { wch:20 },{ wch:12 },{ wch:8 },{ wch:8 },{ wch:8 }
  ]
  XLSX.utils.book_append_sheet(wb, ws2, 'Versions & Ingredients')

  // Download
  XLSX.writeFile(wb, `perfume-lab-formulas-${new Date().toISOString().slice(0,10)}.xlsx`)
}

/**
 * Export Materials Stock List เป็น Excel
 */
export function exportMaterialsToExcel(materials) {
  const wb   = XLSX.utils.book_new()
  const rows = [
    ['Name', 'Family', 'Evaporation', 'Stock (g)', 'Cost (฿/g)',
     'Purchase Price (฿)', 'Purchase Size (g)', 'Dilution (%)', 'Supplier', 'Notes', 'CAS']
  ]
  materials.forEach(m => {
    rows.push([
      m.name || '',
      m.family || '',
      m.evaporation || '',
      m.stock || 0,
      m.cost || '',
      m.purchase_price || '',
      m.purchase_size || '',
      m.dilution || '',
      m.supplier || '',
      m.notes || '',
      m.cas || '',
    ])
  })

  // Summary row
  rows.push([])
  const totalValue = materials.reduce((s,m) => s + (m.stock||0)*(m.cost||0), 0)
  rows.push(['Total materials', materials.length, '', '', '', '', '', '', '', `Stock value: ฿${totalValue.toFixed(2)}`])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch:22 },{ wch:12 },{ wch:12 },{ wch:10 },{ wch:12 },
    { wch:16 },{ wch:16 },{ wch:12 },{ wch:16 },{ wch:30 },{ wch:14 }
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Materials Stock')
  XLSX.writeFile(wb, `perfume-lab-materials-${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── PDF Export ─────────────────────────────────────────────────────────────────

/**
 * Export Formula detail เป็น PDF
 * ใช้ jspdf + jspdf-autotable
 */
export async function exportFormulaToPDF(formula, versions, itemsByVersion, shareMode = false) {
  const { jsPDF }     = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc  = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
  const W    = 210
  let   y    = 20

  // ── Header ──
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(18)
  doc.setTextColor(42, 35, 28)
  doc.text(formula.name, W/2, y, { align:'center' })
  y += 6

  if (formula.name_meaning) {
    doc.setFontSize(10)
    doc.setTextColor(138, 111, 62)
    doc.text(`* ${stripThai(formula.name_meaning)}`, W/2, y, { align:'center' })
    y += 4
  }

  if (formula.vibe) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(107, 101, 96)
    const vibeShort = stripThai(formula.vibe).slice(0, 220)
    const vibeLines = doc.splitTextToSize(vibeShort, 160)
    doc.text(vibeLines, W/2, y, { align:'center' })
    y += vibeLines.length * 3.5 + 3
  }

  // divider
  doc.setDrawColor(212, 184, 150)
  doc.line(20, y, W-20, y)
  y += 5

  // ── DNA Summary ──
  if (formula.projection || formula.texture || formula.feeling) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(138, 111, 62)
    doc.text('FORMULA DNA', 20, y)
    y += 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(107, 101, 96)

    if (formula.projection) {
      doc.text(`Projection: ${formula.projection}`, 20, y); y += 3
    }
    if (formula.texture) {
      doc.text(`Texture: ${formula.texture.split(',').join(' · ')}`, 20, y); y += 3
    }
    if (formula.feeling) {
      doc.text(`Feeling: ${stripThai(formula.feeling.split(',').join(' · '))}`, 20, y); y += 3
    }
    if (formula.opening_style) {
      doc.text(`Opening: ${formula.opening_style.split(',').join(' + ')}`, 20, y); y += 3
    }
    y += 3
    doc.setDrawColor(232, 228, 220)
    doc.line(20, y, W-20, y)
    y += 5
  }

  // ── Versions ──
  const versionsToExport = shareMode
    ? versions.filter(v => v.is_final || v.status === 'Final' || v.final_date)
    : versions

  // ถ้า shareMode ไม่มี Final version เลย ใช้ version ล่าสุดแทน
  const exportVersions = (shareMode && versionsToExport.length === 0)
    ? versions.slice(-1)
    : versionsToExport

  for (const v of exportVersions) {
    const items = itemsByVersion[v.id] || []
    if (items.length === 0) continue

    // Version header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(42, 35, 28)
    doc.setFontSize(10)
    const vLabel = shareMode ? 'Final Formula' : `Version ${v.ver}  ·  ${v.status}${v.rating ? `  ·  ${v.rating}/10` : ''}`
    doc.text(vLabel, 20, y)
    y += 4

    if (v.blend_date) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(107, 101, 96)
      doc.text(`Blend date: ${v.blend_date}  ·  Batch: ${v.batch_ml || 15}ml`, 20, y)
      y += 3
    }

    if (v.notes) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(107, 101, 96)
      const noteLines = doc.splitTextToSize(`"${stripThai(v.notes)}"`, 160)
      doc.text(noteLines, 20, y)
      y += noteLines.length * 3.5 + 1
    }

    // Ingredients table
    const total = items.reduce((s,i) => s + parseFloat(i.grams||0), 0)
    const validItems = items.filter(item => item.material?.name)

    // Alias deduplication สำหรับ shareMode
    const aliasMap = {}
    if (shareMode) {
      const aliasCount = {}
      validItems.forEach(item => {
        const aliases = item.material?.material_aliases || item.material?.aliases || []
        const base    = aliases[0]?.market_name || item.material?.family || item.material?.name || ''
        aliasCount[base] = (aliasCount[base] || 0) + 1
      })
      const seen = {}
      validItems.forEach(item => {
        const aliases = item.material?.material_aliases || item.material?.aliases || []
        const base    = aliases[0]?.market_name || item.material?.family || item.material?.name || ''
        seen[base]    = (seen[base] || 0) + 1
        aliasMap[item.material_id] = aliasCount[base] > 1 ? `${base} ${seen[base]}` : base
      })
    }

    const tableData = validItems.map(item => {
      const density  = getDensity(item.material?.family)
      const ml       = item.ml ? parseFloat(item.ml) : parseFloat(item.grams) / density
      const pct      = total > 0 ? ((item.grams / total) * 100).toFixed(1) : 0
      const dispName = shareMode
        ? (aliasMap[item.material_id] || item.material?.family || item.material?.name || '')
        : (item.material?.name || '')
      return [
        dispName,
        shareMode ? '' : (item.material?.family || ''),
        shareMode ? '' : (item.material?.evaporation || ''),
        `${parseFloat(item.grams).toFixed(3)}g`,
        `${ml.toFixed(2)}ml`,
        `${pct}%`,
      ]
    })

    autoTable(doc, {
      startY: y,
      head: [shareMode
        ? ['Ingredient', 'Grams', 'ml', '%']
        : ['Ingredient', 'Family', 'Role', 'Grams', 'ml', '%']],
      body: shareMode
        ? tableData.map(r => [r[0], r[3], r[4], r[5]])
        : tableData,
      foot: [shareMode
        ? ['Total', `${total.toFixed(3)}g`, '', '100%']
        : ['Total', '', '', `${total.toFixed(3)}g`, '', '100%']],
      margin: { left:20, right:20 },
      styles: { fontSize:7.5, cellPadding:1.5 },
      headStyles: { fillColor:[138, 111, 62], textColor:255, fontSize:8 },
      footStyles: { fillColor:[240, 232, 216], textColor:[42,35,28], fontStyle:'bold' },
      alternateRowStyles: { fillColor:[252, 250, 246] },
    })

    y = doc.lastAutoTable.finalY + 5

    if (v.personal_note) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(138, 111, 62)
      doc.text(`Personal note: "${stripThai(v.personal_note)}"`, 20, y)
      y += 8
    }

    // New page if needed — เกิน 270 ค่อยขึ้นหน้าใหม่
    if (y > 270) {
      doc.addPage()
      y = 20
    }
  }

  // ── Footer ──
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(176, 171, 164)
  doc.text(`Perfume Lab  ·  Export ${new Date().toLocaleDateString('th-TH')}`, W/2, 290, { align:'center' })

  doc.save(`${formula.name.replace(/\s+/g,'-')}-formula.pdf`)
}

/**
 * Export Materials Stock List เป็น PDF
 */
export async function exportMaterialsToPDF(materials) {
  const { jsPDF }     = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' })
  const W   = 297

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(18)
  doc.setTextColor(42, 35, 28)
  doc.text('Materials Stock List', W/2, 18, { align:'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 101, 96)
  doc.text(`${materials.length} materials  ·  Export ${new Date().toLocaleDateString('th-TH')}`, W/2, 25, { align:'center' })

  const totalValue = materials.reduce((s,m) => s + (m.stock||0)*(m.cost||0), 0)

  const tableData = materials.map(m => [
    m.name || '',
    m.family || '',
    m.evaporation || '',
    `${(m.stock||0).toFixed(1)}g`,
    m.cost ? `฿${m.cost}` : '-',
    m.purchase_price && m.purchase_size ? `฿${m.purchase_price}/${m.purchase_size}g` : '-',
    m.supplier || '-',
    m.notes || '-',
  ])

  autoTable(doc, {
    startY: 30,
    head: [['Name', 'Family', 'Role', 'Stock', 'Cost/g', 'Purchase', 'Supplier', 'Notes']],
    body: tableData,
    foot: [[`Total: ${materials.length} items`, '', '', '', '', '', '', `Stock value: ฿${totalValue.toFixed(2)}`]],
    margin: { left:15, right:15 },
    styles: { fontSize:7.5, cellPadding:1.5 },
    headStyles: { fillColor:[138, 111, 62], textColor:255 },
    footStyles: { fillColor:[240, 232, 216], textColor:[42,35,28], fontStyle:'bold' },
    alternateRowStyles: { fillColor:[252, 250, 246] },
    columnStyles: {
      0: { cellWidth:45 }, 1: { cellWidth:20 }, 2: { cellWidth:15 },
      3: { cellWidth:18 }, 4: { cellWidth:18 }, 5: { cellWidth:25 },
      6: { cellWidth:25 }, 7: { cellWidth:55 },
    }
  })

  doc.save(`perfume-lab-materials-${new Date().toISOString().slice(0,10)}.pdf`)
}
