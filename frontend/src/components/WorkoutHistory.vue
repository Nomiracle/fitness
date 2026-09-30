<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { toast } from '@/stores/ui'
import { actMs, daySpanMin, dayTotalMin } from '@/domain/workout'
import { hhmm, validateTimeEdit, MAX_ACTION_MIN } from '@/domain/time'
import type { WorkoutRec } from '@/domain/types'

const data = useDataStore()

/** 最多展示最近 8 个训练日（与 v1.5 一致） */
const days = computed(() => {
  const set = [...new Set(data.db.w.map((x) => x.d))].sort().reverse().slice(0, 8)
  const pos = new Map<WorkoutRec, number>()
  data.db.w.forEach((x, i) => pos.set(x, i))
  return set.map((d) => ({
    d,
    rows: data.db.w
      .filter((x) => x.d === d)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0))
      .map((x) => ({ x, index: pos.get(x) ?? -1 })),
    total: dayTotalMin(data.db, d),
    span: daySpanMin(data.db, d),
  }))
})

const editing = ref<{ index: number; date: string; st: string; et: string } | null>(null)

function openEdit(index: number, x: WorkoutRec): void {
  editing.value = {
    index,
    date: x.d,
    st: x.st ? hhmm(x.st) : '',
    et: x.et ? hhmm(x.et) : '',
  }
}

function applyEdit(): void {
  const e = editing.value
  if (!e) return
  const r = validateTimeEdit(e.date, e.st, e.et)
  if (!r.ok) {
    toast(r.error || '时间不合法', { err: true })
    return
  }
  data.applyTimes(e.index, r.st, r.et)
  editing.value = null
  toast(`已更新：本动作 ${r.minutes} 分钟`)
}

function clearTimes(index: number): void {
  data.clearTimes(index)
  editing.value = null
  toast('已清除该动作计时')
}

async function remove(index: number): Promise<void> {
  const x = data.db.w[index]
  if (!x) return
  try {
    await ElMessageBox.confirm(`删除「${x.ex}」这条记录？删除后当天总时长会重算。`, '删除记录', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  data.removeWorkout(index)
  toast('已删除该条记录')
}

/** 时长显示文案（无计时 → 「—（未计时）」） */
function timeText(x: WorkoutRec): string {
  const v = actMs(x)
  if (v == null) return '—（未计时）'
  const mins = Math.max(1, Math.round(v / 60000))
  const pause = x.pause > 0 ? `（含暂停 ${Math.round(x.pause / 60000)} 分）` : ''
  return `${hhmm(x.st as number)}–${hhmm(x.et as number)} · ${mins} 分钟${pause}`
}
</script>

<template>
  <div>
    <p v-if="!days.length" class="mut">暂无记录</p>

    <template v-for="g in days" :key="g.d">
      <div class="log" style="border-left-color: var(--acc)">
        <b>{{ g.d }}</b>
        <span class="mut">
          {{ g.rows.length }} 个动作 ·
          <template v-if="g.total != null">
            总时长 {{ g.total }} 分钟<template v-if="g.span">
              · 在馆 {{ g.span }}<template v-if="g.span - g.total > 0">（休息 {{ g.span - g.total }}）</template>
            </template>
          </template>
          <template v-else>总时长 —（无计时）</template>
        </span>
      </div>

      <div v-for="r in g.rows" :key="r.index" class="log" style="margin-left: 10px">
        <span class="log-actions">
          <button class="link-btn neutral" @click="openEdit(r.index, r.x)">✎ 时间</button>
          <button class="link-btn" @click="remove(r.index)">删除</button>
        </span>
        {{ r.x.ex }}
        <br />
        <span class="mut">{{ r.x.sets.map((s) => `${s.w}kg×${s.r}`).join(' ｜ ') }}</span>
        <br />
        <span :class="actMs(r.x) == null ? 'mut' : ''">{{ timeText(r.x) }}</span>
      </div>
    </template>

    <el-dialog v-model="editing" title="修正本动作计时" width="92%" append-to-body>
      <template v-if="editing">
        <p class="mut">单段不超过 {{ MAX_ACTION_MIN }} 分钟；保存会清除该动作的暂停累计。</p>
        <div class="row" style="margin-top: 8px">
          <div class="grow">
            开始
            <el-time-picker v-model="editing.st" format="HH:mm" value-format="HH:mm" placeholder="开始" />
          </div>
          <div class="grow">
            结束
            <el-time-picker v-model="editing.et" format="HH:mm" value-format="HH:mm" placeholder="结束" />
          </div>
        </div>
      </template>
      <template #footer>
        <el-button @click="editing = null">取消</el-button>
        <el-button type="warning" @click="editing && clearTimes(editing.index)">清除计时</el-button>
        <el-button type="primary" @click="applyEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
