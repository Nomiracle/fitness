<script setup lang="ts">
import { computed, ref } from 'vue'
import { Upload } from '@element-plus/icons-vue'
import { CREATINE, MEALS, type FoodPreset } from '@/constants/foods'
import { useDataStore } from '@/stores/data'
import { toast } from '@/stores/ui'
import { fmtT, today } from '@/domain/time'
import type { FitnessDB } from '@/domain/types'
import { toFoodRecs, type FoodDraft } from '@/domain/foodDraft'
import { downloadJson, readJsonFile } from '@/utils/download'
import FoodPresetChips from '@/components/FoodPresetChips.vue'

const data = useDataStore()

const date = ref(today())
const meal = ref<string>(MEALS[0])
const items = ref<FoodDraft[]>([{ n: '', k: '', p: '', c: '', f: '' }])
const fileInput = ref<HTMLInputElement | null>(null)

/** 肌酸快捷记录剂量（克） */
const creatineG = ref<number>(CREATINE.defaultG)

const history = computed(() => data.db.f.slice(0, 20))
const mealTotals = computed(() => items.value.reduce((sum, x) => ({
  k: sum.k + (Number(x.k) || 0),
  p: sum.p + (Number(x.p) || 0),
  c: sum.c + (Number(x.c) || 0),
  f: sum.f + (Number(x.f) || 0),
}), { k: 0, p: 0, c: 0, f: 0 }))

function blankItem(): FoodDraft {
  return { n: '', k: '', p: '', c: '', f: '' }
}

function addItem(): void {
  items.value.push(blankItem())
}

function removeItem(index: number): void {
  if (items.value.length === 1) {
    items.value[0] = blankItem()
    return
  }
  items.value.splice(index, 1)
}

/** 点预设：把复合项拆成多条单项草稿，用户可逐项改份量后再保存 */
function pick(preset: FoodPreset): void {
  items.value = preset.items.map((x) => ({ n: x.n, k: String(x.k), p: String(x.p), c: String(x.c), f: String(x.f) }))
}

/**
 * 肌酸快捷记录：一键落一条「补剂」条目——0 热量、0 宏量、cr=剂量。
 * 不走 saveFood 的「必须先有热量」校验：肌酸没有热量，但仍需一条可追溯记录。
 */
function saveCreatine(): void {
  const g = Number(creatineG.value) || CREATINE.defaultG
  data.addFood({
    d: date.value || today(),
    m: CREATINE.meal,
    n: `肌酸${+g.toFixed(1)}g`,
    k: 0,
    p: 0,
    c: 0,
    f: 0,
    cr: +g.toFixed(1),
    ts: Date.now(),
  })
  toast(`肌酸 ${+g.toFixed(1)}g 已记录 ✅`)
}

function saveFood(): void {
  const records = toFoodRecs(items.value, date.value || today(), meal.value, Date.now())
  if (!records) {
    toast('每项都需要填写食物名称和大于 0 的热量', { err: true })
    return
  }
  data.addFoods(records)
  items.value = [blankItem()]
  toast(`已保存 ${records.length} 项饮食 ✅`)
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

    <div v-for="(item, index) in items" :key="index" class="food-item">
      <div class="row" style="align-items: center">
        <b class="grow">食物 {{ index + 1 }}</b>
        <button class="link-btn" @click="removeItem(index)">移除</button>
      </div>
      <el-input v-model="item.n" placeholder="食物名称和份量，如鸡胸肉200g" />
      <div class="row" style="margin-top: 4px">
        <div class="grow">热量 kcal<el-input v-model="item.k" type="number" inputmode="decimal" placeholder="必填" /></div>
        <div class="grow">蛋白 g<el-input v-model="item.p" type="number" inputmode="decimal" placeholder="0" /></div>
        <div class="grow">碳水 g<el-input v-model="item.c" type="number" inputmode="decimal" placeholder="0" /></div>
        <div class="grow">脂肪 g<el-input v-model="item.f" type="number" inputmode="decimal" placeholder="0" /></div>
      </div>
    </div>
    <div class="row" style="margin-top: 8px">
      <el-button class="grow" @click="addItem">＋ 添加食物项</el-button>
      <el-button class="grow" type="primary" @click="saveFood">保存 {{ items.length }} 项</el-button>
    </div>
    <p class="mut">本餐合计：{{ mealTotals.k }} kcal · 蛋白 {{ mealTotals.p }}g · 碳水 {{ mealTotals.c }}g · 脂肪 {{ mealTotals.f }}g。快捷预设会拆成单项，可逐项修改后保存。</p>

    <el-divider style="margin: 14px 0 10px" />

    <div class="row" style="align-items: flex-end">
      <div class="grow">
        肌酸（克）
        <el-input-number
          v-model="creatineG"
          :min="CREATINE.minG"
          :max="CREATINE.maxG"
          :step="1"
          style="width: 100%"
        />
      </div>
      <div class="grow">
        <el-button type="primary" style="width: 100%" @click="saveCreatine">💪 记录肌酸</el-button>
      </div>
    </div>
    <p class="mut">
      一键记一条「补剂」记录（不占热量与宏量，只统计肌酸）。肌酸每天 {{ CREATINE.defaultG }}g、休息日也要吃。
    </p>
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
      <span v-if="x.cr" class="mut">💪 肌酸 {{ x.cr }}g · 不计热量</span>
      <span v-else class="mut">{{ x.k }}kcal · 蛋{{ x.p }}g 碳{{ x.c }}g 脂{{ x.f }}g</span>
    </div>

    <div class="row" style="margin-top: 8px">
      <el-button class="grow" size="small" @click="exportData">导出备份</el-button>
      <el-button class="grow" size="small" :icon="Upload" @click="triggerImport">导入备份</el-button>
    </div>
    <input ref="fileInput" type="file" accept=".json" class="hidden" @change="onFile" />
  </div>
</template>
