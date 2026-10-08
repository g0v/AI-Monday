// @ts-check
import { defineConfig } from 'astro/config';

// 先放在 GitHub Pages（g0v.github.io/AI-Monday/），正式網域定了再改這兩行。
// 站內連結都經過 src/lib/data.ts 的 href()，所以換 base 不用改別的地方。
// 部署到根目錄的預覽站時用環境變數蓋掉：SITE=https://xxx.pages.dev BASE=/ npm run build
export default defineConfig({
  site: process.env.SITE ?? 'https://g0v.github.io',
  base: process.env.BASE ?? '/AI-Monday',
  trailingSlash: 'always',
});
