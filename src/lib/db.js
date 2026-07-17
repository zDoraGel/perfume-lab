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
  async setFinal(id, agingDays = 14) {
    const finalDate = new Date().toISOString().split('T')[0]
    await supabase.from('formula_versions')
      .update({ is_final: true, final_date: finalDate, aging_days: agingDays, status: 'Success' })
      .eq('id', id)
  },
  async setRevisionNote(id, note) {
    await supabase.from('formula_versions')
      .update({ revision_note: note }).eq('id', id)
  },

  // ── Formula Items ──────────────────────────────────────────────────────────
  async getItems(versionId) {
    const { data } = await supabase.from('formula_items')
      .select('*, material:materials(*, material_aliases(market_name, description))').eq('version_id', versionId)
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

  // ── Cost per Gram/Drop (สำหรับ giveaway) ────────────────────────────────────
  // คำนวณต้นทุนของ "น้ำหอมสำเร็จ" (concentrate + alcohol + ขวด) ต่อ ml/กรัม/หยด
  // ใช้ rate เดียวกับ preview ใน PageProduction.jsx: alcohol ฿0.35/ml, bottle cost ตาม size
  async getCostPerUnit(versionId, batch) {
    const items = await this.getItems(versionId)
    const concentrateGrams = items.reduce((s, i) => s + (i.grams || 0), 0)
    const concentrateCostTotal = items.reduce(
      (s, i) => s + (i.grams || 0) * (i.material?.cost || 0), 0
    )
    const costPerGramConcentrate = concentrateGrams > 0
      ? concentrateCostTotal / concentrateGrams : 0

    // ปริมาณ concentrate ที่ใช้จริงต่อขวด (ml) → แปลงเป็นกรัมด้วยความถ่วงจำเพาะเฉลี่ย
    const CONCENTRATE_DENSITY = 0.95 // g/ml เฉลี่ยของน้ำหอมเข้มข้น
    const concentrateMlPerBottle = batch?.concentrate_ml || 0
    const concentrateGramsPerBottle = concentrateMlPerBottle * CONCENTRATE_DENSITY
    const concentrateCostPerBottle = concentrateGramsPerBottle * costPerGramConcentrate

    const ALCOHOL_RATE = 0.35 // ฿/ml — ตรงกับ PageProduction preview
    const alcoholCostPerBottle = (batch?.alcohol_ml_per_bottle || 0) * ALCOHOL_RATE

    const BOTTLE_COST = { 5:35, 10:55, 15:65, 30:90, 50:130, 100:200 }
    const bottleCostEach = BOTTLE_COST[batch?.bottle_ml] || 90

    const totalCostPerBottle = concentrateCostPerBottle + alcoholCostPerBottle + bottleCostEach
    const bottleMl = batch?.bottle_ml || 1
    const costPerMl = totalCostPerBottle / bottleMl

    const FINISHED_DENSITY = 0.88 // g/ml ของน้ำหอมเจือจางแล้ว (ไม่ใช่ concentrate ดิบ)
    const ML_PER_DROP = 0.05

    return {
      costPerGramConcentrate,
      concentrateCostPerBottle,
      alcoholCostPerBottle,
      bottleCostEach,
      totalCostPerBottle,
      costPerMl,
      costPerGram: costPerMl * FINISHED_DENSITY,
      costPerDrop: costPerMl * ML_PER_DROP,
    }
  },

  // บันทึกการแจก giveaway/sample — หักสต็อก batch (qty_sold เสมือนขายแล้ว ป้องกันนับ remaining ผิด)
  // และคืนค่าต้นทุนที่ใช้ไป สำหรับบันทึกเป็น expense
  async logGiveaway(batchId, versionId, mlGiven, note) {
    const { data: batch } = await supabase
      .from('production_batches').select('*').eq('id', batchId).single()
    if (!batch) throw new Error('Batch not found')

    const unitCost = await this.getCostPerUnit(versionId, batch)
    const costOfGiveaway = unitCost.costPerMl * mlGiven

    // หัก "เสมือนขาย" จาก batch (กันนับเป็น remaining stock จริงทั้งที่แจกไปแล้ว)
    // ใช้สัดส่วน ml ต่อขวดแปลงเป็นจำนวนขวดเทียบเท่า
    const bottlesEquivalent = mlGiven / (batch.bottle_ml || 1)

    const { data, error } = await supabase
      .from('giveaway_logs')
      .insert({
        batch_id: batchId,
        formula_id: batch.formula_id,
        ml_given: mlGiven,
        bottles_equivalent: bottlesEquivalent,
        cost: parseFloat(costOfGiveaway.toFixed(2)),
        note: note || null,
        given_at: new Date().toISOString().split('T')[0],
      })
      .select().single()
    if (error) {
      console.error('logGiveaway error:', error)
      return { success: false, error: error.message }
    }
    return { success: true, log: data, cost: costOfGiveaway }
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
    const batches = data || []
    if (batches.length === 0) return batches

    // ดึงยอด giveaway ของ batch เหล่านี้ มารวม แล้วแปลงเป็น "ขวดเทียบเท่า"
    // เพื่อหักออกจาก remaining stock ด้วย (กันนับสต็อกเหลือผิดทั้งที่แจกไปแล้ว)
    const batchIds = batches.map(b => b.id)
    const { data: giveaways } = await supabase
      .from('giveaway_logs')
      .select('batch_id, ml_given')
      .in('batch_id', batchIds)
    const giveawayMlByBatch = {}
    ;(giveaways || []).forEach(g => {
      giveawayMlByBatch[g.batch_id] = (giveawayMlByBatch[g.batch_id] || 0) + (g.ml_given || 0)
    })

    return batches.map(b => {
      const giveawayMl = giveawayMlByBatch[b.id] || 0
      return {
        ...b,
        giveaway_ml: giveawayMl,
        giveaway_bottles_equivalent: giveawayMl / (b.bottle_ml || 1),
      }
    })
  },

  // ดึง batch ทุกสูตรทีเดียว แล้ว group ตาม formula_id — ใช้โชว์ "ผลิตแล้วหรือยัง" ในหน้า list
  // ไม่ต้องกดเข้าไปทีละสูตร
  async getBatchSummaryByFormula() {
    const { data } = await supabase
      .from('production_batches')
      .select('formula_id, qty_produced, qty_sold, produced_at, stage')
    const summary = {}
    ;(data || []).forEach(b => {
      if (!summary[b.formula_id]) {
        summary[b.formula_id] = { produced: 0, sold: 0, batchCount: 0, lastProducedAt: null, pendingConcentrate: 0 }
      }
      if (b.stage === 'concentrate') {
        // หัวเชื้อที่ยังไม่บรรจุขวด — นับแยก ไม่รวมกับยอด "ผลิตแล้ว" (qty_produced ของแถวนี้เป็นแค่ placeholder ไม่ใช่ขวดจริง)
        summary[b.formula_id].pendingConcentrate += 1
        return
      }
      summary[b.formula_id].produced += b.qty_produced || 0
      summary[b.formula_id].sold     += b.qty_sold || 0
      summary[b.formula_id].batchCount += 1
      if (!summary[b.formula_id].lastProducedAt || b.produced_at > summary[b.formula_id].lastProducedAt) {
        summary[b.formula_id].lastProducedAt = b.produced_at
      }
    })
    return summary
  },
  async createBatch(formulaId, { concentration, bottle_ml, qty_produced, produced_at, notes,
    alcohol_mix, concentrate_ml, alcohol_ml_per_bottle, sell_price }) {
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
        alcohol_mix:           (alcohol_mix && alcohol_mix.length) ? alcohol_mix : null,
        concentrate_ml:        concentrate_ml != null ? parseFloat(concentrate_ml) : null,
        alcohol_ml_per_bottle: alcohol_ml_per_bottle != null ? parseFloat(alcohol_ml_per_bottle) : null,
        sell_price:            sell_price != null ? parseFloat(sell_price) : null,
      })
      .select().single()
    if (error) {
      console.error('createBatch error:', error)
      return { data: null, deduction: null, error }
    }

    // หักสต็อกวัตถุดิบอัตโนมัติตาม batch ที่ผลิตจริง (bottle_ml × qty_produced)
    const totalMl = parseInt(bottle_ml) * parseInt(qty_produced)
    let deduction = null
    try {
      deduction = await this.deductStockFromBatch(formulaId, totalMl)
      if (!deduction.ok) {
        console.warn('deductStockFromBatch skipped:', deduction.reason)
      }
    } catch (e) {
      console.error('deductStockFromBatch error:', e)
      deduction = { ok: false, reason: e.message }
    }

    return { data, deduction, error: null }
  },
  // ── ขั้นตอนที่ 1: ทำหัวเชื้อ — หักวัตถุดิบทันที ยังไม่ผสมแอล/บรรจุขวด ──────────────
  async createConcentrateBatch(formulaId, { concentration, bottle_ml, qty_produced,
    concentrate_made_at, concentrate_ml, notes }) {
    const { data, error } = await supabase
      .from('production_batches')
      .insert({
        formula_id:   formulaId,
        concentration,
        bottle_ml:    Math.round(parseFloat(bottle_ml)), // column เป็น integer — ปัดเศษ ค่าจริงเก็บแยกที่ concentrate_ml
        qty_produced: parseInt(qty_produced),
        qty_sold:     0,
        produced_at:  concentrate_made_at || new Date().toISOString().split('T')[0],
        concentrate_made_at: concentrate_made_at || new Date().toISOString().split('T')[0],
        concentrate_ml: concentrate_ml != null ? parseFloat(concentrate_ml) : null,
        notes:        notes || null,
        stage:        'concentrate',
      })
      .select().single()
    if (error) {
      console.error('createConcentrateBatch error:', error)
      return { data: null, deduction: null, error }
    }

    // หักสต็อกวัตถุดิบของหัวเชื้อทันที (ใช้ปริมาณรวมที่ตั้งใจผลิตคำนวณสัดส่วน)
    const totalMl = parseInt(bottle_ml) * parseInt(qty_produced)
    let deduction = null
    try {
      deduction = await this.deductStockFromBatch(formulaId, totalMl)
      if (!deduction.ok) console.warn('deductStockFromBatch skipped:', deduction.reason)
    } catch (e) {
      console.error('deductStockFromBatch error:', e)
      deduction = { ok: false, reason: e.message }
    }

    return { data, deduction, error: null }
  },

  // ── Opening Balance: บันทึกหัวเชื้อที่ทำไว้ก่อนมีระบบ — ไม่หักวัตถุดิบ ─────────────
  // ใช้กับหัวเชื้อที่มีอยู่จริงในตู้แล้ว (material ถูกใช้ไปในโลกจริงก่อนหน้านี้)
  // ถ้าหัก material ซ้ำจะทำให้สต็อกวัตถุดิบติดลบผิดความจริง
  async createOpeningConcentrate(formulaId, { concentration, concentrate_ml,
    concentrate_made_at, notes }) {
    const ml = parseFloat(concentrate_ml)
    if (!ml || ml <= 0) {
      return { data: null, error: { message: 'ปริมาณหัวเชื้อต้องมากกว่า 0' } }
    }
    const madeAt = concentrate_made_at || new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('production_batches')
      .insert({
        formula_id:   formulaId,
        concentration: concentration || 'SIGNATURE',
        bottle_ml:    Math.round(ml),
        qty_produced: 1,
        qty_sold:     0,
        produced_at:  madeAt,
        concentrate_made_at: madeAt,
        concentrate_ml: ml,
        notes: notes ? `[ยกยอดมา] ${notes}` : '[ยกยอดมา] หัวเชื้อที่ทำไว้ก่อนมีระบบ',
        stage: 'concentrate',
      })
      .select().single()
    if (error) {
      console.error('createOpeningConcentrate error:', error)
      return { data: null, error }
    }
    return { data, error: null }
  },

  // ── ขั้นตอนที่ 2: ผสมแอลกอฮอล์ + บรรจุขวด — ทำให้ batch จาก stage 'concentrate' เป็น 'bottled' ─────
  async completeBottling(batchId, { concentration, bottle_ml, qty_produced, concentrate_used_ml,
    alcohol_mix, alcohol_ml_per_bottle, produced_at, sell_price, notes }) {
    // ดึง batch หัวเชื้อเดิมก่อน เพื่อรู้ว่ามีหัวเชื้อเหลือเท่าไหร่
    const { data: original, error: fetchErr } = await supabase
      .from('production_batches').select('*').eq('id', batchId).single()
    if (fetchErr) return { data: null, error: fetchErr }

    const totalHave  = original.concentrate_ml || 0
    const usedMl      = concentrate_used_ml != null ? parseFloat(concentrate_used_ml) : totalHave
    // ✅ กันหัวเชื้อติดลบ — ใช้เกินที่มีไม่ได้ (เผื่อเรียกจากที่อื่นที่ไม่ผ่าน guard ของ AlcoholMixForm)
    if (usedMl > totalHave + 0.05) {
      return { data: null,
        error: { message: `ใช้หัวเชื้อ ${usedMl}ml เกินที่มีอยู่ (${totalHave}ml)` } }
    }
    const remainingMl = Math.round((totalHave - usedMl) * 100) / 100
    const concentratePerBottle = qty_produced ? usedMl / parseInt(qty_produced) : null

    const bottledFields = {
      concentration,
      bottle_ml:    Math.round(parseFloat(bottle_ml)),
      qty_produced: parseInt(qty_produced),
      qty_sold:     0,
      concentrate_ml: concentratePerBottle,
      produced_at:  produced_at || new Date().toISOString().split('T')[0],
      alcohol_mix:           (alcohol_mix && alcohol_mix.length) ? alcohol_mix : null,
      alcohol_ml_per_bottle: alcohol_ml_per_bottle != null ? parseFloat(alcohol_ml_per_bottle) : null,
      sell_price:            sell_price != null ? parseFloat(sell_price) : null,
      notes:                 notes || null,
      stage:                 'bottled',
    }

    if (remainingMl > 0.05) {
      // ใช้หัวเชื้อไม่หมด — แยกเป็น batch ใหม่ที่ bottled แล้ว เหลือของเดิมไว้เป็น pending ต่อ (ลด concentrate_ml ลง)
      const { error: updErr } = await supabase
        .from('production_batches')
        .update({ concentrate_ml: remainingMl })
        .eq('id', batchId)
      if (updErr) return { data: null, error: updErr }

      const { data: newBatch, error: insErr } = await supabase
        .from('production_batches')
        .insert({
          formula_id: original.formula_id,
          concentrate_made_at: original.concentrate_made_at,
          ...bottledFields,
        })
        .select().single()
      if (insErr) return { data: null, error: insErr }
      return { data: newBatch, error: null, splitFromConcentrate: true, remainingMl }
    }

    // ใช้หัวเชื้อหมด — อัปเดต batch เดิมให้กลายเป็น bottled ไปเลย
    const { data, error } = await supabase
      .from('production_batches')
      .update(bottledFields)
      .eq('id', batchId)
      .select().single()
    if (error) {
      console.error('completeBottling error:', error)
      return { data: null, error }
    }
    return { data, error: null }
  },

  async updateBatch(batchId, { concentration, bottle_ml, qty_produced, produced_at, notes,
    concentrate_made_at, alcohol_mix, concentrate_ml, alcohol_ml_per_bottle, sell_price }) {
    const { data, error } = await supabase
      .from('production_batches')
      .update({
        concentration,
        bottle_ml:    parseInt(bottle_ml),
        qty_produced: parseInt(qty_produced),
        produced_at:  produced_at || new Date().toISOString().split('T')[0],
        notes:        notes || null,
        concentrate_made_at:   concentrate_made_at || null,
        alcohol_mix:           (alcohol_mix && alcohol_mix.length) ? alcohol_mix : null,
        concentrate_ml:        concentrate_ml != null ? parseFloat(concentrate_ml) : null,
        alcohol_ml_per_bottle: alcohol_ml_per_bottle != null ? parseFloat(alcohol_ml_per_bottle) : null,
        sell_price:            sell_price != null ? parseFloat(sell_price) : null,
      })
      .eq('id', batchId)
      .select().single()
    if (error) {
      console.error('updateBatch error:', error)
      return { data: null, error }
    }
    return { data, error: null }
  },
  async updateBatchSold(batchId, qty_sold) {
    const { data } = await supabase
      .from('production_batches')
      .update({ qty_sold: parseInt(qty_sold) })
      .eq('id', batchId)
      .select().single()
    return data
  },

  async deleteBatch(batchId) {
    await supabase.from('production_batches').delete().eq('id', batchId)
  },

  // ── Stock Deduction for Orders (FIFO) ───────────────────────────────────────
  async deductStockForOrder(orderId) {
    try {
      const { data: order } = await supabase
        .from('orders').select('*').eq('id', orderId).single()
      if (!order) throw new Error('Order not found')

      // ✅ กันตัดสต็อกซ้ำ — ถ้า order นี้ถูกตัดไปแล้ว ไม่ทำซ้ำ
      if (order.stock_deducted) {
        return { success: true, orderId, deductions: [],
          message: `Order ${orderId} already deducted, skipped` }
      }

      const { data: orderItems } = await supabase
        .from('order_items').select('*').eq('order_id', orderId)
      if (!orderItems || orderItems.length === 0) {
        return { success: true, orderId, deductions: [], message: 'No items to deduct' }
      }

      const deductions = []
      const versionCache = {} // formula_id -> versionId (กันดึงซ้ำถ้า order มีหลาย item ของสูตรเดียวกัน)
      let totalCogs = 0

      for (const item of orderItems) {
        const { formula_id, qty, bottle_ml: itemBottleMl } = item

        const { data: batches } = await supabase
          .from('production_batches').select('*')
          .eq('formula_id', formula_id)
          .order('produced_at', { ascending: true })
        if (!batches || batches.length === 0) {
          throw new Error(`No batches found for formula ${formula_id}`)
        }

        // ✅ แปลงเป็น "ml รวม" ก่อนตัดสต็อก แทนการใช้ qty เป็นจำนวนขวดตรงๆ
        // สำคัญมากสำหรับของแถมแลกแต้ม (เช่น น้ำหอม 2ml) ที่ bottle_ml ไม่เท่ากับขนาดขวดของ batch จริง —
        // ถ้าใช้ qty ตรงๆ (qty:1) จะตัดสต็อกไปเต็ม 1 ขวด ทั้งที่แจกไปแค่ 2ml
        // ถ้า item ไม่มี bottle_ml (ออเดอร์เก่าก่อนแก้บั๊กนี้) fallback ไปใช้ bottle_ml ของ batch แรกแทน (พฤติกรรมเดิม)
        const mlPerUnit = itemBottleMl || batches[0]?.bottle_ml || 1
        let remainingMl = qty * mlPerUnit

        // หา version สำหรับคำนวณต้นทุน — ใช้ Final ก่อน ไม่งั้นใช้ตัวล่าสุด (cache ต่อสูตร)
        if (!(formula_id in versionCache)) {
          const versions = await this.getVersions(formula_id)
          const final = versions.find(v => v.is_final)
          versionCache[formula_id] = final ? final.id : (versions[versions.length - 1]?.id || null)
        }
        const versionId = versionCache[formula_id]

        for (const batch of batches) {
          if (remainingMl <= 0) break
          const batchBottleMl = batch.bottle_ml || mlPerUnit || 1
          const currentRemainingBottles = batch.qty_produced - batch.qty_sold
          if (currentRemainingBottles <= 0) continue
          const currentRemainingMl = currentRemainingBottles * batchBottleMl
          const deductMl = Math.min(remainingMl, currentRemainingMl)
          // แปลง ml ที่ตัดได้กลับเป็น "จำนวนขวดเทียบเท่า" ของ batch นี้ (อาจเป็นเศษส่วน เช่น 2ml จาก batch 15ml = 0.133 ขวด)
          const deductAmount = deductMl / batchBottleMl
          const newQtySold = batch.qty_sold + deductAmount

          const { error: batchUpdateErr } = await supabase.from('production_batches')
            .update({ qty_sold: newQtySold }).eq('id', batch.id)
          if (batchUpdateErr) {
            throw new Error(`อัปเดตสต็อก batch ${batch.id} ไม่สำเร็จ: ${batchUpdateErr.message}`)
          }

          // คำนวณต้นทุนจริงจาก batch ที่ถูกตัดก้อนนี้ (concentrate+alcohol+ขวด ของ batch นั้นจริง ๆ) ตามสัดส่วนที่ตัดจริง
          let batchCost = 0
          if (versionId) {
            try {
              const unit = await this.getCostPerUnit(versionId, batch)
              batchCost = (unit.totalCostPerBottle || 0) * deductAmount
              totalCogs += batchCost
            } catch (e) {
              console.error('getCostPerUnit error during deduction:', e)
            }
          }

          deductions.push({
            formula_id, batch_id: batch.id,
            deduct_qty: parseFloat(deductAmount.toFixed(4)), batch_produced_at: batch.produced_at,
            cost: parseFloat(batchCost.toFixed(2)),
          })
          remainingMl -= deductMl
        }

        if (remainingMl > 0) {
          throw new Error(`Insufficient stock for formula ${formula_id}. Needed ${(remainingMl / mlPerUnit).toFixed(2)} more unit(s).`)
        }
      }

      // ✅ mark ว่าตัดสต็อกของ order นี้แล้ว พร้อมอัปเดต status เป็น paid + เก็บต้นทุนจริงไว้
      const { error: orderUpdateErr } = await supabase.from('orders')
        .update({ status: 'paid', stock_deducted: true, cogs: parseFloat(totalCogs.toFixed(2)) })
        .eq('id', orderId)
      if (orderUpdateErr) {
        throw new Error(`อัปเดตสถานะ order ${orderId} ไม่สำเร็จ: ${orderUpdateErr.message}`)
      }

      return { success: true, orderId, deductions, cogs: parseFloat(totalCogs.toFixed(2)),
        message: `Stock deducted successfully for order ${orderId}` }
    } catch (error) {
      console.error('deductStockForOrder error:', error)
      return { success: false, error: error.message }
    }
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
      if (!map[key]) map[key] = { concentration: b.concentration, bottle_ml: b.bottle_ml, produced: 0, sold: 0, giveaway: 0 }
      map[key].produced += b.qty_produced
      map[key].sold     += b.qty_sold
      map[key].giveaway += b.giveaway_bottles_equivalent || 0
    })
    return Object.values(map).map(s => ({ ...s, remaining: s.produced - s.sold - s.giveaway }))
  },

  // ── Dashboard ──────────────────────────────────────────────────────────────
  async getAllBatchesWithFormula() {
    const { data } = await supabase
      .from('production_batches')
      .select('*, formula:formulas(name)')
      .order('produced_at', { ascending: true })
    return data || []
  },

  async getProductionSummary() {
    const batches = await this.getAllBatchesWithFormula()
    const map = {}
    batches.forEach(b => {
      const id = b.formula_id
      if (!map[id]) map[id] = {
        formula_id: id,
        name: b.formula?.name || `Formula ${id}`,
        produced: 0, sold: 0,
      }
      map[id].produced += b.qty_produced
      map[id].sold     += b.qty_sold
    })
    return Object.values(map).map(s => ({ ...s, remaining: s.produced - s.sold }))
  },

  async getMonthlySeries() {
    const batches = await this.getAllBatchesWithFormula()
    const map = {}
    batches.forEach(b => {
      const d     = new Date(b.produced_at)
      const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = d.toLocaleDateString('en-US', { month:'short', year:'2-digit' })
      if (!map[key]) map[key] = { key, label, produced: 0, sold: 0 }
      map[key].produced += b.qty_produced
      map[key].sold     += b.qty_sold
    })
    return Object.keys(map).sort().map(k => map[k])
  },

  async getRetailStockSummary() {
    const { data } = await supabase
      .from('retail_stock')
      .select('id, name, brand, qty_total, qty_sold, alert_at, price_per_unit, cost_per_unit, is_favorite')
      .eq('is_discontinued', false)
      .order('created_at', { ascending: false })
    return (data || []).map(r => ({
      ...r,
      remaining: r.qty_total - r.qty_sold,
      isLow: (r.qty_total - r.qty_sold) <= r.alert_at,
    }))
  },

  // ── Sales timeline (สำหรับ Dashboard chart) ──────────────────────────────────
  async getSalesLast7Days() {
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - 6)
    const startStr = start.toISOString().slice(0, 10)

    const { data } = await supabase
      .from('retail_stock_logs')
      .select('qty, sell_price, cost_price, logged_at')
      .eq('type', 'out')
      .gte('logged_at', startStr)

    const map = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      map[key] = { key, label: d.toLocaleDateString('th-TH', { day:'numeric', month:'short' }), revenue: 0, qty: 0 }
    }
    for (const log of (data || [])) {
      const key = (log.logged_at || '').slice(0, 10)
      if (!map[key]) continue
      const qty = log.qty ?? 0
      map[key].revenue += (log.sell_price ?? 0) * qty
      map[key].qty     += qty
    }
    return Object.values(map)
  },

  // ── Best sellers (สำหรับ Dashboard donut — สินค้าแยกตัว) ────────────────────────
  async getTopRetailSellers(limit = 5) {
    const { data } = await supabase
      .from('retail_stock')
      .select('name, brand, qty_sold')
      .eq('is_discontinued', false)
      .order('qty_sold', { ascending: false })
      .limit(limit)
    return (data || []).filter(r => (r.qty_sold ?? 0) > 0)
  },

  // ── Expenses (สำหรับ Dashboard donut — รายได้ vs ค่าใช้จ่าย) ──────────────────────
  async getExpensesThisMonth() {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().slice(0, 10)
    const { data } = await supabase
      .from('expenses')
      .select('amount, category')
      .gte('expense_date', monthStart)
    const total = (data || []).reduce((s, e) => s + (e.amount ?? 0), 0)
    return { total, items: data || [] }
  },

  // ── ค่าใช้จ่ายแยกตามกลุ่ม (production / myblends / retail) ──────────────────────
  // รายการหนึ่งอาจผูกกับหลายกลุ่มพร้อมกัน (เช่น กล่องที่ใช้ทั้ง Production และ My Blends)
  // นับเต็มจำนวนในทุกกลุ่มที่ผูกไว้ — ไม่หารเฉลี่ย เพราะแต่ละกลุ่มต้องเห็นค่าใช้จ่ายที่เกี่ยวข้องครบ
  // allTime=true ใช้สำหรับเทียบกับ My Blends ที่เป็นยอดสะสม (ไม่มีข้อมูลแยกเดือน)
  async getExpensesByGroupThisMonth(group, allTime = false) {
    let query = supabase.from('expenses').select('amount, for_groups')
    if (!allTime) {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().slice(0, 10)
      query = query.gte('expense_date', monthStart)
    }
    const { data } = await query
    const filtered = (data || []).filter(e => (e.for_groups || []).includes(group))
    return filtered.reduce((s, e) => s + (e.amount ?? 0), 0)
  },

  // ── สรุปค่าใช้จ่ายทั้งหมด นับแต่ละรายการครั้งเดียว (ไม่ซ้ำ) แม้ผูกหลายกลุ่ม ──────
  // ใช้สำหรับยอดรวมที่ต้อง "ไม่นับซ้ำ" เช่น total expenses ของทั้งระบบ
  async getExpensesTotalDeduped(allTime = false) {
    let query = supabase.from('expenses').select('amount')
    if (!allTime) {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().slice(0, 10)
      query = query.gte('expense_date', monthStart)
    }
    const { data } = await query
    return (data || []).reduce((s, e) => s + (e.amount ?? 0), 0)
  },

  // ── สร้างรายการค่าใช้จ่ายใหม่ — ใช้ร่วมกันได้ทุกหน้า (PageExpenses, PageMaterials ฯลฯ) ──
  async createExpense({ expense_date, category, amount, note, for_groups, adaptation_id }) {
    const { error } = await supabase.from('expenses').insert({
      expense_date, category, amount, note: note || null,
      for_groups: (for_groups && for_groups.length) ? for_groups : null, source: 'app',
      adaptation_id: adaptation_id || null,
    })
    if (error) throw error
  },

  // ── ค่าใช้จ่ายเฉพาะของ blend (adaptation) นั้น ๆ — ไม่ปนกับ blend อื่น ──────────
  async getExpensesByAdaptation(adaptationId) {
    const { data } = await supabase
      .from('expenses').select('amount').eq('adaptation_id', adaptationId)
    return (data || []).reduce((s, e) => s + (e.amount ?? 0), 0)
  },

  // ── Revenue เดือนนี้ (ช่วงเวลาเดียวกับ getExpensesThisMonth เพื่อเทียบกำไรสุทธิได้ถูกต้อง) ──
  async getRevenueThisMonth() {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().slice(0, 10)
    const { data } = await supabase
      .from('retail_stock_logs')
      .select('qty, sell_price, cost_price')
      .eq('type', 'out')
      .gte('logged_at', monthStart)
    let revenue = 0, profit = 0
    for (const l of (data || [])) {
      const qty = l.qty ?? 0
      revenue += (l.sell_price ?? 0) * qty
      profit  += ((l.sell_price ?? 0) - (l.cost_price ?? 0)) * qty
    }
    return { revenue, profit }
  },

  // ── Revenue จาก orders (PageOrderBilling) แยกตามช่องทางขาย ──────────────────
  // หมายเหตุ: เพิ่งพบว่า orders ไม่เคย sync เข้า adaptation_versions/retail_stock_logs
  // เลยต้องดึงจาก orders ตรงๆ เป็นแหล่งรายได้ที่ 3 (เดิมมีแค่ retail + my blends)
  async getRevenueByChannel() {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().slice(0, 10)
    const { data } = await supabase
      .from('orders')
      .select('channel, total_amount, status, created_at, cogs')
      .eq('status', 'paid')
      .gte('created_at', monthStart)

    const byChannel = {}
    let total = 0
    let totalCogs = 0
    ;(data || []).forEach(o => {
      const ch = o.channel || 'ไม่ระบุ'
      const amt = o.total_amount || 0
      const cogs = o.cogs || 0
      if (!byChannel[ch]) byChannel[ch] = { revenue: 0, cogs: 0 }
      byChannel[ch].revenue += amt
      byChannel[ch].cogs    += cogs
      total += amt
      totalCogs += cogs
    })

    return {
      total,
      cogs: totalCogs,
      profit: total - totalCogs,
      channels: Object.entries(byChannel)
        .map(([channel, v]) => ({ channel, revenue: v.revenue, cogs: v.cogs, profit: v.revenue - v.cogs }))
        .sort((a, b) => b.revenue - a.revenue),
    }
  },

  // ── ยอดขายรวม Retail (เดือนนี้) + My Blends (สะสมทั้งหมด) แยกกลุ่ม พร้อมหักค่าใช้จ่ายตามกลุ่ม ──
  // หมายเหตุ: My Blends ไม่มี timestamp ต่อการขายแบบ retail_stock_logs จึงนับเป็นยอดสะสม
  // ทั้งหมดตั้งแต่สร้าง version มา ไม่ใช่ยอดเฉพาะเดือนนี้ — ใช้ดูภาพรวมเชิงเปรียบเทียบกลุ่ม
  // ไม่ใช่ตัวเลขที่เทียบเดือนต่อเดือนได้ตรง 100%
  //
  // ✅ เพิ่ม orders (มี channel) เป็นแหล่งรายได้ที่ 3 — เดิมแก้แค่ retail+myBlends
  // ทำให้ยอดขายผ่าน PageOrderBilling (ระบบแลกแต้ม/หน้าออเดอร์) ไม่ถูกนับเข้า revenue รวมเลย
  async getRevenueBreakdown() {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().slice(0, 10)

    // Retail — เดือนนี้
    const { data: retailLogs } = await supabase
      .from('retail_stock_logs')
      .select('qty, sell_price')
      .eq('type', 'out')
      .gte('logged_at', monthStart)
    const retailRevenue = (retailLogs || [])
      .reduce((s, l) => s + (l.sell_price ?? 0) * (l.qty ?? 0), 0)

    // My Blends — สะสมทั้งหมด (ไม่มีข้อมูลแยกเดือน)
    const { data: versions } = await supabase
      .from('adaptation_versions')
      .select('qty_sold, sell_price')
    const myBlendsRevenue = (versions || [])
      .reduce((s, v) => s + (v.sell_price ?? 0) * (v.qty_sold ?? 0), 0)

    // Orders — เดือนนี้ (จาก PageOrderBilling, แยกตาม channel ได้)
    const ordersData = await this.getRevenueByChannel()
    const ordersRevenue = ordersData.total
    const ordersCogs    = ordersData.cogs
    const ordersProfit  = ordersData.profit

    // ค่าใช้จ่ายแยกตามกลุ่ม — retail หักแบบเดือนนี้ (ตรงกับ revenue), myBlends หักแบบสะสม
    const [retailExpenses, myBlendsExpenses] = await Promise.all([
      this.getExpensesByGroupThisMonth('retail', false),
      this.getExpensesByGroupThisMonth('myblends', true),
    ])

    const retailProfit   = retailRevenue - retailExpenses
    const myBlendsProfit = myBlendsRevenue - myBlendsExpenses

    return {
      total:        retailRevenue + myBlendsRevenue + ordersRevenue,
      totalExpenses: retailExpenses + myBlendsExpenses + ordersCogs,
      totalProfit:  retailProfit + myBlendsProfit + ordersProfit, // ✅ orders หักต้นทุนจริงจาก batch ที่ถูกตัดแล้ว
      retail:    { revenue: retailRevenue,   expenses: retailExpenses,   profit: retailProfit,   label: 'Retail (เดือนนี้)' },
      myBlends:  { revenue: myBlendsRevenue, expenses: myBlendsExpenses, profit: myBlendsProfit, label: 'My Blends (สะสมทั้งหมด)' },
      orders:    { revenue: ordersRevenue, expenses: ordersCogs, profit: ordersProfit,
                   channels: ordersData.channels, label: 'Orders (เดือนนี้ · แยกตามช่องทาง · หักต้นทุนวัตถุดิบแล้ว)' },
    }
  },

  // ── Loyalty ledger (แต้มหมดอายุแบบก้อน) ──────────────────────────────────────
  // ยอดคงเหลือจริงต้องอ่านจาก view customer_points_balance (นับเฉพาะก้อนที่ยังไม่หมดอายุ)
  POINTS_EXPIRY_MONTHS: 12,
  POINTS_RATE_BAHT: 50, // ทุก 50 บาท = 1 แต้ม (ตรงตาม Rewards Program)

  // คำนวณแต้มจากยอดซื้อ โดยรวมเศษยอดซื้อเก่าที่สะสมไว้ก่อน แล้วเก็บเศษใหม่กลับเข้า customers.pending_remainder
  // ไม่มีการปัดเศษทิ้ง — เศษที่เหลือจะถูกนำไปรวมกับยอดซื้อครั้งถัดไปเสมอ
  async earnPointsFromPurchase(customerId, purchaseAmount, { orderId = null, note = null } = {}) {
    if (!purchaseAmount || purchaseAmount <= 0) return { ok: true, points: 0 }

    const { data: cust, error: fetchErr } = await supabase
      .from('customers')
      .select('point_remainder')
      .eq('id', customerId)
      .maybeSingle()
    if (fetchErr) return { ok: false, error: fetchErr.message }

    const oldRemainder = Number(cust?.point_remainder || 0)
    const total = oldRemainder + Number(purchaseAmount)
    const points = Math.floor(total / this.POINTS_RATE_BAHT)
    const newRemainder = Math.round((total - points * this.POINTS_RATE_BAHT) * 100) / 100

    const { error: updateErr } = await supabase
      .from('customers')
      .update({ point_remainder: newRemainder })
      .eq('id', customerId)
    if (updateErr) return { ok: false, error: updateErr.message }

    if (points > 0) {
      const result = await this.earnPoints(customerId, points, {
        kind: 'earn',
        orderId,
        note: note || `ซื้อ ${purchaseAmount} บาท (เศษเดิม ${oldRemainder} บาท → เศษคงเหลือ ${newRemainder} บาท)`,
      })
      if (!result.ok) return result
    }

    return { ok: true, points, remainder: newRemainder }
  },

  async getPointsBalance(customerId) {
    const { data } = await supabase
      .from('customer_points_balance')
      .select('points')
      .eq('customer_id', customerId)
      .maybeSingle()
    return data?.points || 0
  },

  // ให้แต้ม 1 ก้อน (มีวันหมดอายุ) — ใช้ตอนได้แต้มจากออเดอร์ หรือโบนัสวันเกิด
  async earnPoints(customerId, amount, { kind = 'earn', orderId = null, note = null } = {}) {
    if (!amount || amount <= 0) return { ok: true }
    const expires = new Date()
    expires.setMonth(expires.getMonth() + this.POINTS_EXPIRY_MONTHS)
    const { error } = await supabase.from('loyalty_ledger').insert({
      customer_id: customerId, amount, kind,
      order_id: orderId, expires_at: expires.toISOString(), note,
    }).select('id')
    if (error) return { ok: false, error: error.message }
    await this.syncPointsColumn(customerId)
    return { ok: true }
  },

  // ใช้แต้ม (แลกรางวัล) — บันทึกก้อนติดลบ ไม่มีวันหมดอายุ
  async spendPoints(customerId, amount, { orderId = null, note = null } = {}) {
    if (!amount || amount <= 0) return { ok: true }
    const { error } = await supabase.from('loyalty_ledger').insert({
      customer_id: customerId, amount: -Math.abs(amount), kind: 'redeem',
      order_id: orderId, expires_at: null, note,
    }).select('id')
    if (error) return { ok: false, error: error.message }
    await this.syncPointsColumn(customerId)
    return { ok: true }
  },

  // ปรับแต้มด้วยมือ (บวก/ลบ) — บันทึกเป็นก้อน manual พร้อมเหตุผล
  async adjustPointsManual(customerId, delta, reason) {
    if (!delta) return { ok: true }
    const row = delta > 0
      ? { customer_id: customerId, amount: delta, kind: 'manual',
          expires_at: new Date(new Date().setMonth(new Date().getMonth() + this.POINTS_EXPIRY_MONTHS)).toISOString(),
          note: reason }
      : { customer_id: customerId, amount: delta, kind: 'manual', expires_at: null, note: reason }
    const { error } = await supabase.from('loyalty_ledger').insert(row).select('id')
    if (error) return { ok: false, error: error.message }
    await this.syncPointsColumn(customerId)
    return { ok: true }
  },

  // sync ยอดจาก view กลับไป customers.loyalty_points (ให้ UI เดิมที่อ่าน field นี้ยังตรง)
  async syncPointsColumn(customerId) {
    const balance = await this.getPointsBalance(customerId)
    await supabase.from('customers')
      .update({ loyalty_points: balance })
      .eq('id', customerId)
      .select('id')
    return balance
  },
}
