// Assembles the deployable static site into public/.
//
// The site source lives at the repository root so GitHub Pages can serve it
// directly and so index.html stays editable in place. Vercel, however, expects
// a dedicated build output directory (public/ by default) and fails with
// "No Output Directory named public found after the Build completed" when the
// build only rewrites files at the root. This module copies the publishable
// files into public/, rewrites the one GitHub Pages-specific URL for a
// domain-root deployment, and fails the build if any local link would 404.
import { access, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'public');
const bytesPerMegabyte = 1024 * 1024;

// Everything a visitor needs, and nothing else: no tests, scripts, source
// data, documentation, or node_modules ship to the CDN.
const directories = ['assets', 'projects'];
const pages = ['index.html', '404.html'];
const forbidden = ['.git', 'data', 'node_modules', 'package.json', 'scripts', 'tests', 'README.md', 'DESIGN-AUDIT.md'];

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

async function copyTree(source, target, totals) {
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyTree(from, to, totals);
    } else if (entry.isFile()) {
      await copyFile(from, to);
      totals.files += 1;
      totals.bytes += (await stat(from)).size;
    } else {
      throw new Error(`Cannot publish unsupported entry: ${from}`);
    }
  }
}

const references = (markup) => {
  const found = new Set();
  for (const match of markup.matchAll(/(?:href|src)="([^"]*)"/g)) found.add(match[1]);
  for (const match of markup.matchAll(/srcset="([^"]*)"/g)) {
    for (const candidate of match[1].split(',')) {
      const [url] = candidate.trim().split(/\s+/);
      if (url) found.add(url);
    }
  }
  return found;
};

const origin = 'https://deploy.invalid';
const resolve = (file, reference) => {
  const decoded = reference.replaceAll('&amp;', '&');
  if (!decoded || decoded.startsWith('#')) return null;
  let url;
  try { url = new URL(decoded, `${origin}/${file}`); } catch { return null; }
  if (url.origin !== origin) return null;
  return decodeURIComponent(url.pathname);
};

export async function buildSite() {
  const projects = JSON.parse(await readFile(path.join(root, 'data/projects.json'), 'utf8'));
  const totals = { files: 0, bytes: 0 };

  // 1. Rebuild the output from scratch so a removed project never lingers in
  //    the deployed artifact.
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  // 2. Copy the home page and the 404 page.
  const index = await readFile(path.join(root, 'index.html'), 'utf8');
  await writeFile(path.join(out, 'index.html'), index);
  totals.files += 1;
  totals.bytes += Buffer.byteLength(index);

  // 404.html exists for GitHub Pages, which serves it at arbitrary nested paths
  // and therefore needs the repository subpath as its base URL. The Vercel
  // deployment lives at the domain root, so the base must be "/" instead.
  const notFound = await readFile(path.join(root, '404.html'), 'utf8');
  const githubBase = '<base href="/Portfolio.io/">';
  assert.equal(notFound.split(githubBase).length, 2, '404.html must contain exactly one GitHub Pages <base> element.');
  const notFoundForDomainRoot = notFound.replace(githubBase, '<base href="/">');
  await writeFile(path.join(out, '404.html'), notFoundForDomainRoot);
  totals.files += 1;
  totals.bytes += Buffer.byteLength(notFoundForDomainRoot);

  // 3. Copy the shared assets and the generated project pages.
  for (const directory of directories) {
    await copyTree(path.join(root, directory), path.join(out, directory), totals);
  }

  // 4. Guard the artifact: every page and preview must be present, and no
  //    source material may leak into the deploy output.
  for (const page of pages) {
    assert.ok(await exists(path.join(out, page)), `Missing ${page} in the deploy output.`);
  }
  for (const project of projects) {
    assert.ok(await exists(path.join(out, 'projects', `${project.slug}.html`)), `Missing project page: ${project.slug}`);
    for (const image of [project.image, project.fullImage].filter(Boolean)) {
      assert.ok(await exists(path.join(out, image)), `Missing preview image: ${image}`);
    }
  }
  for (const item of forbidden) {
    assert.equal(await exists(path.join(out, item)), false, `${item} must not be published.`);
  }

  // 5. Resolve every local href/src in the deployed HTML so a broken link fails
  //    the build here instead of shipping. External URLs and fragments are fine.
  const broken = [];
  for (const page of pages) {
    const markup = await readFile(path.join(out, page), 'utf8');
    for (const reference of references(markup)) {
      const pathname = resolve(page, reference);
      if (pathname === null) continue;
      const target = path.join(out, pathname);
      const resolved = (await exists(target)) || (await exists(path.join(target, 'index.html')));
      if (!resolved) broken.push(`${page} → ${reference}`);
    }
  }
  assert.deepEqual(broken, [], `Broken local links in the deploy output:\n${broken.join('\n')}`);

  return {
    pages: pages.length + projects.length,
    files: totals.files,
    megabytes: Number((totals.bytes / bytesPerMegabyte).toFixed(1)),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const summary = await buildSite();
  console.log(`Assembled public/: ${summary.pages} pages, ${summary.files} files, ${summary.megabytes} MB ready to deploy.`);
}
