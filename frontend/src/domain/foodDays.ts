/**
 * 饮食历史按日期分组（历史展示用）。
 *
 * 关键语义：分组只决定「怎么展示」，每天的合计一律由 `daySum` / `creatineSum` / `powderSum`
 * 按日期重新汇总 —— 这些函数看的是整份 db.f，与 UI 展示了多少天/多少条无关，
 * 所以某天被截断展示时小计也不会算少。
 */
import { creatineSum, daySum, type MacroSum } from './nutrition'
import { powderSum } from './powder'
import type { FitnessDB, FoodRec } from './types'

export interface FoodDayGroup {
  /** 日期 YYYY-MM-DD */
  d: string
  /** 该天记录（ts 倒序，新在前） */
  items: FoodRec[]
  /** 该天全部记录的宏量合计（k/p/c/f） */
  day: MacroSum
  /** 该天肌酸合计（克，独立统计，不计入 day） */
  cr: number
  /** 该天蛋白粉合计（克，留痕用，不计入 day） */
  pw: number
}

/** 历史默认展示天数（可展开更多） */
export const FOOD_HISTORY_DAYS = 7

/**
 * 按日期倒序分组，组内按 ts 倒序。
 * @param maxDays 只返回最近这么多天；`total` 仍是全部有记录的天数（供「显示更多」判断）
 */
export function foodDays(
  db: FitnessDB,
  maxDays: number = FOOD_HISTORY_DAYS,
): { groups: FoodDayGroup[]; total: number } {
  const dates = [...new Set(db.f.map((x) => x.d))].sort().reverse()
  const groups = dates.slice(0, Math.max(0, maxDays)).map((d) => ({
    d,
    items: db.f.filter((x) => x.d === d).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)),
    day: daySum(db, d),
    cr: creatineSum(db, d),
    pw: powderSum(db, d),
  }))
  return { groups, total: dates.length }
}

/**
 * 记录 → db.f 下标（删除用）。
 * 分组/切片后的下标与 db.f 原下标不是一回事，删错行是这里最容易出的 bug，统一走这张表。
 */
export function foodIndexMap(f: FoodRec[]): Map<FoodRec, number> {
  const m = new Map<FoodRec, number>()
  f.forEach((x, i) => m.set(x, i))
  return m
}
