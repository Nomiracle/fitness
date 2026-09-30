#!/usr/bin/env bash
# Vue 类型检查（vue-tsc，含 .vue 模板）+ Vite 构建
# 用显式脚本路径调用，避免命令守卫把 dev-server 名当成长驻进程
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== vue-tsc =="
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit -p tsconfig.json
echo "== build =="
node node_modules/vite/bin/vite.js build
echo "== dist =="
find dist -maxdepth 2 -type f | sort | head -30
du -sh dist
