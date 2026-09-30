<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { echarts } from '@/charts/echarts'
import type { BodyRec } from '@/domain/types'

const props = defineProps<{ items: BodyRec[] }>()

const el = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

/** 取最近 30 条（DB.bw 已是升序） */
const recent = computed(() => props.items.slice(-30))

function option(): echarts.EChartsCoreOption {
  const vs = recent.value
  const min = Math.min(...vs.map((v) => v.kg)) - 1
  const max = Math.max(...vs.map((v) => v.kg)) + 1
  const step = Math.max(1, vs.length - 1)
  return {
    animation: false,
    grid: { left: 34, right: 12, top: 16, bottom: 22 },
    tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => `${v} kg` },
    xAxis: {
      type: 'category',
      data: vs.map((v) => v.d.slice(5)),
      axisLabel: { color: '#93a1b5', fontSize: 10 },
      axisLine: { lineStyle: { color: '#2c3a52' } },
    },
    yAxis: {
      type: 'value',
      min: Math.floor(min),
      max: Math.ceil(max),
      axisLabel: { color: '#93a1b5', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1f2940' } },
    },
    series: [
      {
        type: 'line',
        smooth: false,
        symbolSize: 5,
        data: vs.map((v) => v.kg),
        itemStyle: { color: '#29d3a5' },
        lineStyle: { color: '#29d3a5', width: 2 },
        label: {
          show: true,
          color: '#eef2f7',
          fontSize: 10,
          position: 'top',
          // 数据多时按步长抽稀，避免标签重叠（v1.5 canvas 版同思路）
          interval: vs.length > 6 ? Math.ceil(vs.length / 6) - 1 : 0,
          formatter: (p: { value: unknown }) => String(p.value),
        },
      },
    ],
    // 单点时不至于把点贴到边框
    dataZoom: undefined,
    _step: step,
  }
}

function render(): void {
  if (!el.value) return
  if (!recent.value.length) return
  if (!chart) chart = echarts.init(el.value, undefined, { renderer: 'canvas' })
  chart.setOption(option(), true)
  chart.resize()
}

function onResize(): void {
  chart?.resize()
}

onMounted(() => {
  render()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})

// flush:'post' 必须：首条数据到达时容器 div 才刚被创建，
// 默认 flush 下 render() 读到的 el 还是 null，图表会静默不渲染。
watch(recent, () => render(), { deep: true, flush: 'post' })
</script>

<template>
  <div>
    <div v-if="!recent.length" class="mut" style="padding: 40px 0; text-align: center">暂无数据</div>
    <div v-else ref="el" class="weight-chart"></div>
  </div>
</template>

<style scoped>
.weight-chart {
  width: 100%;
  height: 160px;
  background: #0e1420;
  border-radius: 10px;
}
</style>
