/**
 * 肌酸快捷记录：汇总语义与向后兼容。
 * 肌酸不是宏量营养素 —— 它独立统计，绝不进 daySum 的 k/p/c/f（那份形状被 legacy 向量冻结）。
 */
import { describe, expect, it } from 'vitest'
import { creatineSum, daySum } from './nutrition'
import type { FitnessDB, FoodRec } from './types'

const DAY = '2026-10-13'
const OTHER = '2026-10-12'

let seq = 0
const food = (over: Partial<FoodRec> = {}): FoodRec => ({
  d: DAY,
  m: '补剂',
  n: '肌酸5g',
  k: 0,
  p: 0,
  c: 0,
  f: 0,
  cr: 5,
  ts: ++seq,
  ...over,
})
const db = (f: FoodRec[]): FitnessDB => ({ w: [], f, bw: [] })

describe('creatineSum', () => {
  it('只统计当天的肌酸条目', () => {
    expect(creatineSum(db([food(), food({ ts: 99 }), food({ d: OTHER })]), DAY)).toBe(10)
    expect(creatineSum(db([food()]), OTHER)).toBe(0)
  })

  it('同一天多次补记会累加（分次吃也算达标）', () => {
    expect(creatineSum(db([food({ cr: 3 }), food({ cr: 2 })]), DAY)).toBe(5)
  })

  it('老记录没有 cr 字段 → 按 0，不产生 NaN', () => {
    const legacy = food({ cr: undefined })
    delete (legacy as Partial<FoodRec>).cr
    const n = creatineSum(db([legacy]), DAY)
    expect(n).toBe(0)
    expect(Number.isNaN(n)).toBe(false)
  })

  it('普通饮食条目（无 cr）不影响肌酸统计', () => {
    expect(creatineSum(db([food({ n: '鸡胸200g', k: 330, p: 55, cr: undefined })]), DAY)).toBe(0)
  })
})

describe('肌酸不进宏量汇总（门禁保护）', () => {
  it('daySum 仍然只返回 k/p/c/f 四键', () => {
    const sum = daySum(db([food()]), DAY)
    expect(Object.keys(sum).sort()).toEqual(['c', 'f', 'k', 'p'])
  })

  it('肌酸条目的 0 热量/0 宏量不会污染当日加总', () => {
    const sum = daySum(db([food(), food({ n: '鸡胸200g', k: 330, p: 55, c: 0, f: 8, cr: undefined })]), DAY)
    expect(sum).toEqual({ k: 330, p: 55, c: 0, f: 8 })
  })

  it('补剂餐次的条目不会让热量目标误判达标', () => {
    const sum = daySum(db([food(), food({ ts: 42 })]), DAY)
    expect(sum.k).toBe(0)
  })
})
