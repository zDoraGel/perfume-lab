// เพิ่มใน src/lib/db.js

  // ── Stock Deduction (FIFO) ─────────────────────────────────────────────────
  async deductStockForOrder(orderId) {
    try {
      // 1. ดึง order + order_items
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      
      if (!order) throw new Error('Order not found')
      
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
      
      if (!orderItems || orderItems.length === 0) {
        console.log('No items in order')
        return { success: true, orderId, message: 'No items to deduct' }
      }

      // 2. สำหรับแต่ละ item → ตัด stock FIFO
      const deductions = []
      
      for (const item of orderItems) {
        const { formula_id, qty } = item
        let remainingQty = qty
        
        // ดึง batches ของ formula นี้ (order by produced_at ASC = เก่าสุดมาก่อน)
        const { data: batches } = await supabase
          .from('production_batches')
          .select('*')
          .eq('formula_id', formula_id)
          .order('produced_at', { ascending: true })
        
        if (!batches || batches.length === 0) {
          throw new Error(`No batches found for formula ${formula_id}`)
        }

        // ตัด qty จากแต่ละ batch จนครบ
        for (const batch of batches) {
          if (remainingQty <= 0) break
          
          const currentRemaining = batch.qty_produced - batch.qty_sold
          
          if (currentRemaining <= 0) continue // batch นี้หมดแล้ว
          
          const deductAmount = Math.min(remainingQty, currentRemaining)
          const newQtySold = batch.qty_sold + deductAmount
          
          // update production_batches
          await supabase
            .from('production_batches')
            .update({ qty_sold: newQtySold })
            .eq('id', batch.id)
          
          deductions.push({
            formula_id,
            batch_id: batch.id,
            deduct_qty: deductAmount,
            batch_produced_at: batch.produced_at,
          })
          
          remainingQty -= deductAmount
        }
        
        if (remainingQty > 0) {
          throw new Error(`Insufficient stock for formula ${formula_id}. Needed ${remainingQty} more.`)
        }
      }

      // 3. Update order status → 'paid' (ถ้ายังไม่ paid)
      if (order.status !== 'paid') {
        await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('id', orderId)
      }

      return {
        success: true,
        orderId,
        deductions,
        message: `Stock deducted successfully for order ${orderId}`,
      }
    } catch (error) {
      console.error('deductStockForOrder error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  },
