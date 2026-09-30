<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { enterSession, resetSessionCache } from '@/composables/useSession'
import { errorText, isApiError } from '@/api/client'
import { KEY_SESSION, safeGet } from '@/utils/storage'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const u = ref(safeGet(KEY_SESSION) || '')
const p = ref('')
const msg = ref('')
const busy = ref(false)

const canSubmit = computed(() => !!u.value.trim() && !!p.value)

async function afterAuth(): Promise<void> {
  await enterSession(auth.username)
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  await router.replace(redirect || '/today')
}

async function onLogin(): Promise<void> {
  if (!canSubmit.value) {
    msg.value = '请输入用户名和密码'
    return
  }
  busy.value = true
  msg.value = ''
  try {
    await auth.login(u.value.trim(), p.value)
    await afterAuth()
  } catch (e) {
    msg.value = errorText(e)
  } finally {
    busy.value = false
  }
}

async function onRegister(): Promise<void> {
  if (!canSubmit.value) {
    msg.value = '请输入用户名和密码'
    return
  }
  busy.value = true
  msg.value = ''
  try {
    await auth.register(u.value.trim(), p.value)
    msg.value = '注册成功，已自动登录'
    await afterAuth()
  } catch (e) {
    // 单用户服务：首个账号建号后注册即关闭（后端 403/409）
    if (isApiError(e) && (e.status === 403 || e.status === 409)) {
      msg.value = e.code === 'user exists' ? '用户已存在，直接登录' : '已关闭公开注册（单用户模式），请直接登录'
      resetSessionCache()
    } else {
      msg.value = errorText(e)
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="card">
      <h3>🏋️ <em>登录 / 注册</em></h3>
      <p class="mut">记录保存在服务端（单用户）；换设备登录同一账号即可看到全部数据，也可以导出/导入 JSON 备份。</p>
      <el-input v-model="u" placeholder="用户名" autocomplete="username" style="margin-top: 8px" />
      <el-input
        v-model="p"
        type="password"
        placeholder="密码"
        autocomplete="current-password"
        show-password
        style="margin-top: 8px"
        @keyup.enter="onLogin"
      />
      <el-button type="primary" style="width: 100%; margin-top: 10px" :loading="busy" @click="onLogin">登录</el-button>
      <el-button style="width: 100%; margin: 8px 0 0" :disabled="busy" @click="onRegister">没有账号？一键注册</el-button>
      <p v-if="msg" class="mut" style="margin-top: 8px">{{ msg }}</p>
    </div>
  </div>
</template>
