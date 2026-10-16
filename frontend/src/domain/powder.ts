/**
 * 蛋白粉记录（乳清蛋白粉补剂条目）。
 *
 * 与肌酸的区别：蛋白粉**是**宏量营养素来源，必须计入 daySum 的热量与蛋白；
 * `pw`（粉的克数）只用于单独留痕（「今天蛋白粉吃了多少克」），**不进 daySum**，
 * 否则要重复计数。宏量一律照常写进 k/p/c/f，服务端同名字段为 `protein_powder`。
 */
import { WHEY } from '@/constants/foods'
import type { MacroSum } from './nutrition'
import type { FitnessDB, FoodRec } from './types'

export interface MacroProfile {
  k: number
  p: number
  c: number
  f: number
}

const r1 = (x: number): number => Math.round(x * 10) / 10

/** 克数 → 宏量：按每 100g 标签值线性折算，保留一位小数（0 与非法值按 0） */
export function powderMacros(g: number, per100g: MacroProfile = WHEY.per100g): MacroSum {
  const ratio = (Number(g) > 0 ? Number(g) : 0) / 100
  return {
    k: r1(per100g.k * ratio),
    p: r1(per100g.p * ratio),
    c: r1(per100g.c * ratio),
    f: r1(per100g.f * ratio),
  }
}

/** 记录名（与肌酸 `肌酸5g` 同风格），克数规整到一位小数 */
export function powderName(g: number): string {
  return `乳清蛋白粉${r1(Number(g) > 0 ? Number(g) : WHEY.defaultG)}g`
}

/**
 * 生成一条待落库的蛋白粉记录：餐次「补剂」、cr=0、pw=克数，宏量由标签折算。
 * 不经过 `toFoodRecs` 的热量校验路径（宏量算出来即 >0，校验本身也过），但仍走 addFood 正常入队。
 */
export function powderRec(d: string, g: number, ts: number): FoodRec {
  const grams = r1(Number(g) > 0 ? Number(g) : WHEY.defaultG)
  const m = powderMacros(grams)
  return {
    d,
    m: WHEY.meal,
    n: powderName(grams),
    k: m.k,
    p: m.p,
    c: m.c,
    f: m.f,
    cr: 0,
    pw: grams,
    ts,
  }
}

/**
 * 当日蛋白粉合计（克）。独立于 daySum：宏量已经通过 k/p/c/f 进过一次 daySum，
 * `pw` 只是留痕字段，混进去就是重复计数。老记录缺 pw → 按 0。
 */
export function powderSum(db: FitnessDB, d: string): number {
  return db.f.filter((x) => x.d === d).reduce((s, x) => s + (x.pw || 0), 0)
}
