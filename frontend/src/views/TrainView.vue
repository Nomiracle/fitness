<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { EXERCISES, DEFAULT_SET_ROWS } from '@/constants/exercises'
import { useDataStore } from '@/stores/data'
import { useTimerStore } from '@/stores/timer'
import { toast } from '@/stores/ui'
import { doneNames, daySpanMin, dayTotalMin, recalcDay } from '@/domain/workout'
import { MAX_ACTION_MS, MAX_ACTION_MIN, hm, hhmm, today } from '@/domain/time'
import ExerciseChips from '@/components/ExerciseChips.vue'
import SetRows, { type SetRowInput } from '@/components/SetRows.vue'
import WorkoutHistory from '@/components/WorkoutHistory.vue'

const data = useDataStore()
const timer = useTimerStore()

const date = ref(today())
const curEx = ref(0)
const rows = ref<SetRowInput[]>(blankRows())
const setRowsRef = ref<InstanceType<typeof SetRows> | null>(null)

function blankRows(): SetRowInput[] {
  return Array.from({ length: DEFAULT_SET_ROWS }, () => ({ w: '', r: '' }))
}

const done = computed(() => doneNames(data.db, date.value))
const exercises = EXERCISES
const current = computed(() => exercises[curEx.value])

/** 有效组：重量或次数任一非空（v1.5 相同的过滤规则） */
const validSets = computed(() =>
  rows.value.map((r) => ({ w: Number(r.w) || 0, r: Number(r.r) || 0 })).filter((s) => s.w || s.r),
)
const canSave = computed(() => validSets.value.length > 0)
const remaining = computed(() => exercises.filter((e) => !done.value.has(e.n)).length)
const dayTotal = computed(() => dayTotalMin(data.db, date.value))
const daySpan = computed(() => daySpanMin(data.db, date.value))
const rest = computed(() =>
  dayTotal.value != null && daySpan.value ? Math.max(0, daySpan.value - dayTotal.value) : 0,
)
const progress = computed(() => `${exercises.filter((e) => done.value.has(e.n)).length}/${exercises.length}`)

const timerMain = computed(() => {
  if (timer.at.state === 'running') return '⏱ 本动作 ' + hm(timer.elapsed())
  if (timer.at.state === 'paused') return '⏸ 本动作 ' + hm(timer.elapsed())
  return '未计时'
})

const timerSub = computed(() => {
  let hint = '点「开始本动作」记录开始时间；不点也能保存，只是这条没有时长'
  if (timer.at.state === 'running') hint = '计时中 · 点保存即结束本动作'
  else if (timer.at.state === 'paused')
    hint = '已暂停 ' + hm(timer.at.pauseMs + (timer.now - timer.at.pauseAt)) + ' · 点继续接着计时'

  let day = ''
  if (dayTotal.value != null) {
    day =
      `今日合计 ${dayTotal.value} 分钟` +
      (daySpan.value ? ` · 在馆 ${daySpan.value}` + (rest.value ? `（休息 ${rest.value}）` : '') : '')
  }
  return `今日进度 ${progress.value}` + (day ? ` · ${day}` : ` · ${hint}`)
})

const timerBtn = computed(() =>
  timer.at.state === 'running' ? '⏸ 暂停' : timer.at.state === 'paused' ? '▶ 继续' : '▶ 开始本动作',
)

/** 选择动作：重置组输入；若当天已记录过则提示「再记会新增一条」 */
function selectEx(i: number): void {
  const isDone = done.value.has(exercises[i].n)
  curEx.value = i
  rows.value = blankRows()
  if (isDone) toast(`${exercises[i].n} 今日已记录 · 再记会新增一条`)
}

/** 切日期：清当前计时 + 自动跳到当天未记录的动作（v1.5 行为） */
watch(date, () => {
  timer.clear()
  const d = doneNames(data.db, date.value)
  if (d.has(exercises[curEx.value].n)) {
    const j = exercises.findIndex((e) => !d.has(e.n))
    if (j >= 0) curEx.value = j
    else curEx.value = curEx.value
  }
  rows.value = blankRows()
})

function scrollToRows(): void {
  const el = document.querySelector('#setRows')
  if (el && 'scrollIntoView' in el) (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' })
}

/** 下一个未记录动作（环形）；全部记完返回 false */
function gotoNextEx(): boolean {
  const d = doneNames(data.db, date.value)
  let j = -1
  for (let i = 1; i <= exercises.length; i++) {
    const k = (curEx.value + i) % exercises.length
    if (!d.has(exercises[k].n)) {
      j = k
      break
    }
  }
  if (j < 0) return false
  selectEx(j)
  scrollToRows()
  return true
}

/** 保存当前动作：以点击时刻作为结束时间；超 120 分钟按上限计入 */
function saveWorkout(advance: boolean): void {
  const sets = validSets.value
  if (!sets.length) {
    toast('至少填一组重量/次数', { err: true })
    return
  }
  const d = date.value
  const nowMs = Date.now()
  const snapshot = JSON.stringify(data.db.w)

  const started = !!timer.at.st
  const st0 = timer.at.st || 0
  const pause = timer.pauseTotalAtSave()
  const over = started && nowMs - st0 - pause > MAX_ACTION_MS

  data.addWorkout({
    d,
    ex: current.value.n,
    sets,
    st: started ? st0 : null,
    et: started ? nowMs : null,
    pause,
    dur: 0,
    ts: nowMs,
  })

  const total = dayTotalMin(data.db, d)
  const exName = current.value.n
  const own = started ? Math.max(1, Math.round(Math.min(MAX_ACTION_MS, nowMs - st0 - pause) / 60000)) : null
  timer.clear()
  rows.value = blankRows()

  let msg =
    exName +
    ' 已保存' +
    (own ? ` · 本动作 ${own} 分钟（${hhmm(st0)}–${hhmm(nowMs)}）` : ' · 未计时') +
    (total ? ` · 今日合计 ${total} 分钟` : '')
  if (over) msg += ` · 已按 ${MAX_ACTION_MIN} 分钟上限计入，可在下方历史里修正`
  if (advance) {
    msg += gotoNextEx() ? ` · 下一个：${current.value.n}` : ` · 今日 ${exercises.length} 个动作已记完 ✅`
  }

  toast(msg, {
    action: () => {
      try {
        data.db.w = JSON.parse(snapshot)
      } catch {
        /* 快照损坏则放弃撤销 */
      }
      recalcDay(data.db, d)
      timer.clear()
      data.save()
      toast('已撤销上一条')
    },
  })
}
</script>

<template>
  <div class="card">
    <h3>🏋️ <em>记录训练</em>（周一/三/六 · 5动作×3组）</h3>
    <div class="row">
      <div class="grow">
        日期
        <el-date-picker
          v-model="date"
          type="date"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          :clearable="false"
          style="width: 100%"
        />
      </div>
    </div>

    <div class="card" style="background: #0e1420; margin: 8px 0">
      <div>
        <b class="timer-main">{{ timerMain }}</b>
        <div class="mut">{{ timerSub }}</div>
      </div>
      <div class="row" style="margin-top: 8px">
        <el-button class="grow" @click="timer.toggle()">{{ timerBtn }}</el-button>
      </div>
    </div>
  </div>

  <div class="card" style="margin: 0 0 8px">
    <ExerciseChips :exercises="exercises" :done="done" :current="curEx" @select="selectEx" />
    <p class="mut" style="margin: 8px 0">
      重量统一记总重量：杠铃=杆+两边，哑铃=两只合计，器械=插片数字。
    </p>

    <div class="card" style="background: #0e1420; margin: 0 0 8px">
      <b style="font-size: 14px">{{ curEx + 1 }}. {{ current.n }}</b>
      <p class="mut">{{ current.d }}</p>
      <div id="setRows" ref="setRowsRef">
        <SetRows v-model="rows" />
      </div>
    </div>

    <el-button type="primary" style="width: 100%" :disabled="!canSave" @click="saveWorkout(true)">
      {{ remaining ? '保存并下一个动作 ▸' : `保存（今日 ${exercises.length} 个动作已记完 ✓）` }}
    </el-button>
    <el-button style="width: 100%; margin: 8px 0 0" :disabled="!canSave" @click="saveWorkout(false)">
      只保存当前动作
    </el-button>
    <p v-if="!canSave" class="mut" style="margin-top: 6px; color: var(--danger)">至少填一组重量/次数</p>
  </div>

  <div class="card">
    <h3>📜 <em>训练历史</em></h3>
    <WorkoutHistory />
  </div>
</template>
