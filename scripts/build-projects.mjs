import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const projects = JSON.parse(await readFile(path.join(root, 'data/projects.json'), 'utf8'));
const categories = { design: 'Design exploration', web: 'Web & AI', apps: 'Application', games: 'Game' };
const escape = (value) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const size = (p, full = false) => {
  const [width, height] = (full ? p.fullSize : p.imageSize) || [1440, 1000];
  return `width="${width}" height="${height}"`;
};

assert.equal(new Set(projects.map(p => p.slug)).size, projects.length, 'Project slugs must be unique.');
for (const project of projects) {
  assert.match(project.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(categories[project.category], `Unknown collection: ${project.slug}`);
  for (const key of ['title', 'discipline', 'style', 'summary', 'overview', 'note', 'alt']) assert.ok(project[key]?.trim(), `Missing ${key}: ${project.slug}`);
  assert.ok(Array.isArray(project.stack) && project.highlights.length >= 1);
  for (const asset of [project.image, project.fullImage].filter(Boolean)) {
    assert.ok(asset.startsWith('assets/images/') && !asset.includes('..'), `Unsafe asset: ${asset}`);
    await access(path.join(root, asset));
  }
  for (const link of [project.demo, project.repo].filter(Boolean)) assert.equal(new URL(link).protocol, 'https:');
  if (project.folder) assert.ok(project.repo && project.demo && project.category === 'design');
}
// When the source collection is available, prove that every project folder is represented.
const sourceDir = path.resolve(root, '../Sample-Portfolio');
let sourceFolders;
try { sourceFolders = await readdir(sourceDir, { withFileTypes: true }); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (sourceFolders) {
  const names = sourceFolders.filter(p => p.isDirectory() && !p.name.startsWith('.')).map(p => p.name).sort();
  assert.deepEqual(projects.filter(p => p.folder).map(p => p.folder).sort(), names, 'Sample-Portfolio coverage is incomplete.');
}

function card(p, index) {
  const searchable = [p.title, p.summary, p.discipline, p.style, p.folder || '', ...p.stack].join(' ');
  const tags = p.stack.length ? p.stack.slice(0, 3) : [p.discipline];
  return `        <li class="project-card" data-project="${p.slug}" data-category="${p.category}" data-style="${escape(p.folder ? p.style : '')}" data-search="${escape(searchable)}">
          <a class="project-link" href="./projects/${p.slug}.html" aria-label="Explore ${escape(p.title)}">
            <figure class="project-media"><img src="./${p.image}" alt="${escape(p.alt)}" ${size(p)} loading="lazy" decoding="async"><span class="project-arrow" aria-hidden="true">↗</span></figure>
            <div class="project-copy">
              <p class="project-kicker"><span>${String(index + 1).padStart(2, '0')} / ${escape(p.style)}</span><span>${p.folder ? 'Concept build' : 'Original work'}</span></p>
              <div class="project-title-row"><h3>${escape(p.title)}</h3><span aria-hidden="true">↗</span></div>
              <p class="project-summary">${escape(p.summary)}</p>
              <div class="project-tags">${tags.map(tag => `<span>${escape(tag)}</span>`).join('')}</div>
            </div>
          </a>
        </li>`;
}

const external = (href, label, secondary = false) => `<a class="button${secondary ? ' button-secondary' : ''}" href="${escape(href)}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>`;
function detail(p, index) {
  const previous = projects[(index + projects.length - 1) % projects.length];
  const next = projects[(index + 1) % projects.length];
  const full = p.fullImage || p.image;
  return `<!doctype html>
<!-- Generated from data/projects.json by scripts/build-projects.mjs. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(p.title)} — ${escape(p.discipline)} | Ivan Tang</title>
  <meta name="description" content="${escape(p.summary)}">
  <meta name="theme-color" content="#f7f8f2">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escape(p.title)} | Ivan Tang">
  <meta property="og:description" content="${escape(p.summary)}">
  <meta property="og:image" content="https://ivantang26.github.io/Portfolio.io/${p.image}">
  <meta property="og:image:alt" content="${escape(p.alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="../assets/images/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="../assets/css/outfit-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../assets/css/style.css">
  <script src="../assets/js/script.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header"><div class="header-inner wrap"><a class="wordmark" href="../index.html" aria-label="Ivan Tang, home">ivan tang<span aria-hidden="true">✳</span></a><nav class="main-nav" aria-label="Main navigation"><a href="../index.html#work">All work <span class="nav-count">${projects.length}</span></a><a href="../index.html#about">About</a><a href="../index.html#experience">Experience</a><a href="../index.html#contact">Let’s talk <span aria-hidden="true">↗</span></a></nav></div></header>
  <main class="project-page wrap" id="main-content" tabindex="-1">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="../index.html#work">← All projects</a><span aria-hidden="true">/</span><span aria-current="page">${escape(p.title)}</span></nav>
    <header class="project-hero"><div><p class="eyebrow">${escape(categories[p.category])} / ${escape(p.style)}</p><h1>${escape(p.title)}</h1><p class="project-lede">${escape(p.summary)}</p></div><div class="project-actions">${p.demo ? external(p.demo, 'Open live demo') + external(p.repo, 'View source', true) : external('../' + full, 'Open full-size preview')}</div></header>
    <figure class="case-image${p.folder ? '' : ' is-original'}"><a href="../${full}" target="_blank" rel="noopener noreferrer" aria-label="Open full-size ${escape(p.title)} screenshot in a new tab"><img src="../${p.image}" alt="${escape(p.alt)}" ${size(p)} fetchpriority="high"></a><figcaption>${p.folder ? 'Screenshot of the deployed concept project. Select the image to view it full size.' : 'Original portfolio preview. Select the image to open the full-resolution version.'}</figcaption></figure>
    <div class="case-content">
      <aside aria-label="Project facts"><dl class="case-facts"><div><dt>Project</dt><dd>${escape(p.discipline)}</dd></div><div><dt>Visual direction</dt><dd>${escape(p.style)}</dd></div><div><dt>Technology</dt><dd>${p.stack.length ? escape(p.stack.join(' · ')) : 'Not documented in the original portfolio'}</dd></div><div><dt>Project type</dt><dd>${p.folder ? 'Functional concept for a fictional brand' : 'Original portfolio · screenshot showcase'}</dd></div>${p.folder ? `<div><dt>Source folder</dt><dd><code>Sample-Portfolio/${escape(p.folder)}</code></dd></div>` : ''}</dl></aside>
      <section class="case-overview" aria-labelledby="overview-title"><h2 id="overview-title">The idea behind the interface.</h2><p>${escape(p.overview)}</p><h3>${p.folder ? 'Inside the build' : 'In the supplied preview'}</h3><ol class="case-highlights">${p.highlights.map(text => `<li>${escape(text)}</li>`).join('')}</ol><div class="case-note"><h3>Scope &amp; context</h3><p>${escape(p.note)}</p></div></section>
    </div>
    <nav class="project-pager" aria-label="More projects"><a href="./${previous.slug}.html"><span>← Previous project</span><strong>${escape(previous.title)}</strong></a><a href="./${next.slug}.html"><span>Next project →</span><strong>${escape(next.title)}</strong></a></nav>
  </main>
  <footer class="site-footer case-footer wrap"><div class="footer-top"><a class="wordmark" href="../index.html">ivan tang<span aria-hidden="true">✳</span></a><p>Have something in mind?</p><a class="text-link" href="../index.html#contact">Let’s build it <span aria-hidden="true">↗</span></a></div><div class="footer-bottom"><p>© <span data-year>2026</span> Ivan Tang</p><a class="text-link" href="../index.html#work">Back to the collection <span aria-hidden="true">↗</span></a></div></footer>
</body>
</html>
`;
}

async function output(relative, content) {
  const file = path.join(root, relative);
  if (check) {
    assert.equal(await readFile(file, 'utf8'), content, `${relative} is stale. Run npm run build.`);
  } else {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
}
function replaceRegion(html, name, content) {
  const start = `<!-- ${name}:START -->`;
  const end = `<!-- ${name}:END -->`;
  assert.equal(html.split(start).length, 2, `Missing or duplicate ${name} marker`);
  assert.equal(html.split(end).length, 2, `Missing or duplicate ${name} marker`);
  const before = html.indexOf(start) + start.length;
  const after = html.indexOf(end);
  return html.slice(0, before) + '\n' + content + '\n        ' + html.slice(after);
}
const styles = [...new Set(projects.filter(p => p.folder).map(p => p.style))].sort();
let index = await readFile(path.join(root, 'index.html'), 'utf8');
index = replaceRegion(index, 'PROJECTS', projects.map(card).join('\n'));
index = replaceRegion(index, 'STYLES', styles.map(s => `          <option value="${escape(s)}">${escape(s)}</option>`).join('\n'));
index = index.replace(/(<(?:span|strong)[^>]*data-total-count[^>]*>)\d+(<\/(?:span|strong)>)/g, `$1${projects.length}$2`);
index = index.replace(/(<strong data-style-count>)\d+(<\/strong>)/g, `$1${styles.length}$2`);
index = index.replace(/(<span data-count="([a-z]+)">)\d+(<\/span>)/g, (_, open, category, close) => open + (category === 'all' ? projects.length : projects.filter(p => p.category === category).length) + close);
index = index.replace(/Showing all \d+ projects/, `Showing all ${projects.length} projects`);
await output('index.html', index);
for (let i = 0; i < projects.length; i++) await output(`projects/${projects[i].slug}.html`, detail(projects[i], i));
console.log(`${check ? 'Verified' : 'Generated'} ${projects.length} project cards and detail pages; ${styles.length} source design styles covered.`);
