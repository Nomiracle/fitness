/** 迁移期新增/改写的规则单测（v1.5 无对应函数，但规则来自其 applyRowTimes / setBar / atBtn） */
import { describe, expect, it } from 'vitest'
import { MAX_ACTION_MIN, tsFromTime, validateTimeEdit } from './time'
import { barWidth, isOver } from './nutrition'
import { elapsedMs, toggleTimer, type TimerState } from './workout'

describe('历史行内改时间的校验规则', () => {
  const d = '2026-09-28'

  it('两栏必填', () => {
    expect(validateTimeEdit(d, '', '21:00').ok).toBe(false)
    expect(validateTimeEdit(d, '20:00', '').ok).toBe(false)
    expect(validateTimeEdit(d, '', '').error).toBe('请填写开始和结束时间')
  })

  it('结束必须晚于开始（相等也拒绝）', () => {
    expect(validateTimeEdit(d, '21:00', '21:00').error).toBe('结束时间必须晚于开始时间')
    expect(validateTimeEdit(d, '21:00', '20:59').error).toBe('结束时间必须晚于开始时间')
  })

  it('单段不超过 120 分钟，边界恰好 120 分钟通过', () => {
    expect(validateTimeEdit(d, '19:00', '21:00').ok).toBe(true)
    expect(validateTimeEdit(d, '19:00', '21:01').error).toBe(`单段不能超过 ${MAX_ACTION_MIN} 分钟`)
  })

  it('通过时给出分钟数并回传本地时间戳', () => {
    const r = validateTimeEdit(d, '19:30', '20:45')
    expect(r.ok).toBe(true)
    expect(r.minutes).toBe(75)
    expect(r.et - r.st).toBe(75 * 60000)
    expect(r.st).toBe(tsFromTime(d, '19:30'))
  })

  it('非法时刻（24:00 / 乱填）按空处理', () => {
    expect(validateTimeEdit(d, '24:00', '23:00').ok).toBe(false)
    expect(validateTimeEdit(d, 'aa:bb', '23:00').ok).toBe(false)
  })
})

describe('进度条超标阈值（v1.5 setBar 的 v>1.15）', () => {
  it('恰好 1.15 不算超标，超过则算', () => {
    expect(isOver(1150, 1000)).toBe(false)
    expect(isOver(1151, 1000)).toBe(true)
    expect(isOver(0, 3000)).toBe(false)
  })

  it('宽度封顶 100%', () => {
    expect(barWidth(1500, 3000)).toBe(50)
    expect(barWidth(9000, 3000)).toBe(100)
    expect(barWidth(10, 0)).toBe(0)
  })
})

describe('计时状态机（v1.5 atBtn 的纯函数版）', () => {
  const T0 = 1_790_000_000_000

  it('idle → running（以点击时刻为开始）', () => {
    const s = toggleTimer({ state: 'idle', st: 0, pauseMs: 0, pauseAt: 0 }, T0)
    expect(s).toEqual({ state: 'running', st: T0, pauseMs: 0, pauseAt: 0 })
  })

  it('running → paused（记下暂停起点）', () => {
    const s = toggleTimer({ state: 'running', st: T0, pauseMs: 0, pauseAt: 0 }, T0 + 60_000)
    expect(s).toEqual({ state: 'paused', st: T0, pauseMs: 0, pauseAt: T0 + 60_000 })
  })

  it('paused → running（暂停时长累计进 pauseMs）', () => {
    const s = toggleTimer({ state: 'paused', st: T0, pauseMs: 30_000, pauseAt: T0 + 60_000 }, T0 + 90_000)
    expect(s).toEqual({ state: 'running', st: T0, pauseMs: 60_000, pauseAt: 0 })
  })

  it('暂停期间已用时长冻结', () => {
    const at: TimerState = { state: 'paused', st: T0, pauseMs: 0, pauseAt: T0 + 60_000 }
    expect(elapsedMs(at, T0 + 60_000)).toBe(60_000)
    expect(elapsedMs(at, T0 + 600_000)).toBe(60_000)
  })

  it('不修改入参（纯函数）', () => {
    const at: TimerState = { state: 'running', st: T0, pauseMs: 0, pauseAt: 0 }
    toggleTimer(at, T0 + 1000)
    expect(at).toEqual({ state: 'running', st: T0, pauseMs: 0, pauseAt: 0 })
  })
})
