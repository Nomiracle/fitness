/** 训练记录派生量（v1.5 逐字移植：无计时的动作一律不计入时长） */
import { MAX_ACTION_MS } from './time'
import type { FitnessDB, WorkoutRec } from './types'

export function dayRecords(db: FitnessDB, d: string): WorkoutRec[] {
  return db.w.filter((x) => x.d === d)
}

/** 单动作有效时长（毫秒）；未计时 → null */
export function actMs(x: WorkoutRec): number | null {
  if (!x.st || !x.et) return null
  return Math.max(0, Math.min(MAX_ACTION_MS, x.et - x.st - Math.max(0, x.pause || 0)))
}

export function dayActMs(db: FitnessDB, d: string): number {
  return dayRecords(db, d).reduce((s, x) => {
    const v = actMs(x)
    return s + (v == null ? 0 : v)
  }, 0)
}

export function hasTimes(db: FitnessDB, d: string): boolean {
  return dayRecords(db, d).some((x) => x.st && x.et)
}

/** 当天总时长（分钟）；无任何计时动作 → null */
export function dayTotalMin(db: FitnessDB, d: string): number | null {
  return hasTimes(db, d) ? Math.max(1, Math.round(dayActMs(db, d) / 60000)) : null
}

/** 在馆时长（最早开始 → 最晚结束，分钟）；无计时 → null */
export function daySpanMin(db: FitnessDB, d: string): number | null {
  const t = dayRecords(db, d).filter((x) => x.st && x.et)
  if (!t.length) return null
  const minSt = Math.min(...t.map((x) => x.st as number))
  const maxEt = Math.max(...t.map((x) => x.et as number))
  return Math.max(1, Math.round((maxEt - minSt) / 60000))
}

/** 把当天总时长回写到该天所有动作的 dur；无计时 → 返回 null（不改写） */
export function recalcDay(db: FitnessDB, d: string): number | null {
  const t = dayTotalMin(db, d)
  if (t == null) return null
  db.w.forEach((x) => {
    if (x.d === d) x.dur = t
  })
  return t
}

export interface TimerState {
  state: 'idle' | 'running' | 'paused'
  /** 本动作开始时间戳 */
  st: number
  /** 累计暂停毫秒 */
  pauseMs: number
  /** 进入暂停的时刻 */
  pauseAt: number
}

export function idleTimer(): TimerState {
  return { state: 'idle', st: 0, pauseMs: 0, pauseAt: 0 }
}

/** 本动作已进行毫秒数（含暂停扣除） */
export function elapsedMs(at: TimerState, now: number): number {
  if (!at.st) return 0
  const extra = at.state === 'paused' ? now - at.pauseAt : 0
  return Math.max(0, now - at.st - Math.max(0, at.pauseMs) - extra)
}

/**
 * 计时按钮：idle→running / running→paused / paused→running（v1.5 atBtn 的纯函数版）
 * 返回新的状态对象（不修改入参）
 */
export function toggleTimer(at: TimerState, now: number): TimerState {
  if (at.state === 'running') return { ...at, pauseAt: now, state: 'paused' }
  if (at.state === 'paused') return { ...at, pauseMs: at.pauseMs + (now - at.pauseAt), pauseAt: 0, state: 'running' }
  return { ...idleTimer(), state: 'running', st: now }
}

/** 保存时本动作的暂停累计值 */
export function pauseAtSave(at: TimerState, now: number): number {
  if (!at.st) return 0
  return at.state === 'paused' ? at.pauseMs + (now - at.pauseAt) : Math.max(0, at.pauseMs)
}

/** 已完成（当天已记录）的动作名集合 */
export function doneNames(db: FitnessDB, d: string): Set<string> {
  return new Set(dayRecords(db, d).map((x) => x.ex))
}
