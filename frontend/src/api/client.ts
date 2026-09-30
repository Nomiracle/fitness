import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

/**
 * 后端 API 前缀。缺省为空字符串 = 与前端同域部署，请求走 /api/...，
 * 绝不硬编码域名或 IP（生产由 nginx 反代转发）。
 */
export const API_BASE: string = ((import.meta.env.VITE_API_BASE as string | undefined) || '').replace(/\/+$/, '')

/** 统一错误：后端返回 {"error":"bad credentials"} 这类字符串码 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

export function errorText(e: unknown): string {
  if (isApiError(e)) return e.message || '请求失败'
  if (e instanceof Error) return e.message
  return '未知错误'
}

/** 后端错误码 → 中文文案（与 v1.5 登录/注册提示逐字一致） */
const MESSAGES: Record<string, string> = {
  'bad credentials': '用户名或密码错误',
  'registration closed': '已关闭公开注册（单用户模式），请直接登录',
  'user exists': '用户已存在，直接登录',
  'bad username/password': '用户名或密码不合法（用户名 2-64 位，密码 4-128 位）',
  unauthorized: '登录状态已失效，请重新登录',
}

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  // 会话是 HttpOnly Cookie（ftsess），同域部署自动携带
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => config)

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null

/** 由 main.ts 注入：任何 401 统一清会话并回登录页 */
export function setUnauthorizedHandler(fn: UnauthorizedHandler): void {
  onUnauthorized = fn
}

function toApiError(err: AxiosError): ApiError {
  const status = err.response?.status ?? 0
  const body = err.response?.data as { error?: unknown } | undefined
  const raw = typeof body?.error === 'string' ? body.error : ''
  const code = raw || (status === 401 ? 'unauthorized' : err.code || 'network_error')
  const message =
    MESSAGES[code] ??
    (status === 0 ? '无法连接服务器，请检查网络或后端服务' : raw || err.message || '请求失败')
  return new ApiError(code, message, status)
}

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const apiError = toApiError(err)
    if (apiError.status === 401 && onUnauthorized) onUnauthorized()
    return Promise.reject(apiError)
  },
)
