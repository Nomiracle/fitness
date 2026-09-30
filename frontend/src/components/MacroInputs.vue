<script setup lang="ts">
export interface MacroInput {
  k: string
  p: string
  c: string
  f: string
}

const macros = defineModel<MacroInput>({ required: true })
</script>

<template>
  <div class="row">
    <div class="grow">
      热量
      <el-input v-model="macros.k" type="number" inputmode="numeric" placeholder="kcal" />
    </div>
    <div class="grow">
      蛋白g
      <el-input v-model="macros.p" type="number" inputmode="decimal" placeholder="0" />
    </div>
    <div class="grow">
      碳水g
      <el-input v-model="macros.c" type="number" inputmode="decimal" placeholder="0" />
    </div>
    <div class="grow">
      脂肪g
      <el-input v-model="macros.f" type="number" inputmode="decimal" placeholder="0" />
    </div>
  </div>
</template>
