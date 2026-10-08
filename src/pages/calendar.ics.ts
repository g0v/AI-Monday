// 可訂閱的日曆（RFC 5545）。只收時間已談定的場次，見 data.ts 的 inIcs()。
import type { APIRoute } from 'astro';
import { eventTitle, getData, hasContent, inIcs, speakerNames, talkTitle } from '../lib/data';

export const GET: APIRoute = async ({ site }) => {
  const { events, talks } = await getData();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const base = site ? new URL(import.meta.env.BASE_URL, site).href.replace(/\/$/, '') : null;

  const vevents = events.filter(inIcs).map((e) => {
    const page = base && `${base}/events/${e.id}/`;
    const own = talks.filter((t) => t.event_id === e.id && hasContent(t)).sort((a, b) => a.order - b.order);
    const desc = [
      ...own.map((t) => (t.speakers.length ? `・${talkTitle(t)}（${speakerNames(t)}）` : `・${talkTitle(t)}`)),
      e.notes_url && `共筆：${e.notes_url}`,
      page,
    ].filter(Boolean).join('\n');
    const timed = e.start_time && e.end_time;
    return [
      'BEGIN:VEVENT',
      `UID:${e.id}@aimonday.g0v`,
      `DTSTAMP:${stamp}`,
      ...(timed
        ? [`DTSTART;TZID=Asia/Taipei:${compact(e.date)}T${compact(e.start_time!)}00`, `DTEND;TZID=Asia/Taipei:${compact(e.date)}T${compact(e.end_time!)}00`]
        // 只有停辦的會走到這裡（可能沒有時間）：當成全天事件，讓訂閱者看得到它被劃掉
        : [`DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${compact(nextDay(e.date))}`]),
      `SUMMARY:${text(eventTitle(e))}`,
      ...(desc ? [`DESCRIPTION:${text(desc)}`] : []),
      ...(e.venue ?? e.format ? [`LOCATION:${text((e.venue ?? e.format)!)}`] : []),
      ...(page ? [`URL:${page}`] : []),
      `STATUS:${e.status === '停辦' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    ];
  });

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//g0v//AI Monday//ZH-TW',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:AI Monday',
    'X-WR-TIMEZONE:Asia/Taipei',
    'X-WR-CALDESC:g0v 揪松團 AI Monday 與相關 AI 主題議程',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    // 台灣沒有日光節約時間，一段 STANDARD 就夠
    'BEGIN:VTIMEZONE', 'TZID:Asia/Taipei',
    'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0800', 'TZOFFSETTO:+0800', 'TZNAME:CST', 'END:STANDARD',
    'END:VTIMEZONE',
    ...vevents.flat(),
    'END:VCALENDAR',
  ];
  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};

const compact = (s: string) => s.replace(/[-:]/g, '');
const nextDay = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);
// TEXT 值的跳脫：反斜線、分號、逗號、換行
const text = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// 每行最多 75 bytes，續行以一個空白開頭。中文一字 3 bytes，要以字為單位切，不能切在字中間
function fold(line: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '', size = 0, limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > limit) { out.push(cur); cur = ''; size = 0; limit = 74; }
    cur += ch; size += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}
