// 作品库：用户用四个 skill 做出来的作品登记在这里，展示库读它。
// 存在 $DSH_HOME/guizang-studio/library.json（没有 DSH_HOME 时是 ~/.dsh），只记路径和元信息，不复制作品文件。
// Host 半边（lib/index.js）和命令行（scripts/library.mjs）共用这一份读写逻辑。
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, extname, join, resolve } from 'node:path'

export const dataDir = () => join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'guizang-studio')
const libraryFile = () => join(dataDir(), 'library.json')

const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])
export const kindOf = (file) => (extname(file).toLowerCase() === '.html' ? 'html' : IMAGE.has(extname(file).toLowerCase()) ? 'image' : extname(file).toLowerCase() === '.pdf' ? 'pdf' : 'file')

export function readLibrary() {
  try {
    const data = JSON.parse(readFileSync(libraryFile(), 'utf8'))
    return Array.isArray(data.works) ? data.works : []
  } catch {
    return []
  }
}

function writeLibrary(works) {
  mkdirSync(dataDir(), { recursive: true })
  const tmp = libraryFile() + '.' + process.pid
  writeFileSync(tmp, JSON.stringify({ works }, null, 2) + '\n')
  renameSync(tmp, libraryFile())
}

// 一份作品 = 一个根目录 + 预览入口 + 若干文件（卡片是一组图，PPT / 网页是一个 HTML）。
// 给目录时：有 index.html 就用它；卡片任务目录有 output/*.png 就收图。
function collect(target) {
  const abs = resolve(target)
  if (!existsSync(abs)) throw new Error(`找不到 ${abs}`)
  if (statSync(abs).isFile()) return { root: dirname(abs), entry: basename(abs), files: [basename(abs)] }
  const out = join(abs, 'output')
  // 封面：小红书首图优先，其次带 cover 的图；配对预览只是预览，不进作品
  const pngs = existsSync(out) ? readdirSync(out).filter((f) => IMAGE.has(extname(f).toLowerCase()) && !/pair-preview/.test(f)).sort() : []
  const cover = pngs.find((f) => /^xhs-0?1\b|^xhs-01/.test(f)) || pngs.find((f) => /cover/.test(f)) || pngs[0]
  if (pngs.length) return { root: abs, entry: `output/${cover}`, files: [cover, ...pngs.filter((f) => f !== cover)].map((f) => `output/${f}`) }
  const html = existsSync(join(abs, 'index.html')) ? 'index.html' : readdirSync(abs).find((f) => f.endsWith('.html'))
  if (html) return { root: abs, entry: html, files: [html] }
  throw new Error(`${abs} 里没有 HTML 或 output/ 图片，指定具体文件再登记`)
}

export function addWork(target, { skill = '', title = '', theme = '', column = '', note = '' } = {}) {
  const { root, entry, files } = collect(target)
  const works = readLibrary()
  // 重复登记：更新，不新增（改了一版再登记很常见）。登记的是目录（卡片任务）时同一个目录算同一份作品
  const isDir = statSync(resolve(target)).isDirectory()
  const old = works.find((w) => w.root === root && (w.entry === entry || (isDir && w.files.length > 1)))
  const work = {
    id: old?.id || randomUUID().slice(0, 8),
    skill, title: title || old?.title || basename(root), theme, column, note,
    root, entry, files, kind: kindOf(entry),
    createdAt: old?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  writeLibrary([work, ...works.filter((w) => w !== old)])
  return work
}

export function removeWork(id) {
  const works = readLibrary()
  const next = works.filter((w) => w.id !== id)
  if (next.length === works.length) return false
  writeLibrary(next)
  return true
}

// 展示用：标出文件是否还在（用户可能删了或挪了任务目录）
export const listWorks = () => readLibrary().map((w) => ({ ...w, missing: !existsSync(join(w.root, w.entry)) }))
