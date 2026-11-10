import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { marketInstallTarget, parseMarketIndex } from '@deepseek-ai/dsh-plugin-market-index'
import { latestMarketVersion, reconcileDistTags } from '../scripts/index-entry.mjs'

const INDEX_URL = 'https://raw.githubusercontent.com/op7418/dsh-guizang-design/main/index.json'

const doc = (overrides = {}) => ({
  'dist-tags': { latest: '0.1.4' },
  time: { '0.1.4': '2026-11-05T08:06:41.964Z' },
  versions: {
    '0.1.4': { name: 'dsh-guizang-design', version: '0.1.4', engines: { dsh: '>=0.2.1-rc.2 <0.3.0' } },
  },
  ...overrides,
})

test('index.json：官方校验器接受，安装地址指向 npm 上的 dsh-guizang-design', () => {
  const index = JSON.parse(readFileSync(new URL('../index.json', import.meta.url), 'utf8'))
  const parsed = parseMarketIndex(index, INDEX_URL)
  assert.equal(parsed.plugins.length, 1)
  const [plugin] = parsed.plugins
  assert.equal(plugin.name, 'dsh-guizang-design')
  assert.equal(plugin.icon, 'https://raw.githubusercontent.com/op7418/dsh-guizang-design/main/icon.png')
  const [version] = plugin.versions
  assert.deepEqual(marketInstallTarget(plugin.name, version).spec, 'dsh-guizang-design@0.1.4')
})

test('index.json：列表里的版本和 engines 与 package.json、发布版一致', () => {
  const index = JSON.parse(readFileSync(new URL('../index.json', import.meta.url), 'utf8'))
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const plugin = index.plugins.find(entry => entry.name === manifest.name)
  assert.ok(plugin, 'index.json 里没有当前包名')
  assert.equal(plugin.versions[0].engines.dsh, manifest.engines.dsh)
})

test('latestMarketVersion：取最新发布，发布时间转成 Unix 秒，engines 用发布时的声明', () => {
  assert.deepEqual(latestMarketVersion(doc()), {
    version: '0.1.4',
    publishTimestamp: 1793866001,
    source: { type: 'npm' },
    engines: { dsh: '>=0.2.1-rc.2 <0.3.0' },
  })
})

test('latestMarketVersion：没有 latest 标签就报错', () => {
  assert.throws(() => latestMarketVersion(doc({ 'dist-tags': {} })), /latest/)
})

test('latestMarketVersion：最新版不在 versions 里就报错', () => {
  assert.throws(() => latestMarketVersion(doc({ 'dist-tags': { latest: '9.9.9' } })), /9\.9\.9/)
})

test('latestMarketVersion：发布版没有 engines.dsh 就报错', () => {
  const broken = doc({ versions: { '0.1.4': { name: 'dsh-guizang-design', version: '0.1.4' } } })
  assert.throws(() => latestMarketVersion(broken), /engines\.dsh/)
})

test('latestMarketVersion：发布时间缺失或读不出就报错', () => {
  assert.throws(() => latestMarketVersion(doc({ time: {} })), /发布时间/)
  assert.throws(() => latestMarketVersion(doc({ time: { '0.1.4': 'soon' } })), /发布时间/)
})

test('官方校验器：engines.dsh 不是 SemVer 区间时整份索引被拒', () => {
  const index = {
    format: 1,
    title: { en: 'Guizang Design', zh: '歸藏设计' },
    metadata: {},
    plugins: [{
      name: 'dsh-guizang-design',
      metadata: {},
      versions: [{ version: '0.1.4', publishTimestamp: 1793866001, source: { type: 'npm' }, engines: { dsh: 'not a range at all' } }],
    }],
  }
  assert.throws(() => parseMarketIndex(index, INDEX_URL), /\$\.plugins\[0\]\.versions\[0\]\.engines\.dsh/)
})

test('官方校验器：分类没在 metadata 里声明时整份索引被拒', () => {
  const index = {
    format: 1,
    title: 'Guizang Design',
    metadata: {},
    plugins: [{
      name: 'dsh-guizang-design',
      metadata: { category: 'design' },
      versions: [{ version: '0.1.4', publishTimestamp: 1793866001, source: { type: 'npm' }, engines: { dsh: '>=0.2.1-rc.2 <0.3.0' } }],
    }],
  }
  assert.throws(() => parseMarketIndex(index, INDEX_URL), /category/)
})

test('reconcileDistTags：保留指向已列出版本的标签，丢掉指空的', () => {
  const warned = []
  const plugin = { 'dist-tags': { latest: '0.1.4', next: '0.2.0-rc.1' } }
  reconcileDistTags(plugin, [{ version: '0.1.4' }], message => warned.push(message))
  assert.deepEqual(plugin['dist-tags'], { latest: '0.1.4' })
  assert.equal(warned.length, 1)
  assert.match(warned[0], /0\.2\.0-rc\.1/)
})

test('reconcileDistTags：全都不指向列出的版本时删掉整个字段', () => {
  const plugin = { 'dist-tags': { next: '0.2.0-rc.1' } }
  reconcileDistTags(plugin, [{ version: '0.1.4' }], () => {})
  assert.equal('dist-tags' in plugin, false)
})

test('reconcileDistTags：没有 dist-tags 时什么都不做', () => {
  const plugin = {}
  reconcileDistTags(plugin, [{ version: '0.1.4' }], () => {})
  assert.deepEqual(plugin, {})
})
