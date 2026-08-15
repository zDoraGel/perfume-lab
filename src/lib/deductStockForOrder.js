// ═══════════════════════════════════════════════════════════════════════════
// แทนที่ deductStockForOrder เดิมใน src/lib/db.js (บรรทัด 637-741)
//
// แก้ 2 บั๊ก:
//   1. ไม่กรอง bottle_ml → ขาย 5ml ไปหักจาก batch 15ml (เกิดค่า 0.333)
//   2. แปลง ml กลับเป็นเศษขวด → qty_sold เป็นทศนิยม
//
// หลักการใหม่: ขวด = หน่วยนับ ตัดเป็นจำนวนเต็มเสมอ
//   - หัก batch ที่ bottle_ml ตรงกับที่ขายเท่านั้น
//   - เรียง FIFO ตาม produced_at (ของเก่าออกก่อน)
//   - ถ้าไม่มี batch ขนาดนั้น → throw error ชัดเจน ไม่ไปกินขนาดอื่นมั่ว
// ═══════════════════════════════════════════════════════════════════════════

  async deductStockForOrder(orderId) {
    try {
      const { data: order } = await supabase
        .from('orders').select('*').eq('id', orderId).single()
      if (!order) throw new Error('Order not found')

      // กันตัดสต็อกซ้ำ
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
      const versionCache = {}
      let totalCogs = 0

      for (const item of orderItems) {
        const { formula_id, qty, bottle_ml: itemBottleMl } = item

        const qtyBottles = parseInt(qty, 10)
        if (!Number.isFinite(qtyBottles) || qtyBottles <= 0) {
          throw new Error(`order_item ${item.id}: qty ไม่ถูกต้อง (${qty})`)
        }

        const { data: allBatches } = await supabase
          .from('production_batches').select('*')
          .eq('formula_id', formula_id)
          .order('produced_at', { ascending: true })
        if (!allBatches || allBatches.length === 0) {
          throw new Error(`ไม่พบ batch ของสูตร ${formula_id}`)
        }

        // ✅ หักเฉพาะ batch ที่ขนาดขวดตรงกับที่ขายจริง
        // ถ้า item ไม่มี bottle_ml (ออเดอร์เก่า) ยอมให้ใช้ batch ไหนก็ได้ (พฤติกรรมเดิม)
        const batches = itemBottleMl
          ? allBatches.filter(b => Number(b.bottle_ml) === Number(itemBottleMl))
          : allBatches

        if (batches.length === 0) {
          throw new Error(
            `สูตร ${formula_id}: ไม่มี batch ขนาด ${itemBottleMl}ml ` +
            `(มีขนาด ${[...new Set(allBatches.map(b => b.bottle_ml))].join(', ')}ml)`
          )
        }

        // version สำหรับคำนวณต้นทุน
        if (!(formula_id in versionCache)) {
          const versions = await this.getVersions(formula_id)
          const final = versions.find(v => v.is_final)
          versionCache[formula_id] = final ? final.id : (versions[versions.length - 1]?.id || null)
        }
        const versionId = versionCache[formula_id]

        // ✅ ตัดเป็น "จำนวนขวด" จำนวนเต็ม ไม่แปลงไป-กลับผ่าน ml อีกแล้ว
        let remainingBottles = qtyBottles

        for (const batch of batches) {
          if (remainingBottles <= 0) break

          const available = Math.floor((batch.qty_produced || 0) - (batch.qty_sold || 0))
          if (available <= 0) continue

          const take = Math.min(remainingBottles, available)
          const newQtySold = (batch.qty_sold || 0) + take

          const { error: batchUpdateErr } = await supabase.from('production_batches')
            .update({ qty_sold: newQtySold }).eq('id', batch.id)
          if (batchUpdateErr) {
            throw new Error(`อัปเดตสต็อก batch ${batch.id} ไม่สำเร็จ: ${batchUpdateErr.message}`)
          }

          let batchCost = 0
          if (versionId) {
            try {
              const unit = await this.getCostPerUnit(versionId, batch)
              batchCost = (unit.totalCostPerBottle || 0) * take
              totalCogs += batchCost
            } catch (e) {
              console.error('getCostPerUnit error during deduction:', e)
            }
          }

          deductions.push({
            formula_id,
            batch_id: batch.id,
            deduct_qty: take,
            batch_bottle_ml: batch.bottle_ml,
            batch_produced_at: batch.produced_at,
            cost: parseFloat(batchCost.toFixed(2)),
          })

          remainingBottles -= take
        }

        if (remainingBottles > 0) {
          throw new Error(
            `สต็อกไม่พอ: สูตร ${formula_id} ขนาด ${itemBottleMl || '-'}ml ` +
            `ขาดอีก ${remainingBottles} ขวด`
          )
        }
      }

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
