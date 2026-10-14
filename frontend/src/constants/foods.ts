/** 饮食预设（v1.5 逐字移植） */
export interface FoodPresetItem {
  n: string
  k: number
  p: number
  c: number
  f: number
}

export interface FoodPreset {
  n: string
  k: number
  p: number
  c: number
  f: number
  items: FoodPresetItem[]
}

export const FOOD_PRESETS: FoodPreset[] = [
  {
    n: '早餐·水煮蛋3个+吐司2片+全脂奶250ml', k: 640, p: 30, c: 55, f: 20,
    items: [
      { n: '水煮蛋3个', k: 234, p: 18, c: 1, f: 15 },
      { n: '吐司2片', k: 190, p: 7, c: 36, f: 3 },
      { n: '全脂奶250ml', k: 216, p: 5, c: 18, f: 2 },
    ],
  },
  {
    n: '午餐·鸡胸200g+米饭200g+蔬菜150g', k: 850, p: 55, c: 70, f: 8,
    items: [
      { n: '鸡胸肉200g', k: 330, p: 42, c: 0, f: 4 },
      { n: '米饭200g', k: 260, p: 5, c: 58, f: 1 },
      { n: '蔬菜150g', k: 260, p: 8, c: 12, f: 3 },
    ],
  },
  {
    n: '练后·乳清蛋白粉1勺', k: 120, p: 24, c: 3, f: 1,
    items: [{ n: '乳清蛋白粉1勺', k: 120, p: 24, c: 3, f: 1 }],
  },
  {
    n: '晚餐·牛肉150g+米饭180g+菜150g+坚果18g', k: 900, p: 38, c: 65, f: 32,
    items: [
      { n: '牛肉150g', k: 340, p: 26, c: 0, f: 16 },
      { n: '米饭180g', k: 234, p: 5, c: 52, f: 1 },
      { n: '蔬菜150g', k: 200, p: 5, c: 10, f: 3 },
      { n: '坚果18g', k: 126, p: 2, c: 3, f: 12 },
    ],
  },
  {
    n: '饭团×2（应急替代午餐）', k: 500, p: 12, c: 85, f: 10,
    items: [{ n: '饭团×2', k: 500, p: 12, c: 85, f: 10 }],
  },
  {
    n: '燕麦60g+牛奶250ml（早餐替代）', k: 450, p: 18, c: 60, f: 12,
    items: [
      { n: '燕麦60g', k: 234, p: 10, c: 40, f: 4 },
      { n: '牛奶250ml', k: 216, p: 8, c: 20, f: 8 },
    ],
  },
]

/** 餐次下拉项 */
export const MEALS = ['早餐', '午餐', '训练后加餐', '晚餐', '加餐', '补剂'] as const

/** 每日营养目标 */
export const TARGETS = { kcal: 3000, p: 150, c: 365, f: 75, cr: 5 }

/** 肌酸快捷记录的默认剂量（克）与可选范围 */
export const CREATINE = { defaultG: 5, minG: 1, maxG: 20, meal: '补剂' }

/** 训练日（周一/三/六） */
export const TRAINING_WEEKDAYS = [1, 3, 6]
