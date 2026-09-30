import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { KEY_TAB, safeGet, safeSet } from '@/utils/storage'

declare module 'vue-router' {
  interface RouteMeta {
    /** 免登录页面 */
    public?: boolean
    title?: string
    /** 是否出现在底部 tab 栏 */
    tab?: boolean
    tabIcon?: string
    /** 与本页对应的历史 tab 名（v1.5 的 ft_tab 值，用于老会话恢复） */
    key?: string
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  { path: '/', redirect: '/today' },
  {
    path: '/today',
    name: 'today',
    component: () => import('@/views/TodayView.vue'),
    meta: { title: '今日', tab: true, tabIcon: '📅', key: 'today' },
  },
  {
    path: '/train',
    name: 'train',
    component: () => import('@/views/TrainView.vue'),
    meta: { title: '训练', tab: true, tabIcon: '🏋️', key: 'train' },
  },
  {
    path: '/food',
    name: 'food',
    component: () => import('@/views/FoodView.vue'),
    meta: { title: '饮食', tab: true, tabIcon: '🍱', key: 'food' },
  },
  {
    path: '/weight',
    name: 'weight',
    component: () => import('@/views/WeightView.vue'),
    meta: { title: '体重', tab: true, tabIcon: '⚖️', key: 'weight' },
  },
  {
    path: '/plan',
    name: 'plan',
    component: () => import('@/views/PlanView.vue'),
    meta: { title: '计划', tab: true, tabIcon: '📖', key: 'plan' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/today' },
]

/** 老会话（v1.5 存的 ft_tab）→ 路由名，用于启动时恢复上次所在页 */
export function restoredRouteName(): string | null {
  const t = safeGet(KEY_TAB)
  if (!t || t === 'today') return null
  const hit = routes.find((r) => r.meta?.key === t && typeof r.name === 'string')
  return hit ? (hit.name as string) : null
}

export function rememberTab(name: string): void {
  const hit = routes.find((r) => r.name === name)
  const key = hit?.meta?.key
  if (key) safeSet(KEY_TAB, key)
}

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    return auth.isAuthed ? { name: 'today' } : true
  }
  if (!auth.isAuthed) {
    return { name: 'login', query: to.fullPath === '/today' ? {} : { redirect: to.fullPath } }
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 增肌记录` : '增肌记录'
  if (typeof to.name === 'string') rememberTab(to.name)
})

export default router
