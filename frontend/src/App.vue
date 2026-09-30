<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import { useTimerStore } from '@/stores/timer'
import { enterSession, resetSessionCache } from '@/composables/useSession'
import TabBar from '@/components/TabBar.vue'
import ToastHost from '@/components/ToastHost.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const data = useDataStore()
const timer = useTimerStore()

const isPublic = computed(() => route.meta.public === true)
const title = computed(() => (route.meta.title as string | undefined) ?? '今日')

/** 已登录即进入会话（绑定用户、读本地缓存、拉服务端数据） */
watch(
  () => auth.isAuthed,
  (ok) => {
    if (ok) void enterSession(auth.username)
  },
  { immediate: true },
)

/** 登出：先把未推送改动推上去（推送失败也照常登出），再清会话与本地缓存 */
async function onLogout(): Promise<void> {
  try {
    await ElMessageBox.confirm('退出后需要重新登录；本地未同步的改动会先尝试同步。确定退出？', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  await data.flush()
  await auth.logout()
  data.reset()
  timer.reset()
  resetSessionCache()
  await router.replace({ name: 'login' })
}

onMounted(() => timer.startTick())
onUnmounted(() => timer.stopTick())
</script>

<template>
  <router-view v-if="isPublic" />

  <div v-else class="app-shell">
    <header class="topbar">
      <router-link class="brand" :to="{ name: 'today' }">
        💪 增肌记录 <span>· BULK</span>
        <small>{{ title }} · 175cm · 70kg · 目标 +0.25~0.5kg/周 · 3000kcal</small>
      </router-link>
      <div class="topbar-right">
        <span>{{ auth.username }} 🌐</span>
        <el-button link type="primary" size="small" @click="onLogout">退出</el-button>
      </div>
    </header>

    <main class="page">
      <router-view />
    </main>

    <TabBar />
  </div>

  <ToastHost />
</template>
