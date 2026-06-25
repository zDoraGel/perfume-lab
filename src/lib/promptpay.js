/**
 * PromptPay QR Payload Generator
 * ตามสเปก EMV QR Code (Tag-Length-Value) ที่ธนาคารแห่งประเทศไทยกำหนด
 * อ้างอิง algorithm เดียวกับที่ใช้ในไลบรารี promptpay-qr ที่นิยมใช้กันทั่วไป
 */

function formatField(id, value) {
  const size = String(value.length).padStart(2, '0')
  return `${id}${size}${value}`
}

function formatAmount(amount) {
  return Number(amount).toFixed(2)
}

// CRC-16/CCITT-FALSE — ตามสเปก EMVCo QR
function crc16(data) {
  let crc = 0xFFFF
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
      crc &= 0xFFFF
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * @param {string} target  เบอร์โทรศัพท์พร้อมเพย์ (เช่น "0812345678") หรือเลขบัตรประชาชน 13 หลัก
 * @param {number} amount  จำนวนเงิน (บาท) — ใส่ null ถ้าอยากให้ QR ไม่ระบุยอด (ลูกค้ากรอกเอง)
 */
export function generatePromptPayPayload(target, amount = null) {
  const cleaned = String(target).replace(/[-\s]/g, '')
  const isCitizenId = cleaned.length >= 13

  let targetFormatted = cleaned
  let subTag
  if (isCitizenId) {
    subTag = '02'
    targetFormatted = cleaned.padStart(13, '0')
  } else {
    subTag = '01'
    // เบอร์โทรไทย: ตัด 0 หน้าออก แล้วเติม 66 แทน format ตามสเปก (13 หลัก)
    targetFormatted = ('66' + cleaned.replace(/^0/, '')).padStart(13, '0')
  }

  const merchantInfo =
    formatField('00', 'A000000677010111') +
    formatField(subTag, targetFormatted)

  const fields = [
    formatField('00', '01'),                 // Payload Format Indicator
    formatField('01', amount ? '12' : '11'), // Point of Initiation Method (12=dynamic, 11=static)
    formatField('29', merchantInfo),          // Merchant Account Info — PromptPay
    formatField('53', '764'),                 // Currency = THB
  ]
  if (amount != null) {
    fields.push(formatField('54', formatAmount(amount))) // Transaction Amount
  }
  fields.push(formatField('58', 'TH'))        // Country Code

  const dataString = fields.join('') + '6304'
  return dataString + crc16(dataString)
}

/**
 * คืน URL รูป QR (ผ่าน api.qrserver.com — service เดียวกับที่ใช้ใน Blotter+QR)
 */
export function getPromptPayQrUrl(target, amount, size = 280) {
  const payload = generatePromptPayPayload(target, amount)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=0&data=${encodeURIComponent(payload)}`
}
