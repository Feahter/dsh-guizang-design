#!/usr/bin/env node
// 个人语料档案：guizang-voice skill 用它找到、查看和追加档案。档案是 <dataDir>/voice.md，只在本机。
//
//   node scripts/voice.mjs path | show | note "<一条观察>"
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { voicePath } from '../lib/voice.js'

const [cmd, text] = process.argv.slice(2)
const file = voicePath()

if (cmd === 'path') console.log(file)
else if (cmd === 'show') {
  if (existsSync(file)) console.log(readFileSync(file, 'utf8'))
  else console.log(`还没有语料档案（${file}）。让用户给 3–10 篇自己写过的文章，按 guizang-voice skill 的步骤建档。`)
} else if (cmd === 'note' && text) {
  mkdirSync(file.replace(/\/[^/]+$/, ''), { recursive: true })
  const day = new Date().toISOString().slice(0, 10)
  if (!existsSync(file)) writeFileSync(file, `# 语料档案\n更新：${day} · 还没有样本，只有对话里学到的\n\n## 对话中学到的\n`)
  const body = readFileSync(file, 'utf8')
  if (!/^## 对话中学到的/m.test(body)) appendFileSync(file, '\n## 对话中学到的\n')
  // 追加到「对话中学到的」小节末尾
  const next = readFileSync(file, 'utf8').replace(/(## 对话中学到的\n(?:(?!\n## )[\s\S])*?)(\n## |\s*$)/, (_, sec, tail) => `${sec.replace(/\s*$/, '')}\n- ${day}：${text}\n${tail.startsWith('\n## ') ? tail : ''}`)
  writeFileSync(file, next)
  console.log('已记下')
} else {
  console.error('用法：voice.mjs path | show | note "<一条观察>"')
  process.exit(1)
}
