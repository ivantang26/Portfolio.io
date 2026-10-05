'use strict';

(() => {
  document.documentElement.classList.add('js');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });

  // The complete gallery and all detail links already exist in the HTML.
  // JavaScript only adds filtering, layout controls, and shareable URL state.
  const grid = document.querySelector('#project-grid');
  if (grid) {
    const cards = [...grid.querySelectorAll('[data-project]')];
    const tabs = [...document.querySelectorAll('button[data-category]')];
    const views = [...document.querySelectorAll('button[data-view]')];
    const search = document.querySelector('#project-search');
    const style = document.querySelector('#project-style');
    const count = document.querySelector('#project-count');
    const empty = document.querySelector('#empty-state');
    const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const validCategories = new Set(tabs.map(tab => tab.dataset.category));
    const validStyles = new Set([...style.options].map(option => option.value));
    const searchIndex = new Map(cards.map(card => [card, normalize(card.dataset.search)]));
    let state = { category: 'all', style: 'all', query: '', view: 'grid' };

    function readURL() {
      const params = new URLSearchParams(window.location.search);
      state = {
        category: validCategories.has(params.get('category')) ? params.get('category') : 'all',
        style: validStyles.has(params.get('style')) ? params.get('style') : 'all',
        query: (params.get('q') || '').slice(0, 100),
        view: params.get('view') === 'list' ? 'list' : 'grid'
      };
    }

    function render() {
      const words = normalize(state.query.trim()).split(/\s+/).filter(Boolean);
      let total = 0;
      cards.forEach(card => {
        const visible = (state.category === 'all' || card.dataset.category === state.category)
          && (state.style === 'all' || card.dataset.style === state.style)
          && words.every(word => searchIndex.get(card).includes(word));
        card.hidden = !visible;
        if (visible) total++;
      });
      tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.category === state.category)));
      views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
      if (search.value !== state.query) search.value = state.query;
      style.value = state.style;
      grid.classList.toggle('is-list', state.view === 'list');
      empty.hidden = total !== 0;
      count.textContent = total === cards.length ? `Showing all ${total} projects` : `Showing ${total} of ${cards.length} projects`;
    }

    function saveURL(push = false) {
      const url = new URL(window.location.href);
      for (const [key, value, fallback] of [['category', state.category, 'all'], ['style', state.style, 'all'], ['q', state.query, ''], ['view', state.view, 'grid']]) {
        if (value === fallback) url.searchParams.delete(key);
        else url.searchParams.set(key, value);
      }
      // No server request: state works on GitHub Pages and with file:// previews.
      if (url.href !== window.location.href) {
        try { window.history[push ? 'pushState' : 'replaceState'](null, '', url); } catch { /* restricted local previews still filter */ }
      }
    }

    tabs.forEach(tab => tab.addEventListener('click', () => {
      state.category = tab.dataset.category;
      state.style = 'all';
      render();
      saveURL(true);
    }));
    search.addEventListener('input', () => { state.query = search.value; render(); saveURL(); });
    style.addEventListener('change', () => {
      state.style = style.value;
      if (state.style !== 'all') state.category = 'design';
      render();
      saveURL(true);
    });
    views.forEach(button => button.addEventListener('click', () => {
      state.view = button.dataset.view;
      render();
      saveURL(true);
    }));
    document.querySelector('[data-reset-filters]').addEventListener('click', () => {
      state = { category: 'all', style: 'all', query: '', view: state.view };
      render();
      saveURL(true);
      search.focus({ preventScroll: true });
    });
    window.addEventListener('popstate', () => { readURL(); render(); });
    readURL();
    render();

    // Keep links shared by the previous four-view portfolio working.
    function legacyLink() {
      const hash = window.location.hash;
      if (hash.startsWith('#portfolio/')) {
        const slug = hash.slice('#portfolio/'.length);
        const card = cards.find(item => item.dataset.project === slug);
        if (card) { window.location.replace(card.querySelector('a').href); return; }
      }
      const target = hash === '#resume' ? 'experience' : hash === '#portfolio' || hash.startsWith('#portfolio/') ? 'work' : '';
      if (target) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search + '#' + target);
        document.getElementById(target).scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }
    legacyLink();
    window.addEventListener('hashchange', legacyLink);
  }

  // Native anchors remain usable without JS; enhanced navigation also moves focus.
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => {
      const target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (window.location.hash === link.hash) target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    });
  });

  if ('IntersectionObserver' in window) {
    const links = [...document.querySelectorAll('[data-section-link]')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          if (link.dataset.sectionLink === entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-12% 0px -65% 0px', threshold: 0 });
    links.forEach(link => {
      const section = document.getElementById(link.dataset.sectionLink);
      if (section) observer.observe(section);
    });
    // Returning above the collection clears the previous section highlight.
    const hero = document.querySelector('.hero');
    if (hero) observer.observe(hero);
  }

  const form = document.querySelector('[data-form]');
  if (form) {
    const inputs = [...form.querySelectorAll('[data-form-input]')];
    const result = form.querySelector('[data-form-result]');
    const draft = form.querySelector('[data-email-draft]');
    form.noValidate = true;

    function validate(input) {
      const error = document.getElementById(`${input.id}-error`);
      let message = '';
      if (!input.value.trim()) {
        message = { fullname: 'Please enter your name.', email: 'Please enter your email address.', message: 'Please write a short message.' }[input.name];
      } else if (input.validity.typeMismatch) {
        message = 'Enter a valid email address, such as name@example.com.';
      } else if (input.value.length > input.maxLength || !input.validity.valid) {
        message = 'Please check this field and its character limit.';
      }
      input.setAttribute('aria-invalid', String(Boolean(message)));
      error.textContent = message;
      error.hidden = !message;
      return !message;
    }

    inputs.forEach(input => {
      input.addEventListener('blur', () => validate(input));
      input.addEventListener('input', () => {
        result.hidden = true;
        draft.removeAttribute('href');
        if (input.hasAttribute('aria-invalid')) validate(input);
      });
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const valid = inputs.map(validate).every(Boolean);
      if (!valid) {
        inputs.find(input => input.getAttribute('aria-invalid') === 'true').focus();
        return;
      }
      const data = new FormData(form);
      const name = data.get('fullname').trim();
      const email = data.get('email').trim();
      const message = data.get('message').trim();
      draft.href = `mailto:ivantang26official@gmail.com?subject=${encodeURIComponent(`Portfolio enquiry from ${name}`)}&body=${encodeURIComponent(`${message}\n\nFrom: ${name}\nReply to: ${email}`)}`;
      form.querySelector('[data-form-status]').textContent = 'Your draft is ready. Open it in your email app to review and send.';
      result.hidden = false;
      draft.focus({ preventScroll: true });
    });
  }

  // The map makes no third-party connection unless the visitor explicitly loads it.
  const mapButton = document.querySelector('[data-map-load]');
  const mapStage = document.querySelector('[data-map-stage]');
  const mapStatus = document.querySelector('[data-map-status]');
  if (mapButton && mapStage && mapStatus) {
    mapButton.addEventListener('click', () => {
      let embed;
      try { embed = new URL(mapButton.dataset.mapEmbed); } catch { return; }
      if (embed.origin !== 'https://www.google.com' || !embed.pathname.startsWith('/maps')) return;

      const frame = document.createElement('iframe');
      frame.title = 'Google Maps interactive map showing the shared location';
      frame.loading = 'lazy';
      frame.referrerPolicy = 'no-referrer-when-downgrade';
      frame.allowFullscreen = true;
      frame.addEventListener('load', () => {
        mapStatus.textContent = 'Google Maps is ready. Use the map controls to explore the shared location.';
      }, { once: true });
      frame.src = embed.href;
      mapStage.replaceChildren(frame);
      mapButton.disabled = true;
      mapButton.setAttribute('aria-pressed', 'true');
      mapButton.textContent = 'Map loaded';
      mapStatus.textContent = 'Google Maps is opening. Map controls will be available below.';
    });
  }

  document.querySelectorAll('.project-media img, .case-image img').forEach(image => {
    const unavailable = () => { image.hidden = true; image.closest('figure').classList.add('image-unavailable'); };
    image.addEventListener('error', unavailable);
    // Lazy images may not have been requested yet.
    if (image.complete && image.naturalWidth === 0) unavailable();
  });
})();
