import { FOOD_PRESETS } from '@/constants/foods'
import { describe, expect, it } from 'vitest'
import { toFoodRecs, type FoodDraft } from './foodDraft'

const draft = (n: string, k: string, p: string): FoodDraft => ({
  n,
  k,
  p,
  c: '0',
  f: '0',
})

describe('food presets', () => {
  it('split items sum exactly to the legacy preset totals', () => {
    for (const preset of FOOD_PRESETS) {
      const sums = preset.items.reduce((acc, x) => ({
        k: acc.k + x.k,
        p: acc.p + x.p,
        c: acc.c + x.c,
        f: acc.f + x.f,
      }), { k: 0, p: 0, c: 0, f: 0 })
      expect(sums, preset.n).toEqual({ k: preset.k, p: preset.p, c: preset.c, f: preset.f })
    }
  })
})

describe('toFoodRecs', () => {
  it('creates one independent log entry per food with shared meal metadata', () => {
    const recs = toFoodRecs([draft('鸡胸肉', '330', '55'), draft('米饭', '260', '5')], '2026-10-14', '午餐', 123)
    expect(recs).toEqual([
      { d: '2026-10-14', m: '午餐', n: '鸡胸肉', k: 330, p: 55, c: 0, f: 0, ts: 123 },
      { d: '2026-10-14', m: '午餐', n: '米饭', k: 260, p: 5, c: 0, f: 0, ts: 124 },
    ])
  })

  it('rejects the save if any food is missing a name or calories', () => {
    expect(toFoodRecs([draft('', '100', '2')], '2026-10-14', '午餐', 123)).toBeNull()
    expect(toFoodRecs([draft('苹果', '0', '0')], '2026-10-14', '午餐', 123)).toBeNull()
  })

  it('converts optional macro fields to zero', () => {
    expect(toFoodRecs([draft('苹果', '95', '')], '2026-10-14', '加餐', 123)?.[0]).toMatchObject({ k: 95, p: 0, c: 0, f: 0 })
  })
})
