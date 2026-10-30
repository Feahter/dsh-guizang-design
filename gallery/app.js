// 歸藏设计 · 插件页面。读 /guizang-design/api/catalog，按 #/路由 渲染：概览、我的作品、内容生产工作流、语气档案、官方示例。
// 按钮把草稿交给外层（插件浏览器半边开新对话并填好输入框）；单独打开页面时复制草稿。
const $ = (s, el = document) => el.querySelector(s)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// 细线图标（24 网格，1.5 线宽，直角端点）
const ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z"/>',
  works: '<path d="M4 5h16v14H4zM4 15l4.5-4.5 4 4 2.5-2.5L20 17"/><path d="M15.5 9.5h.01"/>',
  flow: '<path d="M6 4v6a4 4 0 0 0 4 4h8M14 10l4 4-4 4"/>',
  voice: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>',
  book: '<path d="M4 5.5C7 4.5 9.5 4.5 12 6.5c2.5-2 5-2 8-1V19c-3-1-5.5-1-8 1-2.5-2-5-2-8-1zM12 6.5V20"/>',
  arrow: '<path d="M7 17 17 7M8 7h9v9"/>',
  right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  search: '<path d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20"/>',
}
const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`

// 每个 skill 对应一个瑞士风主题（横幅动画区的底色），作品上的小色块也用它
const META = {
  'guizang-ppt-skill': { short: 'PPT', theme: 'ikb', dot: '#002FA7' },
  'guizang-social-card-skill': { short: '卡片', theme: 'safety-orange', dot: '#FF6B35' },
  'guizang-page-skill': { short: '网页', theme: 'lemon-green', dot: '#C5E803' },
  'humanizer-zh': { short: '去 AI 味', theme: 'lemon', dot: '#FFD500' },
  'guizang-voice': { short: '语气', theme: 'ikb', dot: '#737373' },
}
const meta = (n) => META[n] || { short: n || '其他', dot: '#a3a3a3' }
const skillTag = (n) => `<span><i class="dot" style="--dot:${meta(n).dot}"></i>${esc(meta(n).short)}</span>`
const date = (iso) => (iso ? new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '.') : '')

let data = null
const state = { q: '', skill: 'all', exSkill: 'all' }

function toast(text) {
  const t = $('#toast')
  t.textContent = text
  t.classList.add('show')
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600)
}
function start(prompt) {
  if (window.parent !== window) return window.parent.postMessage({ type: 'guizang-design:start', prompt }, location.origin)
  navigator.clipboard?.writeText(prompt).then(() => toast('草稿已复制，粘贴到对话里就能用'), () => toast('复制失败'))
}
addEventListener('message', (e) => {
  if (e.origin === location.origin && e.data?.type === 'guizang-design:start-failed') toast(`没能开新对话：${e.data.message}`)
})

// ---------- 组件 ----------
const head = (eyebrow, title, desc) => `<header class="head"><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1>${desc ? `<p>${esc(desc)}</p>` : ''}</header>`
const secHead = (num, title, more) => `<div class="sec-head"><span class="num">${num}</span><h2>${esc(title)}</h2>${more ? `<a class="more" href="${more}">查看全部${icon('right')}</a>` : ''}</div>`

function thumb(w) {
  if (w.missing) return '<div class="thumb missing">文件已不在原位置</div>'
  if (w.thumb) return `<div class="thumb"><img src="${esc(w.thumb)}" alt="" loading="lazy"></div>`
  if (w.kind === 'image') {
    const imgs = (w.files?.length ? w.files : [w.url]).slice(0, 3)
    return `<div class="thumb stack">${imgs.map((f) => `<img src="${esc(f)}" alt="" loading="lazy">`).join('')}</div>`
  }
  return `<div class="thumb" data-live="${esc(w.url)}"></div>`
}

// 点卡片 = 打开作品；「做同款」= 在新对话里按这份作品的主题和版式做一份新内容；垃圾桶 = 移出作品库（不删文件）
function workCard(w) {
  const kicker = [skillTag(w.skill), w.files?.length > 1 ? `<span>${w.files.length} 张</span>` : '', w.column ? `<span>${esc(w.column)}</span>` : ''].filter(Boolean).join('<span class="sep">·</span>')
  return `<article class="work">
    ${w.missing ? `<div class="work-open">${thumb(w)}</div>` : `<a class="work-open" href="${esc(w.url)}" target="_blank" rel="noopener" title="打开作品">${thumb(w)}</a>`}
    <div class="work-body">
      <div class="work-kicker mono">${kicker}</div>
      <div class="work-title">${esc(w.title)}</div>
      ${w.theme ? `<div class="work-tags">主题 ${esc(w.theme)}</div>` : ''}
    </div>
    <div class="work-foot">
      <span class="date">${date(w.updatedAt)}</span>
      <button class="btn" data-next="${esc(w.id)}" title="用这份作品的主题和版式，在新对话里做一份新内容">做同款</button>
      <button class="ibtn" data-remove="${esc(w.id)}" title="移出作品库（不删除文件）" aria-label="移出作品库">${icon('trash')}</button>
    </div>
  </article>`
}

function flowCard(r, i) {
  return `<article class="flow">
    <span class="mono">工作流 ${String(i + 1).padStart(2, '0')}</span>
    <h3>${esc(r.title)}</h3>
    <div class="steps">${r.steps.map(skillTag).join('<span class="arrow">→</span>')}</div>
    <button class="btn" data-recipe="${esc(r.id)}">使用工作流</button>
  </article>`
}

function exampleTable(list) {
  return `<div class="table">
    <div class="row th mono"><span>示例</span><span>Skill</span><span></span></div>
    ${list.map((w) => `<div class="row">
      <div><div class="r-title">${esc(w.title)}</div><div class="r-sub">${esc(w.summary || '')}</div></div>
      <div class="r-skill">${skillTag(w.skill)}</div>
      <div class="r-act"><a class="btn ghost" href="${esc(w.url)}" target="_blank" rel="noopener">打开</a><button class="btn" data-next="${esc(w.id)}">做同款</button></div>
    </div>`).join('')}
  </div>`
}

const emptyWorks = `<div class="empty">还没有作品。用上面任意一个 skill 做完一份，它会自己登记到这里；也可以手动登记：<br><br><code>node &lt;插件目录&gt;/scripts/library.mjs add &lt;HTML 文件或卡片任务目录&gt; --skill guizang-ppt-skill --title "标题"</code></div>`

const VOICE_DESC = '读你在 DeepSeek 里发过的消息（尤其是大段的文字），学出你自己的写作习惯：常用的词、不用的词、句子长短、标点和称呼。去 AI 味时保留你本来的说法；让 AI 仿写文案、讲稿、卡片标题时，照着你的语气写。只存在这台电脑上。'

// 档案是 Markdown：只渲染标题、列表和段落
function md(text) {
  const out = []
  let list = false
  for (const line of text.split('\n')) {
    const l = line.trim()
    if (/^- /.test(l)) { if (!list) { out.push('<ul>'); list = true } out.push(`<li>${esc(l.slice(2))}</li>`); continue }
    if (list) { out.push('</ul>'); list = false }
    if (/^# /.test(l)) out.push(`<p class="profile-title">${esc(l.slice(2))}</p>`)
    else if (/^#{2,} /.test(l)) out.push(`<h4>${esc(l.replace(/^#+ /, ''))}</h4>`)
    else if (l && !/^```/.test(l)) out.push(`<p>${esc(l)}</p>`)
  }
  if (list) out.push('</ul>')
  return out.join('')
}

function voicePanel(full) {
  const v = data.voice
  const side = `<div class="panel">
    <span class="mono">档案状态</span>
    <div class="state ${v.exists ? 'ok' : ''}"><i></i>${v.exists ? '已建档' : '还没有档案'}</div>
    ${v.exists && v.updated ? `<p>${esc(v.updated)}</p>` : ''}
    <div class="actions">
      <button class="btn" data-voice-history>${v.exists ? '重新学习我的对话' : '从我的 DeepSeek 对话学习'}</button>
      <button class="btn ghost" data-voice="articles">用我写过的文章补充</button>
    </div>
    <div class="path">${esc(v.path)}</div>
  </div>`
  const main = v.exists
    ? `<div class="panel profile">${md(full ? v.text : v.text.split('\n').slice(0, 14).join('\n'))}</div>`
    : `<div class="panel"><span class="mono">怎么学</span><h3>三步建好你的语气档案</h3><ol>
        <li>点「从我的 DeepSeek 对话学习」：插件把你在 DeepSeek 里发过的消息整理好，开一个新对话交给 AI。</li>
        <li>AI 逐条提炼你的写作习惯，每条都附原文出处，学完给你过目，哪条不对就改哪条。</li>
        <li>之后你在对话里纠正措辞（「别用这个词」「我一般这么说」），它会自己记下来。</li></ol></div>`
  return `<div class="voice">${main}${side}</div>`
}

function pills(key, list) {
  const skills = [...new Set(list.map((w) => w.skill).filter(Boolean))]
  const n = (s) => (s === 'all' ? list.length : list.filter((w) => w.skill === s).length)
  return `<div class="pills">${['all', ...skills].map((s) => `<button class="pill" data-seg="${key}" data-skill="${s}" aria-pressed="${state[key] === s}">${s === 'all' ? '全部' : esc(meta(s).short)} (${n(s)})</button>`).join('')}</div>`
}

// ---------- 视图 ----------
const VIEWS = {
  home() {
    const { skills, works, recipes, examples, columns, voice } = data
    return `${head('歸藏设计 · 插件', '用一套设计做所有内容', 'PPT、图文卡片、网页排版、去 AI 味，共用同一套瑞士风 / 杂志风设计系统。做过的作品都在这里，点「做同款」就能接着做下一份。')}
      <div class="stats">
        <div class="stat"><span class="mono">作品</span><div class="val">${works.length}</div><div class="sub">已登记</div></div>
        <div class="stat"><span class="mono">专栏</span><div class="val">${columns.length}</div><div class="sub">${columns.reduce((n, c) => n + c.issues, 0)} 期</div></div>
        <div class="stat"><span class="mono">工作流</span><div class="val">${recipes.length}</div><div class="sub">跨 skill 组合</div></div>
        <div class="stat"><span class="mono">语气档案</span><div class="val">${voice.exists ? '已建' : '未建'}</div><div class="sub">${voice.exists ? esc(voice.updated || '') : '从对话里学'}</div></div>
      </div>
      <section>${secHead('01', '开始创作')}
        <div class="banners">${skills.map((s) => `
          <button class="banner" data-starter="${esc(s.name)}" data-theme="${meta(s.name).theme}">
            <span class="b-text"><span class="b-title">${esc(s.title)}</span><span class="b-desc">${esc(s.blurb)}</span><span class="b-cmd">/${esc(s.name)}</span></span>
            <span class="b-art"><canvas aria-hidden="true"></canvas><span class="b-go">${icon('arrow')}</span></span>
          </button>`).join('')}</div>
      </section>
      <section class="sec">${secHead('02', '最近作品', works.length > 6 ? '#/works' : null)}
        ${works.length ? `<div class="grid">${works.slice(0, 6).map(workCard).join('')}</div>` : emptyWorks}
      </section>
      <section class="sec">${secHead('03', '内容生产工作流', '#/workflows')}<div class="flows">${recipes.slice(0, 3).map(flowCard).join('')}</div></section>
      <section class="sec">${secHead('04', '语气档案', '#/voice')}${voicePanel(false)}</section>
      <section class="sec">${secHead('05', '官方示例', '#/examples')}${exampleTable(examples.slice(0, 4))}</section>`
  },
  works() {
    const { works, columns } = data
    const shown = works.filter((w) => (state.skill === 'all' || w.skill === state.skill) && (!state.q || `${w.title} ${w.column} ${w.theme}`.toLowerCase().includes(state.q.toLowerCase())))
    return `${head('我的作品', '我的作品', '点卡片打开作品；「做同款」在新对话里按这份作品的主题和版式做一份新内容。连载按专栏归在一起。')}
      ${columns.length ? `${secHead('专栏', '连载')}<div class="columns">${columns.map((c) => `
        <div class="column"><div class="c-body"><span class="mono">${c.issues} 期 · ${date(c.latest.updatedAt)}</span><div class="c-name">${esc(c.name)}</div><div class="c-meta">最近：${esc(c.latest.title)}</div></div>
        <button class="btn" data-column="${esc(c.name)}">做新一期</button></div>`).join('')}</div>` : ''}
      <div class="toolbar"><label class="search">${icon('search')}<input id="q" type="search" placeholder="搜索标题、专栏、主题" value="${esc(state.q)}"></label>${pills('skill', works)}</div>
      ${works.length ? (shown.length ? `<div class="grid">${shown.map(workCard).join('')}</div>` : '<div class="empty">没有符合条件的作品</div>') : emptyWorks}`
  },
  workflows() {
    return `${head('内容生产工作流', '内容生产工作流')}<div class="flows">${data.recipes.map(flowCard).join('')}</div>`
  },
  voice() {
    return `${head('语气档案', '语气档案', VOICE_DESC)}${voicePanel(true)}`
  },
  examples() {
    const shown = data.examples.filter((w) => state.exSkill === 'all' || w.skill === state.exSkill)
    return `${head('官方示例', '官方示例', '「做同款」在新对话里按这份示例的主题和版式，做一份你的内容。')}
      <div class="toolbar">${pills('exSkill', data.examples)}</div>${exampleTable(shown)}`
  },
}

const route = () => (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0]
function render() {
  if (!data) return
  const view = VIEWS[route()] ? route() : 'home'
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.view === view))
  document.querySelectorAll('[data-count="works"]').forEach((el) => (el.textContent = data.works.length || ''))
  $('#rail-foot').innerHTML = `dsh-guizang-design<br>${data.skills.map((s) => `${esc(s.name)}@${esc(s.source?.commit?.slice(0, 7) || '—')}`).join('<br>')}`
  const keepFocus = document.activeElement?.id === 'q'
  $('#app').innerHTML = VIEWS[view]()
  if (keepFocus) { const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length) }
  mountLive()
  mountBlobs()
}
document.querySelectorAll('[data-icon]').forEach((el) => (el.outerHTML = icon(el.dataset.icon)))

// ---------- 网页作品没有缩略图时：缩放的实时预览，进入视野才加载 ----------
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue
    io.unobserve(e.target)
    const f = document.createElement('iframe')
    f.src = e.target.dataset.live
    f.tabIndex = -1
    f.setAttribute('aria-hidden', 'true')
    f.style.transform = `scale(${e.target.clientWidth / 1440})`
    e.target.appendChild(f)
  }
}, { rootMargin: '200px' })
function mountLive() { document.querySelectorAll('.thumb[data-live]').forEach((b) => io.observe(b)) }

// ---------- 横幅动画区：融合的水球 ----------
// 几个水球慢慢游动，靠近时融成一团（metaball 场）。两层：低分辨率场强图画柔和的水球，
// 上层按场强疏密排 ASCII 字符描出体积。平时停在一帧；鼠标移上去渐渐动起来，移开后慢慢停下。
// 字色取该主题的 accent-on（蓝、橙上白色，黄、绿上墨色）——动画区里没有文字，只有纹理。
const GLYPHS = ' .·:-=+*#'
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
function blobArt(banner, seed) {
  const art = $('.b-art', banner), canvas = $('canvas', art), ctx = canvas.getContext('2d')
  const low = document.createElement('canvas'), lctx = low.getContext('2d')
  const cell = 9, LOW = 4
  const rnd = (i) => { const x = Math.sin(seed * 97.13 + i * 12.9898) * 43758.5453; return x - Math.floor(x) }
  const blobs = Array.from({ length: 5 }, (_, i) => ({
    bx: 0.25 + rnd(i) * 0.5, by: 0.3 + rnd(i + 9) * 0.45,
    ax: 0.12 + rnd(i + 3) * 0.14, ay: 0.12 + rnd(i + 5) * 0.16,
    sp: 0.35 + rnd(i + 7) * 0.45, ph: rnd(i + 11) * 6.28, r: 0.1 + rnd(i + 13) * 0.07,
  }))
  let t = 4 + seed * 2.3, speed = 0, target = 0, raf = 0, last = 0, w = 0, h = 0, dpr = 1, rgb = [255, 255, 255]
  function size() {
    const r = art.getBoundingClientRect()
    dpr = Math.min(devicePixelRatio || 1, 2)
    w = Math.round(r.width); h = Math.round(r.height)
    canvas.width = w * dpr; canvas.height = h * dpr
    low.width = Math.max(1, Math.ceil(w / LOW)); low.height = Math.max(1, Math.ceil(h / LOW))
    const m = (getComputedStyle(banner).getPropertyValue('--accent-on').trim() || '#ffffff').match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
    rgb = m ? [m[1], m[2], m[3]].map((x) => parseInt(x, 16)) : [255, 255, 255]
  }
  const S = () => Math.min(w, h * 1.6)
  const pos = (b) => [w * (b.bx + b.ax * Math.sin(t * b.sp + b.ph)), h * (b.by + b.ay * Math.cos(t * b.sp * 0.8 + b.ph * 1.3)), (b.r * S()) ** 2]
  const field = (x, y, P) => { let f = 0; for (const [bx, by, r2] of P) { const dx = x - bx, dy = y - by; f += r2 / (dx * dx + dy * dy + 1) } return f }
  function draw() {
    if (!w || !h) return
    const P = blobs.map(pos)
    const img = lctx.createImageData(low.width, low.height)
    for (let y = 0; y < low.height; y++) for (let x = 0; x < low.width; x++) {
      const a = Math.min(1, Math.max(0, (field(x * LOW, y * LOW, P) - 0.8) / 0.5))
      const i = (y * low.width + x) * 4
      img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = a * a * (3 - 2 * a) * 34
    }
    lctx.putImageData(img, 0, 0)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(low, 0, 0, w, h)
    ctx.font = '500 9px "JetBrains Mono", ui-monospace, monospace'
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
    for (let y = cell / 2; y < h; y += cell) for (let x = cell / 2; x < w; x += cell) {
      const f = field(x, y, P)
      if (f < 0.55) continue
      const v = Math.min(1, (f - 0.55) / 3)
      ctx.fillStyle = `rgba(${rgb.join(',')},${(0.22 + v * 0.55).toFixed(3)})`
      ctx.fillText(GLYPHS[1 + Math.min(GLYPHS.length - 2, Math.floor(Math.sqrt(v) * (GLYPHS.length - 1)))], x, y)
    }
  }
  function loop(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
    last = now
    speed += (target - speed) * Math.min(1, dt * 4)
    t += dt * speed
    draw()
    if (target > 0 || speed > 0.01) raf = requestAnimationFrame(loop)
    else { raf = 0; last = 0 }
  }
  const go = (on) => { if (reduceMotion) return; target = on ? 1 : 0; if (!raf) { last = 0; raf = requestAnimationFrame(loop) } }
  banner.addEventListener('mouseenter', () => go(true))
  banner.addEventListener('mouseleave', () => go(false))
  banner.addEventListener('focus', () => go(true))
  banner.addEventListener('blur', () => go(false))
  new ResizeObserver(() => { size(); draw() }).observe(art)
  document.fonts.ready.then(draw)
}
function mountBlobs() { document.querySelectorAll('.banner').forEach((b, i) => blobArt(b, i + 1)) }

// ---------- 交互 ----------
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button')
  if (!b || !data) return
  if (b.dataset.starter) start(data.skills.find((s) => s.name === b.dataset.starter).starter)
  else if (b.dataset.recipe) start(data.recipes.find((r) => r.id === b.dataset.recipe).prompt)
  else if (b.dataset.next) start([...data.works, ...data.examples].find((w) => w.id === b.dataset.next).next)
  else if (b.dataset.column) start(data.columns.find((c) => c.name === b.dataset.column).next)
  else if (b.dataset.voice) start(data.voice.prompts[b.dataset.voice])
  else if ('voiceHistory' in b.dataset) {
    b.disabled = true
    const r = await fetch('api/voice/collect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((x) => x.json()).catch((err) => ({ ok: false, error: err.message }))
    b.disabled = false
    if (!r.ok) toast(`整理对话失败：${r.error}`)
    else if (!r.prompt) toast(`在 ${r.sessions} 个会话里还没找到成段的消息。多聊几次，或先用写过的文章补充`)
    else { toast(`整理了 ${r.messages} 条消息，正在打开新对话`); start(r.prompt) }
  }
  else if (b.dataset.seg) { state[b.dataset.seg] = b.dataset.skill; render() }
  else if (b.dataset.remove) {
    const w = data.works.find((x) => x.id === b.dataset.remove)
    if (!confirm(`把「${w.title}」移出作品库？作品文件不会删除。`)) return
    const r = await fetch('api/works/remove', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: w.id }) }).then((x) => x.json())
    if (r.ok) { toast('已移出作品库'); load() }
  }
})
document.addEventListener('input', (e) => { if (e.target.id === 'q') { state.q = e.target.value; render() } })
addEventListener('hashchange', () => { render(); scrollTo(0, 0) })

async function load() {
  data = await fetch('api/catalog', { cache: 'no-store' }).then((r) => r.json())
  render()
}
load()
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load() })
