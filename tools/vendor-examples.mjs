#!/usr/bin/env node
// 官方示例：从 guizang-design 的 demo/ 取几份作品放进 examples/，写 examples/manifest.json，并截缩略图。
//
//   node tools/vendor-examples.mjs [guizang-design 仓库路径]（默认 ../guizang-design）
//
// 卡片 PNG 转成 webp（质量 82）控制包体积；网页示例用在线字体重新渲染（内置字体的版本 1MB+）。
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeThumb } from '../lib/thumbs.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DESIGN = resolve(process.argv[2] || join(ROOT, '..', 'guizang-design'))
const DEMO = join(DESIGN, 'demo')
const OUT = join(ROOT, 'examples')
const PAGE_SKILL = join(ROOT, 'skills', 'guizang-page-skill')

// examples/en/ 是手工翻译的英文版（英文客户端用），不从 demo/ 生成，重新生成时保留
for (const f of existsSync(OUT) ? readdirSync(OUT) : []) if (f !== 'en') rmSync(join(OUT, f), { recursive: true, force: true })
mkdirSync(join(OUT, 'thumbs'), { recursive: true })

// HTML 里引用到的本地文件（assets/…、images/…、img/…）
const localRefs = (html) => [...new Set([...html.matchAll(/(?:src|href)="((?:assets|images|img)\/[^"?#]+)"/g)].map((m) => m[1]))]

function copyHtml(srcDir, file, destDir, destFile = file) {
  const html = readFileSync(join(srcDir, file), 'utf8')
  mkdirSync(destDir, { recursive: true })
  writeFileSync(join(destDir, destFile), html)
  for (const ref of localRefs(html)) {
    if (!existsSync(join(srcDir, ref))) continue
    mkdirSync(join(destDir, ref, '..'), { recursive: true })
    cpSync(join(srcDir, ref), join(destDir, ref))
  }
}

function webp(src, dest) {
  mkdirSync(join(dest, '..'), { recursive: true })
  execFileSync('python3', ['-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], "WEBP", quality=82, method=6)', src, dest])
}

const examples = []

// PPT：两种风格各一份
for (const [id, file, title, summary] of [
  ['ppt-magazine', 'magazine.html', '统一设计系统 · 杂志风 PPT', '墨水经典主题，WebGL 流体背景，8 页。'],
  ['ppt-swiss', 'swiss.html', '统一设计系统 · 瑞士风 PPT', '克莱因蓝主题，网格点阵背景，8 页。'],
]) {
  copyHtml(join(DEMO, 'ppt'), file, join(OUT, id), 'index.html')
  examples.push({ id, skill: 'guizang-ppt-skill', title, summary, kind: 'html', entry: `${id}/index.html` })
}

// 卡片：每种风格 4 张
for (const [id, dir, title, summary, picks] of [
  ['card-editorial', 'card/editorial/output', '设计系统发布 · 杂志风卡片', '森林墨主题的小红书组图，含一张品牌色生成的卡片。', ['xhs-01-cover', 'xhs-03-quote', 'xhs-04-pipeline', 'xhs-brand']],
  ['card-swiss', 'card/swiss/output', '设计系统发布 · 瑞士风卡片', '柠檬黄主题的小红书组图。', ['xhs-01-cover', 'xhs-02-compare', 'xhs-04-apca', 'xhs-07-takeaway']],
]) {
  const files = picks.map((p) => `${id}/${p}.webp`)
  picks.forEach((p, i) => webp(join(DEMO, dir, `${p}.png`), join(OUT, files[i])))
  examples.push({ id, skill: 'guizang-social-card-skill', title, summary, kind: 'image', entry: files[0], files })
}

// 网页：用插件自带的网页 skill 重新渲染（在线字体）
for (const [id, dir, md, args, title, summary] of [
  ['page-magazine', 'page/magazine', 'article.md', ['--style', 'magazine', '--theme', 'kraft-paper'], '独立书店如何在算法时代活下来', '杂志风解释模式，牛皮纸主题。'],
  ['page-swiss', 'page/swiss', 'doc.md', ['--style', 'swiss', '--brand', '#00B386'], 'Margin 2.0 发布说明', '瑞士风忠实模式，品牌色 #00B386 生成的主题。'],
]) {
  const src = join(DEMO, dir), dest = join(OUT, id)
  mkdirSync(dest, { recursive: true })
  execFileSync('node', [join(PAGE_SKILL, 'scripts/render.mjs'), join(src, md), join(src, 'annotations.json'), join(dest, 'index.html'), ...args], { stdio: 'pipe' })
  for (const ref of localRefs(readFileSync(join(dest, 'index.html'), 'utf8'))) {
    if (!existsSync(join(src, ref))) continue
    mkdirSync(join(dest, ref, '..'), { recursive: true })
    cpSync(join(src, ref), join(dest, ref))
  }
  examples.push({ id, skill: 'guizang-page-skill', title, summary, kind: 'html', entry: `${id}/index.html` })
}

for (const e of examples) {
  if (e.kind !== 'html') continue
  if (await makeThumb(join(OUT, e.entry), join(OUT, 'thumbs', `${e.id}.jpg`)).catch(() => false)) e.thumb = `thumbs/${e.id}.jpg`
  else console.warn(`! ${e.id}：没能截缩略图`)
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ $comment: 'tools/vendor-examples.mjs 生成', examples }, null, 2) + '\n')
console.log(`${examples.length} 份示例 → examples/`)
