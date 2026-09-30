import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/styles/main.css'
import App from './App.vue'
import router, { restoredRouteName } from './router'
import { useAuthStore } from './stores/auth'
import { useDataStore } from './stores/data'
import { useTimerStore } from './stores/timer'
import { setUnauthorizedHandler } from './api/client'

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus, { locale: zhCn })

/**
 * 启动顺序（骨架屏 → 校验 /api/me → 挂载）：
 * 1. index.html 内联骨架屏先出现（不含登录表单，天然不闪登录页）
 * 2. bootstrap(): 有 ft_session 标记才请求 /api/me，失败即视为未登录
 * 3. 挂载后路由守卫决定渲染登录页还是主界面
 */
async function start(): Promise<void> {
  const auth = useAuthStore()
  const data = useDataStore()
  const timer = useTimerStore()

  await auth.bootstrap()

  app.use(router)

  setUnauthorizedHandler(() => {
    auth.forceLogout()
    data.reset()
    timer.reset()
    const cur = router.currentRoute.value
    if (cur.name !== 'login') {
      void router.replace({ name: 'login', query: cur.fullPath === '/today' ? {} : { redirect: cur.fullPath } })
    }
  })

  await router.isReady()

  // 老会话（v1.5 的 ft_tab）恢复上次所在页：replace 不污染历史
  if (auth.isAuthed) {
    const restored = restoredRouteName()
    if (restored && router.currentRoute.value.name !== restored) {
      await router.replace({ name: restored })
    }
  }

  app.mount('#app')
}

void start()
