// 语气档案的学习素材：从 DSH 的会话记录里取出用户自己发过的消息。
// 会话在 $DSH_HOME/sessions/<工作区>/session-<id>/session.v<N>.jsonl[.zstd]，每行一个事件；
// 只取 type 为 user/message、source.kind 为 user 的事件（用户亲手发的，不含 skill 注入和系统消息）。
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { zstdDecompressSync } from 'node:zlib'

const sessionsRoot = () => join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'sessions')

// 会话文件是多个 zstd 帧首尾相接，zstdDecompressSync 只解第一帧：按帧头切开逐帧解。
// 帧头字节也可能碰巧出现在压缩数据里，解不开的切片并到下一段再试。
function unzstd(buf) {
  const starts = []
  for (let i = 0; i + 3 < buf.length; i++) if (buf[i] === 0x28 && buf[i + 1] === 0xb5 && buf[i + 2] === 0x2f && buf[i + 3] === 0xfd) starts.push(i)
  let out = '', from = starts[0] ?? 0
  for (let k = 1; k <= starts.length; k++) {
    const to = k < starts.length ? starts[k] : buf.length
    try { out += zstdDecompressSync(buf.subarray(from, to)).toString('utf8'); from = to } catch { if (to === buf.length) break }
  }
  return out
}

function sessionFiles() {
  const root = sessionsRoot(), files = []
  if (!existsSync(root)) return files
  for (const ws of readdirSync(root)) {
    const wdir = join(root, ws)
    if (!statSync(wdir).isDirectory()) continue
    for (const s of readdirSync(wdir)) {
      const sdir = join(wdir, s)
      if (!s.startsWith('session-') || !statSync(sdir).isDirectory()) continue
      // 同一个会话可能有多个格式版本的文件，取版本最高的
      const f = readdirSync(sdir).filter((n) => /^session\.v\d+\.jsonl(\.zstd)?$/.test(n)).sort((a, b) => +b.match(/v(\d+)/)[1] - +a.match(/v(\d+)/)[1])[0]
      if (f) files.push(join(sdir, f))
    }
  }
  return files
}

export function userMessages() {
  const out = []
  for (const file of sessionFiles()) {
    let text
    try { text = file.endsWith('.zstd') ? unzstd(readFileSync(file)) : readFileSync(file, 'utf8') } catch { continue }
    let title = ''
    for (const line of text.split('\n')) {
      if (!line.startsWith('{')) continue
      let e
      try { e = JSON.parse(line) } catch { continue }
      if (e.type === 'session/title' && e.data?.title) title = e.data.title
      if (e.type !== 'user/message' || e.data?.source?.kind !== 'user' || !Array.isArray(e.data.content)) continue
      // 去掉开头的 /skill 命令：那是调用方式，不是用户的文字
      const t = e.data.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').replace(/^\/[a-z0-9-]+\s*/, '').trim()
      if (t) out.push({ text: t, time: e.time || 0, title, file })
    }
  }
  return out
}

// 写一份学习素材：长消息优先（大段内容最能体现写作习惯），去重，总量封顶，交给 guizang-voice skill 读
export function writeCorpus(outFile, { minChars = 30, maxChars = 80000 } = {}) {
  const seen = new Set()
  const msgs = userMessages().filter((m) => m.text.length >= minChars && !seen.has(m.text) && seen.add(m.text))
  msgs.sort((a, b) => b.text.length - a.text.length)
  let total = 0
  const picked = []
  for (const m of msgs) { if (total + m.text.length > maxChars && picked.length) continue; picked.push(m); total += m.text.length }
  picked.sort((a, b) => a.time - b.time)
  const md = [`# 用户在 DeepSeek Harness 里发过的消息`, '', `${picked.length} 条（共收集到 ${msgs.length} 条 ${minChars} 字以上的消息，长消息优先，总量约 ${total} 字）。这是语气档案的学习素材，只在本机。`, '']
  for (const m of picked) md.push(`## ${m.time ? new Date(m.time).toISOString().slice(0, 10) : ''}${m.title ? ' · ' + m.title : ''}`, '', m.text, '')
  mkdirSync(join(outFile, '..'), { recursive: true })
  writeFileSync(outFile, md.join('\n'))
  return { messages: picked.length, found: msgs.length, chars: total, sessions: sessionFiles().length }
}
