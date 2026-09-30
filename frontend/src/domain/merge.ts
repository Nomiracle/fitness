/**
 * 本地/远端合并（v1.5 逐字移植）。
 * 仅在本地存在未推送改动（dirty）时使用：按 key 取并集，服务端同键优先；
 * 非 dirty 时由服务端整体覆盖（见 stores/data.ts）。盲并集会复活用户已删除的记录。
 */
import type { BodyRec, FitnessDB, FoodRec, WorkoutRec } from './types'

const SEP = '\u0001'

/** 训练记录合并键：日期 + 动作 + 创建时间 */
export const workoutKey = (x: WorkoutRec): string => x.d + SEP + x.ex + SEP + (x.ts || 0)
/** 饮食记录合并键：日期 + 创建时间 + 食物名 */
export const foodKey = (x: FoodRec): string => x.d + SEP + (x.ts || 0) + SEP + x.n
/** 体重记录合并键：日期（同一天只保留一条） */
export const bodyKey = (x: BodyRec): string => x.d

function union<T>(local: T[] | undefined, remote: T[] | undefined, kf: (x: T) => string): T[] {
  const m = new Map<string, T>()
  ;(local || []).forEach((x) => m.set(kf(x), x))
  ;(remote || []).forEach((x) => m.set(kf(x), x))
  return [...m.values()]
}

export function mergeRemote(local: FitnessDB, remote: FitnessDB): FitnessDB {
  const w = union(local.w, remote.w, workoutKey).sort((a, b) => (b.ts || 0) - (a.ts || 0))
  const f = union(local.f, remote.f, foodKey).sort((a, b) => (b.ts || 0) - (a.ts || 0))
  const bw = union(local.bw, remote.bw, bodyKey).sort((a, b) => (a.d < b.d ? -1 : 1))
  return { w, f, bw }
}

/** 体重按日期升序（评估函数依赖该不变式） */
export function sortBodyAsc(bw: BodyRec[]): BodyRec[] {
  return [...bw].sort((a, b) => (a.d < b.d ? -1 : 1))
}
