// 页面里的「skill」和「内容生产工作流」。工作流是跨 skill 的常用组合：点一下就在新对话里填好草稿，用户补上内容再发。
// 草稿以 /skill 名开头（DSH 把它当成用户显式调用这个 skill），后续步骤用到的 skill 由模型自己加载。
// 文案有中英两份：条目本身是中文，en 字段是英文。客户端语言是英文时页面和草稿都用英文（pick / skillsFor / recipesFor）。

export const SKILLS = [
  {
    name: 'guizang-ppt-skill', title: '网页 PPT', family: '杂志风 / 瑞士风',
    short: '横向翻页的单文件 PPT',
    blurb: '横向翻页的单文件 PPT：WebGL 背景、演讲者视图、讲稿备注、数据大字报。',
    starter: '/guizang-ppt-skill 帮我做一份 PPT。\n\n主题：\n受众：\n时长：\n素材：',
    en: {
      title: 'Web deck', family: 'Magazine / Swiss',
      short: 'Single-file, side-scrolling decks',
      blurb: 'Single-file decks that page sideways: WebGL backgrounds, presenter view, speaker notes, big-number slides.',
      starter: '/guizang-ppt-skill Make me a deck.\n\nTopic:\nAudience:\nLength:\nMaterial:',
    },
  },
  {
    name: 'guizang-social-card-skill', title: '图文卡片', family: '杂志风 / 瑞士风',
    short: '小红书组图、公众号封面',
    blurb: '小红书 3:4 组图、公众号 21:9 头图和 1:1 分享卡，一条命令出 PNG。',
    starter: '/guizang-social-card-skill 帮我做一组小红书卡片。\n\n内容：',
    en: {
      title: 'Social cards', family: 'Magazine / Swiss',
      short: 'Card sets and article covers',
      blurb: '3:4 card sets, 21:9 article headers and 1:1 share cards, exported to PNG with one command.',
      starter: '/guizang-social-card-skill Make me a set of 3:4 social cards.\n\nContent:',
    },
  },
  {
    name: 'guizang-page-skill', title: '网页排版', family: '杂志风 / 瑞士风',
    short: '文章排成精排网页',
    blurb: '把文章、笔记排成精排单页网页，可导出 PDF 和长图。',
    starter: '/guizang-page-skill 把下面这篇文章排成网页。\n\n',
    en: {
      title: 'Page layout', family: 'Magazine / Swiss',
      short: 'Articles as finely set web pages',
      blurb: 'Turns articles and notes into a finely set single web page, ready to export as PDF or a long image.',
      starter: '/guizang-page-skill Lay out the article below as a web page.\n\n',
    },
  },
  {
    name: 'humanizer-zh', title: '去 AI 味', family: '中文润色',
    short: '删掉套话，留下你的语气',
    blurb: '删掉空话、重复和模板化表达，保留事实和作者自己的语气。',
    starter: '/humanizer-zh 帮我把下面这段文字去掉 AI 味：\n\n',
    en: {
      title: 'De-AI editing', family: 'Chinese editing',
      short: 'Cuts the filler, keeps your voice',
      blurb: 'Cuts filler, repetition and template phrasing from Chinese text. Keeps the facts and the author\'s own voice.',
      starter: '/humanizer-zh Remove the AI tone from the text below:\n\n',
    },
  },
]

export const RECIPES = [
  {
    id: 'one-article-three-outputs', title: '一篇文章，三种出口',
    summary: '同一篇文章排成网页，再做小红书组图和公众号封面，三者用同一套主题。',
    steps: ['guizang-page-skill', 'guizang-social-card-skill'],
    prompt: '/guizang-page-skill 把下面这篇文章排成网页。排好以后，再用 guizang-social-card-skill 做一组小红书卡片和公众号封面（21:9 头图 + 1:1 分享卡），主题和网页保持一致。\n\n文章：\n',
    en: {
      title: 'One article, three outputs',
      summary: 'Lay out one article as a web page, then make a card set and article covers in the same theme.',
      prompt: '/guizang-page-skill Lay out the article below as a web page. When that is done, use guizang-social-card-skill to make a set of 3:4 social cards and article covers (a 21:9 header and a 1:1 share card) in the same theme as the page.\n\nArticle:\n',
    },
  },
  {
    id: 'humanize-then-typeset', title: '先去 AI 味，再排版',
    summary: '先把文字改自然，确认改动后再排成网页。',
    steps: ['humanizer-zh', 'guizang-page-skill'],
    prompt: '/humanizer-zh 先把下面的文字去掉 AI 味，改完列出主要改动给我确认；我确认后再用 guizang-page-skill 排成网页。\n\n',
    en: {
      title: 'De-AI first, then lay out',
      summary: 'Make the writing sound natural first. Once you approve the edits, lay it out as a web page.',
      prompt: '/humanizer-zh First remove the AI tone from the text below, then list the main edits for me to approve. After I approve, use guizang-page-skill to lay it out as a web page.\n\n',
    },
  },
  {
    id: 'talk-to-article', title: '演讲回收',
    summary: '讲完的 PPT 不浪费：按讲稿备注和每页内容整理成文章，排成网页。',
    steps: ['guizang-page-skill', 'humanizer-zh'],
    prompt: '/guizang-page-skill 把这份 PPT 整理成一篇文章并排成网页：先读 deck 里每页的内容和演讲备注，按讲的顺序写成文章，保留口语里说得好的句子；写完用 humanizer-zh 的标准过一遍，再排版。\n\nPPT 文件：\n',
    en: {
      title: 'Talk to article',
      summary: 'Get more from a finished talk: turn the slides and speaker notes into an article and lay it out as a web page.',
      prompt: '/guizang-page-skill Turn this deck into an article and lay it out as a web page. First read every slide and its speaker notes, then write the article in the order of the talk, keeping the lines that worked well when spoken. Check it against the humanizer-zh standard, then lay it out.\n\nDeck file:\n',
    },
  },
  {
    id: 'brand-kit', title: '品牌套件',
    summary: '用品牌色生成一套受约束的主题，PPT 和卡片封面统一用它。',
    steps: ['guizang-ppt-skill', 'guizang-social-card-skill'],
    prompt: '/guizang-ppt-skill 用我们的品牌色做一份发布会 PPT（品牌色按 skill 里的品牌主题流程生成，不直接用原色），然后用同一个品牌主题做公众号封面和 3 张小红书卡片。\n\n品牌色：#\n发布内容：\n',
    en: {
      title: 'Brand kit',
      summary: 'Generate a constrained theme from your brand color and use it across a deck and card covers.',
      prompt: '/guizang-ppt-skill Make a launch deck in our brand color (generate it with the skill\'s brand theme flow instead of using the raw color), then use the same brand theme for article covers and 3 social cards.\n\nBrand color: #\nWhat we are launching:\n',
    },
  },
  {
    id: 'cover-matrix', title: '封面矩阵',
    summary: '一次做齐公众号 21:9 头图、1:1 分享卡和小红书 3:4 首图，同主题同关键词。',
    steps: ['guizang-social-card-skill'],
    prompt: '/guizang-social-card-skill 给这篇内容做一套封面矩阵：公众号 21:9 头图、1:1 分享卡、小红书 3:4 首图，同一套主题、同一组关键词，配对预览也出一张。\n\n内容：\n',
    en: {
      title: 'Cover matrix',
      summary: 'A 21:9 header, a 1:1 share card and a 3:4 cover in one pass, with the same theme and keywords.',
      prompt: '/guizang-social-card-skill Make a cover matrix for this content: a 21:9 header, a 1:1 share card and a 3:4 cover, all with the same theme and keywords, plus a paired preview.\n\nContent:\n',
    },
  },
  {
    id: 'bilingual', title: '中英双版本',
    summary: '一篇文章出中文和英文两版网页，英文按英文读者的习惯重写，不逐字直译。',
    steps: ['guizang-page-skill'],
    prompt: '/guizang-page-skill 把下面的文章做成中英两个版本的网页：英文版按英文读者的习惯重写（不逐字直译，专有名词保持一致），两版用同一套主题，各渲染一份。\n\n文章：\n',
    en: {
      title: 'Bilingual edition',
      summary: 'One article as Chinese and English web pages, with the second language rewritten for its readers.',
      prompt: '/guizang-page-skill Make Chinese and English web pages from the article below. Rewrite the second language for its readers instead of translating word for word, keep proper nouns consistent, and render both in the same theme.\n\nArticle:\n',
    },
  },
]

// 一个条目的某种语言：英文覆盖中文，en 字段不外传
export const pick = ({ en, ...item }, lang) => (lang === 'en' && en ? { ...item, ...en } : item)
export const skillsFor = (lang) => SKILLS.map((s) => pick(s, lang))
export const recipesFor = (lang) => RECIPES.map((r) => pick(r, lang))

const VOICES = {
  zh: {
    // 从 DSH 聊天记录学：素材由 /api/voice/collect 先整理好
    history: (r) => `/guizang-voice 从我在 DeepSeek 里的聊天记录学习我的语气。素材已经整理好：${r.path}（${r.sessions} 个会话里的 ${r.messages} 条消息，约 ${r.chars} 字，长消息优先）。按 skill 的步骤建档；已经有档案就更新，新发现和原来矛盾的地方列出来问我。建完把档案给我过目。`,
    articles: '/guizang-voice 用下面这些我写过的文章补充我的语气档案：新特征补进去，和原来矛盾的地方列出来问我。\n\n文章（文件路径、链接或直接贴）：\n',
  },
  en: {
    history: (r) => `/guizang-voice Learn my voice from my DeepSeek chat history. The material is ready at ${r.path} (${r.messages} messages from ${r.sessions} sessions, about ${r.chars} characters, longest first). Build the profile by following the skill's steps. If a profile already exists, update it and ask me about anything that contradicts it. Show me the profile when you are done. Write the profile in English.`,
    articles: '/guizang-voice Use the articles below, which I wrote, to extend my voice profile. Add new traits and ask me about anything that contradicts the profile.\n\nArticles (file paths, links, or pasted text):\n',
  },
}
export const VOICE = VOICES.zh
export const voiceFor = (lang) => VOICES[lang] || VOICES.zh

// 专栏的「做新一期」：沿用最近一期的 skill、主题和版式
export function nextIssue(column, latest, lang = 'zh') {
  const skill = latest.skill || 'guizang-social-card-skill'
  if (lang === 'en') return `/${skill} This is a new issue of the series "${column}". Follow the theme and layout of the latest issue, "${latest.title}" (${latest.root}/${latest.entry}). When registering the work, set column to "${column}".\n\nContent for this issue:\n`
  return `/${skill} 这是专栏「${column}」的新一期。参考最近一期「${latest.title}」（${latest.root}/${latest.entry}）的主题和版式，保持一致；登记作品时 column 填「${column}」。\n\n本期内容：\n`
}

// 作品卡片上的「做同风格的下一份」
export function nextOfWork(work, lang = 'zh') {
  const skill = work.skill || 'guizang-page-skill'
  if (lang === 'en') {
    const theme = work.theme ? `, using the theme ${work.theme}` : ''
    return `/${skill} Make a new one in the style and layout of "${work.title}" from the works library (${work.root}/${work.entry})${theme}. Look at that work before you start.\n\nNew content:\n`
  }
  const theme = work.theme ? `，主题用 ${work.theme}` : ''
  return `/${skill} 参考作品库里的「${work.title}」（${work.root}/${work.entry}）的风格和版式${theme}，做一份新的。先看一下这份作品，再开始。\n\n新内容：\n`
}
