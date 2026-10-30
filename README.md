# 歸藏工作室 · dsh-guizang-design

DeepSeek Harness（dsh）插件。把歸藏的四个 skill 装进 dsh，并在侧栏加一个「工作室」：

- **网页 PPT**（guizang-ppt-skill）、**图文卡片**（guizang-social-card-skill）、**网页排版**（guizang-page-skill）、**去 AI 味**（humanizer-zh）。前三个共用一套设计系统：同样的杂志风 / 瑞士风主题、字号、字体和背景特效，品牌色按色彩科学生成受约束的主题。
- **展示库**：官方示例和你做过的作品。每份作品都可以「做同风格的下一份」：在新对话里填好草稿，补上内容就能发。
- **配方**：跨 skill 的常用组合——一篇文章三种出口、先去 AI 味再排版、演讲回收、品牌套件、封面矩阵、中英双版本。
- **专栏**：连载的各期放在一起，一键做新一期，沿用上一期的主题和版式。
- **我的语气**（guizang-voice）：从你写过的文章和对话里的修改意见学习你的写作习惯，存成本机的一份档案；各个 skill 写文案前都会先读它。

![工作室](screenshots/1-studio.jpg)

## 安装

需要 dsh 0.2.1 以上和 pnpm。

```bash
dsh plugin --profile web add github:op7418/dsh-guizang-design
# dsh web 正在运行的话，重启后刷新页面
```

图文卡片出图用 Playwright 的 Chromium。第一次出图如果提示缺少浏览器，运行 `npx playwright install chromium`。网页导出 PDF / 长图用本机的 Chrome。

## 使用

- 侧栏点「工作室」打开展示库；点「开始」「用这个配方」「做同风格的下一份」会开一个新对话并填好草稿。
- 也可以在输入框里直接打 `/guizang-ppt-skill`、`/guizang-social-card-skill`、`/guizang-page-skill`、`/humanizer-zh`、`/guizang-voice`。
- skill 交付作品后会自己登记进作品库；手动登记：

  ```bash
  node <插件目录>/scripts/library.mjs add <HTML 文件或卡片任务目录> --skill guizang-ppt-skill --title "标题" [--column "专栏名"]
  ```

你在 `~/.dsh/skills` 或项目里装了同名 skill 时，那一份优先，插件自带的这份让位。

## 数据放在哪

作品库、缩略图和语料档案都在 `$DSH_HOME/guizang-design/`（默认 `~/.dsh/guizang-design/`），只在本机。作品库只记路径，不复制作品文件；移出作品库也不会删除文件。

## 开发

- `skills/` 是四个独立仓库的快照（`skills/manifest.json` 记着来源和提交），不要直接改：改各自的仓库，再运行 `node tools/vendor-skills.mjs`。
- `examples/` 由 `node tools/vendor-examples.mjs <guizang-design 路径>` 从设计系统仓库的 demo 生成。
- `gallery/gz-magazine.css` 由设计系统生成（`guizang-design/scripts/sync-skill.mjs studio <本仓库>`）。
- `npm test` 跑插件自己的测试；本地调试：`dsh plugin --profile web add link:$PWD`。

## License

AGPL-3.0。打包的 skill 各自带着自己的 LICENSE（humanizer-zh 是 MIT）。
