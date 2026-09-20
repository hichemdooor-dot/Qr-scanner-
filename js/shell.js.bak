(function(){
  const touchDevice = navigator.maxTouchPoints > 0;
  const smallScreen = Math.min(window.screen?.width || 9999, window.screen?.height || 9999) <= 800;
  const narrowViewport = window.innerWidth <= 800;
  if (touchDevice && (smallScreen || narrowViewport)) document.documentElement.classList.add('mobile-device');
})();

function menuHTML(){
  const icon=(d)=>`<svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  return `<div class="nav dash-menu">
    <a href="dashboard.html">${icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>')}<span>Tableau de bord</span></a>
    <a href="chariots.html">${icon('<path d="M3 16l2-7h10l5 4v3"/><path d="M5 16h14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M15 9V5h3v5"/>')}<span>Tous les chariots</span></a>
    <a href="stock.html">${icon('<path d="M4 7h16v13H4z"/><path d="M8 7V4h8v3M8 11h8M8 15h5"/>')}<span>Chariots en stock</span></a>
    <a href="livres.html">${icon('<path d="M4 5h12v14H4z"/><path d="M8 8h5M8 12h5M8 16h3"/><path d="M16 8h4v11h-4"/>')}<span>Chariots livrés</span></a>
    <div class="nav-separator"></div>
    <a href="nouveau-chariot.html">${icon('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>')}<span>Nouveau chariot</span></a>
    <a href="preparation-livraison.html">${icon('<path d="M3 5h11v11H3z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>')}<span>Préparation livraison</span></a>
    <a href="chariots-prevus-livraison.html">${icon('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M7 2v4M17 2v4M3 9h18"/><path d="M8 13h3M8 17h5"/>')}<span>Chariots prévus livraison</span></a>
    <a href="planning-livraisons.html">${icon('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M7 2v4M17 2v4M3 9h18"/><path d="M8 13h2M12 13h2M16 13h0M8 17h2M12 17h2"/>')}<span>Planning des livraisons</span></a>
    <a href="gestion.html" class="admin-only-nav hidden">${icon('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><path d="M17 11a3 3 0 1 0 0-6M17 15c2.4 0 4 1.5 4 4"/>')}<span>Gestion utilisateurs</span></a>
    <a href="licence.html">${icon('<path d="M12 3l2.2 1.5 2.7-.1.8 2.6 2.2 1.6-1 2.5.5 2.7-2.5 1.1-.9 2.5-2.7-.2L12 21l-2.3-1.6-2.7.2-.9-2.5-2.5-1.1.5-2.7-1-2.5L5.3 8.6l.8-2.6 2.7.1L12 3z"/><circle cx="12" cy="12" r="3"/>')}<span>Paramètres</span></a>
    <a href="#" onclick="logout();return false" class="logout-link">${icon('<path d="M9 5H4v14h5M13 8l4 4-4 4M17 12H8"/>')}<span>Déconnexion</span></a>
  </div>`
}
function nav(){const page=location.pathname.split('/').pop()||'dashboard.html';document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===page))}
function toggleMenu(force){
  const overlay=document.querySelector('.overlay');
  if(!overlay)return;
  const open=typeof force==='boolean'?force:!overlay.classList.contains('open');
  overlay.classList.toggle('open',open);
  document.body.classList.toggle('menu-open',open);
  const btn=document.querySelector('.menu-btn');
  if(btn){
    btn.setAttribute('aria-expanded',open?'true':'false');
    btn.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');
    btn.classList.toggle('is-open',open);
  }
  if(open){
    const first=overlay.querySelector('.nav a');
    if(first) first.setAttribute('tabindex','0');
  }
}
function closeMobileMenu(){toggleMenu(false)}
function toggleSidebar(force){
  if(window.innerWidth<=800){toggleMenu(force);return}
  const collapsed=typeof force==='boolean'?force:!document.body.classList.contains('sidebar-collapsed');
  document.body.classList.toggle('sidebar-collapsed',collapsed);
  const btn=document.querySelector('.pro-menu-btn');
  if(btn)btn.setAttribute('aria-expanded',collapsed?'false':'true');
}
document.addEventListener('DOMContentLoaded',()=>{
  // Use the exact dashboard hamburger drawer on every page.
  document.querySelectorAll('.overlay').forEach((ov,i)=>{
    ov.id=i?'mobileMenu'+i:'mobileMenu';
    const side=ov.querySelector('.side');
    if(side && !side.classList.contains('mobile-notifications-sidebar') && !side.classList.contains('dash-sidebar')){
      side.classList.add('dashboard-mobile-drawer');
      side.innerHTML=`<div class="dash-logo"><img src="assets/sidebar-logo-highres.png" alt="HANGCHA SBI"></div>
        <nav class="dash-nav" data-nav></nav>
        <div class="sidebar-promo"><img src="assets/sidebar-promo-preview.png" alt="Hangcha en Algérie"></div>
        <div class="sidebar-foot">© 2026 SBI · Hangcha<br><span>Version 4.3</span></div>
        <button type="button" class="mobile-drawer-close dashboard-menu-close" aria-label="Fermer le menu" onclick="event.preventDefault();event.stopPropagation();closeMobileMenu();return false;">×</button>`;
    }
  });
  document.querySelectorAll('[data-nav]').forEach(x=>x.innerHTML=menuHTML());
  document.querySelectorAll('.menu-btn').forEach(btn=>{btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-controls','mobileMenu');});
  // Robust close handling for the mobile drawer (works even when the drawer is rebuilt dynamically).
  document.addEventListener('click',e=>{
    const close=e.target.closest?.('.mobile-drawer-close');
    if(close){e.preventDefault();e.stopPropagation();closeMobileMenu();}
  },true);
  document.addEventListener('pointerup',e=>{
    const close=e.target.closest?.('.mobile-drawer-close');
    if(close){e.preventDefault();e.stopPropagation();closeMobileMenu();}
  },true);
  document.querySelectorAll('.brand').forEach(el=>{el.innerHTML='<img class="site-logo" src="assets/logo-sbi-hangcha.png" alt="SBI HANGCHA">';});
  document.querySelectorAll('.avatar').forEach(el=>{
    const wrap=document.createElement('div');
    wrap.className='user-menu-wrap';
    wrap.innerHTML=`<button class="user-menu-button" type="button" onclick="toggleUserMenu();event.stopPropagation()" aria-label="Menu utilisateur"><span class="user-circle" id="userTopAvatar">U</span><span class="user-menu-name"><b id="userTopName">Utilisateur</b><small id="userTopRole">Utilisateur</small></span><span class="user-menu-chevron">⌄</span></button><div id="userMenu" class="user-menu hidden"><a href="profile.html">👤&nbsp; Profil</a><a id="userMenuAdmin" class="hidden" href="gestion.html">👥&nbsp; Gestion utilisateurs</a><button type="button" onclick="logout()">↪&nbsp; Déconnexion</button></div>`;
    el.replaceWith(wrap);
  });
  nav();
  document.querySelectorAll('.overlay').forEach(ov=>{
    ov.addEventListener('click',e=>{if(e.target===ov)closeMobileMenu()});
    ov.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>closeMobileMenu()));
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileMenu()});
  // Android/browser Back: close the drawer first when it is open.
  window.addEventListener('popstate',()=>{const ov=document.querySelector('.overlay.open');if(ov)closeMobileMenu();});

  window.addEventListener('resize',()=>{if(window.innerWidth>800)closeMobileMenu()});
});
