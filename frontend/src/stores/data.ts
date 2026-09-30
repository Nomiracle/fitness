import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '@/api/endpoints'
import { emptyDB, type BodyRec, type FitnessDB, type FoodRec, type WorkoutRec } from '@/domain/types'
import { mergeRemote, sortBodyAsc } from '@/domain/merge'
import { daySum } from '@/domain/nutrition'
import { recalcDay } from '@/domain/workout'
import { today } from '@/domain/time'
import { keyData, keyDirty, safeGet, safeSet } from '@/utils/storage'

const PUSH_DEBOUNCE_MS = 800

/**
 * 全量数据集（与后端 /api/export、/api/import 同形状）。
 * 写入语义与 v1.5 完全一致：本地立即写 localStorage + 置 dirty，800ms 防抖后整体 POST /api/import；
 * 仅当推送成功才清 dirty —— 推送失败意味着本地比服务端新。
 */
export const useDataStore = defineStore('data', () => {
  const user = ref<string>('')
  const db = ref<FitnessDB>(emptyDB())
  const dirty = ref(false)
  const mergeApplied = ref(false)
  let pushTimer: ReturnType<typeof setTimeout> | null = null

  const workouts = computed<WorkoutRec[]>(() => db.value.w)
  const foods = computed<FoodRec[]>(() => db.value.f)
  const body = computed<BodyRec[]>(() => db.value.bw)

  function bind(u: string): void {
    user.value = u
  }

  function loadLocal(): void {
    try {
      const raw = safeGet(keyData(user.value))
      const parsed = raw ? (JSON.parse(raw) as FitnessDB) : null
      db.value = parsed && typeof parsed === 'object' ? { w: parsed.w || [], f: parsed.f || [], bw: parsed.bw || [] } : emptyDB()
    } catch {
      db.value = emptyDB()
    }
  }

  function saveLocal(): void {
    safeSet(keyData(user.value), JSON.stringify(db.value))
  }

  function clearDirty(): void {
    dirty.value = false
    safeSet(keyDirty(user.value), '')
  }

  /** 本地改动入口：写本地 + 置 dirty + 防抖推送 */
  function save(): void {
    saveLocal()
    dirty.value = true
    safeSet(keyDirty(user.value), '1')
    if (pushTimer) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      void pushNow()
    }, PUSH_DEBOUNCE_MS)
  }

  /** 立即推送（登出前、合并后调用） */
  async function pushNow(): Promise<boolean> {
    if (pushTimer) {
      clearTimeout(pushTimer)
      pushTimer = null
    }
    try {
      await api.pushImport(db.value)
      clearDirty()
      return true
    } catch {
      return false
    }
  }

  /** 登出前的兜底推送：只推有未决改动时 */
  async function flush(): Promise<void> {
    if (!dirty.value) return
    await pushNow()
  }

  /**
   * 拉取服务端数据。本地 dirty 时按 key 取并集（服务端同键优先）并回推；
   * 不 dirty 时服务端整体覆盖本地。
   */
  async function loadRemote(): Promise<{ ok: boolean; merged: boolean }> {
    try {
      const remote = await api.fetchExport()
      const wasDirty = safeGet(keyDirty(user.value)) === '1'
      db.value = wasDirty ? mergeRemote(db.value, remote) : remote
      mergeApplied.value = wasDirty
      saveLocal()
      if (wasDirty) await pushNow()
      return { ok: true, merged: wasDirty }
    } catch {
      return { ok: false, merged: false }
    }
  }

  function reset(): void {
    if (pushTimer) {
      clearTimeout(pushTimer)
      pushTimer = null
    }
    user.value = ''
    db.value = emptyDB()
    dirty.value = false
    mergeApplied.value = false
  }

  // ---- 训练 ----
  function addWorkout(rec: WorkoutRec): void {
    db.value.w.unshift(rec)
    recalcDay(db.value, rec.d)
    save()
  }

  function removeWorkout(index: number): void {
    const w = db.value.w[index]
    if (!w) return
    db.value.w.splice(index, 1)
    recalcDay(db.value, w.d)
    save()
  }

  function applyTimes(index: number, st: number, et: number): void {
    const w = db.value.w[index]
    if (!w) return
    w.st = st
    w.et = et
    w.pause = 0
    recalcDay(db.value, w.d)
    save()
  }

  function clearTimes(index: number): void {
    const w = db.value.w[index]
    if (!w) return
    w.st = null
    w.et = null
    w.pause = 0
    recalcDay(db.value, w.d)
    save()
  }

  // ---- 饮食 ----
  function addFood(rec: FoodRec): void {
    db.value.f.unshift(rec)
    save()
  }

  function removeFood(index: number): void {
    db.value.f.splice(index, 1)
    save()
  }

  function sumOf(d: string): ReturnType<typeof daySum> {
    return daySum(db.value, d)
  }

  // ---- 体重 ----
  /** 同一天只保留一条：先按日期删除再插入，并保持升序 */
  function upsertBody(rec: BodyRec): void {
    db.value.bw = sortBodyAsc(db.value.bw.filter((x) => x.d !== rec.d).concat([rec]))
    save()
  }

  // ---- 导出 / 导入 ----
  function replaceAll(next: FitnessDB): void {
    db.value = { w: next.w || [], f: next.f || [], bw: next.bw || [] }
    save()
  }

  function json(): FitnessDB {
    return db.value
  }

  function todaySum(): ReturnType<typeof daySum> {
    return daySum(db.value, today())
  }

  return {
    user,
    db,
    dirty,
    mergeApplied,
    workouts,
    foods,
    body,
    bind,
    loadLocal,
    loadRemote,
    save,
    saveLocal,
    pushNow,
    flush,
    reset,
    addWorkout,
    removeWorkout,
    applyTimes,
    clearTimes,
    addFood,
    removeFood,
    sumOf,
    upsertBody,
    replaceAll,
    json,
    todaySum,
  }
})
