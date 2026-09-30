import type { FitnessDB } from '@/domain/types'
import { useDataStore } from '@/stores/data'
import { useTimerStore } from '@/stores/timer'

export interface EnterResult {
  ok: boolean
  merged: boolean
}

let loadedFor = ''
let inflight: Promise<EnterResult> | null = null

/**
 * 进入会话：绑定用户 → 读本地缓存 → 读本地计时草稿 → 拉服务端数据（dirty 时并集合并并回推）。
 * 视图无需等待该 Promise 完成即可渲染（读到的是本地缓存，服务端数据到达后响应式更新）。
 */
export function enterSession(user: string): Promise<EnterResult> {
  const data = useDataStore()
  const timer = useTimerStore()

  if (loadedFor === user && data.user === user && !inflight) {
    return Promise.resolve({ ok: true, merged: false })
  }
  if (inflight) return inflight

  inflight = (async (): Promise<EnterResult> => {
    data.bind(user)
    timer.bind(user)
    data.loadLocal()
    timer.load()
    loadedFor = user
    return await data.loadRemote()
  })().finally(() => {
    inflight = null
  })

  return inflight
}

/** 供退出登录 / 会话失效时重置（下次登录重新加载） */
export function resetSessionCache(): void {
  loadedFor = ''
  inflight = null
}

/** 类型占位：确保 FitnessDB 在本模块的导入不被摇掉（工具函数的公共出口） */
export type SessionDB = FitnessDB
