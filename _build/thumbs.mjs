// 为画廊动图生成静态首帧缩略图(gallery/thumbs/gifNNN.webp)
// 运行:node _build/thumbs.mjs
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, "..");
const GAL = path.join(SITE, "gallery");
const THUMBS = path.join(GAL, "thumbs");
fs.mkdirSync(THUMBS, { recursive: true });

const files = fs.readdirSync(GAL).filter(f => /^gif\d+\.webp$/i.test(f)).sort();
let made = 0, skipped = 0;
for (const f of files) {
  const out = path.join(THUMBS, f);
  if (fs.existsSync(out)) { skipped++; continue; }        // 幂等:已存在则跳过
  await sharp(path.join(GAL, f), { pages: 1 })            // 只取第一帧(静态)
    .resize(420, 420, { fit: "cover", position: "attention" })
    .webp({ quality: 76 })
    .toFile(out);
  made++;
}
console.log(`缩略图:新建 ${made},跳过 ${skipped},共 ${files.length}`);
