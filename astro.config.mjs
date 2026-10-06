// @ts-check
import { defineConfig } from 'astro/config';

// 正式網址還沒定，先不設 site／base。站內連結都經過 src/lib/data.ts 的 href()，
// 之後掛在子路徑時只要在這裡設 base。
export default defineConfig({
  trailingSlash: 'always',
});
