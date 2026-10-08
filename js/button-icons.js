/* SBI v67.17 — consistent inline SVG icons for action buttons. No external icon dependency. */
(function () {
  'use strict';

  const svgPaths = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    save: '<path d="M5 3h12l4 4v14H3V3z"/><path d="M7 3v6h10V3M8 21v-7h8v7"/>',
    edit: '<path d="m4 16.5-.8 4.3 4.3-.8L20 7.5 16.5 4 4 16.5z"/><path d="m14.8 5.7 3.5 3.5"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14v3M14 19h3M19 19h2"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 1M4 17l2 1a7 7 0 0 0 12.5-3"/>',
    reset: '<path d="M3 11a9 9 0 1 1 2.6 6.4"/><path d="M3 4v7h7"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    filter: '<path d="M3 5h18l-7 8v5l-4 2v-7L3 5z"/>',
    check: '<path d="m5 12 4.2 4.2L19 6.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/>',
    truck: '<path d="M3 6h11v12H3zM14 10h4l3 3v5h-7z"/><circle cx="7" cy="19" r="1.7"/><circle cx="18" cy="19" r="1.7"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6"/>',
    calendarPlus: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M12 13v5M9.5 15.5h5"/>',
    move: '<path d="M5 9 2 12l3 3M19 9l3 3-3 3M9 5l3-3 3 3M9 19l3 3 3-3M2 12h20M12 2v20"/>',
    wrench: '<path d="M14.7 6.3a5.5 5.5 0 0 0-7.3 7.3L3 18l3 3 4.4-4.4a5.5 5.5 0 0 0 7.3-7.3l-3.1 3.1-3-3 3.1-3.1z"/>',
    package: '<path d="M3 7 12 3l9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10M7.5 5l9 4"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/>',
    printer: '<path d="M6 8V3h12v5M6 17H4a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6zM18 11h.01"/>',
    excel: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 3v18M9 8h11M9 13h11M9 18h11M2 8h4M2 13h4M2 18h4"/>',
    pdf: '<path d="M6 3h9l4 4v14H6zM15 3v5h5"/><path d="M8 14h2a1.5 1.5 0 0 0 0-3H8v6M13 17v-6h1.5a3 3 0 0 1 0 6H13M18 11h-2v6M16 14h2"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    login: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M13 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>',
    logout: '<path d="M14 7l5 5-5 5M19 12H7"/><path d="M11 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.4 2.5-5.5 6.5-5.5s6.5 2.1 6.5 5.5M17 5.5a3 3 0 0 1 0 5.8M18 15c2.3.5 3.5 2.1 3.5 4.5"/>',
    userPlus: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.4 2.5-5.5 6.5-5.5 2.1 0 3.8.6 4.9 1.8M18 8v7M14.5 11.5h7"/>',
    userCheck: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.4 2.5-5.5 6.5-5.5 1.8 0 3.4.4 4.5 1.3M16 12.5l2 2 4-4"/>',
    userOff: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.4 2.5-5.5 6.5-5.5 1.8 0 3.4.4 4.5 1.3M16 12l5 5M21 12l-5 5"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/>',
    play: '<path d="m7 4 13 8-13 8z"/>',
    skip: '<path d="M5 5v14l10-7zM19 5v14"/>',
    previous: '<path d="m15 18-6-6 6-6"/>',
    next: '<path d="m9 18 6-6-6-6"/>',
    history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
  };

  const iconSvg = (name) => `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${svgPaths[name] || svgPaths.check}</svg>`;
  const norm = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
  const hasIcon = (el) => !!el.querySelector('svg, .sbi-button-icon');

  function chooseIcon(el) {
    const cls = String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toLowerCase();
    const id = String(el.id || '').toLowerCase();
    const label = norm([el.getAttribute('aria-label'), el.getAttribute('title'), el.textContent].filter(Boolean).join(' '));

    if (/^(prevweek|previousweek)$/.test(id)) return 'previous';
    if (/^(nextweek)$/.test(id)) return 'next';
    if (el.matches('.menu-btn')) return 'menu';
    if (el.matches('.user-menu-button')) return null;
    const workflow = norm(el.getAttribute('data-workflow') || el.getAttribute('data-card-action') || '');
    if (workflow === 'start-modification' || workflow === 'envoyer en modification') return 'wrench';
    if (workflow === 'finish-modification' || workflow === 'ready') return 'checkCircle';
    if (workflow === 'deliver' || workflow === 'livrer') return 'truck';
    if (workflow === 'assign' || workflow === 'affecter') return 'userPlus';
    if (workflow === 'passer en stock') return 'package';
    if (/close|fermer/.test(cls) || /fermer|close/.test(label)) return 'close';
    if (el.matches('.input-clear,.delivery-search-clear') || /^(effacer|clear)$/.test(label)) return 'close';

    if (/\b(pret a livrer|modification terminee|enregistrer et passer|marquer tout comme lu|planifie)\b/.test(label) || el.matches('.save-ready,.sbi-readiness-pass') || workflow === 'ready' || workflow === 'finish-modification') return 'checkCircle';
    if (/\b(passer en stock)\b/.test(label)) return 'package';
    if (/\b(reserver|reserve)\b/.test(label)) return 'bookmark';
    if (el.hasAttribute('data-delete') || /\b(delete|supprimer)\b/.test(label) || cls.includes('danger')) return 'trash';
    if (el.hasAttribute('data-edit') || id === 'edit' || /\b(modifier|edit)\b/.test(label)) return 'edit';
    if (el.hasAttribute('data-move-plan') || /\b(deplacer|move)\b/.test(label)) return 'move';
    if (el.hasAttribute('data-deliver-plan') || workflow === 'deliver' || /\b(livrer|livraison confirmee|delivery)\b/.test(label)) return 'truck';
    if (el.hasAttribute('data-plan') || /\b(planifier|planifie|planifiee|planning)\b/.test(label)) return 'calendarPlus';
    if (el.hasAttribute('data-affect') || /\b(affecter|creer l utilisateur|creer un utilisateur)\b/.test(label)) return 'userPlus';
    if (/\b(qr|qr code|scanner)\b/.test(label)) return 'qr';
    if (/\b(excel|xlsx)\b/.test(label)) return 'excel';
    if (/\b(pdf)\b/.test(label)) return 'pdf';
    if (/\b(imprimer|print)\b/.test(label)) return 'printer';
    if (/\b(enregistrer|sauvegarder|save)\b/.test(label)) return 'save';
    if (/\b(telecharger|download|exporter)\b/.test(label)) return 'download';
    if (/\b(actualiser|rafraichir|refresh)\b/.test(label)) return 'refresh';
    if (/\b(reinitialiser|reset|vider les filtres)\b/.test(label)) return 'reset';
    if (/\b(rechercher|recherche|search)\b/.test(label)) return 'search';
    if (/\b(filtrer|filtre|filter)\b/.test(label)) return 'filter';
    if (/\b(deconnexion|logout)\b/.test(label)) return 'logout';
    if (/\b(se connecter|connexion administrateur|connexion|login)\b/.test(label)) return 'login';
    if (/\b(marquer traite|traiter|confirmer)\b/.test(label)) return 'checkCircle';
    if (/\b(reactiver|activer)\b/.test(label)) return 'userCheck';
    if (/\b(desactiver|bloquer)\b/.test(label)) return 'userOff';
    if (/\b(utilisateurs|gestion utilisateur|profil)\b/.test(label)) return 'users';
    if (/\b(demande|envoyer)\b/.test(label)) return 'send';
    if (/\b(voir|ouvrir|fiche)\b/.test(label)) return 'eye';
    if (/\b(demarrer|commencer)\b/.test(label)) return 'play';
    if (/\b(modification production|envoyer en modification)\b/.test(label)) return 'wrench';
    if (/\b(passer sans completer)\b/.test(label)) return 'skip';
    if (/\b(aujourd hui|jour selectionne|prochaines)\b/.test(label)) return 'calendar';
    if (/\b(historique)\b/.test(label)) return 'history';
    if (/\b(annuler|cancel)\b/.test(label)) return 'close';
    if (/\b(menu utilisateur|mon compte)\b/.test(label)) return 'users';
    if (/\b(ajouter|nouveau|creer)\b/.test(label)) return 'add';
    if (/^(←|‹|<)$/.test(label)) return 'previous';
    if (/^(→|›|>)$/.test(label)) return 'next';
    return null;
  }

  function removeOldLeadingGlyphs(el) {
    // Keep words and nested content intact while removing legacy text-symbol prefixes.
    const glyphs = /^[\s\u00a0]*(?:[＋+⌕✕×↪←→▣☰✓✔])(?:[\s\u00a0]*)/;
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (glyphs.test(node.nodeValue || '')) node.nodeValue = (node.nodeValue || '').replace(glyphs, ' ');
      } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('delivery-save-icon')) {
        node.remove();
      }
    }
  }

  function addIcon(el) {
    if (!(el instanceof Element) || hasIcon(el) || el.matches('.sbi-typeahead-item')) return;
    const iconName = chooseIcon(el);
    if (el.matches('.detail-history-toggle')) {
      const symbol = el.querySelector('.detail-history-symbol');
      if (symbol && !symbol.querySelector('svg')) {
        symbol.textContent = '';
        symbol.innerHTML = iconSvg('history');
        symbol.setAttribute('aria-hidden', 'true');
        el.classList.add('sbi-iconized');
      }
      return;
    }
    if (!iconName || el.matches('.delivery-day,.delivery-move-day,.nav-group-toggle')) return;
    if (el.matches('.delivery-search-result')) {
      // Search-result cards are selectors, not action buttons; their result content stays unchanged.
      return;
    }

    const onlySymbol = /^(menu|close|previous|next)$/.test(iconName) && /^[\s\u00a0]*(?:☰|≡|×|✕|x|←|→|‹|›|<|>)*[\s\u00a0]*$/i.test(el.textContent || '');
    removeOldLeadingGlyphs(el);

    const wrapper = document.createElement('span');
    wrapper.className = 'sbi-button-icon' + (onlySymbol ? ' sbi-button-icon-only' : '');
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML = iconSvg(iconName);
    el.insertBefore(wrapper, el.firstChild);
    el.classList.add('sbi-iconized');

    if (onlySymbol) {
      el.classList.add('sbi-icon-only');
      if (!el.hasAttribute('aria-label')) {
        const labels = { menu: 'Ouvrir le menu', close: 'Fermer', previous: 'Semaine précédente', next: 'Semaine suivante' };
        el.setAttribute('aria-label', labels[iconName] || 'Action');
      }
    }
  }

  function scan(root) {
    if (!root) return;
    if (root instanceof Element && root.matches('button,a.btn,.mark-all-read,.view-chariot,.back-link')) addIcon(root);
    if (root.querySelectorAll) root.querySelectorAll('button,a.btn,.mark-all-read,.view-chariot,.back-link').forEach(addIcon);
  }

  function init() {
    scan(document);
    if (!('MutationObserver' in window)) return;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) scan(node);
        }
      }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
