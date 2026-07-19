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

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
});

const context = await browser.newContext({
  viewport: {width: 540, height: 960},
  deviceScaleFactor: 1,
  httpCredentials: {
    username,
    password,
  },
  recordVideo: {
    dir: recordingsDir,
    size: {width: 540, height: 960},
  },
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
      transition: 'width .12s ease, height .12s ease, background .12s ease',
      left: '270px',
      top: '900px',
    });
    document.documentElement.appendChild(cursor);
    window.addEventListener('mousemove', (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    });
    window.addEventListener('mousedown', () => {
      cursor.style.width = '34px';
      cursor.style.height = '34px';
      cursor.style.background = 'rgba(112, 208, 156, .95)';
    });
    window.addEventListener('mouseup', () => {
      cursor.style.width = '24px';
      cursor.style.height = '24px';
      cursor.style.background = 'rgba(224, 178, 78, .95)';
    });
  });
});

const pause = (ms = 320) => new Promise((resolve) => setTimeout(resolve, ms));

const clickDemo = async (page, locator, after = 320) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('Could not locate clickable element');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {steps: 12});
  await pause(120);
  const tagName = await locator.evaluate((element) => element.tagName);
  if (tagName === 'BUTTON' || tagName === 'A' || tagName === 'INPUT') {
    await locator.click({force: true});
  } else {
    await locator.evaluate((element) => {
      element.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));
    });
  }
  await pause(after);
};

const scrollTo = async (page, locator, wait = 450) => {
  await locator.scrollIntoViewIfNeeded();
  await pause(wait);
};

const saveVideo = async (page, name) => {
  const video = page.video();
  await page.close();
  if (!video) throw new Error(`Video recording missing for ${name}`);
  await video.saveAs(path.join(recordingsDir, name));
};

// 01 · 游前：AI 逐问逐答并生成真实路线
{
  const page = await context.newPage();
  await page.goto('https://qiyucl.site/pretrip', {waitUntil: 'domcontentloaded'});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('heading', {name: /先选一位/}).waitFor();
  await pause(2000);

  const pandaChoice = page.getByRole('button', {name: /团团，大熊猫伙伴/});
  const familyChoice = page.getByRole('button', {name: /亲子家庭 成人与儿童同行/});
  await clickDemo(page, pandaChoice, 650);
  try {
    await familyChoice.waitFor({timeout: 2500});
  } catch {
    await page.reload({waitUntil: 'networkidle'});
    await pause(2200);
    await clickDemo(page, page.getByRole('button', {name: /团团，大熊猫伙伴/}), 650);
    await familyChoice.waitFor({timeout: 8000});
  }
  await clickDemo(page, familyChoice);
  await clickDemo(page, page.getByRole('button', {name: '发送给伙伴'}), 200);
  await page.getByText('你们想用什么节奏逛动物园？').waitFor({timeout: 15000});
  await pause(350);

  await clickDemo(page, page.getByRole('button', {name: /悠享慢游/}));
  await clickDemo(page, page.getByRole('button', {name: '发送给伙伴'}), 200);
  await page.getByText('预计几点入园、几点离园？').waitFor({timeout: 15000});
  await page.getByLabel(/预计入园/).selectOption({label: '10:00'});
  await page.getByLabel(/预计离园/).selectOption({label: '18:00'});
  await pause(280);
  await clickDemo(page, page.getByRole('button', {name: '发送给伙伴'}), 200);
  await page.getByText('依次点击最想看的动物').waitFor({timeout: 15000});

  await clickDemo(page, page.getByRole('button', {name: /熊猫园 核心国宝展区/}), 160);
  await clickDemo(page, page.getByRole('button', {name: /考拉馆 适合观察考拉/}), 160);
  await clickDemo(page, page.getByRole('button', {name: /长颈鹿园 互动型展区/}), 160);
  await clickDemo(page, page.getByRole('button', {name: '发送给伙伴'}), 200);
  await page.getByText('需要在园内用餐吗？').waitFor({timeout: 15000});

  await clickDemo(page, page.getByRole('button', {name: '需要园内用餐'}));
  await clickDemo(page, page.getByRole('button', {name: '发送给伙伴'}), 200);
  await page.getByText('还有什么想特别告诉我？').waitFor({timeout: 15000});
  const note = page.getByPlaceholder('例如：孩子下午容易累，希望少走回头路。');
  await note.fill('孩子下午容易累，希望少走回头路。');
  await pause(350);
  await clickDemo(page, page.getByRole('button', {name: '发送给伙伴'}), 200);
  await page.getByRole('button', {name: '生成我的路线'}).waitFor({timeout: 15000});
  await pause(450);

  await clickDemo(page, page.getByRole('button', {name: '生成我的路线'}), 300);
  await page.getByRole('heading', {name: /团团为你安排的亲子家庭路线/}).waitFor({timeout: 20000});
  await pause(700);
  await scrollTo(page, page.getByText('园区路网计算路线'), 900);
  await scrollTo(page, page.getByText('每一站都有距离和理由'), 900);
  await saveVideo(page, 'pretrip.webm');
}

// 02 · 游中：路线、电子围栏、区域伙伴、科普任务和实时改线
{
  const page = await context.newPage();
  await page.goto('https://qiyucl.site/inpark', {waitUntil: 'domcontentloaded'});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByText('今天想按路线走吗？').waitFor();
  await pause(1000);
  await clickDemo(page, page.getByRole('button', {name: /按计划探险/}), 500);
  await page.getByText('LIVE GIS · 50M GEOFENCE').waitFor();
  await pause(700);

  await clickDemo(page, page.getByRole('button', {name: '模拟前往长颈鹿园'}), 550);
  await page.getByRole('button', {name: '演示抵达'}).waitFor();
  await clickDemo(page, page.getByRole('button', {name: '演示抵达'}), 450);
  await page.getByRole('button', {name: '开始这一站'}).waitFor({timeout: 10000});
  await pause(500);
  await clickDemo(page, page.getByRole('button', {name: '开始这一站'}), 500);
  await page.getByRole('heading', {name: /长颈鹿园 现场奇遇站/}).waitFor();
  await scrollTo(page, page.getByText('高处取食挑战'), 650);
  await clickDemo(page, page.getByRole('button', {name: '舌头', exact: true}), 600);
  await scrollTo(page, page.getByText('高空瞭望员', {exact: true}), 650);
  await clickDemo(page, page.getByRole('button', {name: '长颈鹿的舌头为什么这么长？'}), 220);
  await page.getByText('DeepSeek · 配置约束回答', {exact: true}).waitFor({timeout: 15000});
  await pause(800);

  await clickDemo(page, page.getByRole('button', {name: '返回实时地图'}), 450);
  await page.getByText('告诉我现场情况，我来改路线').waitFor();
  await clickDemo(page, page.getByRole('button', {name: '前面排队很长，帮我调整路线'}), 220);
  await page.getByText('伙伴已根据实时客流调整后续顺序').waitFor({timeout: 15000});
  await pause(750);
  await saveVideo(page, 'inpark.webm');
}

// 03 · 游后：成就、足迹、AIGC 回忆短片和票根系统
{
  const page = await context.newPage();
  await page.goto('https://qiyucl.site/posttrip', {waitUntil: 'domcontentloaded'});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('heading', {name: /今天的奇遇/}).waitFor();
  await pause(1000);
  await scrollTo(page, page.getByText('计划是一条线，'), 700);
  await scrollTo(page, page.getByText('今天发生过的事'), 650);
  await scrollTo(page, page.getByText('认真观察过的证明'), 650);
  await scrollTo(page, page.getByText('把一天，剪成一段会呼吸的回忆'), 550);
  await clickDemo(page, page.getByRole('button', {name: /播放回忆短片/}), 500);
  await clickDemo(page, page.getByRole('button', {name: '下一幕 →'}), 650);
  await clickDemo(page, page.getByRole('button', {name: '下一幕 →'}), 550);
  await clickDemo(page, page.getByRole('button', {name: '关闭回忆短片'}), 350);
  await scrollTo(page, page.getByText('领取今日奇遇票根'), 700);
  await clickDemo(page, page.getByRole('link', {name: '生成奇遇票根'}), 350);
  await page.getByRole('heading', {name: '编辑奇遇票根'}).waitFor({timeout: 10000});
  await pause(700);
  await scrollTo(page, page.getByText('票根样式'), 500);
  await clickDemo(page, page.getByRole('button', {name: /02 动物伙伴票/}), 500);
  await scrollTo(page, page.getByText('分享文案'), 500);
  await saveVideo(page, 'posttrip.webm');
}

await context.close();
await browser.close();

console.log(`Recorded site clips to ${recordingsDir}`);
