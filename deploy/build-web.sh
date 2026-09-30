#!/usr/bin/env bash
# 前端发布（方案 A）：离线构建 → 同步到 nginx 静态目录
# 静态文件更新不需要 reload nginx；只有 vhost 变更才 reload。
# 用法：bash deploy/build-web.sh [目标目录]，默认 /root/transfer/nginx/html/fitness
set -euo pipefail

PROJ=/root/transfer/fitness
FE="$PROJ/frontend"
DEST="${1:-/root/transfer/nginx/html/fitness}"

cd "$FE"
[ -e node_modules ] || ln -s /root/transfer/aresbotv3/web/node_modules node_modules

echo "== 单测 =="
bash scripts/test.sh

echo "== 构建 =="
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.json
node node_modules/vite/bin/vite.js build

echo "== 发布 → $DEST =="
mkdir -p "$DEST"
rsync -a --delete dist/ "$DEST/"
find "$DEST" -maxdepth 2 -type f | sort | head -12
du -sh "$DEST"
echo "done: $(date -Is)"
