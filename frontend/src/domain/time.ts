/** 动作级计时的常量与时间工具（v1.5 逐字移植，见 parity 测试） */

/** 单个动作计时上限（分钟）：超出按上限计入 */
export const MAX_ACTION_MIN = 120
export const MAX_ACTION_MS = MAX_ACTION_MIN * 60000

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 毫秒 → 「[h:]mm:ss」 */
export function hm(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return (h ? h + ':' : '') + pad2(m) + ':' + pad2(ss)
}

/** 时间戳 → 「HH:MM」（本地时区） */
export function hhmm(ts: number): string {
  const d = new Date(ts)
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

/** 时间戳 → 「 HH:MM」（前导空格，用于日志行内联显示；0/空 → 空串） */
export function fmtT(ts: number | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  return ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

/**
 * 今天（本地日历日，YYYY-MM-DD）。
 * 注意：v1.5 用的是 toISOString()（UTC 日），在 UTC+8 的 00:00-08:00 会把日期记成前一天，
 * 与 <input type=date> 的本地日期、hhmm 的本地时刻不一致。这里改为本地日（已核对线上 15 条
 * 记录的 date 与本地日全部一致，属零迁移风险的修正）。
 */
export function today(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** HH:MM（+ 日期）→ 当天本地时间戳；非法返回 0 */
export function tsFromTime(date: string, v: string): number {
  if (!v) return 0
  const p = String(v).split(':')
  const h = +p[0]
  const m = +p[1]
  if (!(h >= 0 && h < 24 && m >= 0 && m < 60)) return 0
  const dt = new Date(date + 'T00:00:00')
  dt.setHours(h, m, 0, 0)
  return dt.getTime()
}

export interface TimeEditResult {
  ok: boolean
  st: number
  et: number
  /** 本动作分钟数（ok 时有效） */
  minutes: number
  error?: string
}

/** 历史行内改时间的校验规则（与 v1.5 applyRowTimes 一致） */
export function validateTimeEdit(date: string, stText: string, etText: string): TimeEditResult {
  const st = tsFromTime(date, stText)
  const et = tsFromTime(date, etText)
  if (!st || !et) return { ok: false, st, et, minutes: 0, error: '请填写开始和结束时间' }
  if (et <= st) return { ok: false, st, et, minutes: 0, error: '结束时间必须晚于开始时间' }
  if (et - st > MAX_ACTION_MS) {
    return { ok: false, st, et, minutes: 0, error: '单段不能超过 ' + MAX_ACTION_MIN + ' 分钟' }
  }
  return { ok: true, st, et, minutes: Math.max(1, Math.round((et - st) / 60000)) }
}
