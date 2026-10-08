/* SBI v67.33 — live chariot suggestions + client autocomplete. Delivery planning search uses its own inline filter. */
(function () {
  'use strict';

  const SEARCH_FIELDS = [
    '#search', '#stockSearch', '#plSearch', '#deliveredSearch',
    '#modSearch', '#affSearch', '#prepSearch',
    '#historySearch', '#siteGlobalSearchInput'
  ];
  const CLIENT_SELECTOR = 'input[name="client"]';
  const MAX_RESULTS = 8;
  let activeInput = null;
  let activeIndex = -1;
  let panel = null;
  let outsideHandlerBound = false;

  const normalize = (value) => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim();

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const getChariots = () => (typeof CHARIOTS !== 'undefined' && Array.isArray(CHARIOTS)) ? CHARIOTS : [];
  const getFields = (chariot) => [
    chariot?.qr_id, chariot?.chassis, chariot?.serial_number, chariot?.numero_serie, chariot?.numeroSerie,
    chariot?.engine, chariot?.engine_number, chariot?.client,
    chariot?.capacity, chariot?.lifting_height, chariot?.mast_type,
    chariot?.fork_dimension, chariot?.status, chariot?.stock, chariot?.color
  ].map((value) => String(value ?? '').trim()).filter(Boolean);

  function matchingClients(query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return [];
    const unique = new Map();
    getChariots().forEach((chariot, index) => {
      const raw = String(chariot?.client ?? '').trim();
      const key = normalize(raw);
      if (!key || !key.includes(normalizedQuery)) return;
      if (!unique.has(key)) unique.set(key, { value: raw, firstIndex: index });
    });
    return [...unique.values()]
      .sort((a, b) => {
        const aa = normalize(a.value), bb = normalize(b.value);
        const as = aa.startsWith(normalizedQuery) ? 0 : 1;
        const bs = bb.startsWith(normalizedQuery) ? 0 : 1;
        return as - bs || aa.localeCompare(bb, 'fr');
      })
      .slice(0, MAX_RESULTS);
  }

  function matchingChariots(query) {
    const normalizedQuery = normalize(query);
    const terms = normalizedQuery.split(' ').filter(Boolean);
    if (!terms.length) return [];

    return getChariots().map((chariot, index) => {
      const fields = getFields(chariot).map(normalize);
      const qr = normalize(chariot?.qr_id);
      const chassis = normalize(chariot?.chassis);
      const serial = normalize(chariot?.serial_number ?? chariot?.numero_serie ?? chariot?.numeroSerie);
      const client = normalize(chariot?.client);
      const combined = fields.join(' ');
      const matches = terms.every((term) => combined.includes(term));
      if (!matches) return null;

      let score = 5;
      if (qr === normalizedQuery || chassis === normalizedQuery || serial === normalizedQuery) score = 0;
      else if (qr.startsWith(normalizedQuery) || chassis.startsWith(normalizedQuery) || serial.startsWith(normalizedQuery)) score = 1;
      else if (client.startsWith(normalizedQuery)) score = 2;
      else if (fields.some((field) => field.startsWith(normalizedQuery))) score = 3;
      return { chariot, index, score };
    }).filter(Boolean)
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .slice(0, MAX_RESULTS);
  }

  function createPanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'sbi-typeahead-panel';
    panel.id = 'sbiTypeaheadPanel';
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-label', 'Suggestions de chariots');
    panel.hidden = true;
    document.body.appendChild(panel);
    return panel;
  }

  function positionPanel() {
    if (!activeInput || !panel || panel.hidden) return;
    const rect = activeInput.getBoundingClientRect();
    const margin = 10;
    const width = Math.min(Math.max(rect.width, 280), window.innerWidth - margin * 2, 460);
    const left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const placeAbove = below < 160 && above > below;
    const maxHeight = Math.max(120, Math.min(330, (placeAbove ? above : below) - 8));
    panel.style.left = `${left}px`;
    panel.style.width = `${width}px`;
    panel.style.maxHeight = `${maxHeight}px`;
    panel.style.top = placeAbove ? 'auto' : `${Math.round(rect.bottom + 6)}px`;
    panel.style.bottom = placeAbove ? `${Math.max(8, window.innerHeight - Math.round(rect.top) + 6)}px` : 'auto';
  }

  function closePanel() {
    if (!panel) return;
    panel.hidden = true;
    panel.innerHTML = '';
    if (activeInput) {
      activeInput.setAttribute('aria-expanded', 'false');
      activeInput.removeAttribute('aria-activedescendant');
    }
    activeInput = null;
    activeIndex = -1;
  }

  function pageOrigin() {
    const page = location.pathname.split('/').pop() || '';
    if (page === 'stock.html') return '&from=stock';
    if (page === 'preparation-livraison.html') return '&from=preparation';
    if (page === 'chariots-prevus-livraison.html') return '&from=prevus';
    return '';
  }

  function setActive(index) {
    if (!panel) return;
    const items = [...panel.querySelectorAll('.sbi-typeahead-item')];
    if (!items.length) return;
    activeIndex = Math.max(0, Math.min(index, items.length - 1));
    items.forEach((item, i) => {
      const selected = i === activeIndex;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    const selected = items[activeIndex];
    activeInput?.setAttribute('aria-activedescendant', selected.id);
    selected.scrollIntoView?.({ block: 'nearest' });
  }

  function renderFor(input, mode = 'chariot') {
    const query = input.value.trim();
    if (!query) { closePanel(); return; }

    activeInput = input;
    const box = createPanel();
    box.dataset.mode = mode;

    if (mode === 'client') {
      const clients = matchingClients(query);
      activeIndex = clients.length ? 0 : -1;
      if (!clients.length && getChariots().length === 0 && !input.dataset.sbiRetrying) {
        input.dataset.sbiRetrying = '1';
        let attempts = 0;
        const retry = () => {
          attempts += 1;
          input.dataset.sbiRetrying = attempts < 12 ? '1' : '';
          if (input.value.trim() && getChariots().length) renderFor(input, 'client');
          else if (attempts < 12 && input.value.trim()) setTimeout(retry, 150);
        };
        setTimeout(retry, 150);
      }
      box.innerHTML = clients.length ? clients.map(({ value }, index) => {
        return `<button type="button" class="sbi-typeahead-item${index === 0 ? ' is-active' : ''}" id="sbiTypeaheadItem${index}" role="option" aria-selected="${index === 0 ? 'true' : 'false'}" data-client="${escapeHtml(value)}"><span class="sbi-typeahead-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg></span><span class="sbi-typeahead-copy"><strong>${escapeHtml(value)}</strong><small>Client existant</small></span><span class="sbi-typeahead-arrow" aria-hidden="true">›</span></button>`;
      }).join('') : '<div class="sbi-typeahead-empty">Aucun client correspondant.</div>';
    } else {
      const rows = matchingChariots(query);
      activeIndex = rows.length ? 0 : -1;
      if (!rows.length && getChariots().length === 0 && !input.dataset.sbiRetrying) {
        input.dataset.sbiRetrying = '1';
        let attempts = 0;
        const retry = () => {
          attempts += 1;
          input.dataset.sbiRetrying = attempts < 12 ? '1' : '';
          if (input.value.trim() && getChariots().length) renderFor(input, 'chariot');
          else if (attempts < 12 && input.value.trim()) setTimeout(retry, 150);
        };
        setTimeout(retry, 150);
      }
      box.innerHTML = rows.length ? rows.map(({ chariot }, index) => {
        const title = chariot.chassis || chariot.qr_id || 'Chariot';
        const serial = chariot.serial_number ?? chariot.numero_serie ?? chariot.numeroSerie;
        const meta = [
          chariot.capacity ? `${chariot.capacity}` : '',
          chariot.client ? `Client : ${chariot.client}` : '',
          serial ? `N° série ${serial}` : ''
        ].filter(Boolean).join(' · ');
        return `<button type="button" class="sbi-typeahead-item${index === 0 ? ' is-active' : ''}" id="sbiTypeaheadItem${index}" role="option" aria-selected="${index === 0 ? 'true' : 'false'}" data-qr="${escapeHtml(chariot.qr_id || '')}"><span class="sbi-typeahead-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M7 8h10M7 12h6M7 16h4"></path></svg></span><span class="sbi-typeahead-copy"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(meta || 'Ouvrir la fiche du chariot')}</small></span><span class="sbi-typeahead-arrow" aria-hidden="true">›</span></button>`;
      }).join('') : '<div class="sbi-typeahead-empty">Aucun chariot correspondant.</div>';
    }

    box.hidden = false;
    input.setAttribute('aria-controls', box.id);
    input.setAttribute('aria-expanded', 'true');
    if (activeIndex >= 0) input.setAttribute('aria-activedescendant', `sbiTypeaheadItem${activeIndex}`);
    positionPanel();
  }

  function bindInput(input, mode = 'chariot') {
    if (input.dataset.sbiTypeaheadReady === '1') return;
    input.dataset.sbiTypeaheadReady = '1';
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.dataset.sbiTypeaheadMode = mode;
    input.addEventListener('input', () => renderFor(input, mode));
    input.addEventListener('focus', () => { if (input.value.trim()) renderFor(input, mode); });
    input.addEventListener('keydown', (event) => {
      if (activeInput !== input || !panel || panel.hidden) return;
      const items = panel.querySelectorAll('.sbi-typeahead-item');
      if (event.key === 'ArrowDown' && items.length) {
        event.preventDefault(); setActive(activeIndex + 1);
      } else if (event.key === 'ArrowUp' && items.length) {
        event.preventDefault(); setActive(activeIndex - 1);
      } else if (event.key === 'Enter' && items.length && activeIndex >= 0) {
        event.preventDefault(); items[activeIndex].click();
      } else if (event.key === 'Escape') {
        event.preventDefault(); closePanel();
      }
    });
  }

  function bindGlobalEvents() {
    if (outsideHandlerBound) return;
    outsideHandlerBound = true;
    document.addEventListener('click', (event) => {
      if (event.target.closest?.('.sbi-typeahead-panel') || event.target === activeInput) return;
      closePanel();
    });
    document.addEventListener('click', (event) => {
      const item = event.target.closest?.('.sbi-typeahead-item');
      if (!item) return;
      if (item.dataset.client !== undefined && activeInput) {
        activeInput.value = String(item.dataset.client || '').toUpperCase();
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        closePanel();
        return;
      }
      const qr = item.dataset.qr;
      if (qr) location.href = `chariot.html?id=${encodeURIComponent(qr)}${pageOrigin()}`;
    });
    window.addEventListener('resize', positionPanel, { passive: true });
    window.addEventListener('scroll', positionPanel, { passive: true, capture: true });
  }

  function init() {
    const inputs = SEARCH_FIELDS.flatMap((selector) => [...document.querySelectorAll(selector)]);
    const clientInputs = [...document.querySelectorAll(CLIENT_SELECTOR)];
    inputs.forEach(input => bindInput(input, 'chariot'));
    clientInputs.forEach(input => bindInput(input, 'client'));
    if (inputs.length || clientInputs.length) { createPanel(); bindGlobalEvents(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
