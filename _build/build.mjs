// 构建脚本:把日文名 mp3 安全化为 audio/001.mp3…,并生成 manifest.json 与 data.js
// 运行:node _build/build.mjs   (在 摩耶重炮 文件夹里)
// 安全流程:先复制到 audio/ → 逐个校验大小 → 全部通过后再删除原始文件
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import translations from "./translations.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, "..");          // 摩耶重炮 文件夹
const AUDIO = path.join(SITE, "audio");
const listPath = path.join(__dirname, "filelist.txt");

// 分类定义(键、中文名、颜色、显示顺序)
const CATEGORIES = [
  { key: "greet",  label: "问候",  color: "#38bdf8" },
  { key: "daily",  label: "日常",  color: "#7dd3fc" },
  { key: "train",  label: "训练",  color: "#34d399" },
  { key: "race",   label: "出走",  color: "#fb923c" },
  { key: "win",    label: "胜利",  color: "#fbbf24" },
  { key: "lose",   label: "失落",  color: "#94a3b8" },
  { key: "growth", label: "成长",  color: "#a78bfa" },
  { key: "story",  label: "剧情",  color: "#fb7185" },
  { key: "event",  label: "活动",  color: "#f472b6" },
  { key: "live",   label: "演出",  color: "#e879f9" },
  { key: "sys",    label: "系统",  color: "#94a3b8" },
];
const validCats = new Set(CATEGORIES.map(c => c.key));

// 读取文件顺序清单
const files = fs.readFileSync(listPath, "utf8").split(/\r?\n/).map(s => s.trim()).filter(Boolean);

// 严格校验:数量必须一致,否则拒绝执行(防止翻译错位)
if (files.length !== translations.length) {
  console.error(`❌ 数量不匹配: 文件 ${files.length} 条, 翻译 ${translations.length} 条`);
  process.exit(1);
}
for (const t of translations) {
  if (!validCats.has(t.cat)) { console.error(`❌ 未知分类 "${t.cat}" (id ${t.id})`); process.exit(1); }
}

fs.mkdirSync(AUDIO, { recursive: true });

const pad = n => String(n).padStart(3, "0");
const clips = [];
const copied = [];   // { src, dest }

// 阶段1:复制到 audio/NNN.mp3(不删原文件)
for (let i = 0; i < files.length; i++) {
  const id = i + 1;
  const orig = files[i];
  const src = path.join(SITE, orig);
  const destName = `${pad(id)}.mp3`;
  const dest = path.join(AUDIO, destName);
  const jp = orig.replace(/\.mp3$/i, "");
  const t = translations[i];

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    copied.push({ src, dest, orig });
  } else if (!fs.existsSync(dest)) {
    console.error(`❌ 源文件缺失且目标不存在: ${orig}`);
    process.exit(1);
  } // 若 src 缺失但 dest 已存在 => 之前已处理过,跳过(幂等)

  clips.push({ id, file: `audio/${destName}`, orig, jp, cn: t.cn, cat: t.cat });
}

// 阶段2:逐个校验目标文件存在且非空
let ok = 0;
for (const c of clips) {
  const p = path.join(SITE, c.file);
  const st = fs.existsSync(p) ? fs.statSync(p) : null;
  if (!st || st.size === 0) { console.error(`❌ 校验失败: ${c.file}`); process.exit(1); }
  ok++;
}
console.log(`✅ 音频校验通过: ${ok}/${clips.length}`);

// 阶段3:全部通过后,删除原始日文名文件(仅删本次复制过的)
let removed = 0;
for (const c of copied) {
  try { fs.unlinkSync(c.src); removed++; } catch (e) { /* 忽略 */ }
}
console.log(`🧹 已移除原始日文名文件: ${removed} 个(原名已记录在 manifest.json 中)`);

// 扫描画廊动图(gallery/ 子文件夹);优先用 thumbs/ 里的静态缩略图
let gallery = [];
const galleryDir = path.join(SITE, "gallery");
const thumbsDir = path.join(galleryDir, "thumbs");
if (fs.existsSync(galleryDir)) {
  gallery = fs.readdirSync(galleryDir)
    .filter(f => /^gif\d+\.(webp|gif|png|jpe?g)$/i.test(f))
    .sort()
    .map(f => {
      const full = "gallery/" + f;
      const hasThumb = fs.existsSync(path.join(thumbsDir, f));
      return { full, thumb: hasThumb ? "gallery/thumbs/" + f : full };
    });
}
console.log(`🖼  画廊图片: ${gallery.length}`);

// 生成数据对象
const data = {
  title: "摩耶重炮 语音站",
  subtitle: "マヤノトップガン ボイスコレクション",
  count: clips.length,
  categories: CATEGORIES,
  clips,
  gallery,
};

// manifest.json(标准数据文件)
fs.writeFileSync(path.join(SITE, "manifest.json"), JSON.stringify(data, null, 2));
// data.js(供 index.html 直接用 <script> 引入,双击本地打开也能工作)
fs.writeFileSync(path.join(SITE, "data.js"), "window.MAYA_DATA = " + JSON.stringify(data) + ";\n");

console.log(`🎉 完成:${clips.length} 条语音 -> manifest.json / data.js`);
