// 歸藏工作室 · DeepSeek Harness 插件：浏览器半边
//   - 侧栏加一个「工作室」入口，主区域是展示库页面（/guizang-design/，iframe）
//   - 展示库里点「开始」「用这个配方」「做同风格的下一份」：页面 postMessage 一段草稿，
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
      function StudioPanel() {
        const ref = React.useRef(null)
        React.useEffect(() => {
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
          return () => removeEventListener('message', onMessage)
        }, [])
        return h('iframe', { ref, src: SRC, title: '歸藏工作室', style: { width: '100%', height: '100%', border: 0, display: 'block' } })
      }
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register({ name: 'sidebar.panellist', id: PANEL, order: 6, label: () => '工作室' }, StudioIcon))
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL }, StudioPanel))
    }

    exports.isPlugin = true
    exports.inject = ['slots', 'uiWorkspace']
    exports.apply = apply
    return module.exports
  },
})
