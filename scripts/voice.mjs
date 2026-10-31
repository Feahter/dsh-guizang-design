#!/usr/bin/env node
// 个人语气档案的命令行版本，给在终端里手动处理档案用。模型在 DSH 里用 guizang_voice 工具（lib/tools.js），
// 不用这个脚本：模型的 bash 跑在沙箱里，写不了工作区外的档案目录。
//
//   node scripts/voice.mjs path | show | note "<一条观察>"
//   node scripts/voice.mjs collect      把 DSH 聊天记录里用户发过的消息整理成学习素材（voice-corpus.md）
import { writeCorpus } from '../lib/history.js'
import { addNote, corpusPath, NO_PROFILE, readProfile, voicePath } from '../lib/voice.js'

const [cmd, text] = process.argv.slice(2)

if (cmd === 'path') console.log(voicePath())
else if (cmd === 'show') console.log(readProfile() ?? NO_PROFILE)
else if (cmd === 'collect') {
  const r = writeCorpus(corpusPath())
  console.log(r.messages ? `从 ${r.sessions} 个会话里整理了 ${r.messages} 条消息（约 ${r.chars} 字）→ ${corpusPath()}` : `${r.sessions} 个会话里还没有 30 字以上的用户消息，可以先让用户给几篇自己写的文章`)
} else if (cmd === 'note' && text) {
  addNote(text)
  console.log('已记下')
} else {
  console.error('用法：voice.mjs path | show | collect | note "<一条观察>"')
  process.exit(1)
}
