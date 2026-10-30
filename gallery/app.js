// 展示库：读 /guizang-studio/api/catalog，渲染四块。点按钮时把草稿交给外层（插件浏览器半边开新对话）。
const $ = (s) => document.querySelector(s)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const SKILL_LABEL = { 'guizang-ppt-skill': 'PPT', 'guizang-social-card-skill': '卡片', 'guizang-page-skill': '网页', 'humanizer-zh': '去 AI 味' }

let data = null
const filter = { works: 'all', examples: 'all' }

function toast(text) {
  const t = $('#toast')
  t.textContent = text
  t.classList.add('show')
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600)
}

// 在 DSH 里：外层开新对话并填好草稿；单独打开这个页面时：复制草稿
function start(prompt) {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'guizang-studio:start', prompt }, location.origin)
    return
  }
  navigator.clipboard?.writeText(prompt).then(() => toast('草稿已复制，粘贴到对话里就能用'), () => toast('复制失败'))
}
addEventListener('message', (e) => {
  if (e.origin === location.origin && e.data?.type === 'guizang-studio:start-failed') toast(`没能开新对话：${e.data.message}`)
})

const date = (iso) => (iso ? new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('/', '.') : '')

function thumbHtml(w) {
  if (w.missing) return '<div class="thumb missing"></div>'
  const count = w.files?.length > 1 ? `<span class="count">${w.files.length} 张</span>` : ''
  if (w.thumb) return `<div class="thumb"><img src="${esc(w.thumb)}" alt="" loading="lazy">${count}</div>`
  if (w.kind === 'image') return `<div class="thumb portrait"><img src="${esc(w.url)}" alt="" loading="lazy">${count}</div>`
  // 没有缩略图的网页作品：缩放的实时预览，进入视野才加载
  return `<div class="thumb" data-live="${esc(w.url)}"></div>`
}

function workCard(w, { removable }) {
  return `<article class="work">
    ${thumbHtml(w)}
    <div class="work-meta"><h3>${esc(w.title)}</h3><span class="tag">${esc(SKILL_LABEL[w.skill] || w.skill || '')}</span></div>
    ${w.summary ? `<p class="sub">${esc(w.summary)}</p>` : ''}
    <p class="sub">${[w.theme, date(w.updatedAt)].filter(Boolean).map(esc).join(' · ')}</p>
    <div class="actions">
      <button class="btn" data-next="${esc(w.id)}">做同风格的下一份</button>
      ${w.missing ? '' : `<a class="btn quiet" href="${esc(w.url)}" target="_blank" rel="noopener">打开</a>`}
      ${removable ? `<button class="btn quiet" data-remove="${esc(w.id)}">移出作品库</button>` : ''}
    </div>
  </article>`
}

function filters(el, list, key) {
  const skills = [...new Set(list.map((w) => w.skill).filter(Boolean))]
  if (skills.length < 2) return (el.innerHTML = '')
  el.innerHTML = ['all', ...skills].map((s) => `<button data-filter="${key}" data-skill="${s}" aria-pressed="${filter[key] === s}">${s === 'all' ? '全部' : esc(SKILL_LABEL[s] || s)}</button>`).join('')
}

function render() {
  const { skills, works, recipes, examples } = data
  $('#mh-count').textContent = `${works.length} 份作品`
  $('#skills').innerHTML = skills.map((s) => `<div class="skill">
    <h3>${esc(s.title)}<span class="fam">${esc(s.family)}</span></h3>
    <p>${esc(s.blurb)}</p>
    <button class="btn" data-starter="${esc(s.name)}">开始</button>
  </div>`).join('')

  filters($('#work-filters'), works, 'works')
  const shownWorks = works.filter((w) => filter.works === 'all' || w.skill === filter.works)
  $('#work-grid').innerHTML = shownWorks.length
    ? shownWorks.map((w) => workCard(w, { removable: true })).join('')
    : `<div class="empty">还没有作品。用上面任意一个 skill 做完一份，它会自己登记到这里；也可以手动登记：<br><code>node &lt;插件目录&gt;/scripts/library.mjs add &lt;HTML 文件或卡片任务目录&gt; --skill guizang-ppt-skill --title "标题"</code></div>`

  $('#column-list').innerHTML = (data.columns || []).map((c) => `<div class="column">
    <h3>${esc(c.name)}<small>专栏 · ${c.issues} 期</small></h3>
    <p>最近一期：${esc(c.latest.title)}（${esc(SKILL_LABEL[c.latest.skill] || c.latest.skill)}，${date(c.latest.updatedAt)}）</p>
    <button class="btn" data-column="${esc(c.name)}">做新一期</button>
  </div>`).join('')

  const v = data.voice
  $('#voice-box').innerHTML = v.exists
    ? `<div class="excerpt">${esc(v.text)}</div>
       <div class="side"><button class="btn" data-voice="refresh">用新文章更新</button><p class="sub">${esc(v.updated ? '更新：' + v.updated : '')}<br>${esc(v.path)}</p></div>`
    : `<div class="excerpt empty-voice">还没有语料档案。给 3–10 篇你写过的文章（文件、链接或直接贴进来），会从里面提炼你的句式、节奏、常用词和不用的词，每一条都附原文出处，建完给你过目。之后你在对话里纠正措辞，它也会记下来。</div>
       <div class="side"><button class="btn" data-voice="learn">从我的文章学习</button></div>`

  $('#recipe-list').innerHTML = recipes.map((r) => `<div class="recipe">
    <h3>${esc(r.title)}</h3>
    <p>${esc(r.summary)}</p>
    <div class="steps">${r.steps.map((s) => `<span>${esc(SKILL_LABEL[s] || s)}</span>`).join('')}</div>
    <button class="btn" data-recipe="${esc(r.id)}">用这个配方</button>
  </div>`).join('')

  filters($('#example-filters'), examples, 'examples')
  $('#example-grid').innerHTML = examples.filter((w) => filter.examples === 'all' || w.skill === filter.examples).map((w) => workCard(w, { removable: false })).join('')

  $('#foot-sources').textContent = skills.map((s) => `${s.name}@${s.source?.commit?.slice(0, 7) || '—'}`).join(' · ')
  mountLive()
}

// 网页作品的实时预览：1440×900 的 iframe 缩放到卡片宽度
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue
    const box = e.target
    io.unobserve(box)
    const f = document.createElement('iframe')
    f.src = box.dataset.live
    f.loading = 'lazy'
    f.tabIndex = -1
    f.setAttribute('aria-hidden', 'true')
    f.style.transform = `scale(${box.clientWidth / 1440})`
    box.appendChild(f)
  }
}, { rootMargin: '200px' })
function mountLive() { document.querySelectorAll('.thumb[data-live]').forEach((b) => io.observe(b)) }
addEventListener('resize', () => document.querySelectorAll('.thumb iframe').forEach((f) => (f.style.transform = `scale(${f.parentElement.clientWidth / 1440})`)))

document.addEventListener('click', async (e) => {
  const b = e.target.closest('button')
  if (!b || !data) return
  if (b.dataset.starter) start(data.skills.find((s) => s.name === b.dataset.starter).starter)
  else if (b.dataset.recipe) start(data.recipes.find((r) => r.id === b.dataset.recipe).prompt)
  else if (b.dataset.next) start([...data.works, ...data.examples].find((w) => w.id === b.dataset.next).next)
  else if (b.dataset.column) start(data.columns.find((c) => c.name === b.dataset.column).next)
  else if (b.dataset.voice) start(data.voice.prompts[b.dataset.voice])
  else if (b.dataset.filter) { filter[b.dataset.filter] = b.dataset.skill; render() }
  else if (b.dataset.remove) {
    const w = data.works.find((x) => x.id === b.dataset.remove)
    if (!confirm(`把「${w.title}」移出作品库？作品文件不会删除。`)) return
    const r = await fetch('api/works/remove', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: w.id }) }).then((x) => x.json())
    if (r.ok) { toast('已移出作品库'); load() }
  }
})

async function load() {
  data = await fetch('api/catalog', { cache: 'no-store' }).then((r) => r.json())
  render()
}
load()
// 回到这个页面时刷新：对话里刚登记的作品马上能看到
addEventListener('focus', load)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load() })
