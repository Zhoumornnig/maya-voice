// 为画廊生成压缩+减帧的动图(gallery/anim/gifNNN.webp),供网格小图使用
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

const WIDTH = 176;   // 网格显示尺寸
const KEEP = 3;      // 每 KEEP 帧保留 1 帧(减帧,原约160帧 -> 约54帧)

// 整段正确解码 -> 隔帧抽取 -> join 重组为新动图(帧率降低、体积大减)
async function reduce(src, out) {
  const meta = await sharp(src, { animated: true }).metadata();
  const n = meta.pages || 1, delay = meta.delay || [];
  const { data, info } = await sharp(src, { animated: true })
    .resize({ width: WIDTH, withoutEnlargement: true }).ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  const outW = info.width, ph = Math.round(info.height / n), ch = info.channels, fb = outW * ph * ch;
  const idx = []; for (let p = 0; p < n; p += KEEP) idx.push(p);
  const frames = [];
  for (const p of idx) {
    const s = Buffer.from(data.subarray(p * fb, (p + 1) * fb));
    frames.push(await sharp(s, { raw: { width: outW, height: ph, channels: ch } }).png().toBuffer());
  }
  const delays = idx.map(p => ((delay[p]) || 40) * KEEP);   // 拉长每帧停留,保持原速
  await sharp(frames, { join: { animated: true } })
    .webp({ quality: 38, alphaQuality: 45, smartSubsample: true, effort: 5, delay: delays, loop: 0 })
    .toFile(out);
}

const files = fs.readdirSync(GAL).filter(f => /^gif\d+\.webp$/i.test(f)).sort();
let made = 0, skip = 0;
for (const f of files) {
  const out = path.join(ANIM, f);
  if (fs.existsSync(out)) { skip++; continue; }              // 幂等
  try { await reduce(path.join(GAL, f), out); made++; }
  catch (e) { console.error("失败", f, e.message); }
}
console.log(`压缩动图(${WIDTH}px, 每${KEEP}帧留1):新建 ${made},跳过 ${skip},共 ${files.length}`);
