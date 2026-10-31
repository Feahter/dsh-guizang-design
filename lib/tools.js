// 插件注册给模型的两个工具。它们在 Host 进程里执行，不经过模型的 bash 沙箱：
// 作品库和语气档案在工作区外（$DSH_HOME/guizang-design），沙箱里的脚本写不进去，每次都要用户授权。
// 工具注册在根上，所有智能体预设都能继承。
import { isAbsolute, join } from 'node:path'
import { writeCorpus } from './history.js'
import { addWork, dataDir } from './library.js'
import { makeThumb } from './thumbs.js'
import { addNote, corpusPath, NO_PROFILE, readProfile, saveProfile } from './voice.js'

export const WORK_SKILLS = ['guizang-ppt-skill', 'guizang-social-card-skill', 'guizang-page-skill']

const str = (description, extra = {}) => ({ type: 'string', description, ...extra })
const text = (value) => [{ type: 'text', text: value }]

// 参数校验：注册的是原始 JSON Schema，没有 defineTool 帮忙校验，这里自己挡住缺字段和类型错
function check(args, schema) {
  const errs = []
  for (const k of schema.required || []) if (args?.[k] === undefined || args[k] === '') errs.push(`缺少 ${k}`)
  for (const [k, v] of Object.entries(args || {})) {
    const p = schema.properties[k]
    if (!p) errs.push(`未知参数 ${k}`)
    else if (typeof v !== 'string') errs.push(`${k} 应该是字符串`)
    else if (p.enum && !p.enum.includes(v)) errs.push(`${k} 只能是 ${p.enum.join(' / ')}`)
  }
  if (errs.length) throw new Error(errs.join('；'))
}

const LIBRARY_PARAMS = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'skill', 'title'],
  properties: {
    path: str('交付物的绝对路径：PPT 和网页给 HTML 文件，卡片给任务目录（会收 output/ 里的图）'),
    skill: str('做这份作品的 skill', { enum: WORK_SKILLS }),
    title: str('作品标题'),
    theme: str('主题 id，例如 ink-classic、ikb'),
    column: str('用户说这是某个连载 / 专栏的一期时，填专栏名；作品库会把同一专栏的各期放在一起'),
    note: str('给以后做同款时看的一句备注'),
  },
}

export const libraryTool = {
  name: 'guizang_library_add',
  description: '把交付的作品登记进歸藏设计的作品库，用户就能在侧栏「歸藏设计」里看到它、一键做同风格的下一份。同一个文件重复登记只会更新。',
  parameters: LIBRARY_PARAMS,
  timeoutMs: 60_000,
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'title', 'files', 'thumb'],
      properties: { id: { type: 'string' }, title: { type: 'string' }, files: { type: 'integer' }, thumb: { type: 'boolean' } },
    },
    render: (_args, v) => text(`已登记：${v.title}（${v.id}，${v.files} 个文件）。用户可以在侧栏「歸藏设计 → 我的作品」里看到它。${v.thumb ? '' : '（没能截缩略图，作品库会用实时预览）'}`),
  },
  async execute(args) {
    check(args, LIBRARY_PARAMS)
    if (!isAbsolute(args.path)) throw new Error('path 要用绝对路径')
    const w = addWork(args.path, { skill: args.skill, title: args.title, theme: args.theme, column: args.column, note: args.note })
    const thumb = w.kind === 'html' ? await makeThumb(join(w.root, w.entry), join(dataDir(), 'thumbs', `${w.id}.jpg`)).catch(() => false) : true
    return { id: w.id, title: w.title, files: w.files.length, thumb: Boolean(thumb) }
  },
}

const VOICE_PARAMS = {
  type: 'object',
  additionalProperties: false,
  required: ['action'],
  properties: {
    action: str('show：读档案；note：在「对话中学到的」里追加一条；save：用 text 整份覆盖档案（建档或整理后）；collect：把用户在 DeepSeek 里发过的消息整理成学习素材', { enum: ['show', 'note', 'save', 'collect'] }),
    text: str('note 时是一条观察（写清用户原话和改法）；save 时是整份档案的 Markdown'),
  },
}

export const voiceTool = {
  name: 'guizang_voice',
  description: '读写用户的个人语气档案（本机的一份 Markdown，记录用户自己的写作习惯）。替用户写要署他名字的文字前用 show 读一次；建档和更新的方法见 guizang-voice skill。',
  parameters: VOICE_PARAMS,
  output: {
    schema: { type: 'object', additionalProperties: false, required: ['text'], properties: { text: { type: 'string' } } },
    render: (_args, v) => text(v.text),
  },
  async execute(args) {
    check(args, VOICE_PARAMS)
    if (args.action === 'show') return { text: readProfile() ?? NO_PROFILE }
    if (!args.text && (args.action === 'note' || args.action === 'save')) throw new Error(`${args.action} 需要 text`)
    if (args.action === 'note') return { text: `已记下（${addNote(args.text)}）` }
    if (args.action === 'save') {
      if (!/^# /.test(args.text.trimStart())) throw new Error('档案要以「# 语气档案」这样的一级标题开头')
      return { text: `已保存（${saveProfile(args.text)}）。把档案内容给用户过目。` }
    }
    const r = writeCorpus(corpusPath())
    return { text: r.messages ? `从 ${r.sessions} 个会话里整理了 ${r.messages} 条消息（约 ${r.chars} 字），素材在 ${corpusPath()}，读这个文件建档。` : `${r.sessions} 个会话里还没有 30 字以上的用户消息。请用户给几篇自己写过的文章。` }
  },
}

export const TOOLS = [libraryTool, voiceTool]
