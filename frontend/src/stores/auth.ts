import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as api from '@/api/endpoints'
import { KEY_SESSION, safeGet, safeSet } from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  /** 已登录用户名（来自 /api/me 或登录响应） */
  const username = ref<string>('')
  /** 启动期校验是否完成（未完成时渲染骨架屏，绝不闪登录页） */
  const booted = ref(false)
  /** 服务端模式：本服务始终走 /api（本机 localStorage 模式已按确认移除） */
  const server = computed(() => true)

  const isAuthed = computed(() => !!username.value)

  /**
   * 启动顺序：存有 ft_session 标记才请求 /api/me（无标记直接落登录页，少一次请求）；
   * 标记存在但会话已失效 → 清标记，渲染登录页。
   */
  async function bootstrap(): Promise<void> {
    const marker = safeGet(KEY_SESSION)
    if (!marker) {
      booted.value = true
      return
    }
    try {
      const r = await api.me()
      if (r.user) {
        username.value = r.user
        safeSet(KEY_SESSION, r.user)
      } else {
        forceLogout()
      }
    } catch {
      forceLogout()
    } finally {
      booted.value = true
    }
  }

  function forceLogout(): void {
    username.value = ''
    safeSet(KEY_SESSION, '')
  }

  async function login(u: string, p: string): Promise<void> {
    const r = await api.login(u, p)
    username.value = r.user || u
    safeSet(KEY_SESSION, username.value)
  }

  async function register(u: string, p: string): Promise<void> {
    const r = await api.register(u, p)
    username.value = r.user || u
    safeSet(KEY_SESSION, username.value)
  }

  /** 登出：先让调用方把未推送改动落库（见 views/App.logout），再清会话标记 */
  async function logout(): Promise<void> {
    try {
      await api.logout()
    } catch {
      /* 后端不可达也要本地登出 */
    }
    forceLogout()
  }

  return { username, booted, server, isAuthed, bootstrap, login, register, logout, forceLogout }
})
