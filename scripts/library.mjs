#!/usr/bin/env node
// 作品库命令行：skill 交付后由模型调用，把作品登记进歸藏设计的作品库。
//
//   node scripts/library.mjs add <HTML 文件 | 任务目录> --skill <skill 名> --title "标题" [--theme 主题id] [--column 专栏] [--note 备注]
//   node scripts/library.mjs list
//   node scripts/library.mjs remove <id>
import { join } from 'node:path'
import { addWork, dataDir, listWorks, removeWork } from '../lib/library.js'
import { makeThumb } from '../lib/thumbs.js'

const args = process.argv.slice(2)
const opt = (k) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : '')
const [cmd, target] = args

if (cmd === 'add' && target) {
  const w = addWork(target, { skill: opt('skill'), title: opt('title'), theme: opt('theme'), column: opt('column'), note: opt('note') })
  console.log(`已登记：${w.title}（${w.id}，${w.files.length} 个文件）→ 侧栏「歸藏设计」里可以看到`)
  if (w.kind === 'html') {
    const ok = await makeThumb(join(w.root, w.entry), join(dataDir(), 'thumbs', `${w.id}.jpg`)).catch(() => false)
    if (!ok) console.log('（没能截缩略图，展示库会用实时预览）')
  }
} else if (cmd === 'list') {
  for (const w of listWorks()) console.log(`${w.id}  ${w.skill.padEnd(26)} ${w.title}${w.missing ? '（文件已不在）' : ''}\n          ${w.root}/${w.entry}`)
} else if (cmd === 'remove' && target) {
  console.log(removeWork(target) ? `已移除 ${target}（作品文件没有动）` : `没有 ${target}`)
} else {
  console.error('用法：library.mjs add <文件或目录> --skill <名> --title <标题> | list | remove <id>')
  process.exit(1)
}
