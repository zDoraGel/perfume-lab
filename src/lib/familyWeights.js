/**
 * Family Weights System — Hybrid Rule-based + AI
 * 
 * Rule-based: กรอง family หยาบๆ จาก keyword
 * AI: re-rank และ weight ตาม vibe จริงๆ
 * Cache: เก็บใน formulas.family_weights
 */

import { callAI, parseAIJson } from './ai'
import { supabase } from './supabase'
import { VIBE_KEYWORDS } from '../constants/stockRecommendations'

// ── Rule-based base weights ────────────────────────────────────────────────────
const FAMILY_LIST = ['Woody','Floral','Citrus','Ambery','Musk','Fresh','Spicy','Gourmand']

function getRuleBasedWeights(vibe = '') {
  const lower  = vibe.toLowerCase()
  const counts = {}
  FAMILY_LIST.forEach(f => counts[f] = 0)

  for (const [keyword, families] of Object.entries(VIBE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      families.forEach(f => { counts[f] = (counts[f] || 0) + 1 })
    }
  }
  return counts
}

// ── AI re-ranking ──────────────────────────────────────────────────────────────
async function getAIWeights(vibe) {
  try {
    const r = await callAI(
      `You are a fragrance expert. Given a perfume vibe/concept, score each fragrance family from 0-10 based on how relevant it is.
Reply with RAW JSON only, no markdown:
{"Woody":0,"Floral":0,"Citrus":0,"Ambery":0,"Musk":0,"Fresh":0,"Spicy":0,"Gourmand":0}
0 = not relevant at all, 10 = core of this fragrance`,
      `Fragrance vibe: "${vibe}"
Score each family 0-10 based on how much it belongs in this fragrance concept.
Consider: aesthetic, mood, season, gender, occasion implied by the vibe.`
    )
    const parsed = parseAIJson(r)
    // validate all families present
    const valid = FAMILY_LIST.every(f => typeof parsed[f] === 'number')
    if (!valid) throw new Error('missing families')
    return parsed
  } catch (e) {
    console.warn('[getAIWeights failed]', e.message)
    return null
  }
}

// ── Hybrid: combine rule-based + AI ────────────────────────────────────────────
function combineWeights(ruleWeights, aiWeights) {
  if (!aiWeights) return ruleWeights
  const combined = {}
  for (const f of FAMILY_LIST) {
    // AI weight dominant (70%) + rule-based (30%)
    const rule = Math.min((ruleWeights[f] || 0) * 2, 10) // normalize rule to 0-10
    const ai   = aiWeights[f] || 0
    combined[f] = parseFloat((ai * 0.7 + rule * 0.3).toFixed(1))
  }
  return combined
}

/**
 * Get family weights for a formula
 * - ถ้ามี cache ใน DB → ใช้เลย
 * - ถ้าไม่มี → คำนวณ hybrid แล้ว save cache
 */
export async function getFamilyWeights(formulaId, vibe = '', forceRefresh = false) {
  // Check cache first
  if (!forceRefresh && formulaId) {
    const { data } = await supabase
      .from('formulas').select('family_weights').eq('id', formulaId).single()
    if (data?.family_weights) {
      return data.family_weights
    }
  }

  // Rule-based first
  const ruleWeights = getRuleBasedWeights(vibe)

  // AI re-rank if vibe is detailed enough
  let aiWeights = null
  if (vibe.length > 20) {
    aiWeights = await getAIWeights(vibe)
  }

  // Combine
  const weights = combineWeights(ruleWeights, aiWeights)

  // Save to DB cache
  if (formulaId) {
    await supabase.from('formulas')
      .update({ family_weights: weights })
      .eq('id', formulaId)
  }

  return weights
}

/**
 * Filter + sort families by weight threshold
 * @param {Object} weights  - { Floral: 8, Musk: 7, Spicy: 1, ... }
 * @param {number} minScore - minimum score to include (default 3)
 */
export function getRelevantFamiliesByWeight(weights, minScore = 3) {
  return Object.entries(weights)
    .filter(([, score]) => score >= minScore)
    .sort((a, b) => b[1] - a[1])
    .map(([family]) => family)
}
