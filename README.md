# AI Monday 講題紀錄

g0v 揪松團每月一場的 AI Monday 線上講座，以及 g0v 國會松、COSCUP 的 AI 主題議程。網站整理了每一場的講題、講者、錄影和簡報，可以搜尋。

## 網站有什麼

| 路徑 | 內容 |
|---|---|
| `/` | 下一場活動、錄影一覽、所有場次。可以搜尋講題、講者、單位、關鍵字，也可以依系列篩選。搜尋條件會寫進網址，可以直接分享 |
| `/events/{id}/` | 單一場次：時間、形式、地點、共筆、議程（有開始時間就推算每個講題的時間）、宣傳事項 |
| `/talks/{id}/` | 單一講題：講者、錄影（從這個講題在整場錄影裡的起始時間開始播）、簡介、簡報、影片授權 |
| `/calendar/`、`/calendar/{YYYY-MM}/` | 月曆，可前後翻月。手機上格子只顯示圓點，細節看下方的當月場次列表 |
| `/calendar.ics` | 可訂閱的日曆。只收「已排定」「已完成」且有起訖時間的場次，以及「停辦」的場次（標成取消，讓訂閱者的日曆自動劃掉）；還在邀約的不收 |

還在邀約講者的空位只會出現在場次頁，不會有自己的講題頁。

## 資料從哪來

場次與講題資料由揪松團維護，每天同步成開放資料：

- [data.civictech.tw/v0/aimonday/events.json](https://data.civictech.tw/v0/aimonday/events.json)：場次
- [data.civictech.tw/v0/aimonday/talks.json](https://data.civictech.tw/v0/aimonday/talks.json)：講題

欄位說明見 [data.civictech.tw](https://data.civictech.tw/)。網站在**建置時**讀取這兩個端點並產生靜態頁面，瀏覽器端不會呼叫 API，所以要看到最新資料就得重新建置。

資料有錯（講題、講者、時間、影片連結）請告訴揪松團，例如在 g0v Slack 的 `#ai-learning` 頻道。改這個 repo 修不到資料。

## 開發

需要 Node.js 22.12 以上。

```bash
npm install
npm run dev      # 開發伺服器
npm run build    # 輸出靜態檔到 dist/
```

想用本機的資料檔（例如還沒上線的資料）建置時，把 `AIMONDAY_DATA` 指向放著 `events.json`、`talks.json` 的目錄：

```bash
AIMONDAY_DATA=path/to/v0/aimonday npm run build
```

### 程式在哪

| 檔案 | 做什麼 |
|---|---|
| `src/lib/data.ts` | 讀資料、型別、共用的格式化函式（日期、議程時間、YouTube 縮圖、簡報內嵌網址） |
| `src/layouts/Base.astro` | 共用版型與全站樣式（顏色、字體都定義在這裡） |
| `src/components/EventRow.astro` | 首頁的場次列 |
| `src/components/CalendarMonth.astro` | 月曆的一個月（`/calendar/` 與 `/calendar/{YYYY-MM}/` 共用） |
| `src/pages/` | 首頁、場次頁、講題頁、404 |

站內連結一律經過 `href()`。之後如果網站掛在子路徑下，只要在 `astro.config.mjs` 設定 `base`。

### 已知限制

講題的 id 是「場次 id＋上台順序」，例如 `2026-07-25-congressthon-2`。資料裡調換講題順序，講題頁的網址就會跟著變。

## 部署

目前放在 GitHub Pages：<https://g0v.github.io/AI-Monday/>。`.github/workflows/deploy.yml` 在 push 到 main 時、以及每天台灣時間 05:00（資料在 04:00 同步完之後）建置並部署。

`npm run build` 產出的 `dist/` 是純靜態檔，搬到別的主機也可以。網址定在 `astro.config.mjs` 的 `site` 與 `base`；部署到根目錄時用環境變數蓋掉：

```bash
SITE=https://example.org BASE=/ npm run build
```

## 資料檢查

同一個 workflow 也會讀 [report.json](https://data.civictech.tw/v0/aimonday/report.json)（資料同步時順手產生的檢查結果）。Sheet 有要修的地方，就開一張標著「資料檢查」的 issue，列出是哪一列、哪裡要改；內容有變動時留言（watch 這個 repo 就會收到通知），全部修好後自動關閉。邏輯在 `scripts/data-check-issue.sh`。

- **錯誤**：資料停在上一版，修好才會恢復更新
- **警告**：資料照常更新，但會顯示不完整。例如「已排定」「已完成」的場次漏填開始或結束時間，那場就先不放進訂閱日曆

## 授權

- 程式碼：[MIT](LICENSE)
- 場次與講題資料：[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.zh-hant)，姓名標示「g0v civictech.tw」
- 錄影與簡報：屬於各講者，授權依各講題頁上的標示
