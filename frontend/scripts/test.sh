#!/usr/bin/env bash
# 单测（含 legacy 差分等价向量）。TZ 固定，保证 hhmm/fmtT 的期望值可复现。
set -euo pipefail
cd "$(dirname "$0")/.."
export TZ=Asia/Shanghai
exec node node_modules/vitest/vitest.mjs run "$@"
