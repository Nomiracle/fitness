import { reactive } from 'vue'

/** 页内反馈（带撤销的 toast）——取代 v1.5 的 alert/confirm */
interface ToastState {
  msg: string
  err: boolean
  visible: boolean
  action: (() => void) | null
  actionLabel: string
}

const state = reactive<ToastState>({
  msg: '',
  err: false,
  visible: false,
  action: null,
  actionLabel: '撤销',
})

let timer: ReturnType<typeof setTimeout> | null = null

/** 有撤销动作时停留 5s（与 v1.5 一致），普通提示 2.6s */
export interface ToastOptions {
  err?: boolean
  ms?: number
  action?: () => void
  actionLabel?: string
}

export function toast(msg: string, opt: ToastOptions = {}): void {
  state.msg = msg
  state.err = !!opt.err
  state.action = opt.action ?? null
  state.actionLabel = opt.actionLabel ?? '撤销'
  state.visible = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    state.visible = false
  }, opt.action ? 5000 : opt.ms || 2600)
}

export function runToastAction(): void {
  const f = state.action
  state.action = null
  if (timer) clearTimeout(timer)
  state.visible = false
  if (f) f()
}

export function hideToast(): void {
  if (timer) clearTimeout(timer)
  state.visible = false
  state.action = null
}

export function useToastState(): ToastState {
  return state
}
