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

数据形状：`w:[{d,ex,sets:[{w,r}],dur,st,et,pause,ts}]`、`f:[{d,m,n,k,p,c,f,ts}]`、`bw:[{d,kg,note,ts}]`。
`st/et/pause` 是动作级计时的秒级毫秒时间戳与暂停累计，`dur` 由当天所有动作的 `et−st−pause` 求和派生（前端没有单独录入入口）。
服务端限制：单类最多 2000 条、每个动作最多 20 组、请求体 ≤ 2MB、日期必须 `YYYY-MM-DD`。

前端写入语义：改本地立即生效并置 `ft_dirty_<user>`，800ms 防抖后整体 POST `/api/import`，**只有推送成功才清脏标记**；
登录后若本地有未推送改动，按 `(d,ex,ts)` / `(d,ts,n)` / `(d)` 取并集（服务端同键优先）并回推；否则服务端整体覆盖本地。

## 从 v1.5 单文件版迁移

`server/` 未改动，数据零迁移。前端重构后与 v1.5 的行为差异（均为有意为之）：

1. **移除本机 localStorage 模式**（原 `HTTP_MODE=false` 分支）：服务始终同域 `/api`。
2. **`today()` 用本地日历日**（v1.5 用 `toISOString()` 取 UTC 日）：UTC+8 的 00:00–08:00 会把日期记成前一天。已核对线上 15 条记录的 `date` 与本地日全部一致 → 对已有数据零影响。
3. **组行默认值改为空**（v1.5 预填 `60kg×10`，不编辑也能通过「至少填一组」校验，容易误存）；校验改为按钮禁用 + 行内提示。
4. **`alert()` → 页内 toast**（带撤销动作，位置在 sticky 头部下方，不遮底部主按钮）。
5. UI 库改为 Element Plus 全量接入（暗色主题，主色覆盖为琥珀色），体重曲线由手绘 canvas 改为 ECharts。

`frontend/src/domain/__vectors__/legacy-vectors.json` 是从 v1.5 抽取纯函数现场生成的冻结输出（含源文件 sha256），
`parity.test.ts` 用它对时长计算、周评估文案、合并键与排序、格式化、时间戳解析逐值比对；
`rules.test.ts` 覆盖改时间的校验、进度条超标阈值与计时状态机。

## 已知限制

- 体重同一天只能有一条记录（同日保存=覆盖），界面没有删除入口。
- 整包覆盖语义 → 多设备同时改是 last-write-wins（与 v1.5 相同，未做冲突合并）。
- 注册开关没有公开端点，登录页只能靠 `/api/register` 的 403/409 判断注册是否已关闭。
- 训练历史只展示最近 8 个训练日、饮食历史 20 条、体重列表 10 条（v1.5 的展示上限，数据不受影响）。
