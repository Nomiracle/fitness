import { http } from './client'
import type { FitnessDB } from '@/domain/types'

/** 与 server/app.py 的 7 个接口一一对应，契约与 v1.5 不变 */

export interface MeResp {
  user: string | null
}

export async function me(): Promise<MeResp> {
  const { data } = await http.get<MeResp>('/api/me')
  return data
}

export interface AuthResp {
  user: string
}

export async function login(username: string, password: string): Promise<AuthResp> {
  const { data } = await http.post<AuthResp>('/api/login', { username, password })
  return data
}

export async function register(username: string, password: string): Promise<AuthResp> {
  const { data } = await http.post<AuthResp>('/api/register', { username, password })
  return data
}

export async function logout(): Promise<void> {
  await http.post('/api/logout', {})
}

export async function fetchExport(): Promise<FitnessDB> {
  const { data } = await http.get<Partial<FitnessDB>>('/api/export')
  return { w: data.w || [], f: data.f || [], bw: data.bw || [] }
}

export interface ImportResp {
  ok: boolean
  w: number
  f: number
  bw: number
}

/** 覆盖式全量写入（与 v1.5 相同语义：先清空该用户数据再插入） */
export async function pushImport(db: FitnessDB): Promise<ImportResp> {
  const { data } = await http.post<ImportResp>('/api/import', db)
  return data
}
