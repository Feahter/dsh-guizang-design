// 歸藏设计 · DeepSeek Harness 插件：浏览器半边
//   - 侧栏加一个「歸藏设计」入口，主区域是插件页面（/guizang-design/，iframe）
//   - 页面里点「开始」「使用这个工作流」「做同风格的下一份」：页面 postMessage 一段草稿，
//     这里开一个新对话并把草稿填进输入框（不直接发送，用户补完内容再发）
window.__ModuleLoader__.load({
  id: 'dsh-guizang-design',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const h = React.createElement
    const PANEL = 'guizang-design'
    const SRC = '/guizang-design/'

    // 侧栏图标：一页翻开的杂志
    function StudioIcon(props) {
      const s = (props && props.size) || 18
      return h('svg', { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round' },
        h('path', { d: 'M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z' }),
        h('path', { d: 'M12 6.5v13' }))
    }

    function apply(ctx) {
      // 明暗跟随 dsh：主题服务在的话，把当前配色发给页面，切换时再发（页面那边见 gallery/scheme.js）
      const frames = new Set()
      let scheme = null
      const post = (frame) => scheme && frame.contentWindow && frame.contentWindow.postMessage({ type: 'guizang-design:scheme', scheme }, location.origin)
      ctx.inject(['theme'], (c) => {
        const push = (snap) => { scheme = snap.active.colorScheme; frames.forEach(post) }
        push(c.theme.getTheme())
        c.on('theme/change', push)
      })

      // 语言跟随 dsh：locale 服务在的话用它，切换时发给页面（页面那边见 gallery/i18n.js）；老版本没有这个服务时跟随浏览器语言
      let lang = /^en\b/i.test(navigator.language) ? 'en' : 'zh'
      const postLang = (frame) => frame.contentWindow && frame.contentWindow.postMessage({ type: 'guizang-design:locale', lang }, location.origin)
      ctx.inject(['locale'], (c) => {
        const push = (snap) => { lang = snap.active; frames.forEach(postLang) }
        push(c.locale.getSnapshot())
        c.on('locale/change', push)
      })
      const LABEL = { zh: '歸藏设计', en: 'Guizang Design' }

      function StudioPanel() {
        const ref = React.useRef(null)
        // 首帧语言放在地址里；之后的切换走 postMessage，不重新加载页面
        const [src] = React.useState(() => `${SRC}?lang=${lang}`)
        React.useEffect(() => {
          const self = ref.current
          if (self) frames.add(self)
          function onMessage(e) {
            const frame = ref.current
            if (!frame || e.source !== frame.contentWindow || e.origin !== location.origin) return
            const m = e.data
            if (!m || m.type !== 'guizang-design:start' || typeof m.prompt !== 'string') return
            try {
              ctx.uiWorkspace.startSession(undefined, { prompt: m.prompt, whenDraftExists: 'replace' })
            } catch (err) {
              console.error('[guizang-design] 开新对话失败', err)
              frame.contentWindow.postMessage({ type: 'guizang-design:start-failed', message: String(err && err.message || err) }, location.origin)
            }
          }
          addEventListener('message', onMessage)
          return () => { removeEventListener('message', onMessage); frames.delete(self) }
        }, [])
        return h('iframe', { ref, src, title: LABEL[lang], allow: 'fullscreen', onLoad: (e) => { post(e.currentTarget); postLang(e.currentTarget) }, style: { width: '100%', height: '100%', border: 0, display: 'block' } })
      }
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register({ name: 'sidebar.panellist', id: PANEL, order: 6, label: () => LABEL[lang] }, StudioIcon))
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL }, StudioPanel))
    }

    exports.isPlugin = true
    exports.inject = ['slots', 'uiWorkspace']
    exports.apply = apply
    return module.exports
  },
})
