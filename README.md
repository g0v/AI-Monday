# AI Monday 講題紀錄

g0v 揪松團 AI Monday，以及 g0v 國會松、COSCUP 的 AI 主題議程：場次、講題與影片。

資料來自 [data.civictech.tw/v0/aimonday/](https://data.civictech.tw/index.json)（揪松團維護的 Google Sheet，每天同步一次）。本站在建置時讀取，不在瀏覽器端呼叫 API。

## 開發

需 Node.js 22.12+。

```bash
npm install
npm run dev
```

API 還沒上線、或想用還沒推上去的資料時，把 `AIMONDAY_DATA` 指向本機目錄：

```bash
AIMONDAY_DATA=../civictech-tw-data/data/v0/aimonday npm run build
```

## 頁面

| 路徑 | 內容 |
|---|---|
| `/` | 場次列表，可搜尋（講題、講者、單位、關鍵字）、依系列篩選。搜尋條件會寫進網址，可以分享 |
| `/events/{id}/` | 場次資訊、議程（有開始時間就推算每個講題的時間）、宣傳事項 |
| `/talks/{id}/` | 講題、講者、影片（YouTube 內嵌，從該講題的起始秒數開始播）、簡報、授權 |

講者還在邀約中的空位只出現在場次頁，不產生講題頁。

⚠️ 講題的 id 是「場次 id＋上台順序」：在 Sheet 裡調換講題順序，講題頁的網址會跟著變。
