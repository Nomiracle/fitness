/** 领域类型 = 服务端 /api/export 与 /api/import 的载荷形状（逐字对齐 v1.5 契约） */

export interface WorkoutSetRec {
  /** 总重量 kg（杠铃=杆+两边，哑铃=两只合计，器械=插片数字） */
  w: number
  /** 次数 */
  r: number
}

export interface WorkoutRec {
  /** 日期 YYYY-MM-DD（本地日） */
  d: string
  /** 动作名 */
  ex: string
  sets: WorkoutSetRec[]
  /** 当天总时长（分钟，由当天所有动作的 et-st-pause 求和派生；无计时动作的天为 0 或历史值） */
  dur: number
  /** 本动作开始毫秒时间戳，无计时为 null */
  st: number | null
  /** 本动作结束毫秒时间戳（=保存时刻），无计时为 null */
  et: number | null
  /** 本动作暂停累计毫秒 */
  pause: number
  /** 记录创建时间戳 */
  ts: number
}

export interface FoodRec {
  d: string
  /** 餐次 */
  m: string
  /** 食物名 */
  n: string
  k: number
  p: number
  c: number
  f: number
  ts: number
}

export interface BodyRec {
  d: string
  kg: number
  note: string
  ts: number
}

/** 全量数据结构：localStorage 与 /api/import 共用 */
export interface FitnessDB {
  w: WorkoutRec[]
  f: FoodRec[]
  bw: BodyRec[]
}

export function emptyDB(): FitnessDB {
  return { w: [], f: [], bw: [] }
}
