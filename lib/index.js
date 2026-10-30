// 歸藏设计 · DeepSeek Harness 插件：Host 半边
// 1. 把插件自带的四个 skill（skills/）注册进 ctx.skills，模型和 /skill 命令都能用
// 2. /guizang-design/            展示库页面（gallery/）
//    /guizang-design/api/catalog  skill、工作流、官方示例、我的作品、语气档案
//    /guizang-design/examples/…   官方示例的文件（examples/）
//    /guizang-design/works/<id>/… 作品库里登记过的作品文件（只放行登记过的目录）
import { createReadStream, existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dataDir, listWorks, removeWork } from './library.js'
import { nextIssue, nextOfWork, RECIPES, SKILLS, VOICE } from './recipes.js'
import { createSkillProvider, readSkills } from './skills.js'
import { corpusPath, voicePath } from './voice.js'
import { writeCorpus } from './history.js'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const BASE = '/guizang-design'
// 插件自带的 skill：独立仓库的快照（tools/vendor-skills.mjs）+ 插件自己的（语料档案）
const SKILL_DIRS = [join(ROOT, 'skills'), join(ROOT, 'own-skills')]

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm',
}

export const name = 'guizang-design'
export const inject = ['webServer', 'skills']

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}
function notFound(res) {
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
  res.end('not found')
}

// 只在 dir 里面找文件：拒绝 ..、点文件和目录外的符号链接
function safeFile(dir, rel) {
  if (!dir || rel.split('/').some((p) => p.startsWith('.'))) return null
  let base
  try { base = realpathSync(dir) } catch { return null }
  const file = normalize(join(base, rel))
  if (!file.startsWith(base + sep) || !existsSync(file)) return null
  const real = realpathSync(file)
  return real.startsWith(base + sep) && statSync(real).isFile() ? real : null
}

function serveFile(req, res, file) {
  const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream'
  res.writeHead(200, { 'content-type': type, 'content-length': statSync(file).size, 'cache-control': 'no-cache' })
  if (req.method === 'HEAD') return res.end()
  createReadStream(file).pipe(res)
}

// 只接受同源页面发来的 JSON
function readJson(req, max = 16 * 1024) {
  return new Promise((resolve, reject) => {
    const origin = req.headers.origin
    if (req.method !== 'POST') return reject(Object.assign(new Error('method'), { status: 405 }))
    if (!/^application\/json\b/.test(req.headers['content-type'] || '')) return reject(Object.assign(new Error('type'), { status: 415 }))
    if (origin && origin.replace(/^https?:\/\//, '') !== req.headers.host) return reject(Object.assign(new Error('origin'), { status: 403 }))
    let size = 0
    const chunks = []
    req.on('data', (c) => { size += c.length; if (size > max) req.destroy(); else chunks.push(c) })
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch (e) { reject(Object.assign(e, { status: 400 })) } })
    req.on('error', reject)
  })
}

const examples = () => {
  try { return JSON.parse(readFileSync(join(ROOT, 'examples', 'manifest.json'), 'utf8')).examples } catch { return [] }
}

function voiceInfo() {
  const file = voicePath()
  if (!existsSync(file)) return { exists: false, path: file }
  const text = readFileSync(file, 'utf8')
  return { exists: true, path: file, updated: (text.match(/^更新：(.+)$/m) || [])[1] || '', text }
}

function columns() {
  const by = new Map()
  for (const w of listWorks()) if (w.column) (by.get(w.column) || by.set(w.column, []).get(w.column)).push(w)
  return [...by].map(([name, ws]) => {
    const latest = ws.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    return { name, issues: ws.length, latest: { id: latest.id, title: latest.title, skill: latest.skill, updatedAt: latest.updatedAt }, next: nextIssue(name, latest) }
  })
}

function catalog() {
  const installed = new Set(readSkills(SKILL_DIRS).map((s) => s.name))
  const manifest = (() => { try { return JSON.parse(readFileSync(join(ROOT, 'skills', 'manifest.json'), 'utf8')).skills } catch { return [] } })()
  return {
    skills: SKILLS.filter((s) => installed.has(s.name)).map((s) => ({ ...s, source: manifest.find((m) => m.name === s.name) })),
    recipes: RECIPES,
    voice: { ...voiceInfo(), prompts: { articles: VOICE.articles } },
    columns: columns(),
    examples: examples().map((e) => ({ ...e, url: `${BASE}/examples/${e.entry}`, thumb: e.thumb && `${BASE}/examples/${e.thumb}`, files: (e.files || [e.entry]).map((f) => `${BASE}/examples/${f}`), next: nextOfWork({ ...e, root: join(ROOT, 'examples'), entry: e.entry }) })),
    works: listWorks().map((w) => ({
      ...w,
      url: `${BASE}/works/${w.id}/${w.entry}`,
      thumb: existsSync(join(dataDir(), 'thumbs', `${w.id}.jpg`)) ? `${BASE}/thumbs/${w.id}.jpg?v=${encodeURIComponent(w.updatedAt)}` : null,
      files: w.files.map((f) => `${BASE}/works/${w.id}/${f}`),
      next: nextOfWork(w),
    })),
  }
}

export function apply(ctx) {
  ctx.effect(() => ctx.skills.registerProvider(() => createSkillProvider(SKILL_DIRS, ROOT)))

  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'prefix',
      path: BASE,
      async handler(req, res) {
        const url = new URL(req.url || '/', 'http://x')
        const rest = decodeURIComponent(url.pathname.slice(BASE.length)) || '/'
        if (rest === '/api/catalog') return sendJson(res, 200, catalog())
        if (rest === '/api/voice/collect') {
          try {
            await readJson(req)
            const r = { ...writeCorpus(corpusPath()), path: corpusPath() }
            return sendJson(res, 200, { ok: true, ...r, prompt: r.messages ? VOICE.history(r) : null })
          } catch (e) {
            return sendJson(res, e.status || 500, { ok: false, error: e.message })
          }
        }
        if (rest === '/api/works/remove') {
          try {
            const body = await readJson(req)
            return sendJson(res, 200, { ok: removeWork(String(body.id || '')) })
          } catch (e) {
            return sendJson(res, e.status || 400, { ok: false, error: e.message })
          }
        }
        if (req.method !== 'GET' && req.method !== 'HEAD') return notFound(res)
        let m
        if ((m = rest.match(/^\/examples\/(.+)$/))) {
          const f = safeFile(join(ROOT, 'examples'), m[1])
          return f ? serveFile(req, res, f) : notFound(res)
        }
        if ((m = rest.match(/^\/thumbs\/([\w-]+\.jpg)$/))) {
          const f = safeFile(join(dataDir(), 'thumbs'), m[1])
          return f ? serveFile(req, res, f) : notFound(res)
        }
        if ((m = rest.match(/^\/works\/([\w-]+)\/(.+)$/))) {
          const work = listWorks().find((w) => w.id === m[1])
          const f = work && safeFile(work.root, m[2])
          return f ? serveFile(req, res, f) : notFound(res)
        }
        const f = safeFile(join(ROOT, 'gallery'), rest === '/' ? 'index.html' : rest.slice(1))
        return f ? serveFile(req, res, f) : notFound(res)
      },
    }),
  )
}
