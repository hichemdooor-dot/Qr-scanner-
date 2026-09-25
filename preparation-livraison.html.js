
async function preparationLivraisonPage(){
  if(!await session())return;
  await loadChariots();
  const els={search:document.getElementById('prepSearch'),status:document.getElementById('prepStatus'),engine:document.getElementById('prepEngine'),capacity:document.getElementById('prepCapacity'),mast:document.getElementById('prepMast'),height:document.getElementById('prepHeight'),reset:document.getElementById('prepReset'),count:document.getElementById('prepCount'),list:document.getElementById('prepList')};
  let baseRows=[];
  function latestFirst(rows){return [...rows].sort((a,b)=>{const da=new Date(a.created_at||a.updated_at||0).getTime();const db=new Date(b.created_at||b.updated_at||0).getTime();if(db!==da)return db-da;return (Number(b.id)||0)-(Number(a.id)||0)})}
  function values(key,label){const vals=[...new Set(baseRows.map(c=>String(c[key]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));return '<option value="">'+label+'</option>'+vals.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('')}
  function buildFilters(){
    els.status.innerHTML='<option value="">Statut : Tous</option>'+[...new Set(baseRows.map(c=>String(c.status||'').trim()).filter(Boolean))].sort().map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');
    els.engine.innerHTML=values('engine','Moteur : Tous');
    els.capacity.innerHTML=values('capacity','Capacité : Toutes');
    els.mast.innerHTML=values('mast_type','Mât : Tous');
    els.height.innerHTML=values('lifting_height','Hauteur : Toutes');
  }
  function match(c){
    const q=els.search.value.trim().toLowerCase();
    const text=[c.qr_id,c.chassis,c.engine,c.client].map(v=>String(v||'').toLowerCase());
    return (!q||text.some(v=>v.includes(q)))
      &&(!els.status.value||String(c.status||'')===els.status.value)
      &&(!els.engine.value||String(c.engine||'')===els.engine.value)
      &&(!els.capacity.value||String(c.capacity||'')===els.capacity.value)
      &&(!els.mast.value||String(c.mast_type||'')===els.mast.value)
      &&(!els.height.value||String(c.lifting_height||'')===els.height.value);
  }
  function render(){
    const rows=latestFirst(baseRows.filter(match));
    els.count.textContent=rows.length+' chariot'+(rows.length!==1?'s':'');
    els.list.innerHTML=rows.map(c=>{
      const disabled=normalizeStatus(c.status)==='préparation livraison'; const admin=isAdmin();
      return `<div class="card prep-item" role="link" tabindex="0" aria-label="Ouvrir la fiche du chariot ${esc(c.chassis||c.qr_id||'')}" data-chariot-row="${esc(c.qr_id||'')}">
        <div class="prep-item-main">
          <div class="prep-item-title">${esc(c.chassis||c.qr_id||'—')}</div>
          <div class="prep-item-meta">${esc(c.engine||'—')} · ${esc(fmtCapacity(c.capacity)||'—')} · ${esc(c.client||'—')}</div>
          <div class="prep-item-meta">Statut : <strong>${esc(c.status||'—')}</strong></div>
        </div>
        <div class="prep-item-actions">
          <a class="btn light prep-view-link" href="chariot.html?id=${encodeURIComponent(c.qr_id||'')}">Voir la fiche</a>
          ${admin?`<button class="btn save-ready" type="button" data-prep-ready="${esc(c.qr_id)}">Prêt à livrer</button>`:''}
        </div>
      </div>`
    }).join('')||'<div class="empty">Aucun chariot correspondant.</div>';
    els.list.querySelectorAll('[data-prep-ready]').forEach(b=>b.onclick=e=>{e.stopPropagation();passToPreparation(b.dataset.prepReady)});els.list.querySelectorAll('[data-chariot-row]').forEach(row=>{const go=()=>{const id=row.dataset.chariotRow;if(id)location.href='chariot.html?id='+encodeURIComponent(id)};row.addEventListener('click',e=>{if(e.target.closest('a,button,input,select,textarea'))return;go()});row.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('a,button,input,select,textarea')){e.preventDefault();go()}})});
  }
  async function passToPreparation(qrId){
    if(!requireAdmin())return;
    if(!currentUser){alert('Connexion requise.');return}
    const c=CHARIOTS.find(x=>String(x.qr_id)===String(qrId));if(!c)return;
    if(normalizeStatus(c.status)==='préparation livraison')return;
    const ok=await performWorkflowAction(qrId,'ready');
    if(!ok)return;
    await loadChariots();
    baseRows=CHARIOTS.filter(c=>normalizeStatus(c.status)==='preparation livraison');
    buildFilters();
    render();
    toastCardUpdate(qrId,'Prêt à livrer');
  }
  // Seuls les chariots avec les statuts autorisés pour la préparation sont affichés.
  baseRows=CHARIOTS.filter(c=>normalizeStatus(c.status)==='preparation livraison');
  buildFilters();
  [els.search,els.status,els.engine,els.capacity,els.mast,els.height].forEach(el=>el.addEventListener(el===els.search?'input':'change',render));
  els.reset.onclick=()=>{[els.search,els.status,els.engine,els.capacity,els.mast,els.height].forEach(el=>el.value='');render()};
  render();
  startSbiRealtime(async()=>{if(document.visibilityState!=='visible')return;try{await loadChariots();baseRows=CHARIOTS.filter(c=>{const st=normalizeStatus(c.status);return ['en fabrication','reserve','en stock'].includes(st);});buildFilters();render()}catch(e){console.warn('Actualisation temps réel préparation',e)}} ,['chariots','maintenance']);
  window.addEventListener('pageshow',async()=>{try{await loadChariots();baseRows=CHARIOTS.filter(c=>{const st=normalizeStatus(c.status);return ['en fabrication','reserve','en stock'].includes(st);});buildFilters();render()}catch(e){}});
}
initPage(preparationLivraisonPage())
