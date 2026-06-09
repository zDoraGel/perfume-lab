// เพิ่มใน src/lib/db.js — ใส่ต่อจาก getAllAliases()

async getMaterialTraits(materialIds) {
  if (!materialIds?.length) return []
  const { data } = await supabase
    .from('material_traits')
    .select('*')
    .in('material_id', materialIds)
  return data || []
},

async upsertTrait(materialId, traits) {
  const { data } = await supabase
    .from('material_traits')
    .upsert({ material_id: materialId, ...traits, updated_at: new Date().toISOString() },
             { onConflict: 'material_id' })
    .select().single()
  return data
},
