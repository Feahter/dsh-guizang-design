// 页面里的「skill」和「内容生产工作流」。工作流是跨 skill 的常用组合：点一下就在新对话里填好草稿，用户补上内容再发。
// 草稿以 /skill 名开头（DSH 把它当成用户显式调用这个 skill），后续步骤用到的 skill 由模型自己加载。

export const SKILLS = [
  {
    name: 'guizang-ppt-skill', title: '网页 PPT', family: '杂志风 / 瑞士风',
    blurb: '横向翻页的单文件 PPT：WebGL 背景、演讲者视图、讲稿备注、数据大字报。',
    starter: '/guizang-ppt-skill 帮我做一份 PPT。\n\n主题：\n受众：\n时长：\n素材：',
  },
  {
    name: 'guizang-social-card-skill', title: '图文卡片', family: '杂志风 / 瑞士风',
    blurb: '小红书 3:4 组图、公众号 21:9 头图和 1:1 分享卡，一条命令出 PNG。',
    starter: '/guizang-social-card-skill 帮我做一组小红书卡片。\n\n内容：',
  },
  {
    name: 'guizang-page-skill', title: '网页排版', family: '杂志风 / 瑞士风',
    blurb: '把文章、笔记排成精排单页网页，可导出 PDF 和长图。',
    starter: '/guizang-page-skill 把下面这篇文章排成网页。\n\n',
  },
  {
    name: 'humanizer-zh', title: '去 AI 味', family: '中文润色',
    blurb: '删掉空话、重复和模板化表达，保留事实和作者自己的语气。',
    starter: '/humanizer-zh 帮我把下面这段文字去掉 AI 味：\n\n',
  },
]

export const RECIPES = [
  {
    id: 'one-article-three-outputs', title: '一篇文章，三种出口',
    summary: '同一篇文章排成网页，再做小红书组图和公众号封面，三者用同一套主题。',
    steps: ['guizang-page-skill', 'guizang-social-card-skill'],
    prompt: '/guizang-page-skill 把下面这篇文章排成网页。排好以后，再用 guizang-social-card-skill 做一组小红书卡片和公众号封面（21:9 头图 + 1:1 分享卡），主题和网页保持一致。\n\n文章：\n',
  },
  {
    id: 'humanize-then-typeset', title: '先去 AI 味，再排版',
    summary: '先把文字改自然，确认改动后再排成网页。',
    steps: ['humanizer-zh', 'guizang-page-skill'],
    prompt: '/humanizer-zh 先把下面的文字去掉 AI 味，改完列出主要改动给我确认；我确认后再用 guizang-page-skill 排成网页。\n\n',
  },
  {
    id: 'talk-to-article', title: '演讲回收',
    summary: '讲完的 PPT 不浪费：按讲稿备注和每页内容整理成文章，排成网页。',
    steps: ['guizang-page-skill', 'humanizer-zh'],
    prompt: '/guizang-page-skill 把这份 PPT 整理成一篇文章并排成网页：先读 deck 里每页的内容和演讲备注，按讲的顺序写成文章，保留口语里说得好的句子；写完用 humanizer-zh 的标准过一遍，再排版。\n\nPPT 文件：\n',
  },
  {
    id: 'brand-kit', title: '品牌套件',
    summary: '用品牌色生成一套受约束的主题，PPT 和卡片封面统一用它。',
    steps: ['guizang-ppt-skill', 'guizang-social-card-skill'],
    prompt: '/guizang-ppt-skill 用我们的品牌色做一份发布会 PPT（品牌色按 skill 里的品牌主题流程生成，不直接用原色），然后用同一个品牌主题做公众号封面和 3 张小红书卡片。\n\n品牌色：#\n发布内容：\n',
  },
  {
    id: 'cover-matrix', title: '封面矩阵',
    summary: '一次做齐公众号 21:9 头图、1:1 分享卡和小红书 3:4 首图，同主题同关键词。',
    steps: ['guizang-social-card-skill'],
    prompt: '/guizang-social-card-skill 给这篇内容做一套封面矩阵：公众号 21:9 头图、1:1 分享卡、小红书 3:4 首图，同一套主题、同一组关键词，配对预览也出一张。\n\n内容：\n',
  },
  {
    id: 'bilingual', title: '中英双版本',
    summary: '一篇文章出中文和英文两版网页，英文按英文读者的习惯重写，不逐字直译。',
    steps: ['guizang-page-skill'],
    prompt: '/guizang-page-skill 把下面的文章做成中英两个版本的网页：英文版按英文读者的习惯重写（不逐字直译，专有名词保持一致），两版用同一套主题，各渲染一份。\n\n文章：\n',
  },
]

export const VOICE = {
  learn: '/guizang-voice 从下面这些我写过的文章里学习我的语气，建一份语料档案。建完把档案给我过目。\n\n文章（文件路径、链接或直接贴）：\n',
  refresh: '/guizang-voice 我又写了几篇新文章，用它们更新我的语料档案：新特征补进去，和原来矛盾的地方列出来问我。\n\n新文章：\n',
}

// 专栏的「做新一期」：沿用最近一期的 skill、主题和版式
export function nextIssue(column, latest) {
  return `/${latest.skill || 'guizang-social-card-skill'} 这是专栏「${column}」的新一期。参考最近一期「${latest.title}」（${latest.root}/${latest.entry}）的主题和版式，保持一致；登记作品时加 --column "${column}"。\n\n本期内容：\n`
}

// 作品卡片上的「做同风格的下一份」
export function nextOfWork(work) {
  const skill = work.skill || 'guizang-page-skill'
  const theme = work.theme ? `，主题用 ${work.theme}` : ''
  return `/${skill} 参考作品库里的「${work.title}」（${work.root}/${work.entry}）的风格和版式${theme}，做一份新的。先看一下这份作品，再开始。\n\n新内容：\n`
}
