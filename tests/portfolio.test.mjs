import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createPortfolioServer } from '../scripts/serve.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const projects = JSON.parse(await readFile(new URL('../data/projects.json', import.meta.url), 'utf8'));
let server, browser, base;
const errors = [];
const scans = [];
const pages = [];
async function newPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && !response.url().includes('missing-page')) errors.push(`${response.status()}: ${response.url()}`); });
  pages.push(page);
  return page;
}
async function noOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow, false, `Horizontal overflow: ${label}`);
}
async function axe(page, label) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  scans.push({ label, violations: results.violations.map(v => ({ id: v.id, description: v.description, nodes: v.nodes.map(n => n.target) })) });
  assert.deepEqual(scans.at(-1).violations, [], `Accessibility: ${label}`);
}
const visibleCount = page => page.locator('.project-card:not([hidden])').count();

before(async () => {
  server = createPortfolioServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch();
  await mkdir(new URL('../.test-artifacts/', import.meta.url), { recursive: true });
});
after(async () => {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(new URL('../.test-artifacts/accessibility.json', import.meta.url), JSON.stringify(scans, null, 2));
  await browser?.close();
  server?.close();
});

test('all 13 sample folders and all 12 original projects have generated pages', async () => {
  assert.equal(projects.length, 25);
  assert.equal(projects.filter(p => p.folder).length, 13);
  assert.equal(projects.filter(p => !p.folder).length, 12);
  assert.equal(new Set(projects.map(p => p.slug)).size, 25);
  const files = await readdir(new URL('../projects/', import.meta.url));
  for (const p of projects) {
    assert.ok(files.includes(p.slug + '.html'));
    if (p.folder) assert.equal(p.repo, `https://github.com/ivantang26/${p.folder}`);
  }
  const response = await fetch(base + '/');
  assert.equal(response.status, 200);
  assert.equal((await response.text()).match(/class="project-card"/g).length, 25);
  const resources = new Set();
  for (const file of ['index.html', ...projects.map(p => `projects/${p.slug}.html`)]) {
    const html = await readFile(new URL('../' + file, import.meta.url), 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = new URL(match[1].replaceAll('&amp;', '&'), base + '/Portfolio.io/' + file);
      if (url.origin !== base) continue;
      url.hash = '';
      resources.add(url.href);
    }
  }
  for (const url of resources) assert.equal((await fetch(url, { method: 'HEAD' })).status, 200, url);
});

test('all categories, every style, search intersections, and reset work', async () => {
  const page = await newPage();
  await page.goto(base);
  for (const [category, total] of Object.entries({ design: 13, web: 8, apps: 3, games: 1, all: 25 })) {
    await page.locator(`button[data-category="${category}"]`).click();
    assert.equal(await visibleCount(page), total);
    assert.equal(await page.locator(`button[data-category="${category}"]`).getAttribute('aria-pressed'), 'true');
  }
  for (const project of projects.filter(p => p.folder)) {
    await page.selectOption('#project-style', project.style);
    assert.equal(await visibleCount(page), 1, project.style);
    assert.equal(await page.locator('.project-card:not([hidden])').getAttribute('data-project'), project.slug);
  }
  await page.locator('button[data-category="all"]').click();
  await page.fill('#project-search', 'Next.js');
  assert.equal(await visibleCount(page), 5);
  await page.fill('#project-search', 'astro keyboard');
  assert.equal(await visibleCount(page), 0); // Search indexes card text, not hidden case-study copy.
  await page.locator('[data-reset-filters]').click();
  assert.equal(await visibleCount(page), 25);
  assert.equal(await page.locator('#project-search').inputValue(), '');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'project-search');
  await page.fill('#project-search', 'lumen');
  await page.locator('button[data-category="apps"]').click();
  assert.equal(await visibleCount(page), 0);
  assert.equal(await page.locator('#empty-state').isVisible(), true);
  await page.locator('[data-reset-filters]').click();
  await page.fill('#project-search', '  ORBIT  ');
  assert.equal(await visibleCount(page), 1);
  await page.close();
});

test('URL state, reload, browser history, and list view stay synchronized', async () => {
  const page = await newPage();
  await page.goto(base + '/?category=design&style=Glassmorphism&q=lumen&view=list#work');
  assert.equal(await visibleCount(page), 1);
  assert.match(await page.locator('#project-grid').getAttribute('class'), /is-list/);
  assert.equal(await page.locator('#project-search').inputValue(), 'lumen');
  await page.reload();
  assert.equal(await visibleCount(page), 1);
  await page.fill('#project-search', '');
  await page.locator('button[data-category="web"]').click();
  assert.equal(await visibleCount(page), 8);
  await page.goBack();
  assert.equal(await visibleCount(page), 1);
  assert.equal(await page.locator('#project-style').inputValue(), 'Glassmorphism');
  await page.goForward();
  assert.equal(await visibleCount(page), 8);
  await page.goto(base + '/?category=invalid&style=invalid&view=invalid');
  assert.equal(await visibleCount(page), 25);
  assert.equal(await page.locator('button[data-view="grid"]').getAttribute('aria-pressed'), 'true');
  await page.close();
});

test('every detail page loads, links to its real assets, and passes mobile accessibility', { timeout: 180000 }, async () => {
  const page = await newPage({ viewport: { width: 390, height: 844 } });
  for (const p of projects) {
    await page.goto(`${base}/Portfolio.io/projects/${p.slug}.html`);
    await page.locator('.case-image img').evaluate(img => img.decode());
    assert.equal(await page.locator('h1').textContent(), p.title);
    assert.equal(await page.locator('.case-image img').evaluate(img => img.naturalWidth > 0), true);
    const hrefs = await page.locator('.project-actions a').evaluateAll(links => links.map(a => a.getAttribute('href')));
    assert.deepEqual(hrefs, p.folder ? [p.demo, p.repo] : ['../' + p.fullImage]);
    assert.equal(await page.locator('.project-pager a').count(), 2);
    await noOverflow(page, p.slug);
    await axe(page, p.slug + ' / 390px');
  }
  await page.goto(base + '/projects/vela.html');
  await page.screenshot({ path: root + '.test-artifacts/mobile-project.png', fullPage: true });
  await page.close();
});

test('home and grid/list layouts fit 320–1920px; no external resources are loaded', { timeout: 120000 }, async () => {
  const page = await newPage();
  const externalRequests = [];
  page.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('data:')) externalRequests.push(request.url()); });
  await page.goto(base + '/Portfolio.io/');
  for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator('button[data-view="grid"]').click();
    await noOverflow(page, width + ' / grid');
    await page.locator('button[data-view="list"]').click();
    await noOverflow(page, width + ' / list');
  }
  await page.locator('button[data-view="grid"]').click();
  // Full-page review images should not contain unrequested lazy-image placeholders.
  await page.locator('img').evaluateAll(images => {
    images.forEach(image => { image.loading = 'eager'; });
    return Promise.all(images.map(image => image.decode()));
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: root + '.test-artifacts/desktop-home.png' });
  await axe(page, 'home / 1440px');
  await page.evaluate(() => document.getElementById('work').scrollIntoView());
  await page.screenshot({ path: root + '.test-artifacts/desktop-work.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: root + '.test-artifacts/mobile-home.png', fullPage: true });
  await axe(page, 'home / 390px');
  assert.deepEqual(externalRequests, []);
  await page.close();
});

test('email draft validation, safe encoding, and stale-draft invalidation', async () => {
  const page = await newPage();
  await page.goto(base + '/#contact');
  const submit = page.locator('[data-form] button[type="submit"]');
  await submit.click();
  assert.equal(await page.locator('[aria-invalid="true"]').count(), 3);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'fullname');
  await page.fill('#fullname', '   ');
  await page.fill('#email', 'invalid-email');
  await page.fill('#message', 'Hello');
  await submit.click();
  assert.equal(await page.locator('[aria-invalid="true"]').count(), 2);
  await page.fill('#fullname', 'Alex & 陳');
  await page.fill('#email', 'alex@example.com');
  await page.fill('#message', 'A project with a + sign & new ideas?\nLet’s talk.');
  await submit.click();
  assert.equal(await page.locator('[data-form-result]').isVisible(), true);
  const draft = new URL(await page.locator('[data-email-draft]').getAttribute('href'));
  assert.equal(draft.protocol, 'mailto:');
  assert.equal(draft.pathname, 'ivantang26official@gmail.com');
  assert.equal(draft.searchParams.get('subject'), 'Portfolio enquiry from Alex & 陳');
  assert.match(draft.searchParams.get('body'), /A project with a \+ sign & new ideas\?/);
  assert.match(draft.searchParams.get('body'), /Reply to: alex@example.com/);
  await page.fill('#message', 'Updated message');
  assert.equal(await page.locator('[data-form-result]').isVisible(), false);
  assert.equal(await page.locator('[data-email-draft]').getAttribute('href'), null);
  await page.close();
});

test('keyboard navigation, old bookmarks, and nested 404 recovery', async () => {
  const page = await newPage();
  await page.goto(base);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to content');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content');
  await page.locator('.main-nav a[href="#contact"]').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'contact');
  await page.goto(base + '/#resume');
  await page.waitForURL('**/#experience');
  await page.goto(base + '/#portfolio');
  await page.waitForURL('**/#work');
  await page.goto(base + '/#portfolio/receipthy');
  await page.waitForURL('**/projects/receipthy.html');
  const response = await page.goto(base + '/Portfolio.io/missing-page/nested');
  assert.equal(response.status(), 404);
  await page.locator('.button').click();
  await page.waitForURL('**/Portfolio.io/#work');
  assert.equal(await visibleCount(page), 25);
  await page.close();
});

test('no-JavaScript and direct-file previews retain all content and project links', async () => {
  const page = await newPage({ javaScriptEnabled: false });
  await page.goto(base);
  assert.equal(await visibleCount(page), 25);
  assert.equal(await page.locator('.project-tools').isVisible(), false);
  assert.equal(await page.locator('[data-form]').getAttribute('action'), 'mailto:ivantang26official@gmail.com');
  await page.locator('[data-project="orbit"] a').click();
  assert.equal(await page.locator('h1').textContent(), 'Orbit');
  await page.close();
  const filePage = await newPage();
  await filePage.goto(new URL('../index.html', import.meta.url).href);
  assert.equal(await visibleCount(filePage), 25);
  await filePage.locator('button[data-category="games"]').click();
  assert.equal(await visibleCount(filePage), 1);
  await filePage.close();
});

test('no browser runtime errors or broken local resources', () => { assert.deepEqual(errors, []); });
