#!/usr/bin/env bash
# 类型检查 + 构建（离线：复用软链的 node_modules，不触发任何安装/网络）
set -euo pipefail
cd "$(dirname "$0")/.."
exec node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
