<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDataStore } from '@/stores/data'
import { toast } from '@/stores/ui'
import { fmtT, today } from '@/domain/time'
import { assess } from '@/domain/assessment'
import WeightChart from '@/components/WeightChart.vue'

const data = useDataStore()

const date = ref(today())
const kg = ref('')
const note = ref('')

const list = computed(() => [...data.db.bw].reverse().slice(0, 10))
const assessText = computed(() => assess(data.db))

/** 同一天只保留一条：先按日期删除再插入（v1.5 saveWeight 语义） */
function saveWeight(): void {
  const v = Number(kg.value)
  if (!v) {
    toast('请输入体重', { err: true })
    return
  }
  data.upsertBody({ d: date.value || today(), kg: v, note: note.value || '', ts: Date.now() })
  kg.value = ''
  note.value = ''
  toast('体重已保存 ✅')
}
</script>

<template>
  <div class="card">
    <h3>⚖️ <em>体重 / 围度</em></h3>
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
      <div class="grow">
        体重kg
        <el-input v-model="kg" type="number" inputmode="decimal" step="0.1" placeholder="70.0" />
      </div>
    </div>
    <el-input v-model="note" placeholder="备注：胸围/臂围/腰围/拍照 ✓（可选）" style="margin-top: 4px" />
    <el-button type="primary" style="width: 100%; margin-top: 8px" @click="saveWeight">保存体重</el-button>
    <p class="mut">目标 +0.25~0.5kg/周；涨太慢午/晚主食各+50g，涨太快各−50g。每2-4周拍照+量围度。</p>
  </div>

  <div class="card">
    <h3>📈 <em>体重曲线</em></h3>
    <WeightChart :items="data.db.bw" />
    <div style="margin-top: 8px">
      <p v-if="!list.length" class="mut">暂无记录，先记一次当前70kg</p>
      <div v-for="x in list" :key="x.d" class="log">
        <b>{{ x.d }}{{ fmtT(x.ts) }}</b> {{ x.kg }}kg <span class="mut">{{ x.note || '' }}</span>
      </div>
    </div>
  </div>

  <div class="card">
    <h3>📊 <em>本周体重评估</em></h3>
    <p class="mut">{{ assessText }}</p>
  </div>
</template>
