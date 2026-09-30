<script setup lang="ts">
import type { Exercise } from '@/constants/exercises'

const props = defineProps<{
  exercises: Exercise[]
  /** 当天已记录的动作名 */
  done: Set<string>
  current: number
}>()

const emit = defineEmits<{ (e: 'select', index: number): void }>()

/** 与 v1.5 一致：编号 + 动作名前 4 字 + 已记录勾 */
function label(e: Exercise, i: number): string {
  return `${i + 1}.${e.n.slice(0, 4)}${props.done.has(e.n) ? ' ✓' : ''}`
}
</script>

<template>
  <div>
    <span
      v-for="(e, i) in exercises"
      :key="e.n"
      class="chip"
      :class="{ on: i === current, done: done.has(e.n), todo: !done.has(e.n) }"
      @click="emit('select', i)"
    >
      {{ label(e, i) }}
    </span>
  </div>
</template>
