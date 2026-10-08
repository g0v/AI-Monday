// 建置時讀 data.civictech.tw/v0/aimonday/ 的兩個端點。
// AIMONDAY_DATA 可改成本機目錄（API 還沒上線、或想用還沒推的資料時）：
//   AIMONDAY_DATA=../civictech-tw-data/data/v0/aimonday npm run build

import { readFile } from 'node:fs/promises';
import path from 'node:path';

export interface Speaker { name: string; affiliation: string | null; url: string | null }
export interface Video { url: string; youtube_id: string | null; start_sec: number }
export interface Promotion { text: string; urls: string[] }

export interface Event {
  id: string; date: string; weekday: string;
  series: string; series_slug: string;
  theme: string | null; status: string | null;
  // end_time：API 2026-10 才加的欄位，舊資料沒有這個 key
  start_time: string | null; end_time?: string | null; format: string | null; venue: string | null;
  notes_url: string | null; sponsor: string | null;
  promotions: Promotion[];
  talk_ids: string[];
}

export interface Talk {
  id: string; event_id: string; order: number;
  kind: 'talk' | 'qa';
  title: string | null; description: string | null;
  speakers: Speaker[];
  open_slot: boolean;
  duration_min: number | null;
  slides_url: string | null;
  video: Video | null;
  keywords: string[];
  license: string | null;
  license_status: 'confirmed' | 'pending' | 'unknown' | null;
}

const SOURCE = process.env.AIMONDAY_DATA ?? 'https://data.civictech.tw/v0/aimonday';

async function load<T>(file: string): Promise<T[]> {
  const text = /^https?:\/\//.test(SOURCE)
    ? await fetch(`${SOURCE}/${file}`).then((r) => {
        if (!r.ok) throw new Error(`${SOURCE}/${file}：HTTP ${r.status}`);
        return r.text();
      })
    : await readFile(path.resolve(SOURCE, file), 'utf8');
  return JSON.parse(text).records;
}

let cache: Promise<{ events: Event[]; talks: Talk[] }> | undefined;

export function getData() {
  cache ??= (async () => {
    const [events, talks] = await Promise.all([load<Event>('events.json'), load<Talk>('talks.json')]);
    events.sort((a, b) => a.date.localeCompare(b.date));
    return { events, talks };
  })();
  return cache;
}

// 「今天」以台灣時間算；網站每天跟著 API 重建，所以建置當下的日期就夠準
export const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(new Date());

// 有實質內容的講題（不是空位）。邀約中的空位只在場次頁顯示，不產生講題頁
export const hasContent = (t: Talk) => !t.open_slot;

export const talkTitle = (t: Talk) => (t.kind === 'qa' ? 'QA' : t.title ?? '講題待定');
export const speakerNames = (t: Talk) => t.speakers.map((s) => s.name).join('、');

export function eventTitle(e: Event) {
  return e.theme ? `${e.series}｜${e.theme}` : e.series;
}

export function formatDate(e: Event) {
  const [y, m, d] = e.date.split('-');
  return `${y}/${Number(m)}/${Number(d)}（${e.weekday}）`;
}

// 「20:00–21:30」；只有開始時間就寫「20:00 開始」
export function timeRange(e: Event) {
  if (!e.start_time) return null;
  return e.end_time ? `${e.start_time}–${e.end_time}` : `${e.start_time} 開始`;
}

// rundown：從開始時間依序加上每個講題長度。沒有開始時間就只列順序
export function rundown(e: Event, talks: Talk[]) {
  let minutes = e.start_time ? toMinutes(e.start_time) : null;
  return talks.map((t) => {
    const at = minutes == null ? null : fromMinutes(minutes);
    if (minutes != null) minutes = t.duration_min == null ? null : minutes + t.duration_min;
    return { talk: t, at };
  });
}
const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fromMinutes = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

// YouTube 縮圖（hqdefault 每支影片都有；maxres 不一定有）
export const thumbUrl = (t: Talk) => (t.video?.youtube_id ? `https://i.ytimg.com/vi/${t.video.youtube_id}/hqdefault.jpg` : null);

export function monthDay(e: Event) {
  const [, m, d] = e.date.split('-').map(Number);
  return { month: m, day: d };
}

// Google 簡報（含上傳到 Drive 再用簡報開的 .pptx）可以內嵌；其他（Drive 資料夾、PDF 連結…）只放連結
export function slidesEmbed(url: string | null) {
  const m = url?.match(/^https:\/\/docs\.google\.com\/presentation\/d\/([\w-]+)/);
  return m ? `https://docs.google.com/presentation/d/${m[1]}/embed?start=false&loop=false` : null;
}

export const LICENSE_URL: Record<string, string> = {
  'CC-BY': 'https://creativecommons.org/licenses/by/4.0/deed.zh-hant',
  'CC-BY-ND': 'https://creativecommons.org/licenses/by-nd/4.0/deed.zh-hant',
  'CC-BY-SA': 'https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hant',
};

// ---------- 日曆 ----------

// 「已排定」「已完成」的時間已談定、「停辦」要通知已訂閱的人劃掉；「邀約中」還沒確定，不進 .ics。
// 已排定／已完成卻漏填時間的，sync 會發警告（每日建置據此開 issue），補好之前先不放進來
export const inIcs = (e: Event) =>
  e.status === '停辦' || ((e.status === '已排定' || e.status === '已完成') && !!e.start_time && !!e.end_time);

export const monthOf = (date: string) => date.slice(0, 7);

// 從第一場到最後一場（含今天所在的月）的每個月，「YYYY-MM」
export function calendarMonths(events: Event[]) {
  const all = [...events.map((e) => monthOf(e.date)), monthOf(today)].sort();
  const months: string[] = [];
  for (let m = all[0]; m <= all[all.length - 1]; m = shiftMonth(m, 1)) months.push(m);
  return months;
}

export function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// 月曆格子：週日開頭，前後補滿成整週。每格是「YYYY-MM-DD」，不在本月的格子為 null
export function monthGrid(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${ym}-${String(d).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

// 站內連結都經過這裡，之後決定掛在子路徑（base）時只改 astro.config
export const href = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${p}`;
