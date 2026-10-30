// 歸藏设计 · 插件页面。读 /guizang-design/api/catalog，按 #/路由 渲染概览和四个二级页。
// 点按钮时把草稿交给外层（插件浏览器半边开新对话并填好输入框）；单独打开页面时复制草稿。
const $ = (s, el = document) => el.querySelector(s)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// 每个 skill 对应一个瑞士风主题（卡片底色），作品卡片上的小色块也用它
const META = {
  'guizang-ppt-skill': { label: '网页 PPT', short: 'PPT', theme: 'ikb', dot: '#002FA7' },
  'guizang-social-card-skill': { label: '图文卡片', short: '卡片', theme: 'safety-orange', dot: '#FF6B35' },
  'guizang-page-skill': { label: '网页排版', short: '网页', theme: 'lemon-green', dot: '#C5E803' },
  'humanizer-zh': { label: '去 AI 味', short: '去 AI 味', theme: 'lemon', dot: '#FFD500' },
  'guizang-voice': { label: '语气档案', short: '语气', theme: 'ikb', dot: '#737373' },
}
const meta = (name) => META[name] || { label: name || '其他', short: name || '其他', dot: '#a1a1aa' }
const chip = (name) => `<span class="chip" style="--dot:${meta(name).dot}"><i></i>${esc(meta(name).short)}</span>`
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

// ---------- 卡片 ----------
function thumb(w) {
  if (w.missing) return '<div class="thumb missing">文件已不在原位置</div>'
  const count = w.files?.length > 1 ? `<span class="count">${w.files.length} 张</span>` : ''
  if (w.thumb) return `<div class="thumb"><img src="${esc(w.thumb)}" alt="" loading="lazy">${count}</div>`
  if (w.kind === 'image') return `<div class="thumb contain"><img src="${esc(w.url)}" alt="" loading="lazy">${count}</div>`
  return `<div class="thumb" data-live="${esc(w.url)}"></div>`
}
const TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
// 点卡片 = 打开作品；「做同款」= 在新对话里按这份作品的主题和版式做一份新内容；右上角垃圾桶 = 移出作品库
function workCard(w, { removable }) {
  const body = `${thumb(w)}<div class="work-body">
      <div class="work-title">${esc(w.title)}</div>
      <div class="work-meta">${chip(w.skill)}${w.column ? `<span>专栏 · ${esc(w.column)}</span>` : ''}${w.theme ? `<span>${esc(w.theme)}</span>` : ''}${w.updatedAt ? `<span>${date(w.updatedAt)}</span>` : ''}</div>
    </div>`
  return `<article class="work">
    ${w.missing ? `<div>${body}</div>` : `<a class="work-open" href="${esc(w.url)}" target="_blank" rel="noopener" title="打开">${body}</a>`}
    ${removable ? `<button class="trash" data-remove="${esc(w.id)}" title="移出作品库（不删除文件）" aria-label="移出作品库">${TRASH}</button>` : ''}
    <div class="work-foot"><button class="btn block" data-next="${esc(w.id)}" title="用这份作品的主题和版式，在新对话里做一份新内容">做同款</button></div>
  </article>`
}
function flowCard(r) {
  return `<article class="flow">
    <h3>${esc(r.title)}</h3>
    <div class="steps">${r.steps.map(chip).join('<span class="arrow">→</span>')}</div>
    <button class="btn" data-recipe="${esc(r.id)}">使用工作流</button>
  </article>`
}
function sec(title, { more, desc } = {}) {
  return `<div class="sec-head"><h2>${esc(title)}</h2>${more ? `<a class="more" href="${more}">查看全部 →</a>` : ''}</div>${desc ? `<p class="sec-desc">${desc}</p>` : ''}`
}
// 官方示例：不放图，一行一份
function exampleRow(w) {
  return `<div class="example">
    <div><div class="ex-title">${esc(w.title)}</div><div class="ex-sub">${chip(w.skill)}<span>${esc(w.summary || '')}</span></div></div>
    <a class="ex-open" href="${esc(w.url)}" target="_blank" rel="noopener">打开</a>
    <button class="btn" data-next="${esc(w.id)}" title="用这份示例的主题和版式，在新对话里做一份你的内容">做同款</button>
  </div>`
}
const emptyWorks = `<div class="empty">还没有作品。用上面任意一个 skill 做完一份，它会自己登记到这里；也可以手动登记：<br><br><code>node &lt;插件目录&gt;/scripts/library.mjs add &lt;HTML 文件或卡片任务目录&gt; --skill guizang-ppt-skill --title "标题"</code></div>`

const VOICE_DESC = '读你在 DeepSeek 里发过的消息（尤其是大段的文字），学出你自己的写作习惯：常用的词、不用的词、句子长短、标点和称呼。学完的结果显示在这里。去 AI 味时会保留你本来的说法，让 AI 仿写文案、讲稿、卡片标题时会照着你的语气写。只在这台电脑上。'

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
  const status = v.exists
    ? `<div class="status ok"><i></i>已建档${v.updated ? ` · ${esc(v.updated)}` : ''}</div>`
    : '<div class="status"><i></i>还没有档案</div>'
  const side = `<div class="panel">${status}<div class="actions">
      <button class="btn block" data-voice-history>${v.exists ? '重新学习我的对话' : '从我的 DeepSeek 对话学习'}</button>
      <button class="btn secondary block" data-voice="articles">用我写过的文章补充</button>
    </div><div class="path">${esc(v.path)}</div></div>`
  const main = v.exists
    ? `<div class="panel line profile">${full ? md(v.text) : md(v.text.split('\n').slice(0, 14).join('\n'))}</div>`
    : `<div class="panel line"><h3>怎么学</h3><ol><li>点「从我的 DeepSeek 对话学习」：插件把你在 DeepSeek 里发过的消息整理好，开一个新对话交给 AI。</li><li>AI 逐条提炼你的写作习惯，每条都附原文出处，学完给你过目，你说哪条不对就改哪条。</li><li>之后你在对话里纠正措辞（「别用这个词」「我一般这么说」），它会自己记下来。</li></ol></div>`
  return `<div class="voice">${main}${side}</div>`
}

// ---------- 视图 ----------
const filterWorks = (list, skill, q) => list.filter((w) => (skill === 'all' || w.skill === skill) && (!q || `${w.title} ${w.column} ${w.theme}`.toLowerCase().includes(q.toLowerCase())))
function seg(key, list) {
  const skills = [...new Set(list.map((w) => w.skill).filter(Boolean))]
  return `<div class="seg">${['all', ...skills].map((s) => `<button data-seg="${key}" data-skill="${s}" aria-pressed="${state[key] === s}">${s === 'all' ? '全部' : esc(meta(s).short)}</button>`).join('')}</div>`
}

const VIEWS = {
  home() {
    const { skills, works, recipes, examples } = data
    return `
      <section class="sec"><div class="skillcards">${skills.map((s, i) => `
        <button class="skillcard" data-theme="${meta(s.name).theme}" data-starter="${esc(s.name)}" title="/${esc(s.name)}">
          <canvas aria-hidden="true"></canvas>
          <span class="sc-title">${esc(s.title)}</span>
          <span class="sc-blurb">${esc(s.short)}</span>
        </button>`).join('')}</div></section>
      <section class="sec">${sec('我的作品', { more: works.length > 8 ? '#/works' : null })}
        ${works.length ? `<div class="grid">${works.slice(0, 8).map((w) => workCard(w, { removable: true })).join('')}</div>` : emptyWorks}
      </section>
      <section class="sec">${sec('内容生产工作流', { more: '#/workflows' })}
        <div class="flows">${recipes.slice(0, 3).map(flowCard).join('')}</div>
      </section>
      <section class="sec">${sec('语气档案', { more: '#/voice', desc: esc(VOICE_DESC) })}${voicePanel(false)}</section>
      <section class="sec">${sec('官方示例', { more: '#/examples' })}
        <div class="examples">${examples.slice(0, 4).map(exampleRow).join('')}</div>
      </section>`
  },
  works() {
    const { works, columns } = data
    const shown = filterWorks(works, state.skill, state.q)
    return `<div class="page-head"><h1>我的作品</h1><p>点卡片打开作品；「做同款」会在新对话里按这份作品的主题和版式，做一份新内容。连载按专栏归在一起，可以直接做新一期。</p></div>
      ${columns.length ? `${sec('专栏')}<div class="columns">${columns.map((c) => `
        <div class="column"><div class="c-body"><div class="c-name">${esc(c.name)}</div><div class="c-meta">${c.issues} 期 · 最近：${esc(c.latest.title)} · ${date(c.latest.updatedAt)}</div></div>
        <button class="btn" data-column="${esc(c.name)}">做新一期</button></div>`).join('')}</div>` : ''}
      <div class="toolbar"><input class="search" id="q" type="search" placeholder="搜索标题、专栏、主题" value="${esc(state.q)}">${seg('skill', works)}<span class="result">${shown.length} / ${works.length}</span></div>
      ${works.length ? (shown.length ? `<div class="grid">${shown.map((w) => workCard(w, { removable: true })).join('')}</div>` : '<div class="empty">没有符合条件的作品</div>') : emptyWorks}`
  },
  workflows() {
    return `<div class="page-head"><h1>内容生产工作流</h1></div>
      <div class="flows">${data.recipes.map(flowCard).join('')}</div>`
  },
  voice() {
    return `<div class="page-head"><h1>语气档案</h1><p>${esc(VOICE_DESC)}</p></div>${voicePanel(true)}`
  },
  examples() {
    const shown = data.examples.filter((w) => state.exSkill === 'all' || w.skill === state.exSkill)
    return `<div class="page-head"><h1>官方示例</h1><p>「做同款」会在新对话里按这份示例的主题和版式，做一份你的内容。</p></div>
      <div class="toolbar">${seg('exSkill', data.examples)}<span class="result">${shown.length} / ${data.examples.length}</span></div>
      <div class="examples">${shown.map(exampleRow).join('')}</div>`
  },
}

function route() { return (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0] }

function render() {
  if (!data) return
  const view = VIEWS[route()] ? route() : 'home'
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.view === view))
  const keepFocus = document.activeElement?.id === 'q'
  $('#app').innerHTML = VIEWS[view]() + `<footer class="foot">dsh-guizang-design · ${data.skills.map((s) => `${s.name}@${s.source?.commit?.slice(0, 7) || '—'}`).join(' · ')}</footer>`
  if (keepFocus) { const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length) }
  mountLive()
  mountAscii()
}

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

// ---------- skill 卡片的水球动效 ----------
// 几个水球在卡片右侧慢慢游动，靠近时融成一团（metaball 场）。两层：
//   底层：低分辨率场强图，柔和的半透明水球；上层：按场强疏密排的 ASCII 字符，描出水球的体积。
// 平时停在一帧；鼠标移上去速度渐渐起来，移开后慢慢停下。字色取卡片的 accent-on（蓝、橙上白色，黄、绿上墨色）
const GLYPHS = ' .·:-=+*#'
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
function blobCard(card, seed) {
  const canvas = $('canvas', card)
  const ctx = canvas.getContext('2d')
  const low = document.createElement('canvas'), lctx = low.getContext('2d')
  const cell = 9, LOW = 4
  // 水球都在右边 55% 的范围里游，躲开左上角的文字
  const rnd = (i) => { const x = Math.sin(seed * 97.13 + i * 12.9898) * 43758.5453; return x - Math.floor(x) }
  const blobs = Array.from({ length: 5 }, (_, i) => ({
    bx: 0.6 + rnd(i) * 0.24, by: 0.3 + rnd(i + 9) * 0.45,
    ax: 0.05 + rnd(i + 3) * 0.08, ay: 0.12 + rnd(i + 5) * 0.16,
    sp: 0.35 + rnd(i + 7) * 0.45, ph: rnd(i + 11) * 6.28, r: 0.09 + rnd(i + 13) * 0.07,
  }))
  let t = 4 + seed * 2.3, speed = 0, target = 0, raf = 0, last = 0, w = 0, h = 0, dpr = 1, rgb = '255,255,255'
  function size() {
    const r = card.getBoundingClientRect()
    dpr = Math.min(devicePixelRatio || 1, 2)
    w = Math.round(r.width); h = Math.round(r.height)
    canvas.width = w * dpr; canvas.height = h * dpr
    low.width = Math.ceil(w / LOW); low.height = Math.ceil(h / LOW)
    const on = getComputedStyle(card).getPropertyValue('--accent-on').trim() || '#ffffff'
    const m = on.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
    rgb = m ? [m[1], m[2], m[3]].map((x) => parseInt(x, 16)).join(',') : '255,255,255'
  }
  const pos = (b) => [w * (b.bx + b.ax * Math.sin(t * b.sp + b.ph)), h * (b.by + b.ay * Math.cos(t * b.sp * 0.8 + b.ph * 1.3)), (b.r * h) ** 2]
  function field(x, y, P) { let f = 0; for (const [bx, by, r2] of P) { const dx = x - bx, dy = y - by; f += r2 / (dx * dx + dy * dy + 1) } return f }
  function draw() {
    const P = blobs.map(pos)
    // 底层：柔和的水球
    const img = lctx.createImageData(low.width, low.height)
    const [cr, cg, cb] = rgb.split(',').map(Number)
    for (let y = 0; y < low.height; y++) for (let x = 0; x < low.width; x++) {
      const f = field(x * LOW, y * LOW, P)
      const a = Math.min(1, Math.max(0, (f - 0.8) / 0.5))
      const i = (y * low.width + x) * 4
      img.data[i] = cr; img.data[i + 1] = cg; img.data[i + 2] = cb; img.data[i + 3] = a * a * (3 - 2 * a) * 34
    }
    lctx.putImageData(img, 0, 0)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(low, 0, 0, w, h)
    // 上层：字符
    ctx.font = '500 9px "JetBrains Mono", ui-monospace, monospace'
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
    for (let y = cell / 2; y < h; y += cell) for (let x = cell / 2; x < w; x += cell) {
      const f = field(x, y, P)
      if (f < 0.55) continue
      const v = Math.min(1, (f - 0.55) / 3)
      const g = GLYPHS[1 + Math.min(GLYPHS.length - 2, Math.floor(Math.sqrt(v) * (GLYPHS.length - 1)))]
      ctx.fillStyle = `rgba(${rgb},${(0.22 + v * 0.55).toFixed(3)})`
      ctx.fillText(g, x, y)
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
  card.addEventListener('mouseenter', () => go(true))
  card.addEventListener('mouseleave', () => go(false))
  card.addEventListener('focus', () => go(true))
  card.addEventListener('blur', () => go(false))
  new ResizeObserver(() => { size(); draw() }).observe(card)
  document.fonts.ready.then(draw)
}
function mountAscii() { document.querySelectorAll('.skillcard').forEach((c, i) => blobCard(c, i + 1)) }

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
    const r = await fetch('api/voice/collect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message }))
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
// 回到这个页面时刷新：对话里刚登记的作品马上能看到
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load() })
