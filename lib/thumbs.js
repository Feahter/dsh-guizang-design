// 网页作品的缩略图：登记时用无头浏览器截首屏（1440×900，JPEG），存在 <dataDir>/thumbs/<id>.jpg。
// 浏览器不可用时不报错，展示库退回实时预览。
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// playwright 自带版本的浏览器没下载时，退到本机已有的 Chromium（别的版本的 playwright 下载过的）或系统 Chrome
function fallbackBrowsers() {
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), process.platform === 'darwin' ? 'Library/Caches/ms-playwright' : '.cache/ms-playwright')
  const found = []
  if (existsSync(cache)) {
    for (const d of readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      for (const rel of ['chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome', 'chrome-win/chrome.exe']) {
        if (existsSync(join(cache, d, rel))) found.push(join(cache, d, rel))
      }
    }
  }
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']) if (existsSync(p)) found.push(p)
  return found
}

async function launch(chromium) {
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
  try { return await chromium.launch({ args }) } catch (e) {
    for (const executablePath of fallbackBrowsers()) {
      try { return await chromium.launch({ args, executablePath }) } catch {}
    }
    throw e
  }
}

export async function makeThumb(htmlFile, outFile) {
  let chromium
  try { ({ chromium } = await import('playwright')) } catch { return false }
  mkdirSync(join(outFile, '..'), { recursive: true })
  const browser = await launch(chromium)
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
    await page.evaluate(async () => {
      await document.fonts.ready
      if (window.GZEffects) await Promise.race([window.GZEffects.ready, new Promise((r) => setTimeout(r, 4000))])
    }).catch(() => {})
    await page.waitForTimeout(800)
    await page.screenshot({ path: outFile, type: 'jpeg', quality: 82 })
    return true
  } finally {
    await browser.close()
  }
}
