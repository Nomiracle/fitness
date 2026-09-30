/**
 * 差分等价门禁：Vue 版 domain 层 vs 冻结的 v1.5 单文件实现输出向量。
 * 向量由 scripts/gen-legacy-vectors.mjs 从 v1.5 index.html 抽取函数现场生成
 * （源文件 sha256 见向量文件头），本测试只读冻结结果，不依赖 index.html。
 *
 * 运行：TZ=Asia/Shanghai node node_modules/vitest/vitest.mjs run
 */
import { describe, expect, it } from 'vitest'
import vectors from './__vectors__/legacy-vectors.json'
import type { BodyRec, FitnessDB, FoodRec, WorkoutRec } from './types'
import { actMs, dayActMs, daySpanMin, dayTotalMin, elapsedMs, pauseAtSave, recalcDay, type TimerState } from './workout'
import { assess } from './assessment'
import { mergeRemote } from './merge'
import { daySum } from './nutrition'
import { fmtT, hm, hhmm, MAX_ACTION_MS, tsFromTime } from './time'

interface WorkoutCase {
  kind: 'workout'
  id: string
  db: FitnessDB
  expected: {
    actMs: (number | null)[]
    dayActMs: number
    dayTotalMin: number | null
    daySpanMin: number | null
    recalcDay: number | null
    durAfter: number[]
  }
}

interface AssessmentCase {
  kind: 'assessment'
  id: string
  bw: BodyRec[]
  expected: string
}

interface MergeCase {
  kind: 'merge'
  id: string
  local: FitnessDB
  remote: FitnessDB
  expected: FitnessDB
}

interface SumCase {
  kind: 'sum'
  id: string
  f: FoodRec[]
  d: string
  expected: { k: number; p: number; c: number; f: number }
}

interface FormatCase {
  kind: 'format'
  id: string
  hm: { input: number; expected: string }[]
  hhmm: { input: number; expected: string }[]
  fmtT: { input: number; expected: string }[]
}

interface TsCase {
  kind: 'tsFromTime'
  id: string
  probes: { date: string; text: string; expected: number }[]
}

interface TimerCase {
  kind: 'timer'
  id: string
  atRunning: TimerState
  nowRunning: number
  expectedRunning: number
  atPaused: TimerState
  nowPaused: number
  expectedPaused: number
  expectedIdle: number
}

type Case = WorkoutCase | AssessmentCase | MergeCase | SumCase | FormatCase | TsCase | TimerCase

const cases = vectors.cases as unknown as Case[]
const byKind = (k: Case['kind']): Case[] => cases.filter((c) => c.kind === k)

describe('legacy 向量文件', () => {
  it('含全部场景且时区固定为 Asia/Shanghai（TZ 不符时格式化断言会直接失败）', () => {
    expect(vectors.tz).toBe('Asia/Shanghai')
    expect(cases.length).toBeGreaterThanOrEqual(16)
  })
})

describe('训练时长：与 v1.5 逐值一致', () => {
  for (const c of byKind('workout') as WorkoutCase[]) {
    it(c.id, () => {
      const db = structuredClone(c.db) as FitnessDB
      const day = db.w[0]?.d ?? '2026-09-28'

      expect(db.w.map((x) => actMs(x))).toEqual(c.expected.actMs)
      expect(dayActMs(db, day)).toBe(c.expected.dayActMs)
      expect(dayTotalMin(db, day)).toBe(c.expected.dayTotalMin)
      expect(daySpanMin(db, day)).toBe(c.expected.daySpanMin)
      expect(recalcDay(db, day)).toBe(c.expected.recalcDay)
      expect(db.w.map((x) => x.dur)).toEqual(c.expected.durAfter)
    })
  }

  it('上限常量与 v1.5 相同', () => {
    expect(MAX_ACTION_MS).toBe(120 * 60000)
  })
})

describe('周评估文案：与 v1.5 逐字一致', () => {
  for (const c of byKind('assessment') as AssessmentCase[]) {
    it(c.id, () => {
      expect(assess({ w: [], f: [], bw: c.bw })).toBe(c.expected)
    })
  }
})

describe('本地/远端合并：键与排序与 v1.5 一致', () => {
  for (const c of byKind('merge') as MergeCase[]) {
    it(c.id, () => {
      const got = mergeRemote(structuredClone(c.local) as FitnessDB, structuredClone(c.remote) as FitnessDB)
      expect(got).toEqual(c.expected)
      // 不修改入参
      expect(structuredClone(c.local) as FitnessDB).toEqual(c.local)
    })
  }

  it('同键时服务端优先；非 dirty 的整包覆盖由 store 负责（此处只验并集语义）', () => {
    const local: FitnessDB = {
      w: [{ d: '2026-09-28', ex: 'A', sets: [], dur: 0, st: 1, et: 2, pause: 0, ts: 7 }],
      f: [],
      bw: [],
    }
    const remote: FitnessDB = { w: [], f: [], bw: [] }
    expect(mergeRemote(local, remote)).toEqual(local)
  })
})

describe('饮食汇总：与 v1.5 一致', () => {
  for (const c of byKind('sum') as SumCase[]) {
    it(c.id, () => {
      expect(daySum({ w: [], f: c.f, bw: [] }, c.d)).toEqual(c.expected)
    })
  }
})

describe('时间格式化：与 v1.5 一致', () => {
  for (const c of byKind('format') as FormatCase[]) {
    it(`${c.id} · hm`, () => {
      for (const p of c.hm) expect(hm(p.input)).toBe(p.expected)
    })
    it(`${c.id} · hhmm`, () => {
      for (const p of c.hhmm) expect(hhmm(p.input)).toBe(p.expected)
    })
    it(`${c.id} · fmtT`, () => {
      for (const p of c.fmtT) expect(fmtT(p.input)).toBe(p.expected)
    })
  }
})

describe('HH:MM → 时间戳：与 v1.5 一致', () => {
  for (const c of byKind('tsFromTime') as TsCase[]) {
    it(c.id, () => {
      for (const p of c.probes) expect(tsFromTime(p.date, p.text)).toBe(p.expected)
    })
  }
})

describe('计时器已用时长：与 v1.5 一致', () => {
  for (const c of byKind('timer') as TimerCase[]) {
    it(c.id, () => {
      expect(elapsedMs(c.atRunning, c.nowRunning)).toBe(c.expectedRunning)
      expect(elapsedMs(c.atPaused, c.nowPaused)).toBe(c.expectedPaused)
      expect(elapsedMs({ state: 'idle', st: 0, pauseMs: 0, pauseAt: 0 }, c.nowPaused)).toBe(c.expectedIdle)
    })
  }

  it('保存时的暂停累计取自 v1.5 atBtn/saveWorkout 的同一算法', () => {
    const now = 1_790_000_100_000
    expect(pauseAtSave({ state: 'running', st: 1_790_000_000_000, pauseMs: 30_000, pauseAt: 0 }, now)).toBe(30_000)
    expect(pauseAtSave({ state: 'paused', st: 1_790_000_000_000, pauseMs: 30_000, pauseAt: 1_790_000_060_000 }, now)).toBe(70_000)
    expect(pauseAtSave({ state: 'idle', st: 0, pauseMs: 0, pauseAt: 0 }, now)).toBe(0)
  })
})

describe('动作记录形状：字段与 v1.5 契约一致', () => {
  it('导出字段为 d/ex/sets/st/et/pause/dur/ts', () => {
    const w: WorkoutRec = { d: '2026-09-28', ex: '卧推', sets: [{ w: 60, r: 10 }], dur: 9, st: 1, et: 2, pause: 0, ts: 3 }
    expect(Object.keys(w).sort()).toEqual(['d', 'dur', 'et', 'ex', 'pause', 'sets', 'st', 'ts'])
  })
})
