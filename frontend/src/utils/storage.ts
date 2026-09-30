/** localStorage 键名（与 v1.5 完全一致，保证老会话/草稿无缝迁移） */

export const KEY_SESSION = 'ft_session'
export const KEY_TAB = 'ft_tab'
export const KEY_SCROLL = 'ft_scroll'

export const keyData = (user: string): string => `ft_data_${user}`
export const keyDirty = (user: string): string => `ft_dirty_${user}`
export const keyTimer = (user: string): string => `ft_timer_${user}`

export function safeGet(key: string): string {
  try {
    return window.localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

export function safeSet(key: string, value: string): void {
  try {
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  } catch {
    /* 隐私模式：忽略 */
  }
}
