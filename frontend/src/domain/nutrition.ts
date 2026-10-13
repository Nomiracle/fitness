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

/**
 * 当日肌酸合计（克）。
 * 独立于 daySum：daySum 的形状被 legacy 差分向量冻结（k/p/c/f 四键），加字段会破门禁；
 * 且肌酸不是宏量营养素，不该混进热量/蛋白的加总里。
 * 老记录缺 cr 字段 → 按 0（`|| 0` 同时兜住 null/undefined/NaN）。
 */
export function creatineSum(db: FitnessDB, d: string): number {
  return db.f.filter((x) => x.d === d).reduce((s, x) => s + (x.cr || 0), 0)
}
