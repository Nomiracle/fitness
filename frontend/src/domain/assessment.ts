/** 本周体重评估（v1.5 逐字移植，含全部文案分支） */
import type { FitnessDB } from './types'

/** 近 7 天均值 − 前 7 天均值的评价文案；DB.bw 必须按日期升序 */
export function assess(db: FitnessDB): string {
  if (db.bw.length < 2) return '数据不足：坚持每天晨起空腹称一次，连续7天后这里会自动评估。'
  const last = [...db.bw].slice(-7)
  const avg = (a: { kg: number }[]) => a.reduce((x, y) => x + y.kg, 0) / a.length
  if (last.length < 7) return `已有${last.length}条，还差${7 - last.length}天即可出周评估。`
  const prev = db.bw.slice(-14, -7)
  if (prev.length < 7) return '再记一周即可对比周均值。'
  const d = avg(last) - avg(prev)
  if (d < 0.25) return `近7天均值涨 ${d.toFixed(2)}kg/周，偏慢 → 午/晚主食各+50g，下周再看。`
  if (d > 0.5) return `近7天均值涨 ${d.toFixed(2)}kg/周，偏快（易囤脂）→ 午/晚主食各−50g。`
  return `近7天均值涨 ${d.toFixed(2)}kg/周 ✅ 完美区间，保持当前饮食+训练。`
}

/** 周增重目标区间（kg/周） */
export const WEEKLY_GAIN_MIN = 0.25
export const WEEKLY_GAIN_MAX = 0.5
