<script setup lang="ts">
import { computed } from 'vue'
import { routes } from '@/router'

const items = computed(() =>
  routes
    .filter((r) => r.meta?.tab && typeof r.name === 'string')
    .map((r) => ({
      name: r.name as string,
      path: r.path,
      title: r.meta?.title ?? '',
      icon: r.meta?.tabIcon ?? '•',
    })),
)
</script>

<template>
  <nav class="tabbar" aria-label="主导航">
    <router-link v-for="it in items" :key="it.name" :to="it.path">
      <span class="ico" aria-hidden="true">{{ it.icon }}</span>
      <span>{{ it.title }}</span>
    </router-link>
  </nav>
</template>
