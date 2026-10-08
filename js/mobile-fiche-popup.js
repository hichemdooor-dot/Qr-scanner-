/* SBI v67.43 — universal mobile "Voir la fiche" popup.
   On mobile, open the actual chariot detail page in an accessible full-screen modal.
   On desktop, preserve the existing direct-navigation behavior. */
(function () {
  'use strict';
  if (window.__sbiUniversalFichePopupReady) return;
  window.__sbiUniversalFichePopupReady = true;

  var STYLE_ID = 'sbi-mobile-fiche-popup-style';
  var ROOT_ID = 'sbiMobileFichePopup';
  var CLOSE_ID = 'sbiMobileFichePopupClose';
  var FRAME_ID = 'sbiMobileFichePopupFrame';
  var TITLE_ID = 'sbiMobileFichePopupTitle';

  var css = `
#${ROOT_ID}{position:fixed!important;inset:0!important;z-index:2147483000!important;display:none!important;align-items:stretch!important;justify-content:center!important;padding:0!important;margin:0!important;background:rgba(7,20,35,.72)!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important}
#${ROOT_ID}.sbi-popup-open{display:flex!important}
#${ROOT_ID} .sbi-popup-dialog{display:flex!important;flex-direction:column!important;width:100%!important;height:100vh!important;height:100dvh!important;max-height:100dvh!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:#f4f8fc!important;overflow:hidden!important;box-shadow:none!important}
#${ROOT_ID} .sbi-popup-head{position:relative!important;z-index:2147483001!important;display:flex!important;flex:0 0 auto!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;min-height:60px!important;padding:8px 12px!important;padding-top:max(8px,env(safe-area-inset-top,0px))!important;background:#fff!important;border:0!important;border-bottom:1px solid #cbd9e6!important;box-shadow:0 2px 10px rgba(12,35,58,.15)!important}
#${ROOT_ID} .sbi-popup-title{display:block!important;flex:1 1 auto!important;min-width:0!important;margin:0!important;padding:0!important;color:#163a60!important;font-family:Arial,Helvetica,sans-serif!important;font-size:15px!important;font-weight:800!important;line-height:1.3!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
#${ROOT_ID} #${CLOSE_ID}{-webkit-appearance:none!important;appearance:none!important;position:relative!important;z-index:2147483002!important;display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;align-items:center!important;justify-content:center!important;flex:0 0 48px!important;width:48px!important;min-width:48px!important;max-width:48px!important;height:48px!important;min-height:48px!important;margin:0!important;padding:0!important;border:2px solid #a9c4d9!important;border-radius:12px!important;background:#e7f0f8!important;color:#123b5c!important;font-family:Arial,Helvetica,sans-serif!important;font-size:32px!important;font-weight:700!important;line-height:1!important;text-align:center!important;text-indent:0!important;text-shadow:none!important;box-shadow:0 1px 5px rgba(12,35,58,.12)!important;cursor:pointer!important;touch-action:manipulation!important}
#${ROOT_ID} #${CLOSE_ID}:active{background:#d6e6f2!important;transform:scale(.97)}
#${ROOT_ID} .sbi-popup-frame{display:block!important;position:relative!important;z-index:1!important;flex:1 1 auto!important;width:100%!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:#f4f8fc!important}
html.sbi-mobile-fiche-popup-lock,html.sbi-mobile-fiche-popup-lock body{overflow:hidden!important;overscroll-behavior:none!important}
@media(min-width:801px){#${ROOT_ID}{display:none!important}}
`;

  function addPopup() {
    if (document.getElementById(ROOT_ID)) return document.getElementById(ROOT_ID);
    if (!document.getElementById(STYLE_ID)) {
      var style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    }
    var root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Fiche chariot');
    root.innerHTML = '<div class="sbi-popup-dialog" role="document"><div class="sbi-popup-head"><div id="' + TITLE_ID + '" class="sbi-popup-title">Fiche chariot</div><button id="' + CLOSE_ID + '" type="button" aria-label="Fermer la fiche" title="Fermer">×</button></div><iframe id="' + FRAME_ID + '" class="sbi-popup-frame" title="Informations détaillées du chariot" loading="eager"></iframe></div>';
    (document.body || document.documentElement).appendChild(root);
    return root;
  }

  var popup = addPopup();
  var frame = document.getElementById(FRAME_ID);
  var title = document.getElementById(TITLE_ID);
  var closeButton = document.getElementById(CLOSE_ID);
  var previousFocus = null;

  function isMobile() {
    return (window.matchMedia && window.matchMedia('(max-width: 800px)').matches) || window.innerWidth <= 800;
  }
  function isViewFicheLink(link) {
    if (!link || !link.href) return false;
    var text = String(link.textContent || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');
    var classMatch = link.classList && (
      link.classList.contains('mobile-fiche-popup-link') ||
      link.classList.contains('pl-view-link') ||
      link.classList.contains('prep-view-link')
    );
    if (!classMatch && !/voir\s+la\s+fiche/.test(text)) return false;
    try {
      var path = new URL(link.href, document.baseURI).pathname.replace(/\/+$/, '');
      return path.endsWith('/chariot.html') || path === 'chariot.html';
    } catch (_) { return false; }
  }
  function findLabel(link, id) {
    var scope = link.closest('[data-card-id],[data-chariot-row],[data-aff-row],.pl-item,.prep-item,.mod-item,.aff-item');
    if (scope) {
      var node = scope.querySelector('.chariot-list-id,.pl-item-title,.prep-item-title,.mod-title,.aff-title');
      if (node && node.textContent.trim()) return node.textContent.trim();
    }
    return id || 'Fiche chariot';
  }
  function openPopup(link) {
    var url;
    try { url = new URL(link.href, document.baseURI); } catch (_) { return; }
    var id = String(url.searchParams.get('id') || link.getAttribute('data-popup-qr') || '').trim();
    if (!id) return;
    previousFocus = document.activeElement;
    title.textContent = 'Fiche chariot — ' + findLabel(link, id);
    url.searchParams.set('id', id);
    url.searchParams.set('popup', '1');
    frame.src = url.href;
    popup.classList.add('sbi-popup-open');
    popup.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('sbi-mobile-fiche-popup-lock');
    try { closeButton.focus({ preventScroll: true }); } catch (_) { closeButton.focus(); }
  }
  function closePopup() {
    if (!popup.classList.contains('sbi-popup-open')) return;
    popup.classList.remove('sbi-popup-open');
    popup.setAttribute('aria-hidden', 'true');
    frame.src = 'about:blank';
    document.documentElement.classList.remove('sbi-mobile-fiche-popup-lock');
    if (previousFocus && typeof previousFocus.focus === 'function') {
      try { previousFocus.focus({ preventScroll: true }); } catch (_) { previousFocus.focus(); }
    }
  }

  closeButton.addEventListener('click', closePopup);
  popup.addEventListener('click', function (event) {
    if (event.target === popup) closePopup();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && popup.classList.contains('sbi-popup-open')) {
      event.preventDefault();
      closePopup();
    }
  });
  // Capture before card-level navigation handlers so all pages behave consistently.
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 3 ? event.target.parentElement : event.target;
    var link = target && target.closest ? target.closest('a[href]') : null;
    if (!isMobile() || !isViewFicheLink(link)) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
    openPopup(link);
  }, true);
})();
