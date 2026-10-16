/**
 * 饮食历史按日期分组：排序、每日小计口径（取整天而非展示条数）、天数上限与删除下标映射。
 */
import { describe, expect, it } from 'vitest'
import { FOOD_HISTORY_DAYS, foodDays, foodIndexMap } from './foodDays'
import type { FitnessDB, FoodRec } from './types'

let seq = 0
const food = (over: Partial<FoodRec> = {}): FoodRec => ({
  d: '2026-10-16',
  m: '早餐',
  n: '燕麦60g',
  k: 234,
  p: 10,
  c: 40,
  f: 4,
  ts: ++seq,
  ...over,
})
const db = (f: FoodRec[]): FitnessDB => ({ w: [], f, bw: [] })

describe('foodDays 分组', () => {
  it('按日期倒序分组，组内按 ts 倒序', () => {
    const a1 = food({ d: '2026-10-14', ts: 100 })
    const b1 = food({ d: '2026-10-16', ts: 200 })
    const b2 = food({ d: '2026-10-16', ts: 300, n: '牛奶250ml' })
    const { groups, total } = foodDays(db([a1, b1, b2]))
    expect(total).toBe(2)
    expect(groups.map((g) => g.d)).toEqual(['2026-10-16', '2026-10-14'])
    expect(groups[0].items.map((x) => x.n)).toEqual(['牛奶250ml', '燕麦60g'])
    expect(groups[1].items.map((x) => x.n)).toEqual(['燕麦60g'])
    expect(groups[0].items[0]).toBe(b2) // 同一对象引用，删除下标映射才能用
  })

  it('每日小计取整天记录，与展示条数无关', () => {
    const day = '2026-10-16'
    const rows = [
      food({ d: day, k: 78, p: 16, c: 1.6, f: 1, pw: 20, n: '乳清蛋白粉20g', ts: 10 }),
      food({ d: day, k: 234, p: 10, c: 40, f: 4, ts: 20 }),
      food({ d: day, k: 0, p: 0, c: 0, f: 0, cr: 5, n: '肌酸5g', ts: 30 }),
    ]
    const { groups } = foodDays(db(rows))
    expect(groups[0].day).toEqual({ k: 312, p: 26, c: 41.6, f: 5 })
    expect(groups[0].cr).toBe(5)
    expect(groups[0].pw).toBe(20)
    expect(groups[0].items.length).toBe(3)
  })

  it('肌酸与蛋白粉都不混进每日宏量小计', () => {
    const rows = [
      food({ k: 0, p: 0, c: 0, f: 0, cr: 5, n: '肌酸5g', ts: 1 }),
      food({ k: 78, p: 16, c: 1.6, f: 1, pw: 20, n: '乳清蛋白粉20g', ts: 2 }),
    ]
    const { groups } = foodDays(db(rows))
    expect(groups[0].day).toEqual({ k: 78, p: 16, c: 1.6, f: 1 })
    expect(groups[0].cr).toBe(5)
    expect(groups[0].pw).toBe(20)
  })

  it('天数上限只截展示，total 仍是全部天数', () => {
    const rows = ['2026-10-10', '2026-10-11', '2026-10-12'].map((d, i) => food({ d, ts: i + 1 }))
    const { groups, total } = foodDays(db(rows), 2)
    expect(groups.map((g) => g.d)).toEqual(['2026-10-12', '2026-10-11'])
    expect(total).toBe(3)
    expect(FOOD_HISTORY_DAYS).toBe(7)
  })

  it('老记录缺 cr/pw 字段 → 0，不产生 NaN', () => {
    const legacy = food({ ts: 1 })
    const { groups } = foodDays(db([legacy]))
    expect(groups[0].cr).toBe(0)
    expect(groups[0].pw).toBe(0)
    expect(Number.isNaN(groups[0].day.k)).toBe(false)
  })

  it('空库返回空分组', () => {
    const { groups, total } = foodDays(db([]))
    expect(groups).toEqual([])
    expect(total).toBe(0)
  })

  it('不修改入参顺序（纯函数）', () => {
    const rows = [food({ d: '2026-10-16', ts: 2 }), food({ d: '2026-10-16', ts: 1 })]
    const before = rows.map((x) => x.ts)
    foodDays(db(rows))
    expect(rows.map((x) => x.ts)).toEqual(before)
  })
})

describe('foodIndexMap 删除下标', () => {
  it('映射的是 db.f 原下标，与分组顺序无关', () => {
    const a = food({ ts: 1 })
    const b = food({ ts: 2 })
    const c = food({ ts: 3 })
    const m = foodIndexMap([a, b, c])
    expect([m.get(a), m.get(b), m.get(c)]).toEqual([0, 1, 2])
    // 分组后组内是 ts 倒序，用映射取到的仍是原下标
    const { groups } = foodDays(db([a, b, c]))
    expect(groups[0].items.map((x) => m.get(x))).toEqual([2, 1, 0])
  })
})
