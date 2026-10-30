import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const home = mkdtempSync(join(tmpdir(), 'gz-studio-'))
process.env.DSH_HOME = home
const { createSkillProvider } = await import('../lib/skills.js')
const { addWork, listWorks, removeWork } = await import('../lib/library.js')
const { RECIPES, SKILLS } = await import('../lib/recipes.js')

const provider = createSkillProvider([join(ROOT, 'skills'), join(ROOT, 'own-skills')], ROOT)

test('四个 skill 和语料档案都注册了，名字合法', async () => {
  const names = (await provider.list({})).map((c) => c.name).sort()
  assert.deepEqual(names, ['guizang-page-skill', 'guizang-ppt-skill', 'guizang-social-card-skill', 'guizang-voice', 'humanizer-zh'])
  for (const c of await provider.list({})) {
    assert.match(c.name, /^[a-z0-9]+(-[a-z0-9]+)*$/)
    assert.ok(c.description.length > 20)
    assert.equal(c.resourceBase.kind, 'directory')
  }
})

test('加载正文：<SKILL_ROOT> 换成实际目录，末尾附上插件说明', async () => {
  const c = (await provider.list({})).find((x) => x.name === 'guizang-ppt-skill')
  const d = await provider.get(c, {})
  assert.ok(!d.content.includes('<SKILL_ROOT>'))
  assert.ok(d.content.includes(join(ROOT, 'skills', 'guizang-ppt-skill')))
  assert.match(d.content, /## 在歸藏设计插件（DSH）里使用/)
  assert.match(d.content, /library\.mjs add/)
  assert.match(d.content, /演讲回收/)
  const v = await provider.get((await provider.list({})).find((x) => x.name === 'guizang-voice'), {})
  assert.ok(!v.content.includes('<PLUGIN_ROOT>'))
  assert.ok(!v.content.includes('在歸藏设计插件（DSH）里使用'))
})

test('作品库：登记、重复登记只更新、卡片目录收图并选首图、移除', () => {
  const page = join(home, 'task-page')
  mkdirSync(page, { recursive: true })
  writeFileSync(join(page, 'index.html'), '<h1>x</h1>')
  const a = addWork(join(page, 'index.html'), { skill: 'guizang-page-skill', title: '一' })
  const b = addWork(join(page, 'index.html'), { skill: 'guizang-page-skill', title: '二' })
  assert.equal(a.id, b.id)
  assert.equal(listWorks().length, 1)

  const card = join(home, 'task-card')
  mkdirSync(join(card, 'output'), { recursive: true })
  for (const f of ['wechat-1x1-cover.png', 'xhs-01-cover.png', 'xhs-02.png', 'wechat-cover-pair-preview.png']) writeFileSync(join(card, 'output', f), '')
  const c = addWork(card, { skill: 'guizang-social-card-skill', title: '卡片', column: '周记' })
  assert.equal(c.entry, 'output/xhs-01-cover.png')
  assert.equal(c.files.length, 3)
  assert.equal(addWork(card, { title: '卡片 v2' }).id, c.id)
  assert.equal(listWorks().length, 2)
  assert.ok(removeWork(c.id))
  assert.equal(listWorks().length, 1)
})

test('语料档案：note 追加到「对话中学到的」', () => {
  const run = (...a) => execFileSync('node', [join(ROOT, 'scripts/voice.mjs'), ...a], { env: { ...process.env, DSH_HOME: home }, encoding: 'utf8' })
  run('note', '第一条')
  run('note', '第二条')
  const text = readFileSync(run('path').trim(), 'utf8')
  assert.match(text, /## 对话中学到的\n- \d{4}-\d{2}-\d{2}：第一条\n- \d{4}-\d{2}-\d{2}：第二条/)
})

test('工作流和 skill 草稿都以 /skill 名开头，并且引用的 skill 都存在', async () => {
  const names = new Set((await provider.list({})).map((c) => c.name))
  for (const r of RECIPES) {
    assert.match(r.prompt, /^\/[a-z-]+ /)
    assert.ok(names.has(r.prompt.slice(1).split(' ')[0]), r.id)
    for (const s of r.steps) assert.ok(names.has(s), `${r.id}: ${s}`)
  }
  for (const s of SKILLS) assert.ok(s.starter.startsWith(`/${s.name} `))
})

test('聊天记录：多帧 zstd 会话里只取用户亲手发的消息，去掉 /skill 前缀，长消息优先写进素材', async () => {
  const { zstdCompressSync } = await import('node:zlib')
  const { userMessages, writeCorpus } = await import('../lib/history.js')
  const dir = join(home, 'sessions', '--ws--', 'session-abc')
  mkdirSync(dir, { recursive: true })
  const ev = (o) => JSON.stringify(o) + '\n'
  const long = '我写东西习惯先讲结论，再补一个具体的例子。'.repeat(6)
  const frames = [
    ev({ type: 'session', version: 4, id: 'session-abc' }),
    ev({ type: 'session/title', seq: 1, time: 1, data: { title: '测试会话' } }),
    ev({ type: 'user/message', seq: 2, time: 1793000000000, data: { source: { kind: 'user' }, content: [{ type: 'text', text: `/guizang-ppt-skill ${long}` }] } }),
    ev({ type: 'user/message', seq: 3, time: 1793000001000, data: { source: { kind: 'skill-invocation' }, content: [{ type: 'text', text: 'skill 正文，不算用户写的'.repeat(5) }] } }),
    ev({ type: 'user/message', seq: 4, time: 1793000002000, data: { source: { kind: 'user' }, content: [{ type: 'text', text: '好' }] } }),
  ].map((f) => zstdCompressSync(Buffer.from(f)))
  writeFileSync(join(dir, 'session.v4.jsonl.zstd'), Buffer.concat(frames))
  const msgs = userMessages()
  assert.equal(msgs.length, 2)
  assert.ok(msgs[0].text.startsWith('我写东西习惯'))
  assert.equal(msgs[0].title, '测试会话')
  const out = join(home, 'corpus.md')
  const r = writeCorpus(out)
  assert.equal(r.messages, 1)   // 「好」太短，不进素材
  assert.match(readFileSync(out, 'utf8'), /## 2026-\d\d-\d\d · 测试会话\n\n我写东西习惯/)
})
