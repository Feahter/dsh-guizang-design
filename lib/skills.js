// skill 提供方：把插件自带的 skills/<name>/SKILL.md 注册进 DSH 的 skill 目录（ctx.skills）。
// 用户自己在 ~/.dsh/skills 或项目里装了同名 skill 时，那一份优先（本提供方按「随包提供」的 rank 600 排在最后）。
// 加载正文时：<SKILL_ROOT> 换成 skill 的实际目录，并在末尾附上「在工作室里使用」的说明（依赖、作品登记）。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const RANK = 600
const INVOCATION = { modelInvocable: true, userInvocable: true }

function parse(file) {
  const text = readFileSync(file, 'utf8')
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!m) return null
  const field = (k) => (m[1].match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1]?.trim().replace(/^(["'])(.*)\1$/, '$2')
  const name = field('name'), description = field('description')
  return name && description ? { name, description, body: text.slice(m[0].length) } : null
}

export function readSkills(dirs) {
  return [].concat(dirs).flatMap(readDir)
}
function readDir(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'SKILL.md')))
    .map((d) => ({ dir: join(dir, d.name), file: join(dir, d.name, 'SKILL.md'), ...parse(join(dir, d.name, 'SKILL.md')) }))
    .filter((s) => s.name)
}

// 插件环境下对 skill 原文的补充：独立仓库的说明（在 skill 目录 npm install、自己找地方放产物）在这里换成插件的做法
function addendum(skill, root) {
  const lib = join(root, 'scripts', 'library.mjs')
  const voice = join(root, 'scripts', 'voice.mjs')
  if (skill.name === 'guizang-voice') return ''
  const lines = [
    '',
    '---',
    '',
    '## 在歸藏工作室（DSH 插件）里使用',
    '',
    `- 本 skill 的目录是 \`${skill.dir}\`，上文的 \`scripts/\`、\`assets/\`、\`references/\` 都相对这个目录。`,
    '- 依赖已随插件安装，跳过上文「在 skill 目录运行 npm install」这一步。',
  ]
  if (skill.name === 'guizang-social-card-skill') lines.push('- 第一次出图如果提示缺少浏览器，运行 `npx playwright install chromium`。')
  lines.push(`- 写要署用户名字的文字（文案、讲稿、标题、改稿）之前，先运行 \`node ${voice} show\`：有个人语料档案就按档案的语气写（guizang-voice skill 说明了怎么用）。用户在对话里纠正措辞时，用 \`node ${voice} note "…"\` 记下来。`)
  if (skill.name !== 'humanizer-zh') {
    lines.push(
      `- 交付以后把作品登记进工作室的作品库，用户就能在侧栏「工作室」里看到它，并一键做同风格的下一份：`,
      '',
      '  ```bash',
      `  node ${lib} add <交付的 HTML 文件或任务目录> --skill ${skill.name} --title "作品标题" [--theme 主题id] [--column "专栏名"]`,
      '  ```',
      '',
      '  卡片给任务目录（会收 output/ 里的图），PPT 和网页给 HTML 文件。同一个文件重复登记只会更新，不会重复。用户说这是某个连载 / 专栏的一期时加 `--column`，展示库会把同一专栏的各期放在一起。',
    )
  }
  if (skill.name === 'guizang-ppt-skill') lines.push('- PPT 交付时提醒用户一句：讲完以后，可以用工作室的「演讲回收」把这份 PPT 的内容和讲稿备注整理成一篇文章；用户需要时再做，不要主动开始。')
  return lines.join('\n') + '\n'
}

export function createSkillProvider(dir, pluginRoot) {
  const candidate = (s) => ({
    name: s.name, description: s.description, path: s.file,
    invocation: INVOCATION, source: 'bundled', provider: 'guizang-design', rank: RANK, locator: s.dir,
    resourceBase: { kind: 'directory', path: s.dir },
  })
  return {
    name: 'guizang-design',
    async list() {
      return readSkills(dir).map(candidate)
    },
    async get(c) {
      const s = readSkills(dir).find((x) => x.dir === c.locator && x.name === c.name)
      if (!s) return undefined
      const content = s.body.replaceAll('<SKILL_ROOT>', s.dir).replaceAll('<PLUGIN_ROOT>', pluginRoot) + addendum(s, pluginRoot)
      const { rank, locator, ...summary } = candidate(s)
      return { ...summary, content }
    },
  }
}
