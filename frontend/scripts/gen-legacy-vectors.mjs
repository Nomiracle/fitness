#!/usr/bin/env node
/**
 * 从 v1.5 单文件前端 (index.html) 抽取纯函数，跑一批固定场景，把结果冻结成
 * src/domain/__vectors__/legacy-vectors.json —— Vue 版的 domain 层必须与这些向量逐值相等。
 *
 * 这是「差分等价」门禁的生成侧：只在迁移期跑一次（index.html 删除后仍可用冻结向量回归）。
 * 用法: TZ=Asia/Shanghai node scripts/gen-legacy-vectors.mjs [path/to/index.html]
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const legacyPath = resolve(process.argv[2] || resolve(here, '../../index.html'))
const outPath = resolve(here, '../src/domain/__vectors__/legacy-vectors.json')

const html = readFileSync(legacyPath, 'utf8')
const scriptStart = html.lastIndexOf('<script>')
const scriptEnd = html.lastIndexOf('</script>')
if (scriptStart < 0 || scriptEnd < 0) throw new Error('legacy <script> block not found')
const src = html.slice(scriptStart + '<script>'.length, scriptEnd)

const FN_NAMES = [
  'hm',
  'hhmm',
  'fmtT',
  'dayOf',
  'actMs',
  'dayActMs',
  'hasTimes',
  'dayTotalMin',
  'daySpanMin',
  'recalcDay',
  'daySum',
  'assess',
  'mergeRemote',
  'tsFromTime',
  'atElapsedMs',
]

/** 按名字做花括号配平抽取函数声明（含函数体的完整源码） */
function extractFn(source, name) {
  const m = new RegExp(`function\\s+${name}\\s*\\(`).exec(source)
  if (!m) throw new Error(`function not found: ${name}`)
  const open = source.indexOf('{', m.index)
  let depth = 0
  for (let j = open; j < source.length; j++) {
    const c = source[j]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return source.slice(m.index, j + 1)
    }
  }
  throw new Error(`unbalanced braces in: ${name}`)
}

const fns = FN_NAMES.map((n) => extractFn(src, n)).join('\n')

const factory = new Function(`
  let DB = { w: [], f: [], bw: [] };
  let AT = { state: 'idle', st: 0, pauseMs: 0, pauseAt: 0 };
  const MAX_ACTION_MIN = 120;
  ${fns}
  return {
    setDB: (v) => { DB = v }, getDB: () => DB,
    setAT: (v) => { AT = v }, getAT: () => AT,
    hm, hhmm, fmtT, dayOf, actMs, dayActMs, hasTimes, dayTotalMin, daySpanMin, recalcDay,
    daySum, assess, mergeRemote, tsFromTime, atElapsedMs,
  }
`)

const L = factory()

// ---------- 场景数据 ----------

const w = (o) => ({ d: '2026-09-28', ex: 'x', sets: [{ w: 60, r: 10 }], dur: 0, st: null, et: null, pause: 0, ts: 0, ...o })

const dbRealShape = {
  w: [
    w({ ex: '坐姿肩推机', st: 1790603272427, et: 1790603524971, pause: 0, ts: 1790603524971 }),
    w({ ex: '卧推（杠铃/哑铃）', st: null, et: null, dur: 9, ts: 1790601817930 }),
    w({ ex: '腿举机', st: null, et: null, dur: 9, ts: 1790600238884 }),
    w({ ex: '坐姿划船机', st: 1790602254560, et: 1790602317758, pause: 0, ts: 1790602317758 }),
    w({ ex: '高位下拉', st: 1790602725821, et: 1790602948578, pause: 0, ts: 1790602948578 }),
  ],
  f: [],
  bw: [],
}

const dbLegacyUntimed = {
  w: [1, 2, 3, 4, 5].map((i) => w({ d: '2026-09-06', ex: `动作${i}`, st: null, et: null, dur: 60, ts: 1788681091995 + i })),
  f: [],
  bw: [],
}

const dbOverCap = {
  w: [w({ ex: '超时动作', st: 1000000, et: 1000000 + 150 * 60000, pause: 0 })],
  f: [],
  bw: [],
}

const dbPause = {
  w: [w({ ex: '暂停动作', st: 1000, et: 1000 + 3600000 + 120000, pause: 120000 })],
  f: [],
  bw: [],
}

const bodyOf = (kgs) => kgs.map((kg, i) => ({ d: `2026-09-${String(i + 1).padStart(2, '0')}`, kg, note: '', ts: 0 }))

const mergeLocal = {
  w: [
    w({ d: '2026-09-28', ex: 'A', st: 1, et: 2, pause: 0, ts: 300 }),
    w({ d: '2026-09-28', ex: 'B', st: 1, et: 2, pause: 0, ts: 100 }),
    w({ d: '2026-09-27', ex: 'C', st: 1, et: 2, pause: 0, ts: 400 }),
  ],
  f: [
    { d: '2026-09-28', m: '早餐', n: '蛋', k: 100, p: 10, c: 1, f: 2, ts: 10 },
    { d: '2026-09-28', m: '午餐', n: '饭', k: 200, p: 20, c: 30, f: 3, ts: 20 },
  ],
  bw: [
    { d: '2026-09-28', kg: 70, note: 'local', ts: 1 },
    { d: '2026-09-27', kg: 69.8, note: '', ts: 1 },
  ],
}

const mergeRemote = {
  // 同键（d+ex+ts）→ 服务端优先；新键 → 并入
  w: [
    w({ d: '2026-09-28', ex: 'A', st: 9, et: 9, pause: 0, ts: 300 }),
    w({ d: '2026-09-28', ex: 'D', st: 5, et: 6, pause: 0, ts: 500 }),
  ],
  f: [{ d: '2026-09-28', m: '晚餐', n: '牛', k: 300, p: 30, c: 40, f: 4, ts: 30 }],
  bw: [{ d: '2026-09-28', kg: 70.4, note: 'remote', ts: 2 }],
}

const foodDay = [
  { d: '2026-09-28', m: '早餐', n: 'a', k: 640.5, p: 30, c: 55, f: 20, ts: 1 },
  { d: '2026-09-28', m: '午餐', n: 'b', k: 850, p: 55.4, c: 70, f: 8, ts: 2 },
  { d: '2026-09-27', m: '晚餐', n: 'c', k: 900, p: 38, c: 65, f: 32, ts: 3 },
]

const cases = []

// 1) 真实形状（3 条计时 + 2 条历史未计时）
L.setDB(dbRealShape)
cases.push({
  kind: 'workout',
  id: 'real-shape-2026-09-28',
  db: dbRealShape,
  expected: {
    actMs: dbRealShape.w.map((x) => L.actMs(x)),
    dayActMs: L.dayActMs('2026-09-28'),
    dayTotalMin: L.dayTotalMin('2026-09-28'),
    daySpanMin: L.daySpanMin('2026-09-28'),
    recalcDay: L.recalcDay('2026-09-28'),
    durAfter: dbRealShape.w.map((x) => x.dur),
  },
})

// 2) 纯历史未计时日（dur=60 但无 st/et）
L.setDB(dbLegacyUntimed)
const untimedBefore = dbLegacyUntimed.w.map((x) => x.dur)
L.recalcDay('2026-09-06')
cases.push({
  kind: 'workout',
  id: 'legacy-untimed-day',
  db: dbLegacyUntimed,
  expected: {
    actMs: dbLegacyUntimed.w.map((x) => L.actMs(x)),
    dayActMs: L.dayActMs('2026-09-06'),
    dayTotalMin: L.dayTotalMin('2026-09-06'),
    daySpanMin: L.daySpanMin('2026-09-06'),
    recalcDay: null,
    durAfter: [...untimedBefore],
  },
})

// 3) 超 120 分钟上限
L.setDB(dbOverCap)
cases.push({
  kind: 'workout',
  id: 'over-cap-150min',
  db: dbOverCap,
  expected: {
    actMs: dbOverCap.w.map((x) => L.actMs(x)),
    dayActMs: L.dayActMs('2026-09-28'),
    dayTotalMin: L.dayTotalMin('2026-09-28'),
    daySpanMin: L.daySpanMin('2026-09-28'),
    recalcDay: L.recalcDay('2026-09-28'),
    durAfter: dbOverCap.w.map((x) => x.dur),
  },
})

// 4) 暂停扣除（60 分钟净时长）
L.setDB(dbPause)
cases.push({
  kind: 'workout',
  id: 'pause-2min',
  db: dbPause,
  expected: {
    actMs: dbPause.w.map((x) => L.actMs(x)),
    dayActMs: L.dayActMs('2026-09-28'),
    dayTotalMin: L.dayTotalMin('2026-09-28'),
    daySpanMin: L.daySpanMin('2026-09-28'),
    recalcDay: L.recalcDay('2026-09-28'),
    durAfter: dbPause.w.map((x) => x.dur),
  },
})

// 5) 周评估各分支
const assessInputs = [
  { id: 'assess-empty', bw: [] },
  { id: 'assess-1-row', bw: bodyOf([70]) },
  { id: 'assess-3-rows', bw: bodyOf([70, 70.2, 70.3]) },
  { id: 'assess-7-rows-only', bw: bodyOf([70, 70.1, 70.2, 70.3, 70.4, 70.5, 70.6]) },
  { id: 'assess-14-slow', bw: bodyOf([70, 70, 70, 70, 70, 70, 70, 70.1, 70.1, 70.1, 70.1, 70.1, 70.1, 70.1]) },
  { id: 'assess-14-perfect', bw: bodyOf([70, 70, 70, 70, 70, 70, 70, 70.3, 70.3, 70.3, 70.3, 70.3, 70.3, 70.3]) },
  { id: 'assess-14-fast', bw: bodyOf([70, 70, 70, 70, 70, 70, 70, 71, 71, 71, 71, 71, 71, 71]) },
]
for (const c of assessInputs) {
  L.setDB({ w: [], f: [], bw: c.bw })
  cases.push({ kind: 'assessment', id: c.id, bw: c.bw, expected: L.assess() })
}

// 6) 合并
L.setDB({ w: [], f: [], bw: [] })
cases.push({
  kind: 'merge',
  id: 'merge-union-server-wins',
  local: mergeLocal,
  remote: mergeRemote,
  expected: L.mergeRemote(mergeLocal, mergeRemote),
})

// 7) 饮食汇总
L.setDB({ w: [], f: foodDay, bw: [] })
cases.push({ kind: 'sum', id: 'food-day-sum', f: foodDay, d: '2026-09-28', expected: L.daySum('2026-09-28') })

// 8) 时长/时间格式化
const hmInputs = [0, 1, 999, 1000, 59000, 60000, 590000, 3599000, 3600000, 7500000]
const tsInputs = [1790603524971, 1790600238884, 1000, 0]
cases.push({
  kind: 'format',
  id: 'format-hm-hhmm-fmtT',
  hm: hmInputs.map((i) => ({ input: i, expected: L.hm(i) })),
  hhmm: tsInputs.map((i) => ({ input: i, expected: L.hhmm(i) })),
  fmtT: tsInputs.map((i) => ({ input: i, expected: L.fmtT(i) })),
})

// 9) HH:MM → 时间戳
const tsProbes = [
  ['2026-09-28', '21:52'],
  ['2026-09-28', '00:00'],
  ['2026-09-28', '23:59'],
  ['2026-09-28', ''],
  ['2026-09-28', '24:00'],
  ['2026-09-28', 'aa:bb'],
]
cases.push({
  kind: 'tsFromTime',
  id: 'hhmm-to-ts',
  probes: tsProbes.map(([d, t]) => ({ date: d, text: t, expected: L.tsFromTime(d, t) })),
})

// 10) 计时器已用时长（运行中 / 暂停中）
const atRunning = { state: 'running', st: 1790000000000, pauseMs: 0, pauseAt: 0 }
const atPaused = { state: 'paused', st: 1790000000000, pauseMs: 60000, pauseAt: 1790000060000 }
L.setAT(atRunning)
const runElapsed = L.atElapsedMs(1790000090000)
L.setAT(atPaused)
const pausedElapsed = L.atElapsedMs(1790000120000)
L.setAT({ state: 'idle', st: 0, pauseMs: 0, pauseAt: 0 })
const idleElapsed = L.atElapsedMs(1790000120000)
cases.push({
  kind: 'timer',
  id: 'elapsed-running-paused-idle',
  atRunning,
  nowRunning: 1790000090000,
  expectedRunning: runElapsed,
  atPaused,
  nowPaused: 1790000120000,
  expectedPaused: pausedElapsed,
  expectedIdle: idleElapsed,
})

const out = {
  generatedFrom: legacyPath,
  sourceSha256: createHash('sha256').update(html).digest('hex'),
  tz: process.env.TZ || '',
  cases,
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')
console.log(`legacy vectors written: ${outPath}`)
console.log(`  source: ${legacyPath} sha256=${out.sourceSha256.slice(0, 12)} tz=${out.tz}`)
console.log(`  cases: ${cases.length} (${cases.map((c) => c.id).join(', ')})`)
