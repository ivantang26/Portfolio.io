# Ivan Tang — Portfolio

A rewritten, responsive portfolio covering **all 13 projects in `Sample-Portfolio` and all 12 original portfolio entries**. The site includes searchable/filterable project cards, grid and list layouts, 25 individual project pages, an about section, experience and education, and an email-draft contact form.

**Runtime:** static HTML, CSS, and vanilla JavaScript. No framework, CDN, server API, or runtime npm dependency is needed.

## Open the website

Open **`index.html`** in a browser, or use the included local server:

```bash
cd Portfolio.io
npm run dev
```

Visit **http://127.0.0.1:4173**. No package installation is needed just to preview or regenerate the static site. The server also emulates the GitHub Pages path at `/Portfolio.io/`.

## Included design explorations

Each entry has a real screenshot of its deployed demo, a project overview, implementation highlights, scope notes, and links to its demo and GitHub repository. Repository URLs come from the local Git remotes; demo URLs were retrieved from the repositories’ public homepage metadata and successfully opened during the rewrite.

| Source folder in `Sample-Portfolio` | Project | Visual direction |
| --- | --- | --- |
| `bento-grid` | Orbit | Bento grid |
| `Claymorphism` | Doodle Math | Claymorphism |
| `Dark-mode` | Synapse | Dark mode / neon |
| `Editorial` | The Long Field | Editorial |
| `Glassmorphism` | Lumen | Glassmorphism |
| `hand-drawn` | Wildroot | Organic / hand-drawn |
| `Immersive-scoll-storytelling` | Vela | Immersive storytelling |
| `Kinetic` | PULSE 27 | Kinetic typography |
| `Maximalism` | Loud House | Maximalism |
| `Minimalism` | Atelier Nord | Minimalism / Swiss |
| `Neo-brutalism` | Stackd | Neo-brutalism |
| `Neumorphism` | Thermo | Neumorphism |
| `Retro` | Static FM | Retro / Y2K |

The original collection is also preserved: **Receipthy, FundProHK, Hansgieng AI SaaS, ILLUSTIFY, AuraWave+, TraderJournalGPT, Web POS, Interior Design, Management Dashboard, Not Only Tea, Snapchat Clone, and WeWa — Whack-a-mole**.

Sample brands are clearly identified as fictional concepts. Original entries retain their optimized and full-resolution screenshots; no unverified live URLs, technical stacks, client claims, or results have been invented. The sample applications themselves remain in their original repositories rather than being copied into this static site.

## Project structure

```text
index.html                     Main page; includes generated gallery markup
404.html                       GitHub Pages recovery page
assets/css/style.css           Shared responsive design system
assets/css/outfit-latin.woff2   Existing self-hosted font (license alongside)
assets/js/script.js            Progressive enhancements and contact validation
assets/images/projects/        13 screenshots captured from real deployed demos
assets/images/                 Preserved original portrait and project assets
data/projects.json             Project content, source folders, links, image metadata
data/preview-sources.json      Screenshot source URLs, titles, and capture timestamps
projects/*.html                25 generated, directly addressable project pages
scripts/build-projects.mjs      Dependency-free static project-page generator
scripts/serve.mjs               Dependency-free local preview server
scripts/capture-previews.mjs    Optional Playwright screenshot refresh tool
tests/portfolio.test.mjs        Browser, content, interaction, and accessibility tests
```

## Editing projects

1. Edit **`data/projects.json`**. Each project has a stable `slug`, category, title, style, description, highlights, scope note, and local preview image.
2. For a design exploration, include its original `folder`, verified `demo` and `repo`, and documented `stack`.
3. For a screenshot-only original, keep `stack: []` when undocumented; include `fullImage`, `imageSize`, and `fullSize` for the supplied assets.
4. Run:

```bash
npm run build
npm run check
```

The generator updates only the marked gallery/style regions and count fields in `index.html`, and generates the individual project pages. Do not edit `projects/*.html` directly. Main-page copy and layout are edited in `index.html` outside those markers.

When the sibling `Sample-Portfolio` folder exists, the generator checks that every project directory is represented. It also checks unique slugs, required content, asset existence, and HTTPS URLs. `npm run check` verifies that committed output matches the data.

## Refresh screenshots

This is an optional, network-dependent maintenance step, not part of the build or page load:

```bash
npm install
npx playwright install chromium
npm run capture                 # all 13 demos
npm run capture -- orbit vela   # selected slugs
```

Captures use a 1440 × 1000 viewport and reduced motion, and are stored as local JPEGs. Vela uses `/configure` to show the actual bike instead of the type-only opening. Capture URLs and timestamps are recorded in `data/preview-sources.json`. Inspect refreshed images before committing; deployments can change or become unavailable.

## Verification

```bash
npm install
npx playwright install chromium
npm run check
npm test
```

Tests start their own server on an available local port and cover:

- All 25 entries and generated pages, with complete 13-folder source coverage.
- Every category and design-style filter, search, empty states, reset, and grid/list controls.
- Shareable URL state, reload, and browser Back/Forward.
- Layout overflow at 320, 390, 768, 1024, 1280, 1440, and 1920 pixels.
- Mobile accessibility scans on all 25 detail pages, plus mobile and desktop homepage scans.
- Contact errors, draft encoding, and invalidation after editing.
- Keyboard skip/navigation links, legacy bookmarks, nested-path 404 recovery, no-JavaScript content, and direct-file browsing.
- Browser runtime errors and failed local-resource requests.

Screenshots and axe results are written to ignored **`.test-artifacts/`**. These are automated local checks, not a substitute for manual assistive-technology or real-device testing.

## Deployment

Publish this folder as a static site. Generated pages and previews are already present; **no build command is required** for GitHub Pages. Do not publish `node_modules` or `.test-artifacts`.

For a different public hostname/path, update:

- The absolute Open Graph image URL in `index.html`.
- The Open Graph URL prefix in `scripts/build-projects.mjs`, then regenerate.
- The `<base href="/Portfolio.io/">` in `404.html`.

Relative project, font, stylesheet, script, and image URLs already work at either the domain root or a repository subpath.

## Contact and privacy

Contact: [ivantang26official@gmail.com](mailto:ivantang26official@gmail.com).

The form prepares a **mailto draft**. It does not send a message or claim success on a server. The visitor opens the draft, reviews it, and sends it using their email app. Search/filter state is kept in the URL. The portfolio uses no analytics, cookies, or third-party runtime assets.

## License

MIT — see [LICENSE](LICENSE). Existing font licensing is in `assets/css/OFL-Outfit.txt`. Project names and third-party materials remain the property of their respective owners.
