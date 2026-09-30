<script setup lang="ts">
import {
  DIET_PLAN,
  DIET_TIP,
  EXERCISE_TIPS,
  EXERCISE_TIPS_INTRO,
  MEAL_PREP_TIP,
  WEEK_PLAN,
} from '@/constants/plan'
</script>

<template>
  <div class="card">
    <h3>🗓️ <em>每周训练</em> · 一三六全身</h3>
    <table class="plan-tbl">
      <tr>
        <th>星期</th>
        <th>内容</th>
        <th>时间</th>
      </tr>
      <tr v-for="r in WEEK_PLAN" :key="r.a">
        <td>{{ r.a }}</td>
        <td>{{ r.b }}</td>
        <td>{{ r.c }}</td>
      </tr>
    </table>
  </div>

  <div class="card">
    <h3>💡 <em>5个动作要领</em></h3>
    <div class="tip">
      <b>通用：</b>{{ EXERCISE_TIPS_INTRO }}
      <template v-for="t in EXERCISE_TIPS" :key="t.t">
        <br /><b>{{ t.t }}：</b>{{ t.b }}
      </template>
    </div>
  </div>

  <div class="card">
    <h3>🍚 <em>每日饮食模板</em> · ~3000kcal</h3>
    <table class="plan-tbl">
      <tr>
        <th>餐</th>
        <th>食物</th>
        <th>量</th>
      </tr>
      <tr v-for="r in DIET_PLAN" :key="r.a">
        <td>{{ r.a }}</td>
        <td>{{ r.b }}</td>
        <td>{{ r.c }}</td>
      </tr>
    </table>
    <div class="tip">{{ DIET_TIP }}</div>
  </div>

  <div class="card">
    <h3>❄️ <em>备餐保存</em></h3>
    <p class="mut" style="line-height: 1.8">{{ MEAL_PREP_TIP }}</p>
  </div>
</template>
