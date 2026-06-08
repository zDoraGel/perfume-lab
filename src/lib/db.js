import { supabase } from './supabase'

export const db = {
  // ── Materials ──────────────────────────────────────────────────────────────
  async getMaterials() {
    const { data } = await supabase.from('materials').select('*').order('name')
    return data || []
  },
  async createMaterial(data) {
    const { data: d } = await supabase.from('materials').insert(data).select().single()
    return d
  },
  async updateMaterial(id, data) {
    await supabase.from('materials').update(data).eq('id', id)
  },
  async deleteMaterial(id) {
    await supabase.from('materials').delete().eq('id', id)
  },

  // ── Material Aliases ────────────────────────────────────────────────────────
  async getAliases(materialId) {
    const { data } = await supabase.from('material_aliases')
      .select('*').eq('material_id', materialId).order('id')
    return data || []
  },
  // รับ array of ids — ใช้ใน FormulaCard
  async getAliasesByIds(materialIds) {
    if (!materialIds?.length) return []
    const ids = materialIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n))
    if (!ids.length) return []
    const { data, error } = await supabase.from('material_aliases')
      .select('*').in('material_id', ids)
    if (error) console.error('getAliasesByIds error:', error)
    return data || []
  },
  async createAlias(materialId, marketName, description, keywords, context) {
    const { data } = await supabase.from('material_aliases')
      .insert({ material_id: materialId, market_name: marketName,
        description: description || null, keywords: keywords || null,
        context: context || null })
      .select().single()
    return data
  },
  async updateAlias(id, marketName, description, keywords, context) {
    await supabase.from('material_aliases')
      .update({ market_name: marketName, description: description || null,
        keywords: keywords || null, context: context || null })
      .eq('id', id)
  },
  async deleteAlias(id) {
    await supabase.from('material_aliases').delete().eq('id', id)
  },
  async getAllAliases() {
    const { data } = await supabase.from('material_aliases')
      .select('*, material:materials(name, family)')
    return data || []
  },


  // ── Material Traits ────────────────────────────────────────────────────────
  async getMaterialTraits(materialIds) {
    if (!materialIds?.length) return []
    // cast เป็น number เพราะ material_id เป็น int8
    const ids = materialIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n))
    if (!ids.length) return []
    const { data, error } = await supabase
      .from('material_traits')
      .select('*')
      .in('material_id', ids)
    if (error) console.error('getMaterialTraits error:', error)
    return data || []
  },
  async upsertTrait(materialId, traits) {
    const id = parseInt(materialId, 10)
    // check ก่อนว่ามี row อยู่ไหม
    const { data: existing } = await supabase
      .from('material_traits')
      .select('material_id')
      .eq('material_id', id)
      .maybeSingle()

    const payload = { ...traits, updated_at: new Date().toISOString() }

    if (existing) {
      // update
      const { data, error } = await supabase
        .from('material_traits')
        .update(payload)
        .eq('material_id', id)
        .select().single()
      if (error) console.error('upsertTrait update error:', error)
      return data
    } else {
      // insert
      const { data, error } = await supabase
        .from('material_traits')
        .insert({ material_id: id, ...payload })
        .select().single()
      if (error) console.error('upsertTrait insert error:', error)
      return data
    }
  },

  // ── Formulas ───────────────────────────────────────────────────────────────
  async getFormulas() {
    const { data } = await supabase.from('formulas').select('*').order('created_at', { ascending: false })
    return data || []
  },
  async getFormula(id) {
    const { data } = await supabase.from('formulas').select('*').eq('id', id).single()
    return data
  },
  async updateFormula(id, fields) {
    await supabase.from('formulas').update(fields).eq('id', id)
  },
  async createFormula(name, vibe, description, nameMeaning, dna = {}) {
    const { data } = await supabase.from('formulas')
      .insert({
        name, vibe, description, name_meaning: nameMeaning || null,
        projection:    dna.projection    || null,
        texture:       dna.texture       || null,
        temperature:   dna.temperature   || null,
        feeling:       dna.feeling       || null,
        opening_style: dna.opening_style || null,
        avoid:         dna.avoid         || null,
        complexity:    dna.complexity    || 'standard',
      })
      .select().single()
    return data
  },

  // ── Formula Versions ───────────────────────────────────────────────────────
  async getVersions(formulaId) {
    const { data } = await supabase.from('formula_versions')
      .select('*').eq('formula_id', formulaId).order('ver')
    return data || []
  },
  async createVersion(formulaId, ver, status, rating, notes, blendDate, batchMl, dnaActual = {}) {
    const { data } = await supabase.from('formula_versions')
      .insert({
        formula_id: formulaId, ver, status, rating, notes,
        blend_date: blendDate, batch_ml: batchMl || 15,
        projection_actual: dnaActual.projection_actual || null,
        longevity_actual:  dnaActual.longevity_actual  || null,
        personal_note:     dnaActual.personal_note     || null,
      })
      .select().single()
    return data
  },
  async updateVersion(id, status, rating, notes, blendDate) {
    await supabase.from('formula_versions')
      .update({ status, rating, notes, blend_date: blendDate }).eq('id', id)
  },

  // ── Formula Items ──────────────────────────────────────────────────────────
  async getItems(versionId) {
    const { data } = await supabase.from('formula_items')
      .select('*, material:materials(*)').eq('version_id', versionId)
    return data || []
  },
  async createItems(versionId, ingredients) {
    function getDensity(family) {
      if (['Citrus','Fresh'].includes(family)) return 0.88
      if (['Woody','Ambery','Gourmand'].includes(family)) return 1.05
      return 0.95
    }
    await supabase.from('formula_items').insert(
      ingredients.map(i => ({
        version_id:  versionId,
        material_id: i.materialId,
        grams:       i.grams,
        ml:          i.ml != null
          ? i.ml
          : parseFloat((i.grams / getDensity(i.family || '')).toFixed(4)),
      }))
    )
  },
  async deleteItems(versionId) {
    await supabase.from('formula_items').delete().eq('version_id', versionId)
  },

  // ── Accords ────────────────────────────────────────────────────────────────
  async getAccords() {
    const { data } = await supabase.from('accords').select('*')
      .order('created_at', { ascending: false })
    return data || []
  },
  async createAccord(name, vibe, description, category, strength) {
    const { data } = await supabase.from('accords')
      .insert({ name, vibe, description, category, strength }).select().single()
    return data
  },

  // ── Accord Versions ────────────────────────────────────────────────────────
  async getAccordVersions(accordId) {
    const { data } = await supabase.from('accord_versions')
      .select('*').eq('accord_id', accordId).order('ver')
    return data || []
  },
  async createAccordVersion(accordId, ver, notes) {
    const { data } = await supabase.from('accord_versions')
      .insert({ accord_id: accordId, ver, notes }).select().single()
    return data
  },

  // ── Accord Items ───────────────────────────────────────────────────────────
  async getAccordItems(versionId) {
    const { data } = await supabase.from('accord_items')
      .select('*, material:materials(*)').eq('version_id', versionId)
    return data || []
  },
  async createAccordItems(versionId, ingredients) {
    await supabase.from('accord_items').insert(
      ingredients.map(i => ({ version_id: versionId, material_id: i.materialId, grams: i.grams }))
    )
  },

  // ── Production Batches ─────────────────────────────────────────────────────
  async getBatches(formulaId) {
    const { data } = await supabase
      .from('production_batches')
      .select('*')
      .eq('formula_id', formulaId)
      .order('produced_at', { ascending: false })
    return data || []
  },
  async createBatch(formulaId, { concentration, bottle_ml, qty_produced, produced_at, notes }) {
    const { data, error } = await supabase
      .from('production_batches')
      .insert({
        formula_id:   formulaId,
        concentration,
        bottle_ml:    parseInt(bottle_ml),
        qty_produced: parseInt(qty_produced),
        qty_sold:     0,
        produced_at:  produced_at || new Date().toISOString().split('T')[0],
        notes:        notes || null,
      })
      .select().single()
    if (error) console.error('createBatch error:', error)
    return data
  },
  async updateBatchSold(batchId, qty_sold) {
    const { data } = await supabase
      .from('production_batches')
      .update({ qty_sold: parseInt(qty_sold) })
      .eq('id', batchId)
      .select().single()
    return data
  },
  // ── Aging Logs ─────────────────────────────────────────────────────────────
  async getAgingLogs(batchId) {
    const { data } = await supabase.from('aging_logs')
      .select('*').eq('batch_id', batchId)
      .order('day_number', { ascending: true })
    return data || []
  },
  async createAgingLog(batchId, formulaId, { day_number, rating, note }) {
    const { data } = await supabase.from('aging_logs')
      .insert({ batch_id:batchId, formula_id:formulaId,
        day_number, rating, note, logged_at: new Date().toISOString() })
      .select().single()
    return data
  },
  async deleteAgingLog(id) {
    await supabase.from('aging_logs').delete().eq('id', id)
  },
  // ── Stock Deduction from Batch ─────────────────────────────────────────────
  // เมื่อสร้าง batch ใหม่ ให้หัก stock วัตถุดิบอัตโนมัติ
  // batch_ml = ปริมาณทั้งหมด (bottle_ml × qty)
  // สูตร: หักตาม grams ratio ของแต่ละ item ใน version ล่าสุด
  async deductStockFromBatch(formulaId, totalMl) {
    // หา version ล่าสุด
    const versions = await this.getVersions(formulaId)
    if (!versions.length) return { ok: false, reason: 'no versions' }
    const latest = versions[versions.length - 1]
    const batchMl = parseFloat(totalMl)
    if (!batchMl || batchMl <= 0) return { ok: false, reason: 'invalid ml' }

    // หา items ของ version นั้น
    const items = await this.getItems(latest.id)
    if (!items.length) return { ok: false, reason: 'no items' }

    // คำนวณ total grams ของสูตร (per batch_ml ของ version)
    const totalG = items.reduce((s, i) => s + parseFloat(i.grams || 0), 0)
    if (!totalG) return { ok: false, reason: 'no grams' }

    // version batch_ml (default 15ml ถ้าไม่มี)
    const versionMl = parseFloat(latest.batch_ml || 15)
    const ratio = batchMl / versionMl

    // หักแต่ละ material
    const errors = []
    for (const item of items) {
      const deductG = parseFloat(item.grams || 0) * ratio
      if (!deductG || !item.material_id) continue
      const { error } = await supabase.rpc('deduct_material_stock', {
        p_material_id: parseInt(item.material_id),
        p_grams: parseFloat(deductG.toFixed(4)),
      })
      if (error) {
        // fallback: manual update
        const { data: mat } = await supabase.from('materials')
          .select('stock').eq('id', item.material_id).single()
        const newStock = Math.max(0, (parseFloat(mat?.stock || 0) - deductG))
        await supabase.from('materials')
          .update({ stock: parseFloat(newStock.toFixed(4)) })
          .eq('id', item.material_id)
      }
    }
    return { ok: true, itemsDeducted: items.length, ratio }
  },

  async getStock(formulaId) {
    const batches = await this.getBatches(formulaId)
    const map = {}
    batches.forEach(b => {
      const key = `${b.concentration}_${b.bottle_ml}`
      if (!map[key]) map[key] = { concentration: b.concentration, bottle_ml: b.bottle_ml, produced: 0, sold: 0 }
      map[key].produced += b.qty_produced
      map[key].sold     += b.qty_sold
    })
    return Object.values(map).map(s => ({ ...s, remaining: s.produced - s.sold }))
  },
}
