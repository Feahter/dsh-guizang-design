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
const { createSkillProvider, readSkills, REWRITES } = await import('../lib/skills.js')
const { addWork, listWorks, removeWork } = await import('../lib/library.js')
const { RECIPES, SKILLS } = await import('../lib/recipes.js')
const { libraryTool, voiceTool, TOOLS } = await import('../lib/tools.js')

const provider = createSkillProvider([join(ROOT, 'skills'), join(ROOT, 'own-skills')], ROOT)

test('四个 skill 和语气档案都注册了，名字合法', async () => {
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
  assert.match(d.content, /guizang_library_add/)
  assert.match(d.content, /guizang_voice/)
  assert.ok(!d.content.split('## 在歸藏设计插件（DSH）里使用')[1].includes('.mjs'), '附注里不再让模型跑脚本（沙箱写不了数据目录）')
  assert.match(d.content, /演讲回收/)
  const v = await provider.get((await provider.list({})).find((x) => x.name === 'guizang-voice'), {})
  assert.ok(!v.content.includes('<PLUGIN_ROOT>'))
  assert.ok(!v.content.includes('在歸藏设计插件（DSH）里使用'))
  assert.ok(!/voice\.mjs|语料档案/.test(v.content))
})

test('只适用于 git clone 安装的步骤都换掉了：每条替换都命中，正文里不再有 git 命令', async () => {
  const skills = readSkills([join(ROOT, 'skills')])
  for (const [name, rules] of Object.entries(REWRITES)) {
    const s = skills.find((x) => x.name === name)
    assert.ok(s, name)
    for (const [from] of rules) assert.match(s.body, from, `${name}：上游改了这一段，更新 REWRITES`)
  }
  for (const c of await provider.list({})) {
    const d = await provider.get(c, {})
    assert.ok(!/git -C|git fetch|git pull|rev-list/.test(d.content), c.name)
  }
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

test('语气档案：note 追加到「对话中学到的」，脚本和工具写的是同一份', async () => {
  const run = (...a) => execFileSync('node', [join(ROOT, 'scripts/voice.mjs'), ...a], { env: { ...process.env, DSH_HOME: home }, encoding: 'utf8' })
  assert.match(run('show'), /还没有语气档案。这不是错误/)
  run('note', '第一条')
  await voiceTool.execute({ action: 'note', text: '第二条' })
  const text = readFileSync(run('path').trim(), 'utf8')
  assert.match(text, /^# 语气档案\n/)
  assert.match(text, /## 对话中学到的\n- \d{4}-\d{2}-\d{2}：第一条\n- \d{4}-\d{2}-\d{2}：第二条/)
  assert.equal((await voiceTool.execute({ action: 'show' })).text, text)
})

test('guizang_voice：save 覆盖整份档案，参数不对时报错', async () => {
  await voiceTool.execute({ action: 'save', text: '# 语气档案\n更新：2026-10-31\n\n## 节奏与结构\n- 短句多' })
  assert.match((await voiceTool.execute({ action: 'show' })).text, /## 节奏与结构\n- 短句多\n$/)
  await assert.rejects(voiceTool.execute({ action: 'save', text: '没有标题' }), /一级标题/)
  await assert.rejects(voiceTool.execute({ action: 'note' }), /需要 text/)
  await assert.rejects(voiceTool.execute({ action: 'delete' }), /action 只能是/)
  await assert.rejects(voiceTool.execute({ action: 'show', path: '/x' }), /未知参数 path/)
})

test('guizang_library_add：登记作品，要求绝对路径和已知的 skill', async () => {
  const dir = join(home, 'task-tool')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), '<h1>x</h1>')
  const v = await libraryTool.execute({ path: join(dir, 'index.html'), skill: 'guizang-ppt-skill', title: '工具登记', column: '周记' })
  const w = listWorks().find((x) => x.id === v.id)
  assert.equal(w.title, '工具登记')
  assert.equal(w.column, '周记')
  assert.match(libraryTool.output.render({}, v)[0].text, /已登记：工具登记/)
  await assert.rejects(libraryTool.execute({ path: 'index.html', skill: 'guizang-ppt-skill', title: 'x' }), /绝对路径/)
  await assert.rejects(libraryTool.execute({ path: join(dir, 'index.html'), skill: 'humanizer-zh', title: 'x' }), /skill 只能是/)
  await assert.rejects(libraryTool.execute({ path: join(dir, 'index.html'), skill: 'guizang-ppt-skill' }), /缺少 title/)
})

test('工具定义符合 DSH 工具注册表的要求', () => {
  const walk = (n, at) => {
    assert.equal(typeof n.type, 'string', at)
    if (n.type === 'object') {
      assert.equal(typeof n.additionalProperties, 'boolean', `${at}.additionalProperties 要写明`)
      for (const k of n.required || []) assert.ok(n.properties[k], `${at}.required ${k}`)
      for (const [k, p] of Object.entries(n.properties)) walk(p, `${at}.${k}`)
    }
  }
  for (const t of TOOLS) {
    assert.match(t.name, /^[a-z][a-z0-9_]*$/)
    assert.equal(typeof t.output.render, 'function')
    walk(t.parameters, `${t.name}.parameters`)
    walk(t.output.schema, `${t.name}.output`)
  }
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
