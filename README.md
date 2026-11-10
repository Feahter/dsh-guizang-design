# 歸藏设计 · dsh-guizang-design

中文 | [English](README.en.md)

[DeepSeek Harness](https://www.npmjs.com/package/@deepseek-ai/dsh)（dsh）插件。把歸藏的内容生产 skill 装进 dsh：网页 PPT、图文卡片、网页排版、去 AI 味，外加一个学你写作语气的语气档案。前三个共用同一套设计系统，同一篇内容做成 PPT、卡片和网页，主题、字体和版式是一家人。

侧栏多一个「歸藏设计」页面：从这里开始创作，回看做过的作品，一键「做同款」，或者用现成的内容生产工作流。

![歸藏设计插件页面](screenshots/1-studio.jpg)

**语言跟随客户端**：DSH 设置里切到 English，页面、工作流草稿和官方示例都换成英文，不用重新加载。

## 装上以后有什么

### 五个 skill

| skill | 命令 | 做什么 | 产出 |
|---|---|---|---|
| 网页 PPT | `/guizang-ppt-skill` | 横向翻页的演示稿，杂志风或瑞士风；WebGL 背景、演讲者视图、讲稿备注、数据大字报 | 单个 HTML 文件 |
| 图文卡片 | `/guizang-social-card-skill` | 小红书 3:4 组图、公众号 21:9 头图和 1:1 分享卡，一条命令出图并核对尺寸 | PNG |
| 网页排版 | `/guizang-page-skill` | 把文章、笔记排成精排单页网页，忠实模式或解释模式；可导出 PDF 和长图 | HTML / PDF / 长图 |
| 去 AI 味 | `/humanizer-zh` | 删掉中文里的空话、重复和模板化表达，保留事实、确定程度和作者自己的语气 | 改好的文字 |
| 语气档案 | `/guizang-voice` | 从你在 DeepSeek 里发过的消息和你写过的文章学出你的写作习惯，存成本机的一份档案 | 一份 Markdown 档案 |

在输入框里打 `/` 就能看到它们。不用记命令也行：直接说「帮我把这篇文章排成网页」，模型会自己选 skill。

### 一套设计系统

PPT、卡片、网页三个 skill 用同一套 token：

- **杂志风** 6 套主题：墨水经典、靛蓝瓷、森林墨、牛皮纸、沙丘，以及深色的午夜墨（午夜墨用于卡片和网页）。
- **瑞士风** 4 套主题：克莱因蓝、柠檬黄、柠檬绿、安全橙。
- **品牌色**：给一个品牌色或 logo 主色，按色彩科学（OKLCH）收进风格允许的明度和彩度范围，生成一套受约束的品牌主题；文字、线条和强调色小字都按对比度规则（WCAG + APCA）算好，不会直接用原色。
- **字体**：中英文字体按固定版本加载；卡片出图和网页 `--embed` 时按实际用字子集化内置，离线也能正确显示。

### 插件页面

| 页面 | 内容 |
|---|---|
| 概览 | 作品、专栏、工作流、语气档案的数量；四个 skill 的入口；最近作品；工作流；官方示例 |
| 我的作品 | 做过的作品，带缩略图；按 skill 筛选、搜索；连载的作品按专栏归在一起，可以直接「做新一期」 |
| 内容生产工作流 | 跨 skill 的常用组合，见下表 |
| 语气档案 | 档案内容和状态；「从我的 DeepSeek 对话学习」「用我写过的文章补充」 |
| 官方示例 | 各 skill 的样张，可以打开看，也可以「做同款」 |

点作品卡片打开作品；「做同款」会开一个新对话，按这份作品的主题和版式填好草稿，你补上新内容就能发。作品交付时 skill 会自己把它登记到作品库。

![我的作品](screenshots/2-works.jpg)

### 内容生产工作流

| 工作流 | 步骤 | 用途 |
|---|---|---|
| 一篇文章，三种出口 | 网页 → 卡片 | 同一篇文章排成网页，再做小红书组图和公众号封面，三者同一套主题 |
| 先去 AI 味，再排版 | 去 AI 味 → 网页 | 先把文字改自然，确认改动后再排版 |
| 演讲回收 | 网页 → 去 AI 味 | 讲完的 PPT 按每页内容和讲稿备注整理成文章，排成网页 |
| 品牌套件 | PPT → 卡片 | 用品牌色生成受约束的主题，PPT 和卡片封面统一用它 |
| 封面矩阵 | 卡片 | 一次做齐公众号 21:9 头图、1:1 分享卡和小红书 3:4 首图 |
| 中英双版本 | 网页 | 一篇文章出中文和英文两版网页，英文按英文读者的习惯重写 |

点「使用工作流」会开一个新对话并填好草稿；后面几步用到的 skill，模型会接着调用。

![点击后新对话里的草稿](screenshots/3-draft.jpg)

### 语气档案

语气档案记的是你自己的写作习惯：常用的词和从来不用的词、句子长短、开头和结尾的方式、标点和称呼。它从两处学：

1. **你在 DeepSeek 里发过的消息**：插件页面点「从我的 DeepSeek 对话学习」，插件读取本机 dsh 的会话记录，只取你亲手发的消息（不含 skill 注入和系统消息），长段文字优先，整理成学习素材，再开一个新对话让模型建档。
2. **你写过的文章**：点「用我写过的文章补充」，把文件、链接或正文交给模型。

每条特征都要在样本里找到至少两处证据，建完给你过目，哪条不对就改哪条。之后你在对话里纠正措辞（「别用这个词」「我一般这么说」），它会记下来。

档案用在两件事上：去 AI 味时保留你本来的说法，只删真正的套话；替你写文案、讲稿、卡片标题时，照着你的语气写。

## 安装

需要 dsh `0.2.1-rc.2` 及以上、`0.3.0` 以下。

### 用插件索引一键安装（推荐）

索引里写好了包名、版本和兼容范围，加一次地址就能从列表里直接装。先在「插件」页打开实验性的索引功能：

- DSH `0.2.2` 及以上：在「实验性插件」下启用「自定义插件索引」。
- DSH `0.2.1` 系列：它叫「自定义插件市场」，在「实验性插件」旁的「更多」里。

打开后页面会多出「已安装」和「发现」两个标签。切到「发现」，添加这条索引地址：

```
https://raw.githubusercontent.com/op7418/dsh-guizang-design/main/index.json
```

GitHub 直连不通时换成这个 CDN 镜像，代价是它最多可能比最新发布晚 12 小时：

```
https://cdn.jsdelivr.net/gh/op7418/dsh-guizang-design@main/index.json
```

列表里点「歸藏设计」的安装，装完点「立即启用」。索引里列的就是 npm 上的 `dsh-guizang-design`，和下面手填包名装到的是同一个包。

### 在插件页面安装（桌面版和网页版都适用）

1. 侧栏打开「插件」，点「添加插件」。
2. 包名填 `dsh-guizang-design`，点安装。
3. 装完点「立即启用」。直接关掉对话框的话，插件是装上了但没打开，要回到插件列表里把它的开关打开。

侧栏会出现「歸藏设计」。

升级：在插件页面把它卸载，再按上面的步骤装一次（插件页面对第三方插件的升级方式就是这样）。卸载：在插件页面打开它，点「卸载」。

### 用命令行安装（网页版）

自己运行 `dsh web` 的话，也可以用命令行，需要 Node.js `22.19` 及以上和 pnpm：

```bash
dsh plugin --profile web add dsh-guizang-design
```

装完重启 dsh web 再刷新页面。`dsh plugin` 会把后面的参数原样交给 pnpm，所以 pnpm 的写法都能用：

```bash
dsh plugin --profile web add github:op7418/dsh-guizang-design   # 从 GitHub 装，跟着 main 的最新提交
dsh plugin --profile web add dsh-guizang-design@0.1.0           # 指定版本
dsh plugin --profile web update dsh-guizang-design --latest     # 升级
dsh plugin --profile web remove dsh-guizang-design              # 卸载
```

用的不是 `web` 这个 profile 时，把 `--profile web` 换成你自己的。**桌面版不能用命令行**：桌面版用的 `desktop` profile 只能由 App 管理，`dsh plugin --profile desktop` 会直接报错，请走插件页面。

### 按需准备

- **卡片出图**用 Playwright 的 Chromium。第一次出图如果提示缺少浏览器，运行 `npx playwright install chromium`。
- **网页导出 PDF / 长图**用本机的 Chrome（或用 `CHROME_PATH` 指定）。

## 使用

- 侧栏点「歸藏设计」打开插件页面；点 skill 卡片、「使用工作流」「做同款」「做新一期」都会开一个新对话并填好草稿。
- 在输入框里直接用命令，比如 `/guizang-page-skill 把这篇文章排成网页`。
- 作品交付时会自动登记进作品库。以前做的作品，在对话里说「把 <文件路径> 登记进歸藏设计的作品库」就行。

### 插件给模型的两个工具

作品库和语气档案放在工作区外（见下面的「数据和隐私」），模型在沙箱里跑的命令写不进去，所以插件注册了两个工具，由 dsh 主进程执行：

| 工具 | 做什么 |
|---|---|
| `guizang_library_add` | 把交付的作品登记进作品库：PPT 和网页给 HTML 文件，卡片给任务目录（会收 `output/` 里的图）；同一个文件重复登记只会更新 |
| `guizang_voice` | 读写语气档案：读、追加一条对话里学到的、整份保存、整理聊天记录素材 |

它们只读写 `guizang-design/` 这一个目录。

在终端里也可以手动处理：

```bash
node <插件目录>/scripts/library.mjs add <HTML 文件或卡片任务目录> --skill guizang-ppt-skill --title "标题" [--column "专栏名"]
node <插件目录>/scripts/library.mjs list
node <插件目录>/scripts/library.mjs remove <id>
node <插件目录>/scripts/voice.mjs show
```

## 数据和隐私

所有数据都在本机的 `$DSH_HOME/guizang-design/`（默认 `~/.dsh/guizang-design/`）：

| 文件 | 内容 |
|---|---|
| `library.json` | 作品库：只记作品的路径和标题等信息，不复制作品文件 |
| `thumbs/` | 网页作品的缩略图 |
| `voice.md` | 语气档案 |
| `voice-corpus.md` | 从会话记录整理出来的学习素材（你发过的消息） |

插件不会把这些内容发到任何地方。「从我的 DeepSeek 对话学习」整理出的素材，会在你点了以后交给你当前选用的模型去分析，和你平时在对话里发消息一样。不想保留时直接删除对应文件；移出作品库不会删除作品文件本身。

## 和独立 skill 仓库的关系

四个 skill 都有自己的独立仓库，在 Claude Code、Codex 等其他 agent 里也能单独用：

- [guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill)
- [guizang-social-card-skill](https://github.com/op7418/guizang-social-card-skill)
- [guizang-pages-skill](https://github.com/op7418/guizang-pages-skill)
- [Humanizer-zh](https://github.com/op7418/Humanizer-zh)

插件里的 `skills/` 是这些仓库在固定提交上的快照，版本记在 [`skills/manifest.json`](skills/manifest.json)，插件页面左下角也会显示。加载时插件会做两处调整：去掉只适用于 git clone 安装的步骤（PPT skill 开头的「检查更新」，插件里的 skill 随插件版本更新）；在末尾补几条插件环境下的说明（依赖已装好、交付后登记作品、写文案前读语气档案）。

你在 `~/.dsh/skills` 或项目的 `.dsh/skills` 里装了同名 skill 时，那一份优先，插件自带的这份让位。

## 常见问题

**插件页面里的作品是空的？**
作品要在装了插件之后做出来才会自动登记。之前做过的，在对话里说「把 <文件路径> 登记进歸藏设计的作品库」。

**语气档案提示「还没找到成段的消息」？**
插件只取 30 字以上、你亲手发的消息。对话少的时候先用「用我写过的文章补充」。

**卡片出图报错找不到浏览器？**
运行 `npx playwright install chromium` 后重试。

**字体在国内网络加载慢？**
卡片出图默认内置字体；网页渲染时加 `--embed` 也会内置，生成的页面离线可看。

## 开发

```bash
git clone https://github.com/op7418/dsh-guizang-design.git
cd dsh-guizang-design
npm install
npm test
npm run index                  # 发布后更新 index.json 的版本和发布时间
dsh plugin --profile web add link:$PWD   # 本地调试
```

`index.json` 是插件市场索引：`npm run index` 按 npm 上的最新发布刷新里面的版本号和发布时间，所以每次发版后跑一次，索引里才是新版本。

| 目录 | 说明 |
|---|---|
| `lib/` | 插件本体：`index.js`（Host 半边：skill 提供方、工具、页面和接口）、`tools.js`（给模型的两个工具）、`client.js`（浏览器半边：侧栏入口、开新对话） |
| `gallery/` | 插件页面。`gz-swiss.css` 由设计系统生成，不要手改 |
| `skills/` | 独立仓库的快照，用 `node tools/vendor-skills.mjs` 更新，不要直接改 |
| `own-skills/` | 插件自己的 skill（语气档案） |
| `examples/` | 官方示例，用 `node tools/vendor-examples.mjs` 生成 |
| `scripts/` | `library.mjs`（作品库）、`voice.mjs`（语气档案）的命令行版本，手动处理用；`build-index.mjs` 生成插件市场索引 |

## License

[AGPL-3.0](LICENSE)。打包的 skill 各自保留自己的 LICENSE（humanizer-zh 是 MIT）。
