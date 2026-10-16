<script setup lang="ts">
import { computed } from 'vue'
import { TARGETS } from '@/constants/foods'
import { barWidth, isOver, type MacroSum } from '@/domain/nutrition'

const props = withDefaults(defineProps<{ sum: MacroSum; creatine?: number; powder?: number }>(), {
  creatine: 0,
  powder: 0,
})

const kpi = computed(() => [
  { label: '热量', value: `${Math.round(props.sum.k)}/${TARGETS.kcal}`, unit: 'kcal' },
  { label: '蛋白', value: `${Math.round(props.sum.p)}/${TARGETS.p}g`, unit: '目标140-155' },
  { label: '碳水', value: `${Math.round(props.sum.c)}/${TARGETS.c}g`, unit: '目标350-400' },
  { label: '脂肪', value: `${Math.round(props.sum.f)}/${TARGETS.f}g`, unit: '目标70-80' },
  {
    label: '肌酸',
    value: `${+(props.creatine || 0).toFixed(1)}/${TARGETS.cr}g`,
    unit: props.creatine >= TARGETS.cr ? '✅ 已达标' : '今天还没吃够',
  },
  {
    label: '蛋白粉',
    value: `${+(props.powder || 0).toFixed(1)}g`,
    unit: props.powder ? '已计入蛋白' : '今天还没喝',
  },
])

const bars = computed(() => [
  { label: '热量进度', value: props.sum.k, target: TARGETS.kcal },
  { label: '蛋白质进度', value: props.sum.p, target: TARGETS.p },
  { label: '肌酸进度', value: props.creatine, target: TARGETS.cr },
])
</script>

<template>
  <div class="kpi" style="margin-top: 8px">
    <div v-for="it in kpi" :key="it.label">
      {{ it.label }}<b>{{ it.value }}</b><span class="mut">{{ it.unit }}</span>
    </div>
  </div>
  <div style="margin-top: 10px">
    <template v-for="b in bars" :key="b.label">
      <div class="mut">{{ b.label }}</div>
      <div class="bar" :class="{ over: isOver(b.value, b.target) }">
        <i :style="{ width: barWidth(b.value, b.target) + '%' }"></i>
      </div>
    </template>
  </div>
</template>
