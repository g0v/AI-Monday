#!/usr/bin/env bash
# 讀 data.civictech.tw/v0/aimonday/report.json，把 Sheet 要修的地方同步成一張 issue：
#   有問題、沒有開著的 issue → 開一張
#   有問題、內容跟上次不同   → 改內文並留一則 comment（改內文不會通知 watcher，comment 才會）
#   有問題、內容跟上次相同   → 不動，免得每天洗版
#   沒問題、有開著的 issue   → 自動關閉
# 用 label 認「是不是那張」，不靠標題，所以人可以改標題。
#
# 本機試跑：DRY_RUN=1 GH_REPO=g0v/AI-Monday bash scripts/data-check-issue.sh
# （仍會讀 issue 列表，但不寫任何東西；REPORT_URL 可以指向本機檔案 file:///…）
set -euo pipefail

REPORT_URL=${REPORT_URL:-https://data.civictech.tw/v0/aimonday/report.json}
LABEL='資料檢查'
run() { if [ -n "${DRY_RUN:-}" ]; then echo "[dry-run] $1 $2 $3"; printf '  ‹%s›\n' "${@:4}"; else "$@"; fi; }

report=$(curl -fsS --max-time 30 "$REPORT_URL") || { echo "::error::讀不到 $REPORT_URL"; exit 1; }
errors=$(jq '.errors | length' <<<"$report")
warnings=$(jq '.warnings | length' <<<"$report")
total=$((errors + warnings))
existing=$(gh issue list --label "$LABEL" --state open --json number --jq '.[0].number // empty' 2>/dev/null || true)

if [ "$total" -eq 0 ]; then
  if [ -n "$existing" ]; then
    run gh issue close "$existing" --comment '最新一次檢查沒有問題了，自動關閉。'
  fi
  echo "✓ 沒有要修的地方"
  exit 0
fi

body=$(jq -r '
  def items: map("- **\(.where)**：\(.msg)") | join("\n");
  "AI Monday 的 [Google Sheet](\(.sheet)) 有 \((.errors | length) + (.warnings | length)) 個地方要修。",
  "",
  "這張 issue 由每天台灣時間 05:00 的自動檢查產生，**修好之後下一次檢查會自動關閉**，不用手動關。",
  (if (.errors | length) > 0 then
    "", "### 🔴 錯誤（\(.errors | length)）：網站資料停在上一版，修好才會恢復更新", "", (.errors | items)
  else empty end),
  (if (.warnings | length) > 0 then
    "", "### 🟡 警告（\(.warnings | length)）：資料照常更新，但這些地方會顯示不完整", "", (.warnings | items)
  else empty end),
  "", "---", "列號是 Sheet 左邊的列號。完整報告：[report.json]('"$REPORT_URL"')"
' <<<"$report")
title="Sheet 資料有 ${total} 個地方要修"
[ "$errors" -gt 0 ] && title="Sheet 資料有錯誤，網站停止更新（共 ${total} 個地方要修）"

if [ -z "$existing" ]; then
  run gh label create "$LABEL" --color D93F0B --description 'Sheet 資料自動檢查' --force
  run gh issue create --title "$title" --label "$LABEL" --body "$body"
  echo "開了新 issue：$title"
elif [ "$(gh issue view "$existing" --json body --jq .body)" != "$body" ]; then
  run gh issue edit "$existing" --title "$title" --body "$body"
  run gh issue comment "$existing" --body "檢查結果有變動，現在共 ${total} 個地方要修（錯誤 ${errors}、警告 ${warnings}），內文已更新。"
  echo "更新了 #$existing"
else
  echo "#$existing 內容沒變，不動"
fi
