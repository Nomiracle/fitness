<script setup lang="ts">
import { useToastState, runToastAction } from '@/stores/ui'

const s = useToastState()
</script>

<template>
  <div v-if="s.visible" class="toast" :class="{ err: s.err }" role="status" aria-live="polite">
    <span>{{ s.msg }}</span>
    <el-button v-if="s.action" size="small" type="primary" @click="runToastAction">{{ s.actionLabel }}</el-button>
  </div>
</template>
