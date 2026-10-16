# 增肌记录（fitness）

单用户健身记录服务：训练（5 动作×3 组 + 动作级计时）、饮食（热量/蛋白/碳水/脂肪）、体重（曲线 + 周评估）、训练计划。
移动优先的单列界面 + 底部 5 tab。

## 结构

```
frontend/         Vue 3 SPA（唯一的用户界面；构建/测试都在这里）
server/app.py     API + 数据模型（Python 标准库 HTTP + SQLAlchemy + bcrypt，7 个接口）
deploy/           前端发布脚本与 nginx 站点配置（静态产物 + /api 反代）
```

前端技术栈：Vue 3.5 · Vite 5 · TypeScript 5.6 · Pinia 2 · Vue Router 4 · Element Plus（全量，暗色主题）· ECharts 5。
依赖版本与本机另一个 Vue 项目保持一致，`frontend/node_modules` 软链到 `/root/transfer/aresbotv3/web/node_modules`，
**离线构建、不执行任何安装**。

## 命令

```bash
bash frontend/scripts/test.sh        # 单测（含 legacy 差分等价向量），TZ 固定 Asia/Shanghai
bash frontend/scripts/build.sh       # vue-tsc 类型检查 + vite build → frontend/dist
bash frontend/scripts/typecheck.sh   # 只做 tsc --noEmit
bash deploy/build-web.sh             # 构建并发布到 nginx 静态目录（不改 vhost、不 reload）
```

本地端到端自测（不改线上）：`bash frontend/scripts/build.sh` 后用 `frontend/scripts/stub_server.py` 起一个
实现了同样 7 个接口的桩后端，即可在浏览器里走通登录/训练/撤销/饮食/体重/导入导出。

## API 契约（与 v1.5 一致，前端 `src/api/endpoints.ts` 一一对应）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/me` | 有会话 → `{user}`；否则 401 |
| POST | `/api/login` | `{username,password}` → `{user}` + HttpOnly Cookie `ftsess` |
| POST | `/api/register` | 首个账号开放；之后 403 `registration closed`；重名 409 `user exists` |
| POST | `/api/logout` | 清会话 |
| GET | `/api/export` | 全量 `{w,f,bw}` |
| POST | `/api/import` | 全量覆盖写入（先清该用户数据再插入） |

数据形状：`w:[{d,ex,sets:[{w,r}],dur,st,et,pause,ts}]`、`f:[{d,m,n,k,p,c,f,cr,pw,ts}]`、`bw:[{d,kg,note,ts}]`。
`st/et/pause` 是动作级计时的秒级毫秒时间戳与暂停累计，`dur` 由当天所有动作的 `et−st−pause` 求和派生（前端没有单独录入入口）。
`cr` 是补剂条目的肌酸克数（缺省/老数据按 0，不参与热量与宏量加总，见「肌酸快捷记录」）。
`pw` 是补剂条目的蛋白粉克数（缺省/老数据按 0，**不参与加总**，只用于留痕；蛋白粉的热量/宏量照常写在 `k/p/c/f`，见「蛋白粉快捷记录」）。
服务端限制：单类最多 2000 条、每个动作最多 20 组、请求体 ≤ 2MB、日期必须 `YYYY-MM-DD`。

前端写入语义：改本地立即生效并置 `ft_dirty_<user>`，800ms 防抖后整体 POST `/api/import`，**只有推送成功才清脏标记**；
登录后若本地有未推送改动，按 `(d,ex,ts)` / `(d,ts,n)` / `(d)` 取并集（服务端同键优先）并回推；否则服务端整体覆盖本地。

## 饮食单项记录

饮食页允许一餐添加多个食物项，分别填写名称、热量与宏量营养素，并即时查看本餐合计；保存时每个食物各自成为一条历史记录（`ts` 依次 +1 保证合并键唯一），可单独删除。快捷预设不再是「一条塞满整餐的复合记录」，而是预填拆分后的条目，仍可逐项调整份量后保存。

- 预设有两处来源：`FOOD_PRESETS[].items`（拆分后的条目）与顶层 `k/p/c/f`（v1.5 的整餐合计）。`foodDraft.test.ts` 断言 `items` 各项之和**逐值等于**顶层合计，避免拆分时把老数据口径改掉。
- 保存校验与老逻辑一致：每项都必须有名字和 >0 的热量（`toFoodRecs` 返回 `null` 即拦截），肌酸快捷记录仍走独立路径、不受该校验限制。
- 历史上只有总营养的复合记录继续原样保留并与单项记录一起汇总，**不会**被自动拆成猜测出来的明细。
- `MacroInputs.vue` 随单条录入表单一起删除（唯一使用方是 FoodView）。

## 从 v1.5 单文件版迁移

`server/` 未改动，数据零迁移。前端重构后与 v1.5 的行为差异（均为有意为之）：

1. **移除本机 localStorage 模式**（原 `HTTP_MODE=false` 分支）：服务始终同域 `/api`。
2. **`today()` 用本地日历日**（v1.5 用 `toISOString()` 取 UTC 日）：UTC+8 的 00:00–08:00 会把日期记成前一天。已核对线上 15 条记录的 `date` 与本地日全部一致 → 对已有数据零影响。
3. **组行默认值不再用固定的 `60kg×10`**（v1.5 的常量预填会让「没编辑就保存」记下假数据）：现在按「上次」同动作记录预填（见下节），没有历史时才是空行；校验改为按钮禁用 + 行内提示。
4. **`alert()` → 页内 toast**（带撤销动作，位置在 sticky 头部下方，不遮底部主按钮）。
5. UI 库改为 Element Plus 全量接入（暗色主题，主色覆盖为琥珀色），体重曲线由手绘 canvas 改为 ECharts。

`frontend/src/domain/__vectors__/legacy-vectors.json` 是从 v1.5 抽取纯函数现场生成的冻结输出（含源文件 sha256），
`parity.test.ts` 用它对时长计算、周评估文案、合并键与排序、格式化、时间戳解析逐值比对；
`rules.test.ts` 覆盖改时间的校验、进度条超标阈值与计时状态机。

## 训练记录的「上次」预填

选动作、切日期、或「保存并下一个动作」跳到下一个动作时，会**按同一动作的上一次记录预填重量×次数**，
组行左侧挂「上次」标签、上方一行提示来源日期与组数，并给一个「清空」按钮改回手动输入。

- 「上次」= 同一动作名、日期 ≤ 选中日期中最近的一条记录（同一天有多条取创建时间最晚的，所以当天重记同一动作也能填）；没有历史则显示空行。
- 组行数 = 上次的组数（上限 20，与后端限制一致）。
- **用户一旦改动任一组输入就不再自动覆盖** —— 否则登录后迟到的 `/api/export` 会把正在输入的数字冲掉。
- 显式「清空」后本轮不再自动填；预填只是输入默认值，不写数据、不产生记录（数据仍是保存时才落库）。

## 肌酸快捷记录

饮食页与首页「快捷记录」各有一个肌酸入口，一键落一条 `补剂` 餐次记录（`n:'肌酸5g'`、`k/p/c/f` 全 0、`cr:5`）：

- 首页按钮（`TodayView`）：点一下即记默认剂量 5g；当天累计达标后按钮变绿并显示已记克数，仍可补记。
- 饮食页（`FoodView`）：剂量输入框（1–20g，默认 `CREATINE.defaultG`）+「记录肌酸」按钮，可先改日期再记。
- 统计独立：`creatineSum(db, d)` 单独汇总，**不进 `daySum`** —— `daySum` 的 `{k,p,c,f}` 形状被 legacy 差分向量冻结（`parity.test.ts` 逐值比对），加字段会直接破门禁；肌酸本身也不是宏量营养素。
- 目标 `TARGETS.cr = 5`（g/天），在今日概览的 KPI 与进度条里显示。
- 不走 `saveFood` 的「必须先填热量」校验：肌酸没有热量，但仍需一条可追溯记录。

后端配套：`ft_foods.creatine`（FLOAT，默认 0，`migrate_schema()` 幂等 `ADD COLUMN IF NOT EXISTS` 自动补列），`/api/export` 输出 `cr`、`/api/import` 读取 `cr`。
**少了这一步，整包覆盖写回时 `cr` 会被服务端丢掉** —— 前端加字段必须同时改后端并重建镜像。

## 蛋白粉快捷记录

饮食页与首页「快捷记录」各有一个蛋白粉入口，按标签折算宏量后落一条 `补剂` 餐次记录（`n:'乳清蛋白粉20g'`、`pw:20`、`cr:0`）：

- 标签值在 `constants/foods.ts` 的 `WHEY.per100g`（默认 390kcal/80p/8c/5f 每 100g），**换产品只改这一处**；宏量 = `克数/100 × 标签值`，保留一位小数（`domain/powder.ts`）。
- 饮食页（`FoodView`）：剂量输入框（5–100g，默认 20g）+「记录蛋白粉」，实时显示折算结果与当日已记克数，可先改日期再记。
- 首页（`TodayView`）：点一下即记默认 20g，按钮上带出「蛋白 +16g」与今日已记克数。
- **与肌酸的关键区别：蛋白粉的 `k/p/c/f` 照常进 `daySum`**（要算进蛋白 150g / 热量 3000kcal 目标），`pw` 只走独立的 `powderSum(db, d)` 留痕，**不进 `daySum`** —— 否则同一份粉会被计两次。今日概览的 KPI 里显示「蛋白粉 Xg · 已计入蛋白」。
- 不走 `saveFood` 的多项校验路径，但仍以普通 `f` 记录落库，可单独删除。

后端配套：`ft_foods.protein_powder`（FLOAT，默认 0，`migrate_schema()` 幂等补列），`/api/export` 输出 `pw`、`/api/import` 读取 `pw`。同样**必须与前端同时上线**，否则整包覆盖写回时 `pw` 会被服务端丢掉（宏量 `k/p/c/f` 不受影响）。

预设 chip 语义（`FoodView.pick()`）：复合餐预设仍是整表预填（v1.5 语义）；**单条目预设改为追加**，并且在追加前只清掉完全空白的草稿行 —— 否则想在已填好的一餐里多加一勺粉会被整表替换冲掉。

## 已知限制

- 体重同一天只能有一条记录（同日保存=覆盖），界面没有删除入口。
- 整包覆盖语义 → 多设备同时改是 last-write-wins（与 v1.5 相同，未做冲突合并）。
- 注册开关没有公开端点，登录页只能靠 `/api/register` 的 403/409 判断注册是否已关闭。
- 训练历史只展示最近 8 个训练日、饮食历史 20 条、体重列表 10 条（v1.5 的展示上限，数据不受影响）。
