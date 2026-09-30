/** 饮食汇总与目标（v1.5 逐字移植） */
import type { FitnessDB } from './types'

export interface MacroSum {
  k: number
  p: number
  c: number
  f: number
}

export function daySum(db: FitnessDB, d: string): MacroSum {
  const r: MacroSum = { k: 0, p: 0, c: 0, f: 0 }
  db.f
    .filter((x) => x.d === d)
    .forEach((x) => {
      r.k += x.k
      r.p += x.p
      r.c += x.c
      r.f += x.f
    })
  return r
}

/** 进度条「超标」阈值：>1.15 视为超标（转红） */
export const OVER_RATIO = 1.15

export function isOver(value: number, target: number): boolean {
  return target > 0 && value / target > OVER_RATIO
}

export function barWidth(value: number, target: number): number {
  return Math.min(100, target > 0 ? (value / target) * 100 : 0)
}
