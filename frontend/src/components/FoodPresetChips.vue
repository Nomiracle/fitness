<script setup lang="ts">
import { FOOD_PRESETS, type FoodPreset } from '@/constants/foods'

const emit = defineEmits<{ (e: 'pick', preset: FoodPreset): void }>()
</script>

<template>
  <div>
    <span v-for="(f, i) in FOOD_PRESETS" :key="i" class="chip" @click="emit('pick', f)">
      {{ f.n.slice(0, 10) }}…
    </span>
  </div>
</template>
