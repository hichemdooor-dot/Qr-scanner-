(function(){
  const touchDevice = navigator.maxTouchPoints > 0;
  const smallScreen = Math.min(window.screen?.width || 9999, window.screen?.height || 9999) <= 800;
  const narrowViewport = window.innerWidth <= 800;
  if (touchDevice && (smallScreen || narrowViewport)) document.documentElement.classList.add('mobile-device');
})();

function menuHTML(){
  const icon=(d)=>`<svg class="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const link=(href,label,d,extra='')=>`<a href="${href}"${extra?` class="${extra}"`:''}>${icon(d)}<span>${label}</span></a>`;
  const group=(id,label,items)=>`<section class="nav-group" data-nav-group="${id}">
    <button type="button" class="nav-group-toggle" aria-expanded="false" aria-controls="nav-items-${id}">
      <span class="nav-group-label">${label}</span>
      <svg class="nav-group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <div class="nav-group-items" id="nav-items-${id}">${items}</div>
  </section>`;
  return `<div class="nav dash-menu">
    ${group('pilotage','Pilotage',link('dashboard.html','Tableau de bord','<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>')+
      link('recherche.html','Recherche globale','<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>'))}
    ${group('parc','Parc & stock',
      link('chariots.html','Tous les chariots','<path d="M3 16l2-7h10l5 4v3"/><path d="M5 16h14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M15 9V5h3v5"/>')+
      link('stock.html','Chariots en stock','<path d="M4 7h16v13H4z"/><path d="M8 7V4h8v3M8 11h8M8 15h5"/>')+
      link('nouveau-chariot.html','Nouveau chariot','<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>','admin-only-nav hidden'))}
    ${group('commercial','Commercial & production',
      link('affectation.html','Affectation commerciale','<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M16 11h6"/>')+
      link('modification-production.html','Modification production','<path d="M4 7h16v10H4z"/><path d="M8 17v3M16 17v3M7 4h10M9 8l2 2 4-4"/>','admin-only-nav hidden'))}
    ${group('livraisons','Livraisons',
      link('preparation-livraison.html','Préparation livraison','<path d="M3 5h11v11H3z"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>')+
      link('chariots-prevus-livraison.html','Chariots prévus livraison','<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M7 2v4M17 2v4M3 9h18"/><path d="M8 13h3M8 17h5"/>')+
      link('planning-livraisons.html','Planning des livraisons','<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M7 2v4M17 2v4M3 9h18"/><path d="M8 13h2M12 13h2M16 13h0M8 17h2M12 17h2"/>')+
      link('livres.html','Chariots livrés','<path d="M4 5h12v14H4z"/><path d="M8 8h5M8 12h5M8 16h3"/><path d="M16 8h4v11h-4"/>'))}
    ${group('administration','Administration',
      link('gestion.html','Gestion utilisateurs','<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><path d="M17 11a3 3 0 1 0 0-6M17 15c2.4 0 4 1.5 4 4"/>','admin-only-nav hidden')+
      link('licence.html','Paramètres','<path d="M12 3l2.2 1.5 2.7-.1.8 2.6 2.2 1.6-1 2.5.5 2.7-2.5 1.1-.9 2.5-2.7-.2L12 21l-2.3-1.6-2.7.2-.9-2.5-2.5-1.1.5-2.7-1-2.5L5.3 8.6l.8-2.6 2.7.1L12 3z"/><circle cx="12" cy="12" r="3"/>','admin-only-nav hidden')+
      link('profile.html','Mon profil','<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7"/>'))}
    <div class="nav-separator"></div>
    ${link('#','Déconnexion','<path d="M9 5H4v14h5M13 8l4 4-4 4M17 12H8"/>','logout-link')}
  </div>`;
}
function nav(){
  const page=location.pathname.split('/').pop()||'dashboard.html';
  document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===page));
  document.querySelectorAll('.nav-group').forEach(group=>{
    const active=!!group.querySelector('a.active');
    group.classList.toggle('is-open',active);
    const toggle=group.querySelector('.nav-group-toggle');
    if(toggle)toggle.setAttribute('aria-expanded',active?'true':'false');
  });
}
function wireNavGroups(root=document){
  root.querySelectorAll('.nav-group-toggle').forEach(toggle=>{
    if(toggle.dataset.groupWired==='1')return;
    toggle.dataset.groupWired='1';
    toggle.addEventListener('click',()=>{
      const group=toggle.closest('.nav-group');
      const menu=toggle.closest('.dash-menu');
      if(!group||!menu)return;
      const shouldOpen=!group.classList.contains('is-open');
      menu.querySelectorAll('.nav-group.is-open').forEach(other=>{
        if(other!==group){other.classList.remove('is-open');other.querySelector('.nav-group-toggle')?.setAttribute('aria-expanded','false');}
      });
      group.classList.toggle('is-open',shouldOpen);
      toggle.setAttribute('aria-expanded',shouldOpen?'true':'false');
    });
  });
}
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
function handleMobileNavClick(e){
  const a=e.currentTarget;
  if(!a || a.getAttribute('href')==='#') return;
  // Give the tap a deterministic visual response, then close the drawer.
  a.classList.add('tap-active');
  window.setTimeout(()=>a.classList.remove('tap-active'),180);
  closeMobileMenu();
}
function toggleSidebar(force){
  if(window.innerWidth<=800){toggleMenu(force);return}
  const collapsed=typeof force==='boolean'?force:!document.body.classList.contains('sidebar-collapsed');
  document.body.classList.toggle('sidebar-collapsed',collapsed);
  const btn=document.querySelector('.pro-menu-btn');
  if(btn)btn.setAttribute('aria-expanded',collapsed?'false':'true');
}
function goToGlobalSearch(query='',from='',to='',focusDate=false){
  const url=new URL('recherche.html',location.href);
  if(String(query||'').trim())url.searchParams.set('q',String(query).trim());
  if(from)url.searchParams.set('from',from);
  if(to)url.searchParams.set('to',to);
  if(focusDate)url.searchParams.set('focusDate','1');
  location.href=url.href;
}
function openGlobalDateSearch(){
  const input=document.getElementById('siteGlobalSearchInput')||document.getElementById('dashboardSearch');
  goToGlobalSearch(input?.value||'','','',true);
}
function initSiteGlobalSearch(){
  const page=location.pathname.split('/').pop()||'dashboard.html';
  if(['index.html','maintenance.html'].includes(page))return;
  const dashboard=document.querySelector('.pro-header');
  if(dashboard){
    const shell=dashboard.querySelector('.dashboard-search-shell');
    if(shell&&!shell.querySelector('.sbi-global-date-btn')){
      const btn=document.createElement('button');btn.type='button';btn.className='sbi-global-date-btn';btn.title='Recherche par date';btn.setAttribute('aria-label','Recherche globale par date');btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6"/></svg>';
      btn.addEventListener('click',openGlobalDateSearch);shell.appendChild(btn);
    }
    return;
  }
  const header=document.querySelector('header.top');
  if(!header||header.querySelector('.sbi-global-searchbar'))return;
  const form=document.createElement('form');form.className='sbi-global-searchbar';form.setAttribute('role','search');form.setAttribute('aria-label','Recherche globale dans le site');
  form.innerHTML='<input id="siteGlobalSearchInput" type="search" autocomplete="off" placeholder="Recherche globale : châssis, série, client, moteur..." aria-label="Rechercher dans tout le site"><button class="sbi-global-submit" type="submit" aria-label="Lancer la recherche"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg></button><button class="sbi-global-date-btn" type="button" title="Rechercher par date" aria-label="Recherche par date"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6"/></svg></button>';
  form.addEventListener('submit',e=>{e.preventDefault();goToGlobalSearch(form.querySelector('input')?.value||'')});
  form.querySelector('.sbi-global-date-btn')?.addEventListener('click',()=>openGlobalDateSearch());
  const avatar=header.querySelector('.avatar');
  if(avatar)header.insertBefore(form,avatar);else header.appendChild(form);
}
document.addEventListener('DOMContentLoaded',()=>{
  // Use the exact dashboard hamburger drawer on every page.
  document.querySelectorAll('.overlay').forEach((ov,i)=>{
    ov.id=i?'mobileMenu'+i:'mobileMenu';
    const side=ov.querySelector('.side');
    if(side && !side.classList.contains('mobile-notifications-sidebar') && !side.classList.contains('dash-sidebar')){
      side.classList.add('dashboard-mobile-drawer');
      // Keep the drawer shell separate from the desktop data-nav container so the close button survives rendering.
      side.removeAttribute('data-nav');
      side.innerHTML=`<div class="mobile-drawer-title" aria-hidden="false"><span class="mobile-drawer-title-text">Menu</span>
        <button type="button" class="mobile-drawer-close dashboard-menu-close" aria-label="Fermer le menu" title="Fermer le menu">×</button></div>
        <nav class="dash-nav" data-nav aria-label="Navigation principale"></nav>`;
    }
  });
  document.querySelectorAll('[data-nav]').forEach(x=>{
    x.innerHTML=menuHTML();
    // Admin-only links must be available in the shared navigation on every page,
    // not only through dashboard quick actions. The final role check still lives
    // in app.js; this simply syncs the freshly-rendered menu as soon as the
    // shared shell is mounted.
    if(typeof isAdmin==='function') x.querySelectorAll('.admin-only-nav').forEach(el=>el.classList.toggle('hidden',!isAdmin()));
  });
  wireNavGroups();
  initSiteGlobalSearch();
  document.querySelectorAll('.menu-btn').forEach(btn=>{btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-controls','mobileMenu');});
  document.querySelectorAll('.overlay').forEach((ov,i)=>{
    const side=ov.querySelector('.side');
    const close=side?.querySelector('.mobile-drawer-close');
    if(close) close.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();closeMobileMenu();},{passive:false});
    ov.querySelectorAll('.nav a').forEach(a=>{
      a.addEventListener('click',handleMobileNavClick);
    });
  });
  // The hamburger menu renders Déconnexion as an anchor with href="#".
  // Wire it explicitly so both desktop and mobile navigation use the same
  // real logout flow as the user dropdown.
  document.querySelectorAll('.logout-link').forEach(a=>{
    if(a.dataset.logoutWired==='1')return;
    a.dataset.logoutWired='1';
    a.addEventListener('click',async e=>{
      e.preventDefault();
      e.stopPropagation();
      a.classList.add('tap-active');
      try{
        closeMobileMenu();
        if(typeof logout==='function') await logout();
        else location.href='index.html';
      }catch(err){
        location.href='index.html';
      }
    });
  });
  document.querySelectorAll('.overlay').forEach((ov)=>{
    const side=ov.querySelector('.dashboard-mobile-drawer');
    if(!side) return;
    let touchStartX=0, touchStartY=0;
    side.addEventListener('touchstart',(e)=>{
      const t=e.changedTouches?.[0];
      if(!t) return;
      touchStartX=t.clientX; touchStartY=t.clientY;
    },{passive:true});
    side.addEventListener('touchend',(e)=>{
      const t=e.changedTouches?.[0];
      if(!t) return;
      const dx=t.clientX-touchStartX, dy=t.clientY-touchStartY;
      if(dx < -70 && Math.abs(dx) > Math.abs(dy)*1.2) closeMobileMenu();
    },{passive:true});
  });
  document.querySelectorAll('.brand').forEach(el=>{el.innerHTML='<img class="site-logo" src="assets/logo-sbi-hangcha.png" alt="SBI HANGCHA">';});
  document.querySelectorAll('.avatar').forEach(el=>{
    const wrap=document.createElement('div');
    wrap.className='user-menu-wrap';
    wrap.innerHTML=`<button class="user-menu-button" type="button" onclick="toggleUserMenu();event.stopPropagation()" aria-label="Menu utilisateur"><span class="user-circle" id="userTopAvatar">U</span><span class="user-menu-name"><b id="userTopName">Utilisateur</b><small id="userTopRole">Utilisateur</small></span><span class="user-menu-chevron">⌄</span></button><div id="userMenu" class="user-menu hidden"><a href="profile.html">👤&nbsp; Mon profil</a><a id="userMenuAdmin" class="hidden" href="gestion.html">👥&nbsp; Gestion utilisateurs</a><button type="button" onclick="logout()">↪&nbsp; Déconnexion</button></div>`;
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
