<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/data'
import { assess } from '@/domain/assessment'
import { dayTotalMin } from '@/domain/workout'
import { today } from '@/domain/time'
import { TRAINING_WEEKDAYS } from '@/constants/foods'
import KpiGrid from '@/components/KpiGrid.vue'

const router = useRouter()
const data = useDataStore()

const d = today()
const sum = computed(() => data.sumOf(d))

const isTrainingDay = computed(() => TRAINING_WEEKDAYS.includes(new Date().getDay()))
const trainHint = computed(() =>
  isTrainingDay.value
    ? '💪 今天是训练日（一/三/六）：5个基础动作各3组，约60分钟（时长自动记录）'
    : '😴 今天休息：好好吃够3000kcal，睡好就是在长肉',
)

const todayWorkouts = computed(() => data.db.w.filter((x) => x.d === d))
const totalMin = computed(() => dayTotalMin(data.db, d))
const workoutText = computed(() => {
  if (!todayWorkouts.value.length) return '今日还未记录训练'
  const names = todayWorkouts.value.map((x) => x.ex.replace(/（.*$/, '').slice(0, 6)).join('、')
  return `今日已练 ${todayWorkouts.value.length} 个动作：${names}` + (totalMin.value ? ` · 总时长 ${totalMin.value} 分钟` : '')
})

const assessText = computed(() => assess(data.db))
</script>

<template>
  <div class="card">
    <h3>📅 <em>今日概览</em> <span class="mut">{{ d }}</span></h3>
    <p class="mut">{{ trainHint }}</p>
    <KpiGrid :sum="sum" />
    <p class="mut" style="margin-top: 8px">{{ workoutText }}</p>
  </div>

  <div class="card">
    <h3>⚡ <em>快捷记录</em></h3>
    <div class="row">
      <el-button class="grow" @click="router.push({ name: 'train' })">+ 记录今日训练</el-button>
      <el-button class="grow" @click="router.push({ name: 'weight' })">+ 记录今日体重</el-button>
    </div>
    <el-button style="width: 100%; margin: 8px 0 0" @click="router.push({ name: 'food' })">+ 记录饮食 → 去饮食页</el-button>
  </div>

  <div class="card">
    <h3>📊 <em>本周体重评估</em></h3>
    <p class="mut">{{ assessText }}</p>
  </div>
</template>
