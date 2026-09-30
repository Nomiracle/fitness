<script setup lang="ts">
export interface SetRowInput {
  /** 总重量 kg（字符串以保留空态） */
  w: string
  r: string
}

const rows = defineModel<SetRowInput[]>({ required: true })

/** 行标签（例如「上次」表示这行来自上次记录） */
withDefaults(defineProps<{ tag?: string }>(), { tag: '' })

function addRow(): void {
  rows.value = [...rows.value, { w: '', r: '' }]
}

function removeRow(i: number): void {
  rows.value = rows.value.filter((_, j) => j !== i)
}

/** 有效组：重量或次数任一非空（与 v1.5 相同的过滤规则） */
function valid(row: SetRowInput): boolean {
  return !!(Number(row.w) || Number(row.r))
}

defineExpose({ valid })
</script>

<template>
  <div>
    <div v-for="(row, i) in rows" :key="i" class="set-row">
      <span class="mut" style="min-width: 34px">组{{ i + 1 }}</span>
      <span v-if="tag" class="set-tag">{{ tag }}</span>
      <el-input v-model="row.w" type="number" inputmode="decimal" placeholder="总重量kg" />
      <el-input v-model="row.r" type="number" inputmode="numeric" placeholder="次数" />
      <el-button v-if="rows.length > 1" link type="danger" @click="removeRow(i)">删</el-button>
    </div>
    <el-button style="width: 100%; margin-top: 6px" @click="addRow">+ 加一组</el-button>
  </div>
</template>
