/**
 * 蛋白粉记录：宏量折算、留痕汇总与「不与 daySum 重复计数」的边界。
 */
import { describe, expect, it } from 'vitest'
import { daySum } from './nutrition'
import { powderMacros, powderName, powderRec, powderSum } from './powder'
import type { FitnessDB, FoodRec } from './types'

const DAY = '2026-10-16'
const OTHER = '2026-10-15'

let seq = 0
const food = (over: Partial<FoodRec> = {}): FoodRec => ({
  d: DAY,
  m: '补剂',
  n: '乳清蛋白粉20g',
  k: 78,
  p: 16,
  c: 1.6,
  f: 1,
  cr: 0,
  pw: 20,
  ts: ++seq,
  ...over,
})
const db = (f: FoodRec[]): FitnessDB => ({ w: [], f, bw: [] })

describe('powderMacros', () => {
  it('按每 100g 标签值线性折算（默认 390/80/8/5）', () => {
    expect(powderMacros(20)).toEqual({ k: 78, p: 16, c: 1.6, f: 1 })
  })

  it('整百克等于标签值本身，30g 一勺也对得上', () => {
    expect(powderMacros(100)).toEqual({ k: 390, p: 80, c: 8, f: 5 })
    expect(powderMacros(30)).toEqual({ k: 117, p: 24, c: 2.4, f: 1.5 })
  })

  it('0 / 负数 / 非法值都归零，不产生 NaN', () => {
    expect(powderMacros(0)).toEqual({ k: 0, p: 0, c: 0, f: 0 })
    expect(powderMacros(-20)).toEqual({ k: 0, p: 0, c: 0, f: 0 })
    expect(powderMacros(Number.NaN)).toEqual({ k: 0, p: 0, c: 0, f: 0 })
  })

  it('支持自定义产品标签（换牌子只改 per100g）', () => {
    const iso = { k: 380, p: 85, c: 4, f: 2 }
    expect(powderMacros(20, iso)).toEqual({ k: 76, p: 17, c: 0.8, f: 0.4 })
  })
})

describe('powderRec', () => {
  it('落一条「补剂」记录：名字带克数、pw 留痕、宏量按标签折算', () => {
    const r = powderRec(DAY, 20, 1234)
    expect(r).toEqual({
      d: DAY,
      m: '补剂',
      n: '乳清蛋白粉20g',
      k: 78,
      p: 16,
      c: 1.6,
      f: 1,
      cr: 0,
      pw: 20,
      ts: 1234,
    })
  })

  it('缺剂量时回落默认 20g，而不是记一条 0g 的空记录', () => {
    expect(powderRec(DAY, 0, 1).pw).toBe(20)
    expect(powderName(0)).toBe('乳清蛋白粉20g')
  })
})

describe('powderSum', () => {
  it('只统计当天的蛋白粉克数', () => {
    expect(powderSum(db([food(), food({ ts: 99 }), food({ d: OTHER })]), DAY)).toBe(40)
    expect(powderSum(db([food()]), OTHER)).toBe(0)
  })

  it('老记录没有 pw 字段 → 按 0，不产生 NaN', () => {
    const legacy = food({ pw: undefined })
    delete (legacy as Partial<FoodRec>).pw
    const n = powderSum(db([legacy]), DAY)
    expect(n).toBe(0)
    expect(Number.isNaN(n)).toBe(false)
  })
})

describe('蛋白粉计入宏量但不与留痕重复计数', () => {
  it('蛋白粉的热量/蛋白会进 daySum（这是与肌酸的关键区别）', () => {
    expect(daySum(db([food()]), DAY)).toEqual({ k: 78, p: 16, c: 1.6, f: 1 })
  })

  it('daySum 仍然只返回 k/p/c/f 四键（legacy 形状门禁）', () => {
    expect(Object.keys(daySum(db([food()]), DAY)).sort()).toEqual(['c', 'f', 'k', 'p'])
  })

  it('pw 只走 powderSum，不会被 daySum 二次累加', () => {
    const before = daySum(db([food({ pw: undefined })]), DAY)
    const after = daySum(db([food()]), DAY)
    expect(after).toEqual(before)
    expect(powderSum(db([food()]), DAY)).toBe(20)
  })

  it('蛋白粉条目与肌酸条目互不干扰，补剂餐次语义不变', () => {
    const creatine = food({ n: '肌酸5g', k: 0, p: 0, c: 0, f: 0, cr: 5, pw: 0 })
    expect(daySum(db([creatine]), DAY)).toEqual({ k: 0, p: 0, c: 0, f: 0 })
    expect(powderSum(db([creatine]), DAY)).toBe(0)
  })
})
