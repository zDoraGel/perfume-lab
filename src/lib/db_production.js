// เพิ่มใน src/lib/db.js

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
        formula_id: formulaId,
        concentration,
        bottle_ml: parseInt(bottle_ml),
        qty_produced: parseInt(qty_produced),
        qty_sold: 0,
        produced_at: produced_at || new Date().toISOString().split('T')[0],
        notes: notes || null,
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

  async deleteBatch(batchId) {
    await supabase.from('production_batches').delete().eq('id', batchId)
  },

  async getStock(formulaId) {
    // stock per concentration + bottle_ml
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

  async getAllStock() {
    const { data } = await supabase.from('product_stock').select('*')
    return data || []
  },
