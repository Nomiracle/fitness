import type { FoodRec } from './types'

export interface FoodDraft {
  n: string
  k: string
  p: string
  c: string
  f: string
}

export function toFoodRecs(drafts: FoodDraft[], d: string, m: string, ts: number): FoodRec[] | null {
  if (!drafts.length || drafts.some((x) => !x.n.trim() || !(Number(x.k) > 0))) return null
  return drafts.map((x, index) => ({
    d,
    m,
    n: x.n.trim(),
    k: Number(x.k) || 0,
    p: Number(x.p) || 0,
    c: Number(x.c) || 0,
    f: Number(x.f) || 0,
    ts: ts + index,
  }))
}
