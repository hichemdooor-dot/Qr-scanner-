(function(){
  const touchDevice = navigator.maxTouchPoints > 0;
  const smallScreen = Math.min(window.screen?.width || 9999, window.screen?.height || 9999) <= 800;
  const narrowViewport = window.innerWidth <= 800;
  if (touchDevice && (smallScreen || narrowViewport)) document.documentElement.classList.add('mobile-device');
})();

/* SVG icon library — professional line icons */
const _ico={
  dashboard:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>',
  chariots:'<svg viewBox="0 0 24 24"><path d="M3 7h11l3 5h3"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h10"/><path d="M9 12V7"/></svg>',
  stock:'<svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>',
  delivered:'<svg viewBox="0 0 24 24"><path d="M3 7h11l3 5"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M5 17.5h5"/><path d="M10 17.5h5"/><path d="M9 12l2 2 4-4"/></svg>',
  newplus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  history:'<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/></svg>',
  prep:'<svg viewBox="0 0 24 24"><path d="M3 7h11l3 5"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M5 17.5h10"/><path d="M9 12V7"/><circle cx="20" cy="4" r="2.5"/><path d="M20 6.5v3"/></svg>',
  planned:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><circle cx="12" cy="14" r="2"/></svg>',
  calendar:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="M8 14h2M14 14h2M8 18h2M14 18h2"/></svg>',
  export:'<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>',
  users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15 14.5c3.6 0 6 2.4 6 5.5"/></svg>',
  settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1"/></svg>',
  logout:'<svg viewBox="0 0 24 24"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h12"/></svg>',
  bell:'<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></svg>',
  user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>',
  chevronDown:'<svg viewBox="0 0 24 24" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>',
  menu:'<svg viewBox="0 0 24 24" stroke-width="2.5"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close:'<svg viewBox="0 0 24 24" stroke-width="2.5"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};

function menuHTML(){return `<div class="nav dash-menu">
<a href="dashboard.html"><span class="nav-icon">${_ico.dashboard}</span><span>Tableau de bord</span></a>
<a href="chariots.html"><span class="nav-icon">${_ico.chariots}</span><span>Tous les chariots</span></a>
<a href="stock.html"><span class="nav-icon">${_ico.stock}</span><span>Chariots en stock</span></a>
<a href="livres.html"><span class="nav-icon">${_ico.delivered}</span><span>Chariots livrés</span></a>
<a href="nouveau-chariot.html"><span class="nav-icon">${_ico.newplus}</span><span>Nouveau chariot</span></a>
<div class="nav-separator"></div>
<a href="historique.html"><span class="nav-icon">${_ico.history}</span><span>Historique</span></a>
<a href="preparation-livraison.html"><span class="nav-icon">${_ico.prep}</span><span>Préparation livraison</span></a>
<a href="chariots-prevus-livraison.html"><span class="nav-icon">${_ico.planned}</span><span>Chariots prévus pour livraison</span></a>
<a href="planning-livraisons.html"><span class="nav-icon">${_ico.calendar}</span><span>Planning des livraisons</span></a>
<a href="export.html"><span class="nav-icon">${_ico.export}</span><span>Export Excel / PDF</span></a>
<a href="gestion.html"><span class="nav-icon">${_ico.users}</span><span>Gestion utilisateurs</span></a>
<a href="licence.html"><span class="nav-icon">${_ico.settings}</span><span>Paramètres</span></a>
<a href="#" onclick="logout();return false" class="logout-link"><span class="nav-icon">${_ico.logout}</span><span>Déconnexion</span></a>
</div>`}

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
    btn.innerHTML=open?_ico.close:_ico.menu;
  }
  if(open){
    const first=overlay.querySelector('.nav a');
    if(first) first.setAttribute('tabindex','0');
  }
}
function closeMobileMenu(){toggleMenu(false)}
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-nav]').forEach(x=>x.innerHTML=menuHTML());
  document.querySelectorAll('.menu-btn').forEach(btn=>{
    btn.setAttribute('aria-expanded','false');
    btn.setAttribute('aria-controls','mobileMenu');
    btn.innerHTML=_ico.menu;
  });
  document.querySelectorAll('.overlay').forEach((ov,i)=>{ov.id=i?'mobileMenu'+i:'mobileMenu';});
  document.querySelectorAll('.brand').forEach(el=>{el.innerHTML='<img class="site-logo" src="assets/logo-sbi-hangcha.png" alt="SBI HANGCHA">';});
  document.querySelectorAll('.avatar').forEach(el=>{
    const wrap=document.createElement('div');
    wrap.className='user-menu-wrap';
    wrap.innerHTML=`<button class="user-menu-button" type="button" onclick="toggleUserMenu();event.stopPropagation()" aria-label="Menu utilisateur"><span class="user-circle" id="userTopAvatar">U</span><span class="user-menu-name"><b id="userTopName">Utilisateur</b><small id="userTopRole">Utilisateur</small></span><span class="user-menu-chevron">${_ico.chevronDown}</span></button><div id="userMenu" class="user-menu hidden"><a href="profile.html"><span class="nav-icon" style="width:20px">${_ico.user}</span>Profil</a><a id="userMenuAdmin" class="hidden" href="gestion.html"><span class="nav-icon" style="width:20px">${_ico.users}</span>Gestion utilisateurs</a><button type="button" onclick="logout()"><span class="nav-icon" style="width:20px">${_ico.logout}</span>Déconnexion</button></div>`;
    el.replaceWith(wrap);
  });
  nav();
  document.querySelectorAll('.overlay').forEach(ov=>{
    ov.addEventListener('click',e=>{if(e.target===ov)closeMobileMenu()});
    ov.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>closeMobileMenu()));
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileMenu()});
  window.addEventListener('resize',()=>{if(window.innerWidth>800)closeMobileMenu()});
});
