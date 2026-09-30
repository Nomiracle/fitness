/** 饮食预设（v1.5 逐字移植） */
export interface FoodPreset {
  n: string
  k: number
  p: number
  c: number
  f: number
}

export const FOOD_PRESETS: FoodPreset[] = [
  { n: '早餐·水煮蛋3个+吐司2片+全脂奶250ml', k: 640, p: 30, c: 55, f: 20 },
  { n: '午餐·鸡胸200g+米饭200g+蔬菜150g', k: 850, p: 55, c: 70, f: 8 },
  { n: '练后·乳清蛋白粉1勺', k: 120, p: 24, c: 3, f: 1 },
  { n: '晚餐·牛肉150g+米饭180g+菜150g+坚果18g', k: 900, p: 38, c: 65, f: 32 },
  { n: '饭团×2（应急替代午餐）', k: 500, p: 12, c: 85, f: 10 },
  { n: '燕麦60g+牛奶250ml（早餐替代）', k: 450, p: 18, c: 60, f: 12 },
]

/** 餐次下拉项 */
export const MEALS = ['早餐', '午餐', '训练后加餐', '晚餐', '加餐'] as const

/** 每日营养目标 */
export const TARGETS = { kcal: 3000, p: 150, c: 365, f: 75 }

/** 训练日（周一/三/六） */
export const TRAINING_WEEKDAYS = [1, 3, 6]
