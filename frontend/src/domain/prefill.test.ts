/** 「上次」预填数据源的单测（new behavior；不改动既有 parity 向量） */
import { describe, expect, it } from 'vitest'
import { lastSetsFor, MAX_SET_ROWS } from './workout'
import type { FitnessDB, WorkoutRec } from './types'

function w(o: Partial<WorkoutRec> & { d: string; ex: string }): WorkoutRec {
  return { sets: [{ w: 60, r: 10 }], dur: 0, st: null, et: null, pause: 0, ts: 0, ...o }
}

function db(...recs: WorkoutRec[]): FitnessDB {
  return { w: recs, f: [], bw: [] }
}

describe('lastSetsFor：取「上次」记录', () => {
  it('取日期最近的一条，而不是最早或最新的插入顺序', () => {
    const d = db(
      w({ d: '2026-09-06', ex: '卧推', sets: [{ w: 30, r: 10 }], ts: 1788681091995 }),
      w({ d: '2026-09-28', ex: '卧推', sets: [{ w: 40, r: 8 }], ts: 1790601817930 }),
      w({ d: '2026-09-24', ex: '卧推', sets: [{ w: 35, r: 9 }], ts: 1790253549342 }),
    )
    const got = lastSetsFor(d, '卧推', '2026-09-30')
    expect(got?.d).toBe('2026-09-28')
    expect(got?.sets).toEqual([{ w: 40, r: 8 }])
  })

  it('同一天多条取创建时间更晚的那条', () => {
    const d = db(
      w({ d: '2026-09-28', ex: '卧推', sets: [{ w: 30, r: 10 }], ts: 100 }),
      w({ d: '2026-09-28', ex: '卧推', sets: [{ w: 32, r: 10 }], ts: 900 }),
      w({ d: '2026-09-28', ex: '卧推', sets: [{ w: 31, r: 10 }], ts: 500 }),
    )
    expect(lastSetsFor(d, '卧推', '2026-09-28')?.sets[0]).toEqual({ w: 32, r: 10 })
  })

  it('选中日期当天的记录算「上次」（同日重记也能填）', () => {
    const d = db(w({ d: '2026-09-30', ex: '卧推', sets: [{ w: 40, r: 5 }], ts: 1 }))
    expect(lastSetsFor(d, '卧推', '2026-09-30')?.d).toBe('2026-09-30')
  })

  it('排除晚于选中日期的记录（回填旧日期时不会拿未来的数据）', () => {
    const d = db(
      w({ d: '2026-09-24', ex: '卧推', sets: [{ w: 35, r: 9 }], ts: 1790253549342 }),
      w({ d: '2026-09-28', ex: '卧推', sets: [{ w: 40, r: 8 }], ts: 1790601817930 }),
    )
    expect(lastSetsFor(d, '卧推', '2026-09-25')?.d).toBe('2026-09-24')
    expect(lastSetsFor(d, '卧推', '2026-09-24')?.sets[0]).toEqual({ w: 35, r: 9 })
    expect(lastSetsFor(d, '卧推', '2026-09-23')).toBeNull()
  })

  it('不串动作（高位下拉的历史不会填到卧推）', () => {
    const d = db(
      w({ d: '2026-09-28', ex: '高位下拉', sets: [{ w: 32, r: 10 }], ts: 1 }),
      w({ d: '2026-09-24', ex: '卧推', sets: [{ w: 35, r: 9 }], ts: 2 }),
    )
    expect(lastSetsFor(d, '卧推', '2026-09-30')?.sets[0]).toEqual({ w: 35, r: 9 })
    expect(lastSetsFor(d, '腿举机', '2026-09-30')).toBeNull()
  })

  it('跳过没有组数据的历史记录，回退到更早的有效记录', () => {
    const d = db(
      w({ d: '2026-09-28', ex: '卧推', sets: [], ts: 9 }),
      w({ d: '2026-09-24', ex: '卧推', sets: [{ w: 35, r: 9 }], ts: 8 }),
    )
    expect(lastSetsFor(d, '卧推', '2026-09-30')?.d).toBe('2026-09-24')
    expect(lastSetsFor(db(w({ d: '2026-09-28', ex: '卧推', sets: [], ts: 9 })), '卧推', '2026-09-30')).toBeNull()
  })

  it('组数封顶 20（服务端每动作上限）', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ w: 20 + i, r: 5 }))
    const d = db(w({ d: '2026-09-28', ex: '卧推', sets: many, ts: 1 }))
    const got = lastSetsFor(d, '卧推', '2026-09-30')
    expect(got?.sets.length).toBe(MAX_SET_ROWS)
    expect(got?.sets[19]).toEqual({ w: 39, r: 5 })
  })

  it('纯函数：不修改 db，返回的组是副本', () => {
    const d = db(w({ d: '2026-09-28', ex: '卧推', sets: [{ w: 40, r: 8 }], ts: 1 }))
    const got = lastSetsFor(d, '卧推', '2026-09-30')
    got!.sets[0].w = 999
    expect(d.w[0].sets[0].w).toBe(40)
    expect(d.w[0].d).toBe('2026-09-28')
  })

  it('空库返回 null', () => {
    expect(lastSetsFor({ w: [], f: [], bw: [] }, '卧推', '2026-09-30')).toBeNull()
  })
})
