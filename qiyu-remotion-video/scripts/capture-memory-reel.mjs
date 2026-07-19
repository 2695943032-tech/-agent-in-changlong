import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const recordingsDir = path.join(root, 'public', 'recordings');
await mkdir(recordingsDir, {recursive: true});

const username = process.env.QIYU_SITE_USER;
const password = process.env.QIYU_SITE_PASSWORD;
if (!username || !password) {
  throw new Error('Set QIYU_SITE_USER and QIYU_SITE_PASSWORD before recording.');
}

const browser = await chromium.launch({channel: 'chrome', headless: true});
const context = await browser.newContext({
  viewport: {width: 540, height: 960},
  deviceScaleFactor: 1,
  httpCredentials: {username, password},
  recordVideo: {dir: recordingsDir, size: {width: 540, height: 960}},
  colorScheme: 'light',
  reducedMotion: 'no-preference',
});

await context.addInitScript(() => {
  window.addEventListener('DOMContentLoaded', () => {
    const cursor = document.createElement('div');
    cursor.id = 'qiyu-demo-cursor';
    Object.assign(cursor.style, {
      position: 'fixed',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      background: 'rgba(224, 178, 78, 0.95)',
      border: '3px solid rgba(255,255,255,.96)',
      boxShadow: '0 4px 18px rgba(0,0,0,.3)',
      pointerEvents: 'none',
      zIndex: '2147483647',
      transform: 'translate(-50%, -50%)',
    });
    document.documentElement.append(cursor);
    window.addEventListener('mousemove', (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    });
  });
});

const page = await context.newPage();
await page.goto('https://qiyucl.site/posttrip', {waitUntil: 'domcontentloaded'});
await page.waitForLoadState('networkidle').catch(() => {});

const playButton = page.getByRole('button', {name: /播放回忆短片/});
await playButton.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
const playBox = await playButton.boundingBox();
if (playBox) {
  await page.mouse.move(playBox.x + playBox.width / 2, playBox.y + playBox.height / 2, {steps: 14});
}
await playButton.click();
await page.waitForTimeout(2600);

for (let index = 0; index < 4; index++) {
  const next = page.getByRole('button', {name: /下一幕/});
  await next.waitFor({timeout: 10000});
  const box = await next.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {steps: 12});
  }
  await page.waitForTimeout(220);
  await next.click();
  await page.waitForTimeout(index === 3 ? 3400 : 3200);
}

await page.waitForTimeout(900);
const video = page.video();
await page.close();
if (!video) throw new Error('Memory reel recording was not created.');
await video.saveAs(path.join(recordingsDir, 'memory-reel.webm'));
await context.close();
await browser.close();

console.log(`Recorded memory reel to ${path.join(recordingsDir, 'memory-reel.webm')}`);
