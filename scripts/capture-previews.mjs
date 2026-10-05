// Optional maintainer tool. Captures real deployed websites, not invented mockups.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const projects = JSON.parse(await readFile(path.join(root, 'data/projects.json'), 'utf8'));
const requested = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
const records = [];
await mkdir(path.join(root, 'assets/images/projects'), { recursive: true });
try {
  for (const project of projects.filter(p => p.demo && (!requested.length || requested.includes(p.slug)))) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce', colorScheme: 'light' });
    const url = project.demo + (project.capturePath || '/');
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      if (!response || !response.ok()) throw new Error(`HTTP ${response?.status()}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(2500);
      const title = await page.title();
      if (/application error|deployment not found|404:|vercel security checkpoint/i.test(title)) throw new Error(title);
      await page.screenshot({ path: path.join(root, project.image), type: 'jpeg', quality: 85, animations: 'disabled' });
      records.push({ slug: project.slug, url, title, image: project.image, capturedAt: new Date().toISOString(), width: 1440, height: 1000 });
      console.log(`Captured ${project.title}: ${title}`);
    } catch (error) {
      console.error(`Could not capture ${project.title}: ${error.message}`);
      process.exitCode = 1;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
const recordPath = path.join(root, 'data/preview-sources.json');
let previous = [];
try { previous = JSON.parse(await readFile(recordPath, 'utf8')); } catch {}
const updated = [...previous.filter(p => !records.some(r => r.slug === p.slug)), ...records];
await writeFile(recordPath, JSON.stringify(updated, null, 2) + '\n');
