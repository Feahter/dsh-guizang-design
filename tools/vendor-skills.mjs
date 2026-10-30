#!/usr/bin/env node
// 把四个独立 skill 仓库按指定提交复制进插件的 skills/<name>/，并写 skills/manifest.json 记下来源。
// 独立仓库是主入口；插件只带它们的一份快照，改 skill 去改各自的仓库，再运行这个脚本。
//
//   node tools/vendor-skills.mjs                      从 GitHub 取各仓库 main 的最新提交
//   node tools/vendor-skills.mjs --local ppt=~/code/guizang-ppt-skill   某个 skill 用本地仓库（取它当前的 HEAD）
//
// 只复制 git 跟踪的文件，去掉 README、开发文档、测试和 node_modules 这类运行时用不到的东西；各自的 LICENSE 保留。
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT = join(ROOT, 'skills')
const CACHE = join(ROOT, '.vendor-cache')

export const SOURCES = [
  { key: 'ppt', name: 'guizang-ppt-skill', repo: 'https://github.com/op7418/guizang-ppt-skill.git' },
  { key: 'card', name: 'guizang-social-card-skill', repo: 'https://github.com/op7418/guizang-social-card-skill.git' },
  { key: 'page', name: 'guizang-page-skill', repo: 'https://github.com/op7418/guizang-pages-skill.git' },
  { key: 'humanizer', name: 'humanizer-zh', repo: 'https://github.com/op7418/Humanizer-zh.git' },
]

// 运行时用不到的文件：说明文档、开发记录、测试、给其他 agent 的配置、锁文件
const SKIP = [
  /^README[^/]*$/i, /^CONTRIBUTING/i, /^SPONSORS/i, /^HANDOFF/i, /^PRODUCT/i, /^AGENTS?\.md$/i, /^CHANGELOG/i,
  /^docs?\//, /^local-tests\//, /^tests?\//, /^agents\//, /^\.github\//, /^\.gitignore$/,
  /^package(-lock)?\.json$/, /(^|\/)\.DS_Store$/,
  /^assets\/ppt-skill-showcase\.png$/,   // README 用的宣传图，skill 不引用
]

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
const expand = (p) => resolve(p.replace(/^~(?=\/|$)/, homedir()))

const args = process.argv.slice(2)
const local = Object.fromEntries(args.flatMap((a, i) => (a === '--local' ? [args[i + 1].split('=')] : [])).map(([k, v]) => [k, expand(v)]))

mkdirSync(CACHE, { recursive: true })
const manifest = { $comment: 'tools/vendor-skills.mjs 生成：各 skill 的来源仓库和提交。不要手改 skills/ 下的文件，改各自的仓库后重新运行脚本。', skills: [] }
rmSync(OUT, { recursive: true, force: true })
for (const s of SOURCES) {
  let src = local[s.key]
  if (!src) {
    src = join(CACHE, s.name)
    if (existsSync(join(src, '.git'))) git(src, 'fetch', '-q', '--depth', '1', 'origin', 'main'), git(src, 'reset', '-q', '--hard', 'FETCH_HEAD')
    else execFileSync('git', ['clone', '-q', '--depth', '1', s.repo, src])
  }
  const commit = git(src, 'rev-parse', 'HEAD')
  const dirty = git(src, 'status', '--porcelain', '--untracked-files=no')
  if (dirty) console.warn(`! ${s.name}：本地仓库有未提交的修改，复制的是工作区内容，但 manifest 记的是 HEAD ${commit.slice(0, 7)}`)
  const files = git(src, 'ls-files').split('\n').filter((f) => f && !SKIP.some((re) => re.test(f)))
  const dest = join(OUT, s.name)
  for (const f of files) {
    mkdirSync(dirname(join(dest, f)), { recursive: true })
    cpSync(join(src, f), join(dest, f))
  }
  const head = readFileSync(join(dest, 'SKILL.md'), 'utf8').match(/^name:\s*(.+)$/m)
  if (!head || head[1].trim() !== s.name) throw new Error(`${s.name}：SKILL.md 的 name 是 ${head && head[1]}，和预期不符`)
  manifest.skills.push({ name: s.name, repo: s.repo.replace(/\.git$/, ''), commit, files: files.length })
  console.log(`${s.name}  ${commit.slice(0, 7)}  ${files.length} 个文件${local[s.key] ? '（本地）' : ''}`)
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
