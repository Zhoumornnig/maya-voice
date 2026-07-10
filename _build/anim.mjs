// 为画廊生成压缩版动图(gallery/anim/gifNNN.webp,256px),供网格小图使用
// 原图仍保留给灯箱(点击放大)用。运行:node _build/anim.mjs
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, "..");
const GAL = path.join(SITE, "gallery");
const ANIM = path.join(GAL, "anim");
fs.mkdirSync(ANIM, { recursive: true });

const files = fs.readdirSync(GAL).filter(f => /^gif\d+\.webp$/i.test(f)).sort();
let made = 0, skip = 0;
for (const f of files) {
  const out = path.join(ANIM, f);
  if (fs.existsSync(out)) { skip++; continue; }          // 幂等
  await sharp(path.join(GAL, f), { animated: true })      // 读取全部帧(保留动画)
    .resize({ width: 200, withoutEnlargement: true })
    .webp({ quality: 38, effort: 5 })
    .toFile(out);
  made++;
}
console.log(`压缩动图:新建 ${made},跳过 ${skip},共 ${files.length}`);
