# Guizang Design · dsh-guizang-design

[中文](README.md) | English

A [DeepSeek Harness](https://www.npmjs.com/package/@deepseek-ai/dsh) (dsh) plugin that installs Guizang's content skills — web slide decks, social cards, typeset web pages and Chinese de-AI editing — plus a writing-voice profile. The first three share one design system, so a deck, a card set and a web page made from the same content use the same themes, fonts and layout language.

It also adds a **歸藏设计** page to the sidebar: start a skill, browse what you have made, make another one in the same style, or run a multi-skill workflow.

![Plugin page](screenshots/1-studio.jpg)

## What you get

### Five skills

| Skill | Command | What it does | Output |
|---|---|---|---|
| Web slide deck | `/guizang-ppt-skill` | Horizontal-paging decks in a magazine or Swiss style; WebGL backgrounds, presenter view, speaker notes | One HTML file |
| Social cards | `/guizang-social-card-skill` | Xiaohongshu 3:4 sets, WeChat 21:9 headers and 1:1 share cards; one command renders and size-checks the PNGs | PNG |
| Web page typesetting | `/guizang-page-skill` | Turns an article or notes into a typeset single page (faithful or explain mode); exports PDF and long images | HTML / PDF / PNG |
| De-AI editing | `/humanizer-zh` | Removes filler, repetition and template phrasing from Chinese text while keeping facts, certainty and the author's voice | Edited text |
| Voice profile | `/guizang-voice` | Learns your writing habits from messages you sent in DeepSeek and from your own articles; stores them in a local profile | A Markdown profile |

Type `/` in the composer to see them, or just describe the task and the model picks the skill.

### One design system

- **Magazine** style: 6 themes (Ink Classic, Indigo Porcelain, Forest Ink, Kraft Paper, Dune, and the dark Midnight Ink for cards and pages).
- **Swiss** style: 4 themes (IKB, Lemon, Lemon Green, Safety Orange).
- **Brand colours** are not used raw: they are moved into the style's lightness and chroma range in OKLCH, and every text, rule and small accent-text colour is checked against WCAG and APCA contrast.
- **Fonts** load from pinned versions; card renders and `--embed` pages subset and embed only the glyphs the page uses, so they display correctly offline.

### The plugin page

| View | Contents |
|---|---|
| Overview | Counts of works, columns, workflows and the voice profile; skill entry points; recent works; workflows; official examples |
| My works | Everything you made, with thumbnails; filter by skill, search; serial works grouped by column with "new issue" |
| Workflows | Multi-skill combinations (below) |
| Voice profile | The profile and its status; learn from your DeepSeek chats, or add articles |
| Official examples | Sample output of each skill, to open or to use as a style reference |

Clicking a work opens it. **做同款** ("make one like this") opens a new conversation with a draft that references the work's theme and layout; add your content and send. Skills register their deliverables in the works library automatically.

### Workflows

| Workflow | Steps | Purpose |
|---|---|---|
| One article, three outputs | page → cards | Typeset the article, then make a Xiaohongshu set and WeChat covers in the same theme |
| De-AI first, then typeset | de-AI → page | Make the text read naturally, confirm the edits, then typeset |
| Talk to article | page → de-AI | Turn a delivered deck's slides and speaker notes into an article page |
| Brand kit | deck → cards | Generate a constrained brand theme and use it for the deck and the covers |
| Cover matrix | cards | WeChat 21:9 header, 1:1 share card and Xiaohongshu 3:4 cover in one theme |
| Bilingual | page | Chinese and English pages from one article; the English is rewritten for English readers |

### Voice profile

The profile records your own habits: words you use and never use, sentence length, how you open and close, punctuation and forms of address. It learns from:

1. **Messages you sent in DeepSeek**: "从我的 DeepSeek 对话学习" reads the local dsh session logs, keeps only messages you typed yourself (no skill injections or system messages), longest first, writes them to a study file, and opens a conversation where the model builds the profile.
2. **Articles you wrote**: hand files, links or text to the model.

Every trait needs at least two pieces of evidence from the samples, and you review the result. Corrections you make in later chats ("don't use this word") are noted. The profile is used to keep your own wording when de-AI-ing and to write in your voice when drafting for you.

## Install

Requires dsh `>=0.2.1-rc.2 <0.3.0`.

### From the Plugins page (desktop and web, recommended)

1. Open **Plugins** in the sidebar and click **Add plugin**.
2. Enter `dsh-guizang-design` as the package and install.
3. Click **Enable now** when it finishes. If you close the dialog instead, the plugin is installed but off; switch it on in the plugin list.

**歸藏设计** appears in the sidebar.

To upgrade, uninstall it on the Plugins page and install again (that is how the page upgrades third-party plugins). To uninstall, open it on the Plugins page and click **Uninstall**.

### From the command line (web)

If you run `dsh web` yourself you can also use the CLI, which needs Node.js `22.19+` and pnpm:

```bash
dsh plugin --profile web add dsh-guizang-design
```

Restart dsh web and refresh. `dsh plugin` passes its arguments to pnpm unchanged, so any pnpm form works:

```bash
dsh plugin --profile web add github:op7418/dsh-guizang-design   # from GitHub, tracks main
dsh plugin --profile web add dsh-guizang-design@0.1.0           # a specific version
dsh plugin --profile web update dsh-guizang-design --latest     # upgrade
dsh plugin --profile web remove dsh-guizang-design              # uninstall
```

Replace `--profile web` with your own profile if you use another one. **The desktop app cannot use the CLI**: its `desktop` profile is managed only by the app, and `dsh plugin --profile desktop` exits with an error. Use the Plugins page there.

### Optional

- Card rendering uses Playwright's Chromium. If the first render reports a missing browser, run `npx playwright install chromium`.
- Page PDF / long-image export uses your local Chrome (or `CHROME_PATH`).

## Usage

- Open **歸藏设计** in the sidebar; skill cards, "使用工作流", "做同款" and "做新一期" all open a new conversation with the draft filled in.
- Or use the commands directly, e.g. `/guizang-page-skill typeset this article`.
- Register a work manually when needed:

  ```bash
  node <plugin dir>/scripts/library.mjs add <HTML file or card task dir> --skill guizang-ppt-skill --title "Title" [--column "Column"]
  node <plugin dir>/scripts/library.mjs list
  node <plugin dir>/scripts/library.mjs remove <id>
  ```

## Data and privacy

Everything lives in `$DSH_HOME/guizang-design/` (default `~/.dsh/guizang-design/`):

| File | Contents |
|---|---|
| `library.json` | Works library: paths and titles only, work files are not copied |
| `thumbs/` | Thumbnails of web works |
| `voice.md` | The voice profile |
| `voice-corpus.md` | Your own messages collected from session logs, as study material |

The plugin does not send these anywhere. When you start "learn from my DeepSeek chats", the study file is handed to the model you are using, like any message you send. Delete the files to remove the data; removing a work from the library never deletes the work itself.

## Relation to the standalone skill repos

Each skill has its own repo and also works in Claude Code, Codex and other agents:
[guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill) ·
[guizang-social-card-skill](https://github.com/op7418/guizang-social-card-skill) ·
[guizang-pages-skill](https://github.com/op7418/guizang-pages-skill) ·
[Humanizer-zh](https://github.com/op7418/Humanizer-zh)

`skills/` holds snapshots of those repos at pinned commits ([`skills/manifest.json`](skills/manifest.json)); the plugin page shows the versions in its lower-left corner. When a skill loads, the plugin appends a few notes for this environment (dependencies are installed, register deliverables, read the voice profile before writing). A same-named skill in `~/.dsh/skills` or a project's `.dsh/skills` takes precedence over the bundled one.

## Development

```bash
git clone https://github.com/op7418/dsh-guizang-design.git
cd dsh-guizang-design
npm install
npm test
dsh plugin --profile web add link:$PWD
```

`lib/` is the plugin (host half `index.js`, browser half `client.js`); `gallery/` the page (`gz-swiss.css` is generated by the design system); `skills/` the vendored snapshots (update with `node tools/vendor-skills.mjs`); `own-skills/` the voice-profile skill; `examples/` the official examples (`node tools/vendor-examples.mjs`).

## License

[AGPL-3.0](LICENSE). Bundled skills keep their own licenses (humanizer-zh is MIT).
