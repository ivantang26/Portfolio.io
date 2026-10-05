# Portfolio rewrite — scope and verification

## Source review

The source collection contains 13 distinct applications. The review covered the folder inventory, all available project READMEs, package manifests, homepage implementations, route/component organization, content models, representative functional code, assets, and repository remotes. Generated output, dependencies, procedural image-frame sequences, and the separate Stackd video-production workspace are not additional portfolio projects.

`Maximalism` has no root README; its Loud House identity, gallery features, calm mode, and booking flow were derived from its source files. The other project names and feature descriptions were cross-checked against their READMEs and implementations.

All 13 public repository homepage URLs opened successfully during screenshot capture. `data/preview-sources.json` records the actual pages, titles, viewport sizes, and timestamps. Vela’s configurator was captured rather than its type-only opening. Screenshots are static local assets; visiting this portfolio never loads or embeds the external demo websites.

## Content coverage

- **13 new design explorations**, one per top-level project folder.
- **12 original projects**, preserving original screenshots and full-resolution preview links.
- **25 static project-detail pages**, each with an overview, scope notes, and meaningful navigation.
- Existing education, work history, email, phone, location, and social destinations retained.
- No fabricated client work, performance outcomes, technologies, or live links for screenshot-only projects.
- Concept products and simulated features explicitly distinguished from real production services.

## Design and implementation

The previous four-view sidebar layout has been rewritten as an image-led, single-page portfolio. A warm neutral canvas, forest-green accent, self-hosted Outfit, occasional italic serif headings, and restrained borders give very different project identities a consistent frame.

- Sticky navigation links to Work, About, Experience, and Contact.
- The opening pairs a clear introduction with real Orbit and Stackd screenshots.
- The collection has five categories, thirteen design-style options, text search, result feedback, a recoverable empty state, and grid/list layouts.
- Project content comes from `data/projects.json`; a small Node generator writes static HTML, avoiding client-only content and runtime framework dependencies.
- Project cards, detailed pages, résumé, and contact information remain readable without JavaScript.
- Old `#portfolio`, `#portfolio/receipthy`, `#portfolio/fundprohk`, and `#resume` bookmarks are supported.
- Shareable query parameters preserve category, style, search, and layout choices. Browser navigation restores the controls and results.
- Reduced-motion preferences disable decorative movement. Keyboard focus is visible, navigation moves focus, and status updates are announced.
- The form is an explicit email-draft handoff, with inline validation and correctly encoded content. Editing invalidates the old draft.
- The old icon CDN dependency and inactive template CSS are no longer loaded.

## Local verification

`npm run check` confirms generated output is current, all source project folders are represented, linked assets exist, and the client script parses.

`npm test` passed all nine test groups:

1. 25 project entries/pages, covering 13 sample and 12 original projects.
2. All collection and style filters, search combinations, and reset states.
3. Query-string state, reload, history, and list-view synchronization.
4. Every detail page at 390px, real asset/action URLs, and axe checks.
5. Homepage grid/list overflow checks at 320, 390, 768, 1024, 1280, 1440, and 1920px; no external runtime requests.
6. Form validation, Unicode and reserved-character encoding, and draft invalidation.
7. Keyboard navigation, old bookmarks, and nested GitHub Pages 404 recovery.
8. No-JavaScript content and direct-file previews.
9. No uncaught browser exceptions or failed local-resource requests during the tests.

The axe run covered the homepage at 1440px and 390px and all 25 project pages at 390px: **27 scans with no reported WCAG A/AA violations**. Desktop and mobile screenshots were inspected. Test artifacts are ignored under `.test-artifacts/`.

These results describe this local rewrite only. The earlier template’s Lighthouse figures are not carried forward as measurements of the new website. Manual screen-reader testing, production field metrics, and exhaustive validation of the independent sample applications remain outside this portfolio rewrite.

## Hosting and maintenance

The output is compatible with static hosting and GitHub Pages. Full sample applications remain in their own repositories; their verified deployments are linked, not copied into this website. External demos can change or become unavailable independently.

Update project content in `data/projects.json` and regenerate with `npm run build`. If changing hosts, update the social-image origin and the 404 base path as described in `README.md`. The website has not been deployed or pushed as part of this rewrite.
