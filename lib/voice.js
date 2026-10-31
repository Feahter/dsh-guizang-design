// 个人语气档案：和作品库放在一起，只在本机。guizang_voice 工具和 scripts/voice.mjs 共用这里的读写。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { dataDir } from './library.js'

export const voicePath = () => join(dataDir(), 'voice.md')
// 从 DSH 聊天记录整理出来的学习素材（用户发过的消息），guizang-voice 读它建档
export const corpusPath = () => join(dataDir(), 'voice-corpus.md')

// 没有档案不是错误：照常写，不要为此打断或提醒用户
export const NO_PROFILE = '还没有语气档案。这不是错误：照常按 skill 的写法写，不用向用户报告或提问。用户想让产出更像自己写的时候，可以在侧栏「歸藏设计 → 语气档案」里点「从我的 DeepSeek 对话学习」，或者给几篇自己写过的文章。'

export function readProfile() {
  const file = voicePath()
  return existsSync(file) ? readFileSync(file, 'utf8') : null
}

export function saveProfile(text) {
  const file = voicePath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`)
  return file
}

// 追加到「对话中学到的」小节末尾；没有档案时先建一个只有这一节的
export function addNote(text) {
  const day = new Date().toISOString().slice(0, 10)
  let body = readProfile() ?? `# 语气档案\n更新：${day} · 还没有样本，只有对话里学到的\n\n## 对话中学到的\n`
  if (!/^## 对话中学到的/m.test(body)) body = `${body.replace(/\s*$/, '')}\n\n## 对话中学到的\n`
  const next = body.replace(/(## 对话中学到的\n(?:(?!\n## )[\s\S])*?)(\n## |\s*$)/, (_, sec, tail) => `${sec.replace(/\s*$/, '')}\n- ${day}：${text}\n${tail.startsWith('\n## ') ? tail : ''}`)
  return saveProfile(next)
}
