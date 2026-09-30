import { ref } from 'vue'
import { defineStore } from 'pinia'
import { elapsedMs, idleTimer, pauseAtSave, toggleTimer, type TimerState } from '@/domain/workout'
import { today } from '@/domain/time'
import { keyTimer, safeGet, safeSet } from '@/utils/storage'

const TOGGLE_LOCK_MS = 400
const TICK_MS = 1000

interface PersistedTimer extends TimerState {
  day: string
}

/**
 * 动作级计时器。状态放在 store 而不是视图中：SPA 切 tab 会卸载视图组件，
 * 若把 interval/状态放在 TrainView 里，切页会杀掉计时或起多个 interval。
 */
export const useTimerStore = defineStore('timer', () => {
  const at = ref<TimerState>(idleTimer())
  /** 每 tick 更新，驱动「本动作 mm:ss」显示 */
  const now = ref<number>(Date.now())
  const user = ref<string>('')
  let tick: ReturnType<typeof setInterval> | null = null
  let lock = 0

  function bind(u: string): void {
    user.value = u
  }

  function persist(): void {
    if (!user.value) return
    const payload: PersistedTimer = { day: today(), ...at.value }
    safeSet(keyTimer(user.value), JSON.stringify(payload))
  }

  /** 只恢复「当天」的计时状态（跨天自动作废，与 v1.5 一致） */
  function load(): void {
    if (!user.value) return
    try {
      const raw = safeGet(keyTimer(user.value))
      if (!raw) return
      const s = JSON.parse(raw) as Partial<PersistedTimer>
      if (s && s.day === today() && typeof s.st === 'number' && (s.st > 0 || s.state === 'idle')) {
        at.value = {
          state: s.state === 'running' || s.state === 'paused' ? s.state : 'idle',
          st: s.st || 0,
          pauseMs: s.pauseMs || 0,
          pauseAt: s.pauseAt || 0,
        }
      }
    } catch {
      /* 损坏的草稿忽略 */
    }
  }

  function clear(): void {
    at.value = idleTimer()
    persist()
    now.value = Date.now()
  }

  /** 计时按钮（带 400ms 防抖，防连点把状态机打乱） */
  function toggle(): void {
    const t = Date.now()
    if (t - lock < TOGGLE_LOCK_MS) return
    lock = t
    at.value = toggleTimer(at.value, t)
    now.value = t
    persist()
  }

  function elapsed(): number {
    return elapsedMs(at.value, now.value)
  }

  function pauseTotalAtSave(): number {
    return pauseAtSave(at.value, Date.now())
  }

  function startTick(): void {
    if (tick) return
    tick = setInterval(() => {
      now.value = Date.now()
    }, TICK_MS)
  }

  function stopTick(): void {
    if (tick) {
      clearInterval(tick)
      tick = null
    }
  }

  function reset(): void {
    stopTick()
    at.value = idleTimer()
    user.value = ''
  }

  return { at, now, user, bind, load, clear, toggle, elapsed, pauseTotalAtSave, startTick, stopTick, reset }
})
