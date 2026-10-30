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
  'guizang-voice': { label: '语气档案', short: '语气', theme: 'ikb', dot: '#0a0a0a' },
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
function workCard(w, { removable }) {
  return `<article class="work">
    ${thumb(w)}
    <div class="work-body">
      <div class="work-title">${esc(w.title)}</div>
      <div class="work-meta">${chip(w.skill)}${w.column ? `<span>专栏 · ${esc(w.column)}</span>` : ''}${w.theme ? `<span>${esc(w.theme)}</span>` : ''}${w.updatedAt ? `<span>${date(w.updatedAt)}</span>` : ''}</div>
      ${w.summary ? `<div class="work-meta">${esc(w.summary)}</div>` : ''}
      <div class="work-actions">
        <button class="btn primary" data-next="${esc(w.id)}">做同风格的下一份</button>
        ${w.missing ? '' : `<a class="btn" href="${esc(w.url)}" target="_blank" rel="noopener">打开</a>`}
        ${removable ? `<button class="btn ghost icon" data-remove="${esc(w.id)}" title="移出作品库" aria-label="移出作品库">✕</button>` : ''}
      </div>
    </div>
  </article>`
}
function flowCard(r) {
  return `<article class="flow">
    <h3>${esc(r.title)}</h3>
    <div class="steps">${r.steps.map(chip).join('<span class="arrow">→</span>')}</div>
    <p>${esc(r.summary)}</p>
    <button class="btn" data-recipe="${esc(r.id)}">使用这个工作流</button>
  </article>`
}
function sec(title, { count, more, desc } = {}) {
  return `<div class="sec-head"><h2>${esc(title)}</h2>${count != null ? `<span class="count">${count}</span>` : ''}${more ? `<a class="more" href="${more}">查看全部 →</a>` : ''}</div>${desc ? `<p class="sec-desc">${desc}</p>` : ''}`
}
const emptyWorks = `<div class="empty">还没有作品。用上面任意一个 skill 做完一份，它会自己登记到这里；也可以手动登记：<br><br><code>node &lt;插件目录&gt;/scripts/library.mjs add &lt;HTML 文件或卡片任务目录&gt; --skill guizang-ppt-skill --title "标题"</code></div>`

const VOICE_DESC = '语气档案记的是<b>你自己</b>的写作习惯：常用的词和从来不用的词、句子长短、标点和称呼方式。它从两处学：你给它看的、你写过的文章；你和 AI 对话时改过的措辞（比如你说「别用这个词」「我一般这么说」）。<br>之后两件事会用到它：<b>去 AI 味</b>时保留你本来的说法，只删真正的套话；<b>让 AI 仿写</b>时（文案、讲稿、卡片标题），照着你的语气写。档案只存在这台电脑上。'

function voicePanel(full) {
  const v = data.voice
  const status = v.exists
    ? `<div class="status ok"><i></i>已建档${v.updated ? ` · ${esc(v.updated)}` : ''}</div>`
    : '<div class="status"><i></i>还没有档案</div>'
  const actions = v.exists
    ? '<button class="btn primary" data-voice="refresh">用新文章更新</button>'
    : '<button class="btn primary" data-voice="learn">从我的文章学习</button>'
  const side = `<div class="panel sunken">${status}<div class="actions">${actions}</div><div class="path">${esc(v.path)}</div></div>`
  const main = full
    ? `<div class="panel">${v.exists ? `<h3>档案内容</h3><div class="profile">${esc(v.text)}</div>` : `<h3>怎么建档</h3><ul><li>准备 3–10 篇你写过的文章（文件、链接或直接贴）。</li><li>点「从我的文章学习」，在新对话里把文章交给 AI。它会逐条提炼你的习惯，每条都附原文出处，建完给你过目。</li><li>之后在对话里纠正措辞，它会自己记一笔；同一条规律出现两次就正式写进档案。</li></ul>`}</div>`
    : `<div class="panel"><p>${VOICE_DESC}</p></div>`
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
        <button class="skillcard" data-theme="${meta(s.name).theme}" data-starter="${esc(s.name)}" aria-label="开始：${esc(s.title)}">
          <canvas aria-hidden="true"></canvas>
          <div class="sc-top"><span>${String(i + 1).padStart(2, '0')}</span><span>${esc(s.family)}</span></div>
          <div class="sc-title">${esc(s.title)}</div>
          <div class="sc-blurb">${esc(s.blurb)}</div>
          <div class="sc-cmd">/${esc(s.name)}</div>
          <span class="sc-go">开始 <span aria-hidden="true">→</span></span>
        </button>`).join('')}</div></section>
      <section class="sec">${sec('我的作品', { count: works.length, more: works.length > 8 ? '#/works' : null })}
        ${works.length ? `<div class="grid">${works.slice(0, 8).map((w) => workCard(w, { removable: true })).join('')}</div>` : emptyWorks}
      </section>
      <section class="sec">${sec('内容生产工作流', { count: recipes.length, more: '#/workflows', desc: '跨 skill 的常用组合。点「使用」会开一个新对话并填好草稿，补上你的内容就能发。' })}
        <div class="flows">${recipes.slice(0, 3).map(flowCard).join('')}</div>
      </section>
      <section class="sec">${sec('语气档案', { more: '#/voice' })}${voicePanel(false)}</section>
      <section class="sec">${sec('官方示例', { count: examples.length, more: '#/examples' })}
        <div class="grid">${examples.slice(0, 4).map((w) => workCard(w, { removable: false })).join('')}</div>
      </section>`
  },
  works() {
    const { works, columns } = data
    const shown = filterWorks(works, state.skill, state.q)
    return `<div class="page-head"><h1>我的作品</h1><p>用这几个 skill 做过的东西都在这里。连载的作品按专栏归在一起，可以直接做新一期。</p></div>
      ${columns.length ? `${sec('专栏', { count: columns.length })}<div class="columns">${columns.map((c) => `
        <div class="column"><div class="c-body"><div class="c-name">${esc(c.name)}</div><div class="c-meta">${c.issues} 期 · 最近：${esc(c.latest.title)} · ${date(c.latest.updatedAt)}</div></div>
        <button class="btn" data-column="${esc(c.name)}">做新一期</button></div>`).join('')}</div>` : ''}
      <div class="toolbar"><input class="search" id="q" type="search" placeholder="搜索标题、专栏、主题" value="${esc(state.q)}">${seg('skill', works)}<span class="result">${shown.length} / ${works.length}</span></div>
      ${works.length ? (shown.length ? `<div class="grid">${shown.map((w) => workCard(w, { removable: true })).join('')}</div>` : '<div class="empty">没有符合条件的作品</div>') : emptyWorks}`
  },
  workflows() {
    return `<div class="page-head"><h1>内容生产工作流</h1><p>跨 skill 的常用组合。点「使用这个工作流」会开一个新对话并填好草稿，补上你的内容就能发；后面几步用到的 skill，AI 会自己接着调用。</p></div>
      <div class="flows">${data.recipes.map(flowCard).join('')}</div>`
  },
  voice() {
    return `<div class="page-head"><h1>语气档案</h1><p>${VOICE_DESC}</p></div>${voicePanel(true)}`
  },
  examples() {
    const shown = data.examples.filter((w) => state.exSkill === 'all' || w.skill === state.exSkill)
    return `<div class="page-head"><h1>官方示例</h1><p>四个 skill 的样张。「做同风格的下一份」会参考这份示例的主题和版式。</p></div>
      <div class="toolbar">${seg('exSkill', data.examples)}<span class="result">${shown.length} / ${data.examples.length}</span></div>
      <div class="grid">${shown.map((w) => workCard(w, { removable: false })).join('')}</div>`
  },
}

function route() { return (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0] }

function render() {
  if (!data) return
  const view = VIEWS[route()] ? route() : 'home'
  document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('on', a.dataset.view === view))
  $('#tab-works').textContent = data.works.length || ''
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

// ---------- skill 卡片的 ASCII 动效 ----------
// 和 PPT 瑞士风封面的 ASCII 呼吸场同一个算法（guizang-design effects/gz-effects.js），
// 平时停在一帧静态画面，鼠标移上去才播放；字色取卡片的「色块上的文字色」
const GLYPHS = ' .:-=+*#%@'
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
function asciiCard(card, seed) {
  const canvas = $('canvas', card)
  const ctx = canvas.getContext('2d')
  const cell = 14
  let t = 12.5 + seed * 3.7, raf = 0, last = 0, w = 0, h = 0, dpr = 1
  function size() {
    const r = card.getBoundingClientRect()
    dpr = Math.min(devicePixelRatio || 1, 2)
    w = Math.round(r.width); h = Math.round(r.height)
    canvas.width = w * dpr; canvas.height = h * dpr
  }
  function draw() {
    const color = getComputedStyle(card).color
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace'
    ctx.textBaseline = 'top'
    ctx.fillStyle = color
    const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell), tt = t * 0.55
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const n = (Math.sin(k * 0.18 + tt) + Math.sin(r * 0.24 - tt * 0.7) + Math.sin((k + r) * 0.12 + tt * 0.45) + Math.sin(Math.hypot(k - cols * 0.75, r - rows * 0.3) * 0.16 - tt * 0.55)) / 4
      const v = (n + 1) / 2
      if (v < 0.3) continue
      const g = GLYPHS[Math.min(GLYPHS.length - 1, Math.floor(v * GLYPHS.length))]
      if (g === ' ') continue
      ctx.globalAlpha = 0.06 + (v - 0.3) * 0.42
      ctx.fillText(g, k * cell, r * cell)
    }
    ctx.globalAlpha = 1
  }
  function loop(now) {
    if (now - last >= 1000 / 30) { t += (now - (last || now)) / 1000; last = now; draw() }
    raf = requestAnimationFrame(loop)
  }
  card.addEventListener('mouseenter', () => { if (!reduceMotion && !raf) { last = 0; raf = requestAnimationFrame(loop) } })
  card.addEventListener('mouseleave', () => { cancelAnimationFrame(raf); raf = 0 })
  new ResizeObserver(() => { size(); draw() }).observe(card)
  document.fonts.ready.then(draw)
}
function mountAscii() { document.querySelectorAll('.skillcard').forEach((c, i) => asciiCard(c, i)) }

// ---------- 交互 ----------
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button')
  if (!b || !data) return
  if (b.dataset.starter) start(data.skills.find((s) => s.name === b.dataset.starter).starter)
  else if (b.dataset.recipe) start(data.recipes.find((r) => r.id === b.dataset.recipe).prompt)
  else if (b.dataset.next) start([...data.works, ...data.examples].find((w) => w.id === b.dataset.next).next)
  else if (b.dataset.column) start(data.columns.find((c) => c.name === b.dataset.column).next)
  else if (b.dataset.voice) start(data.voice.prompts[b.dataset.voice])
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
