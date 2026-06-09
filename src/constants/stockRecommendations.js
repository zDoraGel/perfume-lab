/**
 * Stock Recommendation System
 * แนะนำวัตถุดิบที่ควรมีติด stock ตาม vibe และ fragrance family
 * พร้อม substitutes, future_value และ unlocks (accord/formula ที่ทำได้)
 */

export const STOCK_BY_FAMILY = {
  Woody: [
    {
      name: 'Cedarwood EO', role: 'base', priority: 'must',
      reason: 'โครงสร้างหลักกลุ่ม Woody ราคาถูก ใช้ได้กว้าง',
      future_value: 'ให้ความแห้ง สะอาด เป็น backbone ของน้ำหอมหลายสูตร ราคาถูกที่สุดในกลุ่ม Woody',
      substitutes: ['Sandalwood', 'Vetiver', 'Guaiacwood'],
      unlocks: [
        { type: 'accord', name: 'Dry Wood Accord', desc: 'ไม้แห้ง สะอาด เป็น base สำหรับสูตร masculine' },
        { type: 'accord', name: 'Cedar Musk Accord', desc: 'ผสมกับ Iso E Super ได้ clean woody musk' },
        { type: 'formula', name: 'สูตร Woody Minimal', desc: 'Cedar + Bergamot + Musk = น้ำหอมผู้ชายคลาสสิก' },
      ],
    },
    {
      name: 'Sandalwood', role: 'base', priority: 'must',
      reason: 'ให้ความอุ่น เนื้อครีม หาตัวแทนยาก',
      future_value: 'ให้ความ creamy smooth ที่ไม่มีตัวอื่นแทนได้ 100% เพิ่ม longevity และ skin feel',
      substitutes: ['Cedarwood EO', 'Guaiacwood'],
      unlocks: [
        { type: 'accord', name: 'Sandalwood Rose Accord', desc: 'คู่คลาสสิกที่ขายดีที่สุดในโลก' },
        { type: 'accord', name: 'Creamy Musk Accord', desc: 'Sandalwood + Musk = skin scent นุ่มๆ' },
        { type: 'formula', name: 'สูตร Oriental Soft', desc: 'Sandalwood + Vanilla + Rose = ติดทน หวานอบอุ่น' },
      ],
    },
    {
      name: 'Vetiver', role: 'base', priority: 'must',
      reason: 'ดิน รมควัน เพิ่ม depth',
      future_value: 'เพิ่ม complexity และ earthiness ทำให้สูตรดู "niche" และมีมิติขึ้นมาก',
      substitutes: ['Cedarwood EO', 'Patchouli'],
      unlocks: [
        { type: 'accord', name: 'Smoky Earth Accord', desc: 'Vetiver + Patchouli = earthy dark base' },
        { type: 'formula', name: 'สูตร Niche Woody', desc: 'Vetiver + Iris + Bergamot = ดู expensive มาก' },
      ],
    },
    {
      name: 'Patchouli', role: 'base', priority: 'nice',
      reason: 'เพิ่มความหนัก earthy ใช้ได้หลาย formula',
      future_value: 'fixative ที่ดี ทำให้กลิ่นติดทนนานขึ้น และเพิ่ม vintage character',
      substitutes: ['Vetiver', 'Cedarwood EO'],
      unlocks: [
        { type: 'accord', name: 'Hippie Accord', desc: 'Patchouli + Rose + Sandalwood = bohemian classic' },
        { type: 'formula', name: 'สูตร Dark Floral', desc: 'Patchouli + Jasmine + Amber = sexy และ mysterious' },
      ],
    },
    {
      name: 'Guaiacwood', role: 'base', priority: 'nice',
      reason: 'ไม้ควัน smoky ทางเลือก Sandalwood',
      future_value: 'ให้กลิ่น smoky woody ที่นุ่มกว่า Vetiver เป็น budget alternative ของ Sandalwood',
      substitutes: ['Sandalwood', 'Cedarwood EO'],
      unlocks: [
        { type: 'accord', name: 'Smoky Soft Wood Accord', desc: 'Guaiacwood + Musk = ไม้นุ่มควันอ่อนๆ' },
      ],
    },
  ],
  Floral: [
    {
      name: 'Rose Absolute', role: 'heart', priority: 'must',
      reason: 'ราชินีดอกไม้ ขาดไม่ได้',
      future_value: 'เปิดโลก Floral ได้เต็มรูปแบบ ใช้ได้ทั้ง feminine และ unisex สูตร',
      substitutes: ['Geranium EO', 'Rose Otto'],
      unlocks: [
        { type: 'accord', name: 'Rose Musk Accord', desc: 'Rose + Galaxolide = กลิ่นกุหลาบสะอาด ติดทน' },
        { type: 'accord', name: 'Rose Oud Accord', desc: 'Rose + Vetiver + Patchouli = oriental luxury' },
        { type: 'formula', name: 'สูตร Modern Rose', desc: 'Rose + Bergamot + Cedar = unisex floral ทันสมัย' },
        { type: 'formula', name: 'สูตร Rose Chypre', desc: 'Rose + Oakmoss + Bergamot = classic floral chypre' },
      ],
    },
    {
      name: 'Jasmine Absolute', role: 'heart', priority: 'must',
      reason: 'หัวใจ floral ชิ้นสำคัญ',
      future_value: 'ให้ความ sensual indolic ที่ Rose ให้ไม่ได้ ทำให้สูตร floral มีชีวิต',
      substitutes: ['Ylang Ylang EO', 'Geranium EO'],
      unlocks: [
        { type: 'accord', name: 'White Floral Accord', desc: 'Jasmine + Ylang + Musk = floral สะอาดหอม' },
        { type: 'formula', name: 'สูตร Floral Oriental', desc: 'Jasmine + Amber + Vanilla = sensual และ warm' },
      ],
    },
    {
      name: 'Geranium EO', role: 'heart', priority: 'must',
      reason: 'ดอกกุหลาบราคาประหยัด versatile มาก',
      future_value: 'ราคาถูกกว่า Rose Absolute 10–20 เท่า แต่ให้ floral rosy blend ได้ดีมาก',
      substitutes: ['Rose Absolute'],
      unlocks: [
        { type: 'accord', name: 'Budget Rose Accord', desc: 'Geranium + Linalool = rosy floral ราคาประหยัด' },
        { type: 'formula', name: 'สูตร Everyday Floral', desc: 'Geranium + Bergamot + Cedar = ใส่ได้ทุกวัน' },
      ],
    },
    {
      name: 'Ylang Ylang EO', role: 'heart', priority: 'nice',
      reason: 'ดอกไม้เขตร้อน ให้ความหวานหอม',
      future_value: 'เพิ่ม tropical sweetness ใช้น้อยๆ เพื่อ boost floral heart',
      substitutes: ['Jasmine Absolute', 'Geranium EO'],
      unlocks: [
        { type: 'accord', name: 'Tropical Floral Accord', desc: 'Ylang + Coconut + Jasmine = หอมเขตร้อน' },
      ],
    },
    {
      name: 'Iris', role: 'heart', priority: 'nice',
      reason: 'Powdery floral ให้ความ elegant',
      future_value: 'ให้ความ powdery violet-like ที่ทำให้สูตรดู luxury และ timeless',
      substitutes: ['Violet Leaf Absolute'],
      unlocks: [
        { type: 'accord', name: 'Powdery Iris Accord', desc: 'Iris + Musk + Violet = powdery elegant' },
        { type: 'formula', name: 'สูตร Niche Powdery', desc: 'Iris + Vetiver + Bergamot = luxury niche style' },
      ],
    },
  ],
  Citrus: [
    {
      name: 'Bergamot EO', role: 'top', priority: 'must',
      reason: 'Citrus ที่ใช้บ่อยที่สุด เปรี้ยวหอม',
      future_value: 'top note คลาสสิกที่ทำให้กลิ่นเปิดตัวได้สวย ใช้ได้กับทุก family',
      substitutes: ['Lemon EO', 'Lime EO', 'Litsea Cubeba EO'],
      unlocks: [
        { type: 'accord', name: 'Eau de Cologne Accord', desc: 'Bergamot + Lemon + Neroli = cologne คลาสสิก' },
        { type: 'formula', name: 'สูตร Fresh Citrus', desc: 'Bergamot + Cedar + Musk = น้ำหอมออฟฟิศ' },
      ],
    },
    {
      name: 'Lemon EO', role: 'top', priority: 'must',
      reason: 'สด ชัดเจน ราคาถูก',
      future_value: 'top note ที่สดที่สุด ราคาถูกมาก เหมาะสำหรับสูตร fresh และ clean',
      substitutes: ['Bergamot EO', 'Litsea Cubeba EO'],
      unlocks: [
        { type: 'accord', name: 'Citrus Fresh Accord', desc: 'Lemon + Spearmint + Musk = สด สะอาด' },
        { type: 'formula', name: 'สูตร Clean Daily', desc: 'Lemon + Lavender + Cedar = ใส่ทำงานได้' },
      ],
    },
    {
      name: 'Lime EO', role: 'top', priority: 'nice',
      reason: 'สดชื่น มีมิติมากกว่า Lemon',
      future_value: 'ให้ความ zesty สดกว่า Lemon เหมาะกับสูตร tropical และ aquatic',
      substitutes: ['Lemon EO', 'Bergamot EO'],
      unlocks: [
        { type: 'accord', name: 'Tropical Citrus Accord', desc: 'Lime + Coconut + Calone = beach vibes' },
      ],
    },
    {
      name: 'Grapefruit EO', role: 'top', priority: 'nice',
      reason: 'ขมอ่อนๆ ทันสมัย',
      future_value: 'ให้ความ bitter-fresh ที่ทันสมัย นิยมในน้ำหอม niche และ unisex',
      substitutes: ['Bergamot EO', 'Lemon EO'],
      unlocks: [
        { type: 'formula', name: 'สูตร Niche Citrus', desc: 'Grapefruit + Iris + Musk = modern unisex' },
      ],
    },
    {
      name: 'Litsea Cubeba EO', role: 'top', priority: 'nice',
      reason: 'Citrus เขตร้อน ราคาถูกมาก',
      future_value: 'ให้ lemongrass-citrus ราคาถูกกว่า Bergamot มาก เหมาะสูตร budget',
      substitutes: ['Lemon EO', 'Bergamot EO'],
      unlocks: [
        { type: 'accord', name: 'Budget Citrus Accord', desc: 'Litsea + Spearmint = สดราคาประหยัด' },
      ],
    },
  ],
  Ambery: [
    {
      name: 'Benzyl Benzoate', role: 'base', priority: 'must',
      reason: 'fixative พื้นฐาน ยึด amber accord',
      future_value: 'ทำให้กลิ่นติดทนนานขึ้นอย่างชัดเจน ราคาถูกมาก คุ้มค่าสุดในกลุ่ม',
      substitutes: ['Benzoin Resinoid'],
      unlocks: [
        { type: 'accord', name: 'Amber Base Accord', desc: 'Benzyl + Labdanum + Vanilla = amber base คลาสสิก' },
      ],
    },
    {
      name: 'Labdanum Absolute', role: 'base', priority: 'must',
      reason: 'หัวใจของ amber ให้ warmth',
      future_value: 'ให้ความ animalic warm ที่ทำให้สูตร amber มีความลึกและ complexity',
      substitutes: ['Benzoin Resinoid', 'Vanilla Absolute'],
      unlocks: [
        { type: 'accord', name: 'Chypre Accord', desc: 'Labdanum + Bergamot + Oakmoss = chypre คลาสสิก' },
        { type: 'formula', name: 'สูตร Warm Amber', desc: 'Labdanum + Rose + Sandalwood = oriental feminine' },
      ],
    },
    {
      name: 'Vanilla Absolute', role: 'base', priority: 'must',
      reason: 'ความหวาน เพิ่ม longevity',
      future_value: 'เพิ่ม sweetness และ warmth ทำให้สูตรดึงดูดขึ้น ขายง่าย ใช้ได้กว้างมาก',
      substitutes: ['Benzoin Resinoid', 'Tonka Bean Absolute'],
      unlocks: [
        { type: 'accord', name: 'Vanilla Musk Accord', desc: 'Vanilla + Galaxolide = นุ่ม หวาน ติดผิว' },
        { type: 'accord', name: 'Gourmand Base', desc: 'Vanilla + Caramel + Tonka = ขนมหอม' },
        { type: 'formula', name: 'สูตร Sweet Oriental', desc: 'Vanilla + Rose + Sandalwood = หวานอบอุ่น feminine' },
      ],
    },
    {
      name: 'Benzoin Resinoid', role: 'base', priority: 'nice',
      reason: 'อบอุ่น vanilla-like ราคาถูก',
      future_value: 'budget alternative ของ Vanilla และ Labdanum ใช้ blend ง่าย',
      substitutes: ['Vanilla Absolute', 'Labdanum Absolute'],
      unlocks: [
        { type: 'accord', name: 'Soft Resin Accord', desc: 'Benzoin + Sandalwood = อบอุ่น resinous' },
      ],
    },
    {
      name: 'Tonka Bean Absolute', role: 'base', priority: 'nice',
      reason: 'vanilla+marzipan+hay',
      future_value: 'ให้ complexity ที่ Vanilla เดี่ยวๆ ให้ไม่ได้ เพิ่ม coumarin hay-like note',
      substitutes: ['Vanilla Absolute', 'Benzoin Resinoid'],
      unlocks: [
        { type: 'accord', name: 'Fougère Accord', desc: 'Tonka + Lavender + Oakmoss = fougère คลาสสิก' },
        { type: 'formula', name: 'สูตร Elegant Amber', desc: 'Tonka + Iris + Cedar = powdery sophisticated' },
      ],
    },
  ],
  Musk: [
    {
      name: 'Iso E Super', role: 'base', priority: 'must',
      reason: 'Musk สังเคราะห์ยอดนิยม woody-clean',
      future_value: 'ให้ woody-clean musk ที่ติดผิว เป็น secret ingredient ของน้ำหอมหลายตัว',
      substitutes: ['Galaxolide', 'Cashmeran'],
      unlocks: [
        { type: 'accord', name: 'Skin Scent Accord', desc: 'Iso E Super + Ambrette = กลิ่นผิวหนังสะอาด' },
        { type: 'accord', name: 'Woody Musk Accord', desc: 'Iso E Super + Cedarwood = woody clean base' },
        { type: 'formula', name: 'สูตร Molecule Style', desc: 'Iso E Super เดี่ยว หรือ + Bergamot = minimalist niche' },
      ],
    },
    {
      name: 'Galaxolide', role: 'base', priority: 'must',
      reason: 'Clean musk คลาสสิก',
      future_value: 'musk ที่สะอาดที่สุด ให้กลิ่น laundry-fresh ใส่ใน formula ไหนก็ขายได้',
      substitutes: ['Iso E Super', 'Habanolide'],
      unlocks: [
        { type: 'accord', name: 'Clean Linen Accord', desc: 'Galaxolide + Dihydromyrcenol = ผ้าสะอาด' },
        { type: 'accord', name: 'Soft Musk Accord', desc: 'Galaxolide + Vanilla = นุ่ม หวาน skin-close' },
        { type: 'formula', name: 'สูตร Fresh Clean', desc: 'Galaxolide + Bergamot + Cedar = น้ำหอมทุกวัน' },
      ],
    },
    {
      name: 'Habanolide', role: 'base', priority: 'nice',
      reason: 'Musk นุ่ม diffusive',
      future_value: 'ให้ musk trail ที่ diffusive ออกจากผิวได้ดี เพิ่ม sillage ให้สูตร',
      substitutes: ['Galaxolide', 'Iso E Super'],
      unlocks: [
        { type: 'accord', name: 'Airy Musk Accord', desc: 'Habanolide + Calone = กลิ่น air อ่อนๆ' },
        { type: 'formula', name: 'สูตร Soft Projection', desc: 'Habanolide + Floral = กลิ่นลอยรอบตัว' },
      ],
    },
    {
      name: 'Cashmeran', role: 'base', priority: 'nice',
      reason: 'Musky+Woody+Spicy อเนกประสงค์',
      future_value: 'versatile มาก ให้ทั้ง musk + warmth + spice ในตัวเดียว เป็น signature ingredient',
      substitutes: ['Iso E Super', 'Galaxolide'],
      unlocks: [
        { type: 'accord', name: 'Cashmere Accord', desc: 'Cashmeran + Sandalwood + Vanilla = นุ่มอุ่นหรู' },
        { type: 'formula', name: 'สูตร Cozy Warm', desc: 'Cashmeran + Rose + Amber = อบอุ่น intimate' },
      ],
    },
    {
      name: 'Ambrette Seed', role: 'base', priority: 'nice',
      reason: 'Natural musk ทางเลือก',
      future_value: 'natural alternative ที่ให้ musky floral ไม่แพ้ synthetic แต่ unique มากกว่า',
      substitutes: ['Galaxolide', 'Habanolide'],
      unlocks: [
        { type: 'accord', name: 'Natural Musk Accord', desc: 'Ambrette + Rose = natural skin musk' },
        { type: 'formula', name: 'สูตร Natural Niche', desc: 'Ambrette + Iris + Bergamot = artisan fragrance' },
      ],
    },
  ],
  Fresh: [
    {
      name: 'Calone', role: 'top', priority: 'must',
      reason: 'ทะเล ozonic ให้ความสดชื่น',
      future_value: 'ให้ marine aquatic ที่ไม่มีตัวอื่นแทนได้ — หยดเดียวก็เปลี่ยน character สูตรได้เลย',
      substitutes: ['Dihydromyrcenol', 'Spearmint EO'],
      unlocks: [
        { type: 'accord', name: 'Ocean Accord', desc: 'Calone + Dihydromyrcenol + Musk = กลิ่นทะเล' },
        { type: 'accord', name: 'Aquatic Fresh Accord', desc: 'Calone + Bergamot + Cedar = ลมทะเล' },
        { type: 'formula', name: 'สูตร Aquatic Marine', desc: 'Calone + Violet Leaf + Sandalwood = ocean niche' },
      ],
    },
    {
      name: 'Dihydromyrcenol', role: 'top', priority: 'must',
      reason: 'Citrus-Fresh ราคาถูก ใช้ได้เยอะ',
      future_value: 'ให้ fresh clean citrus-like ราคาถูกมาก เป็น backbone ของน้ำหอม fresh หลายตัว',
      substitutes: ['Lemon EO', 'Litsea Cubeba EO'],
      unlocks: [
        { type: 'accord', name: 'Clean Fresh Accord', desc: 'Dihydromyrcenol + Galaxolide = ผ้าสะอาดสด' },
        { type: 'formula', name: 'สูตร Sport Fresh', desc: 'Dihydromyrcenol + Cedar + Musk = น้ำหอมผู้ชายสด' },
      ],
    },
    {
      name: 'Eucalyptus EO', role: 'top', priority: 'nice',
      reason: 'สะอาด herbaceous',
      future_value: 'ให้ clean medicinal fresh เพิ่ม spa-like และ masculine freshness',
      substitutes: ['Spearmint EO', 'Dihydromyrcenol'],
      unlocks: [
        { type: 'accord', name: 'Spa Fresh Accord', desc: 'Eucalyptus + Spearmint + Cedar = spa day' },
      ],
    },
    {
      name: 'Spearmint EO', role: 'top', priority: 'nice',
      reason: 'สดชื่น สะอาด',
      future_value: 'ให้ minty fresh ที่นุ่มกว่า Peppermint เหมาะกับสูตร clean และ aquatic',
      substitutes: ['Eucalyptus EO', 'Dihydromyrcenol'],
      unlocks: [
        { type: 'accord', name: 'Mint Tea Accord', desc: 'Spearmint + Green Tea + Musk = ชาเย็นหอม' },
        { type: 'formula', name: 'สูตร Linen Fresh', desc: 'Spearmint + Galaxolide + Cedar = ผ้าสะอาด' },
      ],
    },
    {
      name: 'Violet Leaf Absolute', role: 'heart', priority: 'nice',
      reason: 'Green watery ทันสมัย',
      future_value: 'ให้ green-watery ที่เป็น signature ของน้ำหอม niche สาย fresh — หายากและทันสมัยมาก',
      substitutes: ['Spearmint EO', 'Calone'],
      unlocks: [
        { type: 'accord', name: 'Green Water Accord', desc: 'Violet Leaf + Calone + Musk = น้ำสีเขียว' },
        { type: 'formula', name: 'สูตร Niche Fresh', desc: 'Violet Leaf + Iris + Cedar = artisan fresh' },
      ],
    },
  ],
  Spicy: [
    {
      name: 'Black Pepper EO', role: 'top', priority: 'must',
      reason: 'spice ที่ versatile ที่สุด',
      future_value: 'เพิ่ม zing และ personality ให้สูตร ใช้ได้ทั้ง masculine และ unisex',
      substitutes: ['Cardamom EO', 'Ginger EO'],
      unlocks: [
        { type: 'accord', name: 'Spicy Fresh Accord', desc: 'Black Pepper + Bergamot = สดเผ็ด energetic' },
        { type: 'formula', name: 'สูตร Pepper Rose', desc: 'Black Pepper + Rose + Sandalwood = spicy floral' },
      ],
    },
    {
      name: 'Cardamom EO', role: 'top', priority: 'must',
      reason: 'สดเผ็ด หอมเขตร้อน',
      future_value: 'ให้ spicy ที่มี freshness เป็น middle ground ระหว่าง spice และ fresh',
      substitutes: ['Black Pepper EO', 'Ginger EO'],
      unlocks: [
        { type: 'accord', name: 'Exotic Spice Accord', desc: 'Cardamom + Rose + Oud = middle eastern' },
        { type: 'formula', name: 'สูตร Spicy Oriental', desc: 'Cardamom + Sandalwood + Musk = exotic warm' },
      ],
    },
    {
      name: 'Clove Bud EO', role: 'heart', priority: 'must',
      reason: 'เผ็ดร้อน หอมเครื่องเทศ',
      future_value: 'ให้ warmth และ oriental spice ที่ชัดเจน ใช้น้อยๆ ให้ผลมาก',
      substitutes: ['Cinnamon Bark EO', 'Cardamom EO'],
      unlocks: [
        { type: 'accord', name: 'Spice Market Accord', desc: 'Clove + Cinnamon + Cardamom = ตลาดเครื่องเทศ' },
        { type: 'formula', name: 'สูตร Winter Spice', desc: 'Clove + Orange + Amber = กลิ่นหน้าหนาว' },
      ],
    },
    {
      name: 'Cinnamon Bark EO', role: 'heart', priority: 'nice',
      reason: 'อบอุ่น เผ็ด ใช้น้อยๆ',
      future_value: 'ให้ warmth ที่หวานกว่า Clove เหมาะสูตร oriental และ gourmand-spicy',
      substitutes: ['Clove Bud EO', 'Cardamom EO'],
      unlocks: [
        { type: 'accord', name: 'Sweet Spice Accord', desc: 'Cinnamon + Vanilla + Amber = อบอุ่นหวาน' },
      ],
    },
    {
      name: 'Ginger EO', role: 'top', priority: 'nice',
      reason: 'สด เผ็ดสะอาด',
      future_value: 'ให้ fresh spicy ที่สะอาด เป็น bridge ระหว่าง fresh และ spicy notes',
      substitutes: ['Black Pepper EO', 'Cardamom EO'],
      unlocks: [
        { type: 'accord', name: 'Ginger Citrus Accord', desc: 'Ginger + Lemon + Musk = สด กระปรี้กระเปร่า' },
      ],
    },
  ],
  Gourmand: [
    {
      name: 'Vanilla Absolute', role: 'base', priority: 'must',
      reason: 'หัวใจ gourmand ขาดไม่ได้',
      future_value: 'ทำให้สูตรดึงดูด น่ากิน และ approachable — ขายได้ง่ายที่สุดในกลุ่ม',
      substitutes: ['Benzoin Resinoid', 'Tonka Bean Absolute'],
      unlocks: [
        { type: 'accord', name: 'Vanilla Soft Accord', desc: 'Vanilla + Musk = skin vanilla นุ่มๆ' },
        { type: 'accord', name: 'Gourmand Base', desc: 'Vanilla + Caramel + Tonka = ฐาน gourmand' },
        { type: 'formula', name: 'สูตร Sweet Skin', desc: 'Vanilla + Rose + Musk = น่ารัก หวาน feminine' },
      ],
    },
    {
      name: 'Ethyl Maltol', role: 'base', priority: 'must',
      reason: 'candy-like หวานมาก',
      future_value: 'ให้ cotton candy sweetness ที่ Vanilla ไม่มี ราคาถูกมาก ผลแรง',
      substitutes: ['Vanilla Absolute', 'Caramel'],
      unlocks: [
        { type: 'accord', name: 'Candy Accord', desc: 'Ethyl Maltol + Vanilla + Musk = candy sweet' },
        { type: 'formula', name: 'สูตร Dessert', desc: 'Ethyl Maltol + Caramel + Sandalwood = warm dessert' },
      ],
    },
    {
      name: 'Caramel', role: 'base', priority: 'must',
      reason: 'กาแฟ ขนมหวาน',
      future_value: 'ให้ warm baked sweetness เพิ่ม foodie character ที่แตกต่างจาก Vanilla',
      substitutes: ['Ethyl Maltol', 'Vanilla Absolute'],
      unlocks: [
        { type: 'accord', name: 'Coffee Accord', desc: 'Caramel + Tonka + Patchouli = กาแฟอุ่นๆ' },
        { type: 'formula', name: 'สูตร Café', desc: 'Caramel + Vanilla + Sandalwood = coffee shop vibes' },
      ],
    },
    {
      name: 'Heliotropin', role: 'heart', priority: 'nice',
      reason: 'Cherry blossom + almond',
      future_value: 'ให้ powdery almond-cherry ที่ทำให้สูตร gourmand ดู elegant ไม่ childish',
      substitutes: ['Vanilla Absolute', 'Tonka Bean Absolute'],
      unlocks: [
        { type: 'accord', name: 'Cherry Blossom Accord', desc: 'Heliotropin + Rose + Musk = sakura vibes' },
      ],
    },
    {
      name: 'Hazelnut', role: 'heart', priority: 'nice',
      reason: 'ถั่ว warm baked',
      future_value: 'ให้ nutty warmth เพิ่ม complexity ให้ gourmand สูตร ดูน่ากินและ sophisticated',
      substitutes: ['Caramel', 'Tonka Bean Absolute'],
      unlocks: [
        { type: 'accord', name: 'Nutty Warm Accord', desc: 'Hazelnut + Vanilla + Tonka = ขนมถั่วอบ' },
      ],
    },
  ],
}

export const VIBE_KEYWORDS = {
  'ดอกไม้': ['Floral'], 'rose': ['Floral'], 'กุหลาบ': ['Floral'],
  'มะลิ': ['Floral'], 'jasmine': ['Floral'], 'floral': ['Floral'],
  'สด': ['Fresh', 'Citrus'], 'ฝน': ['Fresh'], 'ทะเล': ['Fresh'],
  'สะอาด': ['Fresh', 'Musk'], 'fresh': ['Fresh'], 'ocean': ['Fresh'], 'aqua': ['Fresh'],
  'ไม้': ['Woody'], 'woody': ['Woody'], 'ป่า': ['Woody', 'Fresh'], 'ดิน': ['Woody'],
  'ส้ม': ['Citrus'], 'bergamot': ['Citrus'], 'citrus': ['Citrus'],
  'lemon': ['Citrus'], 'เปรี้ยว': ['Citrus'],
  'อบอุ่น': ['Ambery', 'Woody'], 'amber': ['Ambery'], 'vanilla': ['Gourmand', 'Ambery'],
  'ร้อน': ['Spicy', 'Ambery'], 'warm': ['Ambery'],
  'musk': ['Musk'], 'niche': ['Musk', 'Woody'], 'ผิว': ['Musk'],
  'masculine': ['Musk', 'Woody'], 'skin': ['Musk'],
  'เครื่องเทศ': ['Spicy'], 'spice': ['Spicy'], 'spicy': ['Spicy'], 'พริก': ['Spicy'],
  'หวาน': ['Gourmand', 'Ambery'], 'ขนม': ['Gourmand'], 'กาแฟ': ['Gourmand'],
  'chocolate': ['Gourmand'], 'sweet': ['Gourmand'], 'baked': ['Gourmand'],
  'tea': ['Fresh', 'Woody'], 'ชา': ['Fresh', 'Woody'],
  'fabric': ['Musk', 'Fresh'], 'linen': ['Musk', 'Fresh'], 'cotton': ['Musk', 'Fresh'],
  'minimal': ['Musk', 'Fresh'], 'clean': ['Fresh', 'Musk'],
}

export function getRelevantFamilies(vibe = '') {
  const lower = vibe.toLowerCase()
  const families = new Set()
  for (const [keyword, fams] of Object.entries(VIBE_KEYWORDS)) {
    if (lower.includes(keyword)) fams.forEach(f => families.add(f))
  }
  return [...families]
}

export function getStockRecommendations(vibe = '', ownedMaterialNames = [], explicitFamilies = null) {
  const families = explicitFamilies || getRelevantFamilies(vibe)
  if (families.length === 0) return []

  const owned = ownedMaterialNames.map(n => n.toLowerCase())

  function matchOwned(targetName) {
    const t = targetName.toLowerCase()
    return owned.some(o =>
      o.includes(t.split(' ')[0]) || t.includes(o.split(' ')[0])
    )
  }

  const recs = []
  const seen = new Set()

  for (const fam of families) {
    const items = STOCK_BY_FAMILY[fam] || []
    for (const item of items) {
      if (seen.has(item.name)) continue
      seen.add(item.name)
      const alreadyOwned    = matchOwned(item.name)
      const substituteOwned = !alreadyOwned
        ? (item.substitutes || []).find(s => matchOwned(s)) || null
        : null
      recs.push({ ...item, family: fam, alreadyOwned, substituteOwned })
    }
  }

  return recs.sort((a, b) => {
    if (a.alreadyOwned && !b.alreadyOwned) return 1
    if (!a.alreadyOwned && b.alreadyOwned) return -1
    if (a.priority === 'must' && b.priority !== 'must') return -1
    if (b.priority === 'must' && a.priority !== 'must') return 1
    if (a.substituteOwned && !b.substituteOwned) return 1
    if (!a.substituteOwned && b.substituteOwned) return -1
    return 0
  })
}
