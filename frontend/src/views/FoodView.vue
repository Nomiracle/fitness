<script setup lang="ts">
import { computed, ref } from 'vue'
import { Upload } from '@element-plus/icons-vue'
import { MEALS, type FoodPreset } from '@/constants/foods'
import { useDataStore } from '@/stores/data'
import { toast } from '@/stores/ui'
import { fmtT, today } from '@/domain/time'
import type { FitnessDB } from '@/domain/types'
import { downloadJson, readJsonFile } from '@/utils/download'
import FoodPresetChips from '@/components/FoodPresetChips.vue'
import MacroInputs, { type MacroInput } from '@/components/MacroInputs.vue'

const data = useDataStore()

const date = ref(today())
const meal = ref<string>(MEALS[0])
const name = ref('')
const macros = ref<MacroInput>({ k: '', p: '', c: '', f: '' })
const fileInput = ref<HTMLInputElement | null>(null)

const history = computed(() => data.db.f.slice(0, 20))
const canSave = computed(() => !!Number(macros.value.k))

function pick(preset: FoodPreset): void {
  name.value = preset.n
  macros.value = { k: String(preset.k), p: String(preset.p), c: String(preset.c), f: String(preset.f) }
}

function saveFood(): void {
  if (!canSave.value) {
    toast('先点预设餐或填写热量', { err: true })
    return
  }
  data.addFood({
    d: date.value || today(),
    m: meal.value,
    n: name.value || '自定义',
    k: Number(macros.value.k) || 0,
    p: Number(macros.value.p) || 0,
    c: Number(macros.value.c) || 0,
    f: Number(macros.value.f) || 0,
    ts: Date.now(),
  })
  name.value = ''
  macros.value = { k: '', p: '', c: '', f: '' }
  toast('饮食已保存 ✅')
}

function removeFood(index: number): void {
  data.removeFood(index)
  toast('已删除该条饮食')
}

/** 导出：与 /api/export 同形状的 JSON 备份（v1.5 兼容） */
function exportData(): void {
  downloadJson(`fitness-${data.user}.json`, data.json())
  toast('已导出备份')
}

function triggerImport(): void {
  fileInput.value?.click()
}

/** 导入：整包替换（与 v1.5 importData 一致，随后走防抖推送同步到服务端） */
async function onFile(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const parsed = (await readJsonFile(file)) as Partial<FitnessDB>
    data.replaceAll({ w: parsed.w || [], f: parsed.f || [], bw: parsed.bw || [] })
    toast('导入成功 ✅')
  } catch {
    toast('文件无效', { err: true })
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <div class="card">
    <h3>🍱 <em>记录饮食</em></h3>
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
        餐次
        <el-select v-model="meal" style="width: 100%">
          <el-option v-for="m in MEALS" :key="m" :label="m" :value="m" />
        </el-select>
      </div>
    </div>

    <FoodPresetChips style="margin: 8px 0" @pick="pick" />

    <div class="row">
      <div class="grow">
        食物
        <el-input v-model="name" placeholder="例：鸡胸肉200g" />
      </div>
    </div>
    <MacroInputs v-model="macros" style="margin-top: 4px" />

    <el-button type="primary" style="width: 100%; margin-top: 8px" @click="saveFood">保存饮食</el-button>
    <p class="mut">点预设餐可一键填入营养，再按保存。</p>
  </div>

  <div class="card">
    <h3>📜 <em>饮食历史</em></h3>
    <p v-if="!history.length" class="mut">暂无记录</p>
    <div v-for="(x, i) in history" :key="`${x.d}-${x.ts}-${x.n}`" class="log">
      <span class="log-actions">
        <button class="link-btn" @click="removeFood(i)">删除</button>
      </span>
      <b>{{ x.d }}{{ fmtT(x.ts) }} {{ x.m }}</b> {{ x.n }}
      <br />
      <span class="mut">{{ x.k }}kcal · 蛋{{ x.p }}g 碳{{ x.c }}g 脂{{ x.f }}g</span>
    </div>

    <div class="row" style="margin-top: 8px">
      <el-button class="grow" size="small" @click="exportData">导出备份</el-button>
      <el-button class="grow" size="small" :icon="Upload" @click="triggerImport">导入备份</el-button>
    </div>
    <input ref="fileInput" type="file" accept=".json" class="hidden" @change="onFile" />
  </div>
</template>
