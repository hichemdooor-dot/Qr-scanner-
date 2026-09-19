const SUPABASE_URL="https://hkakedonludcqjgjzkei.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_AQWeYHI3Xli_1iBKVr9EPg_8L8PR-Hc";
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:true,
    storageKey:'sbi-supabase-auth'
  }
});
const ADMIN_EMAIL="HICHEMDOOOR@GMAIL.COM",LICENSE_COMPANY="SBI";
// MAINTENANCE_FRESH_CHECK_V8
let maintenanceConfigSynced=false;
async function syncMaintenanceConfig(){
  if(maintenanceConfigSynced)return;
  maintenanceConfigSynced=true;
  try{
    const u=new URL('maintenance-config.js',location.href);
    u.searchParams.set('cb',String(Date.now()));
    const r=await fetch(u.toString(),{cache:'no-store',credentials:'same-origin'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const text=await r.text();
    const enabledMatch=text.match(/\benabled\s*:\s*(true|false)\b/);
    const titleMatch=text.match(/\btitle\s*:\s*([\"'])(.*?)\1/);
    const messageMatch=text.match(/\bmessage\s*:\s*([\"'])(.*?)\1/);
    const returnMatch=text.match(/\bexpectedReturn\s*:\s*([\"'])(.*?)\1/);
    if(!window.SBI_MAINTENANCE)window.SBI_MAINTENANCE={};
    if(enabledMatch)window.SBI_MAINTENANCE.enabled=enabledMatch[1]==='true';
    if(titleMatch)window.SBI_MAINTENANCE.title=titleMatch[2];
    if(messageMatch)window.SBI_MAINTENANCE.message=messageMatch[2];
    if(returnMatch)window.SBI_MAINTENANCE.expectedReturn=returnMatch[2];
  }catch(e){
    console.warn('Lecture fraiche du mode maintenance impossible, utilisation de la configuration deja chargee.',e);
  }
}
function maintenanceEnabled(){
  return !!(window.SBI_MAINTENANCE&&window.SBI_MAINTENANCE.enabled);
}
function isMaintenancePage(){
  const p=location.pathname.split('/').pop()||'index.html';
  return p==='maintenance.html';
}
async function enforceMaintenance(){
  await syncMaintenanceConfig();
  if(!maintenanceEnabled()||isMaintenancePage())return true;
  try{
    const sessionPromise=supabaseClient.auth.getSession();
    const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('TIMEOUT')),3500));
    const {data}=await Promise.race([sessionPromise,timeout]);
    const u=data?.session?.user||null;
    if(u){
      const email=String(u.email||'').toLowerCase();
      let role=String(u.user_metadata?.sbi_role||u.app_metadata?.sbi_role||'').toLowerCase();
      try{
        const r=await supabaseClient.rpc('get_my_sbi_status');
        if(!r.error&&r.data)role=String(r.data.role||role||'').toLowerCase();
      }catch(_){}
      if(email===ADMIN_EMAIL.toLowerCase()||role==='admin')return true;
    }
  }catch(_){}
  location.replace('maintenance.html');
  return false;
}

let CHARIOTS=[],currentUser=null,current=null,editingQrId=null,licenseValid=false,DELIVERY_PLANS=[];
const DELIVERY_PLAN_KEY='sbi_delivery_plans_v1',DELIVERY_PLAN_TYPES=['Planification livraison','Annulation planification livraison'];
const $=s=>document.querySelector(s); const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/\s+/g,' ');
function fmtCapacity(v){let x=String(v??'').trim();if(!x)return'—';x=x.replace(/\s*T\s*T?\s*$/i,'').trim();return x+' T'}
function normalizeStatus(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}
function isAdmin(){return !!currentUser&&(String(currentUser.email||'').toLowerCase()===ADMIN_EMAIL.toLowerCase()||String(currentUser.user_metadata?.sbi_role||currentUser.app_metadata?.sbi_role||'').toLowerCase()==='admin')}
function requireAdmin(){if(!currentUser){alert('Connexion administrateur requise.');return false}if(!isAdmin()){alert('Accès administrateur requis.');return false}return true}
function requireAdminForDelivery(){if(!currentUser){alert('Connexion requise pour gérer les chariots.');return false}if(!isAdmin()){alert('Seul un Admin peut mettre un chariot en statut « Livré ».');return false}return true}
function requireValidLicense(){if(licenseValid)return true;alert('Licence SBI invalide ou expirée.');return false}
function friendlySupabaseError(e){const m=String(e?.message||e||'');if(/failed to fetch|networkerror|load failed|network request failed/i.test(m))return'Impossible de joindre Supabase. Vérifiez la connexion Internet.';if(/invalid login credentials/i.test(m))return'Email ou mot de passe incorrect.';return m||'Erreur inconnue.'}
function getCachedLicense(){
  const cacheKey='sbi-license-check-v1';
  try{
    const c=JSON.parse(localStorage.getItem(cacheKey)||'null');
    if(!c?.checkedAt||!c?.license)return null;
    const age=Date.now()-Number(c.checkedAt);
    if(age<0 || age>60*60*1000)return null;
    return c.license;
  }catch(_){return null}
}
function cacheLicense(l){try{localStorage.setItem('sbi-license-check-v1',JSON.stringify({checkedAt:Date.now(),license:l}))}catch(_){} }
function validateLicenseData(l){
  if(!l)throw new Error('Licence introuvable.');
  const now=new Date();
  const start=l.start_date?new Date(l.start_date+'T00:00:00'):null;
  const end=l.expiration_date?new Date(l.expiration_date+'T23:59:59'):null;
  if(String(l.status||'').toLowerCase()!=='active')throw new Error('La licence est désactivée.');
  if(start&&now<start)throw new Error("La licence n'est pas encore active.");
  if(end&&now>end)throw new Error('La licence a expiré le '+l.expiration_date+'.');
  return l;
}
function applyLicenseCache(){
  const cached=getCachedLicense();
  if(!cached)return false;
  try{
    validateLicenseData(cached);
    licenseValid=true;
    return true;
  }catch(_){return false}
}
async function verifyLicense(options={}){
  const gate=$('#licenseGate');
  if(!gate){
    licenseValid=licenseValid||applyLicenseCache();
  }
  const info=$('#licenseInfo');
  const showGate=options.showGate===true;
  const hideGate=()=>{if(gate){gate.classList.remove('loading-visible');gate.classList.add('hidden')}};
  const showFailure=options.showFailure===true;
  hideGate();

  // Never block the application on the licence check. A previously verified
  // licence is accepted immediately while Supabase is checked in background.
  const cachedOk=applyLicenseCache();
  if(cachedOk && !showFailure){
    licenseValid=true;
    if(info)info.innerHTML='<div>Licence SBI valide. Vérification en arrière-plan...</div>';
  }

  const withTimeout=(promise,ms)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('TIMEOUT')),ms))]);
  const runCheck=async()=>{
    try{
      let l=null;
      try{
        const result=await withTimeout(supabaseClient.rpc('check_sbi_license'),8000);
        const {data,error}=result||{};
        if(error)throw error;
        l=Array.isArray(data)?data[0]:data;
      }catch(rpcErr){
        const result=await withTimeout(supabaseClient.from('licenses').select('company_name,status,start_date,expiration_date').eq('company_name',LICENSE_COMPANY).maybeSingle(),5000);
        if(result?.error)throw result.error;
        l=result?.data||null;
      }
      l=validateLicenseData(l);
      licenseValid=true;
      cacheLicense(l);
      if(info)info.innerHTML=`<div><b>Entreprise :</b> ${esc(l.company_name||'—')}</div><div><b>Statut :</b> <span style="color:#16803e;font-weight:800">Active</span></div><div><b>Expiration :</b> ${esc(l.expiration_date||'Sans expiration')}</div>`;
      hideGate();
      return true;
    }catch(e){
      // If we already have a valid cached licence, keep the site usable when
      // Supabase is temporarily unreachable. Otherwise keep the gate hidden so
      // a network problem cannot freeze the whole website at startup.
      if(licenseValid) return true;
      licenseValid=false;
      if(info)info.innerHTML=`<div style="color:#9a6700"><b>Vérification différée :</b> ${esc(friendlySupabaseError(e))}</div>`;
      if(showGate&&showFailure){
        gate?.classList.remove('hidden');
        gate?.classList.add('loading-visible');
      }else{
        hideGate();
      }
      return false;
    }
  };

  // Background verification: callers can await it explicitly, but normal page
  // initialization does not need to wait.
  if(options.wait===true)return await runCheck();
  runCheck();
  return licenseValid;
}

async function getSession(){
  try{
    const sessionPromise=supabaseClient.auth.getSession();
    const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('SESSION_TIMEOUT')),4000));
    const {data,error}=await Promise.race([sessionPromise,timeout]);
    if(error)throw error;
    currentUser=data.session?.user||null;
    if(!currentUser)return false;
    currentUser.user_metadata=currentUser.user_metadata||{};
    try{
      const rolePromise=supabaseClient.rpc('get_my_sbi_status');
      const roleTimeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('ROLE_TIMEOUT')),3500));
      const {data:s,error:roleError}=await Promise.race([rolePromise,roleTimeout]);
      if(!roleError&&s){
        if(s.disabled){await supabaseClient.auth.signOut();currentUser=null;return false}
        currentUser.user_metadata.sbi_role=s.role||currentUser.user_metadata.sbi_role||'user';
      }
    }catch(roleErr){
      console.warn('Lecture du rôle utilisateur impossible, session conservée.',roleErr);
    }
    return !!currentUser;
  }catch(e){
    console.warn('Restauration de session impossible.',e);
    currentUser=null;
    return false;
  }
}
async function session(){if(!(await enforceMaintenance()))return false;if(!(await getSession())){location.href='index.html';return false}verifyLicense();return true}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&$('#email')&&$('#password')&&document.activeElement!==document.body){e.preventDefault();login()}});
async function login(){const email=$('#email')?.value.trim(),password=$('#password')?.value,msg=$('#msg');if(!email||!password){if(msg)msg.textContent='Email et mot de passe requis.';return}if(msg)msg.textContent='Connexion...';try{const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)throw error;const {data:s,error:se}=await supabaseClient.rpc('get_my_sbi_status');if(se)throw se;if(s?.disabled){await supabaseClient.auth.signOut();throw new Error('Accès bloqué : votre compte est désactivé.')}currentUser=data.user;currentUser.user_metadata=currentUser.user_metadata||{};currentUser.user_metadata.sbi_role=s?.role||'user';location.href='dashboard.html'}catch(e){if(msg)msg.textContent=friendlySupabaseError(e)}}
async function logout(){await supabaseClient.auth.signOut();location.href='index.html'}
async function restoreLoginSession(){
  await syncMaintenanceConfig();
  const path=location.pathname;
  if(path.split('/').pop()!=='index.html' && !path.endsWith('/') && path!=='')return;
  // In maintenance mode, redirect immediately without waiting for Supabase.
  // The admin login is available on maintenance.html. This prevents the login/license spinner from blocking maintenance.
  document.getElementById('licenseGate')?.classList.remove('loading-visible');
  if(maintenanceEnabled()){
    location.replace('maintenance.html');
    return;
  }
  try{
    applyLicenseCache();
    const hasSession=await getSession();
    if(!hasSession){verifyLicense();return}
    location.replace('dashboard.html');
    verifyLicense();
  }catch(e){
    console.warn('Restauration automatique de la connexion impossible.',e);
    verifyLicense();
  }
}


const CHARIOT_SELECT_FIELDS='id,qr_id,chassis,serial_number,engine_number,engine,stock,color,capacity,lifting_height,fork_dimension,mast_type,tire_type,status,client,delivery_date,observations,created_at,updated_at';
async function loadChariots(){
  const attempts=[
    ()=>supabaseClient.from('chariots').select(CHARIOT_SELECT_FIELDS).order('created_at',{ascending:false}).limit(5000),
    ()=>supabaseClient.from('chariots').select(CHARIOT_SELECT_FIELDS).limit(5000),
    ()=>supabaseClient.from('chariots').select('*').limit(5000)
  ];
  let lastError=null;
  for(const makeQuery of attempts){
    try{
      const {data,error}=await withTimeout(makeQuery(),12000);
      if(!error){
        CHARIOTS=Array.isArray(data)?data:[];
        CHARIOTS.sort((a,b)=>{
          const da=new Date(a.created_at||a.updated_at||0).getTime(),db=new Date(b.created_at||b.updated_at||0).getTime();
          if(db!==da)return db-da;
          return Number(b.id||0)-Number(a.id||0);
        });
        try{localStorage.setItem('sbi_chariots_cache_v1',JSON.stringify({savedAt:Date.now(),rows:CHARIOTS}))}catch(_){ }
        return CHARIOTS;
      }
      lastError=error;
    }catch(e){lastError=e}
  }
  try{
    const cached=JSON.parse(localStorage.getItem('sbi_chariots_cache_v1')||'null');
    if(Array.isArray(cached?.rows)&&cached.rows.length){
      CHARIOTS=cached.rows;
      console.warn('Supabase chariots indisponible, utilisation des données en cache.',lastError);
      return CHARIOTS;
    }
  }catch(_){ }
  CHARIOTS=[];
  throw lastError||new Error('Impossible de charger les chariots.');
}

function getUserDisplayName(){return currentUser?.user_metadata?.full_name||currentUser?.user_metadata?.name||currentUser?.email?.split('@')[0]||'Utilisateur'}
function getUserRoleLabel(){return isAdmin()?'Administrateur':'Utilisateur'}
function renderConnectedUser(){const name=getUserDisplayName(),role=getUserRoleLabel();if($('#welcomeUser'))$('#welcomeUser').textContent=name;if($('#userTopName'))$('#userTopName').textContent=name;if($('#userTopRole'))$('#userTopRole').textContent=role;if($('#userTopAvatar'))$('#userTopAvatar').textContent=String(name).trim().charAt(0).toUpperCase()||'U';if(isAdmin()){$('#userMenuAdmin')?.classList.remove('hidden')}}
function toggleUserMenu(){const m=$('#userMenu');if(m)m.classList.toggle('hidden')}
document.addEventListener('click',e=>{const w=document.querySelector('.user-menu-wrap');if(w&&!w.contains(e.target))$('#userMenu')?.classList.add('hidden')});
async function profilePage(){if(!await session())return;renderConnectedUser();if($('#profileName'))$('#profileName').textContent=getUserDisplayName();if($('#profileEmail'))$('#profileEmail').textContent=currentUser?.email||'—';if($('#profileRole'))$('#profileRole').textContent=getUserRoleLabel();}
async function sendPasswordChangeRequest(){
  if(!currentUser){alert('Connexion requise.');return}
  const reason=$('#passwordRequestReason')?.value.trim()||'';
  if(reason.length<3){alert('Veuillez indiquer la raison de la demande.');return}
  const btn=$('#passwordRequestBtn');if(btn)btn.disabled=true;
  try{
    const name=getUserDisplayName();
    const email=String(currentUser.email||'');
    const requestQrId=String(currentUser.id||'');
    const requestText=[
      'Demande de changement de mot de passe',
      'Utilisateur : '+name,
      'Email : '+email,
      'Motif :',
      reason
    ].join('\n');
    const {error}=await supabaseClient.from('maintenance').insert({
      qr_id:requestQrId,
      date:new Date().toISOString().slice(0,10),
      technicien:name,
      type:'Demande changement mot de passe',
      travaux:requestText,
      created_by:currentUser.id
    });
    if(error)throw error;
    $('#passwordRequestReason').value='';
    $('#passwordRequestMsg').textContent='Votre demande a été envoyée. Elle est maintenant visible dans Gestion utilisateurs pour les administrateurs.';
    $('#passwordRequestMsg').className='notice';
  }catch(e){
    if($('#passwordRequestMsg')){$('#passwordRequestMsg').textContent='Erreur : '+friendlySupabaseError(e);$('#passwordRequestMsg').className='notice red';}
  }finally{if(btn)btn.disabled=false}
}
async function loadPasswordRequests(){
  if(!requireAdmin())return;
  const box=$('#passwordRequests');
  if(!box)return;
  try{
    const {data,error}=await supabaseClient.from('maintenance').select('id,date,technicien,type,travaux,created_at,created_by,qr_id').eq('type','Demande changement mot de passe').order('created_at',{ascending:false}).limit(50);
    if(error)throw error;
    const rows=data||[];
    box.innerHTML=rows.length?rows.map(x=>{
      const lines=String(x.travaux||'').split(/\n/);
      const emailLine=lines.find(v=>/^Email\s*:/i.test(v));
      const reasonIndex=lines.findIndex(v=>/^Motif\s*:/i.test(v));
      const reason=reasonIndex>=0?lines.slice(reasonIndex+1).join(' ').trim():String(x.travaux||'');
      const email=emailLine?emailLine.replace(/^Email\s*:/i,'').trim():'';
      const when=x.created_at?new Date(x.created_at).toLocaleString('fr-FR'):(x.date||'');
      return `<div class="item password-request-item" style="cursor:default"><div class="item-main"><div class="item-title">${esc(x.technicien||'Utilisateur')}</div><div class="meta"><strong>Email :</strong> ${esc(email||'—')}<br><strong>Date :</strong> ${esc(when)}<br><strong>Motif :</strong> ${esc(reason||'—')}</div></div><div class="user-actions"><span class="badge orange">À traiter</span><button class="btn light" type="button" onclick="resolvePasswordRequest('${esc(x.id)}')">Marquer traité</button></div></div>`;
    }).join(''):'<div class="empty">Aucune demande de changement de mot de passe.</div>';
  }catch(e){box.innerHTML=`<div class="notice red">Erreur : ${esc(friendlySupabaseError(e))}</div>`}
}
async function resolvePasswordRequest(id){
  if(!requireAdmin())return;
  if(!id)return;
  if(!confirm('Marquer cette demande comme traitée et la retirer de la liste ?'))return;
  const {error}=await supabaseClient.from('maintenance').delete().eq('id',id).eq('type','Demande changement mot de passe');
  if(error){alert('Erreur : '+friendlySupabaseError(error));return}
  await loadPasswordRequests();
}


function statusClass(v){const s=normalizeStatus(v);return s==='en stock'?'status-stock':s==='livre'?'status-delivered':s.includes('reserve')?'status-reserved':s.includes('preparation')?'status-preparation':s.includes('pret a livrer')?'status-ready':s.includes('bloque')||s.includes('non conforme')?'status-blocked':s.includes('fabrication')?'status-fabrication':''}
function isDelivered(c){return normalizeStatus(c.status)==='livre'||!!c.delivery_date}
function getDeliveryPlan(qrId){return DELIVERY_PLANS.find(p=>String(p.qr)===String(qrId))||null}
function readCachedDeliveryPlans(){try{const raw=localStorage.getItem(DELIVERY_PLAN_KEY);const plans=raw?JSON.parse(raw):[];return Array.isArray(plans)?plans:[]}catch(e){return []}}
function cacheDeliveryPlans(plans){try{localStorage.setItem(DELIVERY_PLAN_KEY,JSON.stringify(plans||[]))}catch(e){}}
function parseDeliveryEvent(row){
  try{
    const payload=JSON.parse(String(row?.travaux||'{}'));
    if(!payload||!payload.qr)return null;
    return {id:String(payload.id||row.id),qr:String(payload.qr),date:String(payload.date||row.date||''),time:String(payload.time||''),driver:String(payload.driver||''),destination:String(payload.destination||''),note:String(payload.note||''),created_at:row.created_at||'',created_by:row.created_by||null};
  }catch(e){
    return null;
  }
}
async function loadDeliveryPlans({migrateLocal=false}={}){
  const localBefore=readCachedDeliveryPlans();
  const {data,error}=await supabaseClient.from('maintenance').select('id,qr_id,date,technicien,type,travaux,created_at,created_by').in('type',DELIVERY_PLAN_TYPES).order('created_at',{ascending:true}).limit(1000);
  if(error)throw error;
  const map=new Map();
  for(const row of data||[]){
    const payload=parseDeliveryEvent(row);
    if(!payload)continue;
    if(String(row.type)==='Annulation planification livraison'){
      map.delete(payload.id);
    }else{
      map.set(payload.id,payload);
    }
  }
  DELIVERY_PLANS=[...map.values()].filter(p=>p.date&&p.qr);
  cacheDeliveryPlans(DELIVERY_PLANS);
  if(migrateLocal){
    const local=localBefore;
    const remoteQrs=new Set(DELIVERY_PLANS.map(p=>String(p.qr)));
    const missing=local.filter(p=>p&&p.qr&&p.date&&!remoteQrs.has(String(p.qr)));
    for(const p of missing){
      const logicalId=String(p.id||('dp_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)));
      const {error:insertError}=await supabaseClient.from('maintenance').insert({qr_id:p.qr,date:p.date,technicien:currentUser?.email||getUserDisplayName(),type:'Planification livraison',travaux:JSON.stringify({id:logicalId,qr:String(p.qr),date:String(p.date),time:String(p.time||''),driver:String(p.driver||''),destination:String(p.destination||''),note:String(p.note||'')}),created_by:currentUser?.id||null});
      if(insertError)console.warn('Migration planning non enregistrée',insertError);
    }
    if(missing.length){
      const refreshed=await supabaseClient.from('maintenance').select('id,qr_id,date,technicien,type,travaux,created_at,created_by').in('type',DELIVERY_PLAN_TYPES).order('created_at',{ascending:true}).limit(1000);
      if(!refreshed.error){
        const remap=new Map();
        for(const row of refreshed.data||[]){const payload=parseDeliveryEvent(row);if(!payload)continue;if(String(row.type)==='Annulation planification livraison')remap.delete(payload.id);else remap.set(payload.id,payload)}
        DELIVERY_PLANS=[...remap.values()].filter(p=>p.date&&p.qr);
        cacheDeliveryPlans(DELIVERY_PLANS);
      }
    }
  }
  return DELIVERY_PLANS;
}
function formatPlannedDate(iso){if(!iso)return '—';try{return parseLocalDate(iso).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'})}catch(e){return iso}}
function parseLocalDate(iso){const [y,m,d]=String(iso).split('-').map(Number);return new Date(y||2000,(m||1)-1,d||1)}
function isStock(c){return normalizeStatus(c.status)==='en stock'&&!String(c.client||'').trim()}
function card(c){const id=String(c.qr_id||'');const delivered=isDelivered(c);const canDeliver=isAdmin()&&!delivered;return `<div class="item" onclick="location.href='chariot.html?id=${encodeURIComponent(id)}'"><div class="item-main"><div class="item-title">${esc(id)}</div><div class="meta">${esc(c.chassis||'—')} • ${esc(c.engine||'—')} • ${esc(fmtCapacity(c.capacity))}</div>${c.client?`<div class="client-line"><strong>Client :</strong> ${esc(c.client)}</div>`:''}<div class="recent-time">${c.updated_at?'Mis à jour : '+new Date(c.updated_at).toLocaleString('fr-FR'):''}</div></div><span class="badge ${statusClass(c.status)}">${esc(c.status||c.stock||'—')}</span>${canDeliver?`<button class="btn delivered-action" onclick="event.stopPropagation();markDelivered('${esc(id)}')">Livrer</button>`:''}</div>`}
async function dashboardPage(){
  if(!await session())return;
  let dataLoadError=null;
  try{await loadChariots()}catch(e){dataLoadError=e;console.error('Chargement des chariots du dashboard impossible',e)}
  try{await loadDeliveryPlans({migrateLocal:true})}catch(e){console.warn('Planning dashboard',e)}
  renderConnectedUser();
  $('#dashDate').textContent=new Date().toLocaleString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
  $('#total').textContent=dataLoadError?'—':CHARIOTS.length;
  $('#stock').textContent=dataLoadError?'—':CHARIOTS.filter(isStock).length;
  $('#delivered').textContent=dataLoadError?'—':CHARIOTS.filter(isDelivered).length;
  renderDashboardLatest();
  if(dataLoadError){
    const msg='Impossible de charger les données Supabase. Vérifiez la connexion puis actualisez la page.';
    if($('#latestRows'))$('#latestRows').innerHTML=`<tr><td colspan=5 class=\"dash-empty\">${esc(msg)}</td></tr>`;
    if($('#activityList'))$('#activityList').innerHTML=`<div class=\"dash-empty\">${esc(msg)}</div>`;
    if($('#upcomingDeliveries'))$('#upcomingDeliveries').innerHTML=`<div class=\"dash-empty\">${esc(msg)}</div>`;
    return;
  }
  await loadDashboardNotifications();
  renderProfessionalDashboard();
}
function renderDashboardLatest(){
  const rows=[...CHARIOTS].sort((a,b)=>new Date(b.created_at||b.updated_at||0)-new Date(a.created_at||a.updated_at||0)).slice(0,5);
  $('#latestRows').innerHTML=rows.map(c=>`<tr onclick="location.href='chariot.html?id=${encodeURIComponent(c.qr_id||'')}'" style="cursor:pointer"><td><b>${esc(c.chassis||c.qr_id||'—')}</b>${c.client?`<div class="dash-client"><strong>Client :</strong> ${esc(c.client)}</div>`:''}</td><td>${esc(c.engine||'—')}</td><td>${esc(fmtCapacity(c.capacity))}</td><td><span class="dash-status ${isDelivered(c)?'delivered':''}">${esc(c.status||'—')}</span></td><td>${c.created_at?new Date(c.created_at).toLocaleDateString('fr-FR'):c.updated_at?new Date(c.updated_at).toLocaleDateString('fr-FR'):'—'}</td></tr>`).join('')||'<tr><td colspan="5" class="dash-empty">Aucun chariot.</td></tr>';
}
function parseEventPayload(value){
  if(value&&typeof value==='object')return value;
  if(typeof value!=='string')return null;
  const raw=value.trim();
  if(!raw||(!raw.startsWith('{')&&!raw.startsWith('[')))return null;
  try{const p=JSON.parse(raw);return p&&typeof p==='object'?p:null}catch(_){return null}
}
function eventDetails(x,payload){
  const parts=[];
  if(payload){
    if(payload.date)parts.push('Date : '+payload.date);
    if(payload.time)parts.push('Heure : '+payload.time);
    if(payload.driver)parts.push('Chauffeur : '+payload.driver);
    if(payload.destination)parts.push('Destination : '+payload.destination);
    if(payload.note)parts.push('Note : '+payload.note);
  }
  return parts;
}
function formatMaintenanceEvent(x,c){
  const type=String(x?.type||'').trim();
  const payload=parseEventPayload(x?.travaux);
  const chassis=String(c?.chassis||x?.qr_id||'—');
  const normalized=normalizeStatus(type);
  const parts=eventDetails(x,payload);
  if(type==='Planification livraison' && payload){
    return {title:'Livraison planifiée — '+chassis,details:parts.join(' • ')||'Planification enregistrée',icon:'▣',kind:'delivery'};
  }
  if(type==='Annulation planification livraison' && payload){
    return {title:'Livraison annulée — '+chassis,details:parts.filter((_,i)=>i<4).join(' • ')||'Planification annulée',icon:'×',kind:'cancel'};
  }
  const delivered=normalized.includes('statut')&&normalizeStatus(x?.travaux).includes('livr');
  if(delivered)return {title:'Statut changé en Livré — '+chassis,details:'Chariot passé au statut Livré',icon:'▰',kind:'delivered'};
  if(payload){
    const modificationParts=[];
    if(payload.date)modificationParts.push('Date : '+payload.date);
    if(payload.note)modificationParts.push('Observation : '+payload.note);
    return {title:'Modification du chariot '+chassis,details:modificationParts.join(' • ')||'Modification enregistrée',icon:'✎',kind:'edit'};
  }
  const clean=String(x?.travaux||'').trim();
  return {title:'Modification du chariot '+chassis,details:clean||type||'Modification enregistrée',icon:'✎',kind:'edit'};
}
async function loadDashboardNotifications(){
  let data=[];
  try{const r=await supabaseClient.from('maintenance').select('id,qr_id,date,technicien,type,travaux,created_at,created_by').order('created_at',{ascending:false}).limit(8);if(!r.error)data=r.data||[]}catch(e){}
  const rows=data.filter(x=>x.qr_id&&!String(x.type||'').toLowerCase().includes('demande changement mot de passe')).slice(0,6);
  const unread=rows.filter(x=>!localStorage.getItem('sbi_notif_read_'+x.id)).length;
  $('#notificationCount').textContent=unread;
  $('#notificationCountTitle').textContent=unread;
  $('#notificationsList').innerHTML=rows.length?`<div class="alerts-table-wrap"><table class="alerts-table"><thead><tr><th>Chariot</th><th>Type</th><th>Statut</th><th>Date</th></tr></thead><tbody>${rows.slice(0,5).map((x)=>{
    const c=CHARIOTS.find(v=>String(v.qr_id)===String(x.qr_id));
    const ev=formatMaintenanceEvent(x,c);
    const type=String(x.type||ev.title||'Intervention').replace(/Planification livraison/i,'Livraison').replace(/Modification chariot/i,'Modification');
    const status=ev.kind==='delivered'?'Livré':ev.kind==='cancel'?'Annulée':ev.kind==='delivery'?'Planifiée':'À faire';
    const statusClass=status==='Livré'?'delivered':status==='Planifiée'?'planned':status==='Annulée'?'cancelled':'todo';
    return `<tr onclick="location.href='chariot.html?id=${encodeURIComponent(x.qr_id)}'" style="cursor:pointer"><td><b>${esc(c?.chassis||x.qr_id||'—')}</b></td><td>${esc(type)}</td><td><span class="alert-status ${statusClass}">${esc(status)}</span></td><td>${esc(formatPlannedDate(x.date)||'—')}</td></tr>`;
  }).join('')}</tbody></table></div>`:'<div class="dash-empty">Aucune alerte récente.</div>';
  const acts=rows.slice(0,5);
  $('#activityList').innerHTML=acts.length?acts.map((x,i)=>{
    const c=CHARIOTS.find(v=>String(v.qr_id)===String(x.qr_id));
    const ev=formatMaintenanceEvent(x,c);
    const line=ev.kind==='delivered'?'green':ev.kind==='delivery'?'blue':ev.kind==='cancel'?'orange':i%3===1?'orange':'';
    return `<div class="activity-item"><span class="activity-line ${line}"></span><span class="activity-icon">${ev.icon}</span><div class="activity-main"><b>${esc(ev.title)}</b><div>${esc(ev.details)}</div></div><span class="activity-time">${x.created_at?relativeTime(x.created_at):''}</span></div>`;
  }).join(''):'<div class="dash-empty">Aucune activité.</div>';
}
function relativeTime(iso){const ms=Date.now()-new Date(iso).getTime(),m=Math.max(0,Math.floor(ms/60000));if(m<1)return'À l’instant';if(m<60)return`Il y a ${m} min`;const h=Math.floor(m/60);if(h<24)return`Il y a ${h} h`;const d=Math.floor(h/24);return`Il y a ${d} j`}
function markDashboardNotificationsRead(){document.querySelectorAll('.notification-row').forEach((row)=>{row.classList.remove('notification-new')});document.querySelectorAll('#notificationsList .view-chariot').forEach(b=>{const s=b.getAttribute('onclick')||'',m=s.match(/sbi_notif_read_([^']+)/);if(m)localStorage.setItem('sbi_notif_read_'+m[1],'1')});$('#notificationCount').textContent='0';$('#notificationCountTitle').textContent='0'}
async function chariotsPage(){if(!await session())return;await loadChariots();const ids=['engineFilter','capacityFilter','mastFilter','heightFilter'];function fill(){const defs=[['engineFilter','engine','Moteur : Tous'],['capacityFilter','capacity','Capacité : Toutes'],['mastFilter','mast_type','Mât : Tous'],['heightFilter','lifting_height','Hauteur : Toutes']];defs.forEach(([id,k,label])=>{const e=$('#'+id),old=e.value;if(!e)return;let vals;if(id==='capacityFilter'){vals=['2.5T','3T','3.8T','5T','7T','10T','12T']}else{vals=[...new Set(CHARIOTS.map(c=>String(c[k]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))}e.innerHTML=`<option value="">${label}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(vals.includes(old))e.value=old})}function render(){fill();let rows=CHARIOTS;const sf=$('#statusFilter')?.value||'';if(sf==='stock')rows=rows.filter(isStock);if(sf==='delivered')rows=rows.filter(isDelivered);const q=$('#search')?.value.trim().toLowerCase()||'';const fs=[['engineFilter','engine'],['capacityFilter','capacity'],['mastFilter','mast_type'],['heightFilter','lifting_height']];rows=rows.filter(c=>(!q||[c.qr_id,c.chassis,c.engine,c.client,c.capacity].some(v=>String(v||'').toLowerCase().includes(q)))&&fs.every(([id,k])=>!$('#'+id)?.value||norm(c[k])===norm($('#'+id).value)));$('#count').textContent=rows.length+' chariot'+(rows.length!==1?'s':'');$('#list').innerHTML=rows.map(card).join('')||'<div class="empty">Aucun résultat.</div>'}$('#search').addEventListener('input',render);$('#statusFilter').addEventListener('change',render);ids.forEach(id=>$('#'+id).addEventListener('change',render));$('#clearFilters').onclick=()=>{ids.forEach(id=>$('#'+id).value='');$('#statusFilter').value='';$('#search').value='';render()};render()}
async function detailPage(){if(!await session())return;await loadChariots();try{await loadDeliveryPlans()}catch(e){DELIVERY_PLANS=readCachedDeliveryPlans()}const id=new URLSearchParams(location.search).get('id');current=CHARIOTS.find(c=>String(c.qr_id)===String(id));if(!current){$('#detail').innerHTML='<div class="empty">Chariot introuvable.</div>';return}$('#title').textContent=current.qr_id;$('#status').textContent=current.status||'—';const planned=getDeliveryPlan(current.qr_id);const plannedDate=planned?.date?formatPlannedDate(planned.date):'—';const plannedTime=planned?.time||'—';const plannedDriver=planned?.driver||'—';const plannedDestination=planned?.destination||'—';const groups=[['Identification',[['N° châssis',current.chassis],['N° de série',current.serial_number],['N° moteur',current.engine_number],['Moteur',current.engine]]],['Caractéristiques',[['Capacité',fmtCapacity(current.capacity)],['Hauteur de levage',current.lifting_height],['Dimensions des fourches',current.fork_dimension],['Type de mât',String(current.mast_type||'').toUpperCase()],['Type de pneu',current.tire_type],['Couleur',current.color]]],['Informations stock',[['Stock',current.stock],['Statut',current.status],['Client',current.client],['Date planifiée',plannedDate],['Heure planifiée',plannedTime],['Chauffeur planifié',plannedDriver],['Destination planifiée',plannedDestination],['Date de livraison',current.delivery_date]]],['Observations',[['Observations',current.observations]]]];$('#detail').innerHTML=groups.map(g=>`<div class="section"><h3>${esc(g[0])}</h3><div class="details">${g[1].map(([k,v])=>`<div class="kv"><small>${esc(k)}</small><b>${esc(v||'—')}</b></div>`).join('')}</div></div>`).join('');$('#edit').onclick=()=>location.href='nouveau-chariot.html?id='+encodeURIComponent(current.qr_id);const deliverBtn=$('#deliver');if(deliverBtn){if(isDelivered(current)||!isAdmin()){deliverBtn.style.display='none'}else{deliverBtn.style.display='inline-flex';deliverBtn.onclick=()=>markDelivered(current.qr_id)}}await renderMaintenanceHistory()}
async function renderMaintenanceHistory(){const box=$('#history');if(!box||!current)return;const {data,error}=await supabaseClient.from('maintenance').select('id,date,technicien,type,travaux,created_at').eq('qr_id',current.qr_id).order('date',{ascending:false}).order('created_at',{ascending:false});if(error){box.innerHTML='<div class="notice red">Erreur historique : '+esc(error.message)+'</div>';return}box.innerHTML=(data||[]).filter(x=>!DELIVERY_PLAN_TYPES.includes(String(x.type||''))).map(x=>`<div class="log"><b>${esc(x.date)} — ${esc(x.type||'Intervention')}</b><small>${esc(x.technicien||'—')}</small><div style="margin-top:7px">${esc(x.travaux||'—')}</div>${isAdmin()&&x.id?`<div class="actions"><button class="btn light" onclick="deleteMaintenance('${esc(x.id)}')">Supprimer</button></div>`:''}</div>`).join('')||'<div class="muted">Aucune intervention enregistrée.</div>'}
async function addMaintenance(){if(!requireValidLicense())return;if(!current){alert('Sélectionnez un chariot.');return}if(!currentUser){alert('Connectez-vous.');return}const types=[...document.querySelectorAll('#typeMultiOptions input:checked')].map(x=>x.value).join(', '),travaux=$('#travaux')?.value.trim()||'';if(!types&&!travaux){alert('Sélectionnez un type de modification ou indiquez les détails.');return}const {error}=await supabaseClient.from('maintenance').insert({qr_id:current.qr_id,date:$('#date')?.value||new Date().toISOString().slice(0,10),technicien:$('#technicien')?.value.trim()||currentUser.email,type:types,travaux,created_by:currentUser.id});if(error){alert('Erreur : '+error.message);return}document.querySelectorAll('#typeMultiOptions input').forEach(x=>x.checked=false);if($('#travaux'))$('#travaux').value='';await renderMaintenanceHistory()}
async function deleteMaintenance(id){if(!requireAdmin())return;if(!confirm('Supprimer définitivement cette intervention ?'))return;const {error}=await supabaseClient.from('maintenance').delete().eq('id',id);if(error)alert('Erreur : '+error.message);else await renderMaintenanceHistory()}
function nextQr(){let n=Math.max(0,...CHARIOTS.map(c=>Number(String(c.qr_id||'').match(/^CH-(\d+)$/i)?.[1]||0)))+1;return'CH-'+String(n).padStart(4,'0')}
async function newPage(){if(!await session())return;await loadChariots();const id=new URLSearchParams(location.search).get('id');const old=CHARIOTS.find(c=>String(c.qr_id)===String(id));if(old){editingQrId=old.qr_id;$('#formTitle').textContent='Modifier '+old.qr_id;for(const [k,v] of Object.entries(old)){const el=document.querySelector(`[name="${k}"]`);if(el)el.value=v??''}}else{$('[name="qr_id"]').value=nextQr();editingQrId=null}if(!isAdmin()){const statusSelect=document.querySelector('[name="status"]');statusSelect?.querySelectorAll('option').forEach(o=>{if(normalizeStatus(o.value)==='livre')o.remove()});}
  document.querySelectorAll('#chariotForm input,#chariotForm select,#chariotForm textarea').forEach(el=>el.addEventListener('input',updateSaveButtonState));document.querySelectorAll('#chariotForm select').forEach(el=>el.addEventListener('change',updateSaveButtonState));updateSaveButtonState()}
function updateSaveButtonState(){const ok=['chassis','color','engine','capacity','fork_dimension','tire_type'].every(k=>String(document.querySelector(`[name="${k}"]`)?.value||'').trim());$('#saveBtn')?.classList.toggle('save-ready',ok)}
async function saveChariot(){
  if(!requireValidLicense())return;if(!currentUser){alert('Connectez-vous pour gérer les chariots.');return}
  const f=$('#chariotForm'),p=Object.fromEntries(new FormData(f).entries());
  for(const [k,label] of [['chassis','N° châssis'],['color','Couleur'],['engine','Type de moteur'],['capacity','Capacité'],['fork_dimension','Fourche'],['tire_type','Type de pneu']])if(!String(p[k]||'').trim()){alert(label+' obligatoire.');return}
  const oldId=new URLSearchParams(location.search).get('id')||'';
  const old=CHARIOTS.find(c=>String(c.qr_id)===String(oldId));
  if(normalizeStatus(p.status)==='livre' && !isAdmin()){alert('Seul un Admin peut mettre un chariot en statut « Livré ».');return}
  const duplicate=CHARIOTS.find(c=>norm(c.chassis)===norm(p.chassis)&&norm(c.engine)===norm(p.engine)&&String(c.qr_id)!==String(oldId));
  if(duplicate){alert(`Le numéro de châssis « ${p.chassis} » existe déjà avec le même moteur (${p.engine}) — ${duplicate.qr_id}.`);return}
  p.updated_at=new Date().toISOString();p.delivery_date=p.delivery_date||null;p.qr_id=p.qr_id||nextQr();
  const {error}=oldId?await supabaseClient.from('chariots').update(p).eq('qr_id',oldId):await supabaseClient.from('chariots').insert(p);
  if(error){alert('Erreur : '+error.message);return}
  if(oldId&&old){
    const labels={chassis:'N° châssis',serial_number:'N° de série',engine_number:'N° moteur',engine:'Moteur',capacity:'Capacité',lifting_height:'Hauteur de levage',fork_dimension:'Dimensions des fourches',mast_type:'Type de mât',tire_type:'Type de pneu',color:'Couleur',stock:'Stock',status:'Statut',client:'Client',delivery_date:'Date de livraison',observations:'Observations'};
    const changes=Object.keys(labels).filter(k=>String(old[k]??'')!==String(p[k]??'')).map(k=>`${labels[k]} : ${old[k]||'—'} → ${p[k]||'—'}`);
    if(changes.length){try{await supabaseClient.from('maintenance').insert({qr_id:p.qr_id,date:new Date().toISOString().slice(0,10),technicien:currentUser.email,type:'Modification chariot',travaux:changes.join(' • '),created_by:currentUser.id})}catch(e){console.warn('Notification modification non enregistrée',e)}}
  }
  location.href='chariot.html?id='+encodeURIComponent(p.qr_id)
}
async function markDelivered(qrId){if(!requireValidLicense()||!requireAdminForDelivery())return;const c=CHARIOTS.find(x=>String(x.qr_id)===String(qrId));if(!c)return alert('Chariot introuvable.');if(isDelivered(c))return;if(!confirm('Passer le chariot '+qrId+' directement au statut « Livré » ?'))return;const payload={status:'Livré',delivery_date:new Date().toISOString().slice(0,10),updated_at:new Date().toISOString()};const {error}=await supabaseClient.from('chariots').update(payload).eq('qr_id',qrId);if(error){alert('Erreur : '+error.message);return}try{await supabaseClient.from('maintenance').insert({qr_id:qrId,date:payload.delivery_date,technicien:currentUser.email,type:'Statut',travaux:`Statut : ${c.status||'—'} → Livré`,created_by:currentUser.id})}catch(e){console.warn('Notification livraison non enregistrée',e)}c.status=payload.status;c.delivery_date=payload.delivery_date;c.updated_at=payload.updated_at;if(typeof chariotsPage==='function'&&document.getElementById('list')){const input=document.getElementById('search');const filter=document.getElementById('filter');if(input&&filter){let rows=CHARIOTS;const f=filter.value||'all';if(f==='stock')rows=rows.filter(isStock);if(f==='delivered')rows=rows.filter(isDelivered);const q=input.value.trim().toLowerCase();if(q)rows=rows.filter(x=>[x.qr_id,x.chassis,x.engine,x.client,x.capacity].some(v=>String(v||'').toLowerCase().includes(q)));document.getElementById('count').textContent=rows.length+' chariot'+(rows.length!==1?'s':'');document.getElementById('list').innerHTML=rows.map(card).join('')||'<div class="empty">Aucun résultat.</div>';}}else location.reload();}
async function deleteChariot(){if(!requireValidLicense()||!requireAdmin())return;const id=new URLSearchParams(location.search).get('id')||$('#qr_id')?.value;if(!id)return;if(!confirm('Supprimer définitivement le chariot '+id+' ?'))return;const {error}=await supabaseClient.from('chariots').delete().eq('qr_id',id);if(error){alert('Erreur : '+error.message);return}location.href='chariots.html'}
async function stockPage(){if(!await session())return;await loadChariots();const ids=['engineFilter','capacityFilter','mastFilter','heightFilter'];function fill(){const rows=CHARIOTS.filter(isStock);const defs=[['engineFilter','engine','Moteur : Tous'],['capacityFilter','capacity','Capacité : Toutes'],['mastFilter','mast_type','Mât : Tous'],['heightFilter','lifting_height','Hauteur : Toutes']];defs.forEach(([id,k,label])=>{const e=$('#'+id),old=e.value,vals=[...new Set(rows.map(c=>String(c[k]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));e.innerHTML=`<option value="">${label}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(vals.includes(old))e.value=old})}function render(){fill();let rows=CHARIOTS.filter(isStock);const q=$('#stockSearch')?.value.trim().toLowerCase()||'';const fs=[['engineFilter','engine'],['capacityFilter','capacity'],['mastFilter','mast_type'],['heightFilter','lifting_height']];rows=rows.filter(c=>(!q||[c.qr_id,c.chassis,c.engine,c.client,c.capacity].some(v=>String(v||'').toLowerCase().includes(q)))&&fs.every(([id,k])=>!$('#'+id).value||norm(c[k])===norm($('#'+id).value)));$('#stockCount').textContent=rows.length+' chariot'+(rows.length!==1?'s':'')+' en stock';$('#stockList').innerHTML=rows.map(card).join('')||'<div class="empty">Aucun chariot en stock.</div>'}$('#stockSearch').addEventListener('input',render);ids.forEach(id=>$('#'+id).addEventListener('change',render));$('#clearFilters').onclick=()=>{ids.forEach(id=>$('#'+id).value='');$('#stockSearch').value='';render()};render()}
async function deliveredPage(){if(!await session())return;await loadChariots();function render(){const q=$('#deliveredSearch').value.trim().toLowerCase();const rows=CHARIOTS.filter(isDelivered).filter(c=>!q||[c.qr_id,c.chassis,c.engine,c.client].some(v=>String(v||'').toLowerCase().includes(q))).sort((a,b)=>{const da=new Date(a.delivery_date||0).getTime();const db=new Date(b.delivery_date||0).getTime();if(db!==da)return db-da;return new Date(b.updated_at||0).getTime()-new Date(a.updated_at||0).getTime()});$('#deliveredCount').textContent=rows.length+' chariot'+(rows.length!==1?'s':'')+' livré'+(rows.length!==1?'s':'');$('#deliveredList').innerHTML=rows.map(card).join('')||'<div class="empty">Aucun chariot livré.</div>'}$('#deliveredSearch').addEventListener('input',render);render()}
async function qrPage(){if(!await session())return;await loadChariots();const sel=$('#qrSelect');const rows=[...CHARIOTS].sort((a,b)=>Number(b.id)-Number(a.id));sel.innerHTML='<option value="">Choisir un chariot...</option>'+rows.map(c=>`<option value="${esc(c.qr_id)}">${esc(c.qr_id)} — ${esc(c.chassis||'')} — ${esc(c.engine||'')} — ${esc(fmtCapacity(c.capacity))}</option>`).join('');sel.value=rows[0]?.qr_id||'';renderQR(sel.value);sel.onchange=()=>renderQR(sel.value)}
function renderQR(id){const box=$('#qr');if(!box)return;box.innerHTML='';const c=CHARIOTS.find(x=>x.qr_id===id);if(!c){$('#qrLabel').textContent='';return}const url=location.origin+location.pathname.replace('qr-codes.html','chariot.html')+'?id='+encodeURIComponent(id);new QRCode(box,{text:url,width:220,height:220,correctLevel:QRCode.CorrectLevel.M});$('#qrLabel').textContent=id}
function printSelectedQrCode(){const box=$('#qr');const source=box?.querySelector('canvas,img');if(!source){alert('QR code introuvable.');return}const src=source.tagName.toLowerCase()==='canvas'?source.toDataURL('image/png'):source.src;const w=window.open('','_blank','width=600,height=700');if(!w){alert('Autorisez les fenêtres popup.');return}w.document.write(`<html><head><title>QR Code</title><style>@page{margin:0}body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center}img{width:70mm;height:70mm}</style></head><body><img src="${src}"></body></html>`);w.document.close();w.onload=()=>{w.print();setTimeout(()=>w.close(),300)}}
async function historyPage(){if(!await session())return;await loadChariots();const rows=[...CHARIOTS].sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0));$('#historyList').innerHTML=rows.map(c=>card(c)).join('')||'<div class="empty">Aucune donnée.</div>'}
function exportRows(){const cols=[['QR ID','qr_id'],['N° châssis','chassis'],['N° de série','serial_number'],['N° moteur','engine_number'],['Moteur','engine'],['Stock','stock'],['Couleur','color'],['Capacité','capacity'],['Hauteur de levage','lifting_height'],['Dimensions des fourches','fork_dimension'],['Type de mât','mast_type'],['Type de pneu','tire_type'],['Statut','status'],['Client','client'],['Date de livraison','delivery_date'],['Observations','observations']];return{headers:cols.map(x=>x[0]),rows:CHARIOTS.map(c=>cols.map(x=>c[x[1]]??''))}}
function exportChariotsExcel(){if(!requireValidLicense()||!currentUser)return alert('Connexion requise pour exporter.');if(typeof XLSX==='undefined')return alert('Module Excel indisponible.');const {headers,rows}=exportRows(),ws=XLSX.utils.aoa_to_sheet([headers,...rows]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Chariots');XLSX.writeFile(wb,'Chariots_SBI.xlsx')}
function exportChariotsPDF(){if(!requireValidLicense()||!currentUser)return alert('Connexion requise pour exporter.');if(!window.jspdf?.jsPDF?.API?.autoTable)return alert('Module PDF indisponible.');const {headers,rows}=exportRows(),{jsPDF}=window.jspdf,doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});doc.text('Liste des chariots — SBI',10,10);doc.autoTable({head:[headers],body:rows,startY:15,styles:{fontSize:5,cellPadding:1},margin:{left:5,right:5}});doc.save('Chariots_SBI.pdf')}
async function gestionPage(){if(!await session())return;if(!requireAdmin()){$('#users').innerHTML='<div class="notice red">Accès administrateur requis.</div>';return}await loadSbiUsers();await loadPasswordRequests()}
function renderSbiUsers(users){$('#users').innerHTML=users.length?users.map(u=>{const email=String(u.email||'—');const role=String(u.role||'user');const status=u.disabled?'Désactivé':'Actif';return `<div class="item sbi-user-item" style="cursor:default"><div class="item-main sbi-user-main"><div class="item-title sbi-user-email" title="${esc(email)}">${esc(email)}</div><div class="meta sbi-user-meta"><span><strong>Rôle :</strong> ${esc(role)}</span><span><strong>Statut :</strong> ${esc(status)}</span></div></div><span class="badge ${u.disabled?'red':''} sbi-user-badge">${u.disabled?'Inactif':'Actif'}</span><div class="user-actions sbi-user-actions"><button class="btn light" onclick="toggleSbiUser('${esc(u.id)}',${!u.disabled})">${u.disabled?'Réactiver':'Désactiver'}</button><button class="btn danger" onclick="deleteSbiUser('${esc(u.id)}')">Supprimer</button></div></div>`}).join(''):'<div class="empty">Aucun utilisateur.</div>'}
async function loadSbiUsers(){if(!requireAdmin())return;try{const {data,error}=await supabaseClient.rpc('admin_list_sbi_users');if(error)throw error;renderSbiUsers(data||[]);$('#userAdminMsg').textContent=(data||[]).length+' utilisateur(s).'}catch(e){$('#userAdminMsg').textContent='Erreur : '+friendlySupabaseError(e)}}
async function createSbiUser(){if(!requireAdmin())return;const email=$('#userAdminEmail').value.trim(),password=$('#userAdminPassword').value,role=$('#userAdminRole').value;if(!email||password.length<6){$('#userAdminMsg').textContent='Email requis et mot de passe de 6 caractères minimum.';return}try{const {data,error}=await supabaseClient.functions.invoke('admin-create-user',{body:{email,password,role}});if(error)throw error;if(data?.error)throw new Error(data.error);$('#userAdminEmail').value='';$('#userAdminPassword').value='';$('#userAdminMsg').textContent='Utilisateur créé avec succès.';await loadSbiUsers()}catch(e){$('#userAdminMsg').textContent='Erreur : '+friendlySupabaseError(e)}}
async function toggleSbiUser(id,disabled){if(!requireAdmin())return;const {error}=await supabaseClient.rpc('admin_set_sbi_user_disabled',{p_user_id:id,p_disabled:disabled});if(error){alert('Erreur : '+error.message);return}await loadSbiUsers()}
async function deleteSbiUser(id){if(!requireAdmin()||!confirm('Supprimer définitivement cet utilisateur ?'))return;const {error}=await supabaseClient.rpc('admin_delete_sbi_user',{p_user_id:id});if(error)alert('Erreur : '+error.message);else await loadSbiUsers()}
async function licencePage(){if(!await session())return;if(!isAdmin()){$('#licensePanel').innerHTML='<div class="notice red">Gestion de licence réservée à l’administrateur.</div>';return}const {data,error}=await supabaseClient.from('licenses').select('company_name,status,start_date,expiration_date').eq('company_name',LICENSE_COMPANY).maybeSingle();if(error){$('#licenseMsg').textContent=error.message;return}if(!data){$('#licenseMsg').textContent='Licence introuvable.';return}$('#licenseStatus').value=data.status||'active';$('#licenseStart').value=data.start_date||'';$('#licenseExpiry').value=data.expiration_date||''}
async function saveLicense(){if(!requireAdmin())return;const status=$('#licenseStatus').value,start_date=$('#licenseStart').value,expiration_date=$('#licenseExpiry').value||null;if(!start_date)return $('#licenseMsg').textContent='Date de début obligatoire.';if(expiration_date&&expiration_date<start_date)return $('#licenseMsg').textContent='Expiration invalide.';const {error}=await supabaseClient.from('licenses').update({status,start_date,expiration_date}).eq('company_name',LICENSE_COMPANY);if(error){$('#licenseMsg').textContent='Erreur : '+error.message;return}$('#licenseMsg').textContent='Licence mise à jour.';await verifyLicense()}
async function initPage(fn){if(!(await enforceMaintenance()))return;if(!(await getSession())){location.href=maintenanceEnabled()?'maintenance.html':'index.html';return}applyLicenseCache();await fn();if(currentUser&&typeof renderConnectedUser==='function')renderConnectedUser();verifyLicense()}


async function deliveryPlanningPage(){
  if(!await session())return;
  await loadChariots();
  try{await loadDeliveryPlans({migrateLocal:true})}catch(e){
    DELIVERY_PLANS=readCachedDeliveryPlans();
    if(!DELIVERY_PLANS.length)alert('Impossible de charger le planning partagé : '+friendlySupabaseError(e));
  }
  let plans=[...DELIVERY_PLANS];
  const els={week:$('#weekDays'),list:$('#deliveryList'),range:$('#rangeTitle'),modal:$('#deliveryModal'),form:$('#deliveryForm'),search:$('#deliverySearch'),searchResults:$('#deliverySearchResults'),clearSearch:$('#clearDeliverySearch'),chariot:$('#deliveryChariot'),date:$('#deliveryDate'),time:$('#deliveryTime'),driver:$('#deliveryDriver'),destination:$('#deliveryDestination'),note:$('#deliveryNote'),noteCount:$('#deliveryNoteCount'),close:$('#closeDeliveryModal'),today:$('#todayBtn'),prev:$('#prevWeek'),next:$('#nextWeek'),plan:$('#planBtn'),cancel:$('#cancelDelivery'),todayCount:$('#todayCount'),weekCount:$('#weekCount'),plannedCount:$('#plannedCount')};
  let selectedDate=localDateISO(new Date()), weekStart=startOfWeek(new Date()), refreshBusy=false;
  function localDateISO(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
  function parseDate(s){const [y,m,d]=String(s).split('-').map(Number);return new Date(y||2000,(m||1)-1,d||1)}
  function startOfWeek(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());const n=x.getDay();const diff=n===0?-6:1-n;x.setDate(x.getDate()+diff);return x}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
  function formatLong(s){return parseDate(s).toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
  function syncPlans(next){plans=(next||[]).filter(p=>{const c=getMachine(p.qr);return !c||!isDelivered(c)});cacheDeliveryPlans(plans)}
  function getMachine(qr){return CHARIOTS.find(c=>String(c.qr_id)===String(qr))}
  function availableChariots(excludeQr=''){
    const excluded=plans.filter(p=>String(p.qr)!==String(excludeQr)).map(p=>String(p.qr));
    return CHARIOTS.filter(c=>normalizeStatus(c.status)!=='livre'&&!c.delivery_date&&!excluded.includes(String(c.qr_id)));
  }
  function chariotSearchText(c){return Object.values(c||{}).filter(v=>v!==null&&v!==undefined).map(v=>String(v)).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()}
  function searchTokens(s){return norm(s).split(/\s+/).filter(Boolean)}
  function refreshChariotOptions(excludeQr=''){
    const old=els.chariot.value;
    els.chariot.innerHTML='<option value="">Sélectionner un chariot</option>'+availableChariots(excludeQr).map(c=>`<option value="${esc(c.qr_id)}">${esc(c.chassis||c.qr_id)} · ${esc(c.client||'Sans client')} · ${esc(fmtCapacity(c.capacity))}</option>`).join('');
    if(old&&availableChariots(excludeQr).some(c=>String(c.qr_id)===String(old)))els.chariot.value=old; else if(excludeQr)els.chariot.value=excludeQr;
    renderSearchResults();
  }
  function renderSearchResults(){
    if(!els.searchResults||!els.search)return;
    const raw=els.search.value.trim();
    if(!raw){els.searchResults.innerHTML='';return}
    const tokens=searchTokens(raw);
    const matches=availableChariots().filter(c=>{const text=chariotSearchText(c);return tokens.every(t=>text.includes(t))}).sort((a,b)=>String(a.chassis||a.qr_id||'').localeCompare(String(b.chassis||b.qr_id||''),undefined,{numeric:true,sensitivity:'base'})).slice(0,20);
    els.searchResults.innerHTML=matches.length?matches.map(c=>`<button type="button" class="delivery-search-result" data-qr="${esc(c.qr_id)}"><strong>${esc(c.chassis||c.qr_id||'Chariot')}</strong><span>QR: ${esc(c.qr_id||'—')} · N° moteur: ${esc(c.engine_number||'—')} · ${esc(c.engine||'—')} · ${esc(fmtCapacity(c.capacity))} · ${esc(c.client||'Sans client')}</span></button>`).join(''):'<div class="delivery-search-empty">Aucun chariot correspondant.</div>';
    els.searchResults.querySelectorAll('[data-qr]').forEach(b=>b.addEventListener('click',()=>{els.chariot.value=b.dataset.qr;els.search.value='';els.searchResults.innerHTML=''}));
  }
  function weekPlans(){const a=localDateISO(weekStart),b=localDateISO(addDays(weekStart,6));return plans.filter(p=>p.date>=a&&p.date<=b)}
  function renderStats(){const today=localDateISO(new Date());els.todayCount.textContent=plans.filter(p=>p.date===today).length;els.weekCount.textContent=weekPlans().length;els.plannedCount.textContent=plans.length}
  function renderWeek(){const dates=Array.from({length:7},(_,i)=>addDays(weekStart,i));els.range.textContent=`Semaine du ${dates[0].toLocaleDateString('fr-FR',{day:'2-digit',month:'long'})} au ${dates[6].toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}`;els.week.innerHTML=dates.map(d=>{const iso=localDateISO(d),n=plans.filter(p=>p.date===iso).length;return `<button type="button" class="delivery-day ${iso===selectedDate?'active':''}" data-date="${iso}"><div class="dow">${esc(d.toLocaleDateString('fr-FR',{weekday:'long'}))}</div><div class="date">${esc(d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}))}</div><div class="num">${n} livraison${n!==1?'s':''}</div></button>`}).join('');els.week.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{selectedDate=b.dataset.date;renderWeek();renderList()})}
  function renderList(){let rows=plans.filter(p=>p.date===selectedDate).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));els.list.innerHTML=rows.length?rows.map(p=>{const c=getMachine(p.qr);return `<div class="delivery-row"><div class="delivery-time">${esc(p.time||'—')}</div><div class="delivery-main"><div class="delivery-title">${esc(c?.chassis||p.qr||'Chariot')}</div><div class="delivery-meta">${esc(c?.engine||'—')} · ${esc(fmtCapacity(c?.capacity))} · ${esc(c?.client||'Sans client')}</div>${p.driver?`<div class="delivery-meta"><strong>Chauffeur :</strong> ${esc(p.driver)}</div>`:''}${p.destination?`<div class="delivery-meta"><strong>Destination :</strong> ${esc(p.destination)}</div>`:''}${p.note?`<div class="delivery-meta">${esc(p.note)}</div>`:''}</div><div class="delivery-actions">${isAdmin()&&!isDelivered(c)?`<button class="btn deliver-plan-btn" type="button" data-deliver-plan="${esc(p.qr)}" data-plan-id="${esc(p.id)}">Livrer</button>`:''}<button class="btn light" type="button" data-edit="${esc(p.id)}">Modifier</button><button class="btn light" type="button" data-delete="${esc(p.id)}">Supprimer</button></div></div>`}).join(''):`<div class="delivery-empty">Aucune livraison planifiée pour ${esc(formatLong(selectedDate))}.</div>`;els.list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEdit(b.dataset.edit));els.list.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>removePlan(b.dataset.delete));els.list.querySelectorAll('[data-deliver-plan]').forEach(b=>b.onclick=()=>deliverPlanned(b.dataset.deliverPlan,b.dataset.planId));renderStats()}
  async function deliverPlanned(qr,id){if(!requireAdminForDelivery())return;const c=getMachine(qr);if(!c)return alert('Chariot introuvable.');if(isDelivered(c))return;if(!confirm('Passer le chariot '+(c.chassis||qr)+' directement au statut « Livré » ?'))return;const now=new Date(),deliveryDate=localDateISO(now),updatedAt=now.toISOString();const {error}=await supabaseClient.from('chariots').update({status:'Livré',delivery_date:deliveryDate,updated_at:updatedAt}).eq('qr_id',qr);if(error){alert('Erreur : '+friendlySupabaseError(error));return}try{await supabaseClient.from('maintenance').insert({qr_id:qr,date:deliveryDate,technicien:currentUser.email,type:'Statut',travaux:`Statut : ${c.status||'—'} → Livré`,created_by:currentUser.id})}catch(e){console.warn('Notification livraison non enregistrée',e)}c.status='Livré';c.delivery_date=deliveryDate;c.updated_at=updatedAt;plans=plans.filter(p=>String(p.id)!==String(id));cacheDeliveryPlans(plans);renderWeek();renderList();alert('Chariot '+(c.chassis||qr)+' passé au statut « Livré ».')}
  function fillDeliverySuggestions(){const drivers=[...new Set(plans.map(p=>String(p.driver||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));const destinations=[...new Set(plans.map(p=>String(p.destination||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));if(els.driverOptions)els.driverOptions.innerHTML=drivers.map(v=>`<option value="${esc(v)}"></option>`).join('');if(els.destinationOptions)els.destinationOptions.innerHTML=destinations.map(v=>`<option value="${esc(v)}"></option>`).join('')}
  function updateNoteCount(){if(els.noteCount&&els.note)els.noteCount.textContent=`${els.note.value.length}/200`}
  function setSelectValue(select,value,labelPrefix=''){
    if(!select)return;
    const v=String(value||'');
    if(!v){select.value='';return}
    const exists=[...select.options].some(o=>String(o.value)===v);
    if(!exists){const opt=document.createElement('option');opt.value=v;opt.textContent=labelPrefix?`${labelPrefix} : ${v}`:v;select.appendChild(opt)}
    select.value=v;
  }
  function openModal(date=selectedDate,qr=''){refreshChariotOptions();fillDeliverySuggestions();els.form.dataset.edit='';els.date.value=date;els.time.value='';els.driver.value='';els.destination.value='';els.note.value='';updateNoteCount();els.chariot.value=qr;els.search.value='';els.searchResults.innerHTML='';els.modal.classList.remove('hidden');setTimeout(()=>els.search.focus(),20)}
  function openEdit(id){const p=plans.find(x=>x.id===id);if(!p)return;refreshChariotOptions(p.qr);fillDeliverySuggestions();els.form.dataset.edit=id;els.date.value=p.date;els.time.value=p.time||'';els.note.value=p.note||'';updateNoteCount();els.chariot.value=p.qr;setSelectValue(els.driver,p.driver,'Ancien chauffeur');setSelectValue(els.destination,p.destination,'Ancienne destination');els.search.value='';els.searchResults.innerHTML='';els.modal.classList.remove('hidden');setTimeout(()=>els.search.focus(),20)}
  function closeModal(){els.modal.classList.add('hidden');els.form.dataset.edit=''}
  async function refreshFromServer(){if(refreshBusy||document.visibilityState==='hidden')return;refreshBusy=true;try{const before=JSON.stringify(plans);const remote=await loadDeliveryPlans();if(JSON.stringify(remote)!==before){syncPlans(remote);renderWeek();renderList()}}catch(e){console.warn('Actualisation planning',e)}finally{refreshBusy=false}}
  async function removePlan(id){if(!confirm('Supprimer cette livraison du planning ?'))return;const p=plans.find(x=>x.id===id);if(!p)return;const payload={id:p.id,qr:p.qr,date:p.date,time:p.time||'',note:p.note||''};const {error}=await supabaseClient.from('maintenance').insert({qr_id:p.qr,date:p.date,technicien:currentUser?.email||getUserDisplayName(),type:'Annulation planification livraison',travaux:JSON.stringify(payload),created_by:currentUser?.id||null});if(error){alert('Erreur : '+friendlySupabaseError(error));return}try{await loadDeliveryPlans()}catch(e){}syncPlans(DELIVERY_PLANS);renderWeek();renderList()}
  els.form.onsubmit=async e=>{e.preventDefault();const qr=els.chariot.value,date=els.date.value||localDateISO(new Date()),time=els.time.value||'',driver=els.driver.value.trim(),destination=els.destination.value.trim(),note=els.note.value.trim();if(!qr){alert('Veuillez sélectionner un chariot.');return}const edit=els.form.dataset.edit;const duplicate=plans.some(p=>String(p.qr)===String(qr)&&p.id!==edit);if(duplicate){alert('Ce chariot est déjà planifié pour une livraison.');return}const logicalId=edit||('dp_'+Date.now()+'_'+Math.random().toString(36).slice(2,8));const payload={id:logicalId,qr:String(qr),date:String(date),time:String(time||''),driver:String(driver||''),destination:String(destination||''),note:String(note||'')};const {error}=await supabaseClient.from('maintenance').insert({qr_id:qr,date,technicien:currentUser?.email||getUserDisplayName(),type:'Planification livraison',travaux:JSON.stringify(payload),created_by:currentUser?.id||null});if(error){alert('Erreur : '+friendlySupabaseError(error));return}try{await loadDeliveryPlans()}catch(e){alert('Planification enregistrée mais actualisation impossible : '+friendlySupabaseError(e))}syncPlans(DELIVERY_PLANS);selectedDate=date;weekStart=startOfWeek(parseDate(date));closeModal();refreshChariotOptions();renderWeek();renderList()};
  els.cancel.onclick=closeModal;els.close?.addEventListener('click',closeModal);els.clearSearch?.addEventListener('click',()=>{els.search.value='';renderSearchResults();els.search.focus()});els.modal.addEventListener('click',e=>{if(e.target===els.modal)closeModal()});els.search?.addEventListener('input',renderSearchResults);els.search?.addEventListener('search',renderSearchResults);els.chariot?.addEventListener('change',()=>{if(els.search){els.search.value='';els.searchResults.innerHTML=''}});els.note?.addEventListener('input',updateNoteCount);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!els.modal.classList.contains('hidden'))closeModal()});els.plan.onclick=()=>openModal(selectedDate, new URLSearchParams(location.search).get('qr')||'');els.today.onclick=()=>{selectedDate=localDateISO(new Date());weekStart=startOfWeek(new Date());renderWeek();renderList()};els.prev.onclick=()=>{weekStart=addDays(weekStart,-7);renderWeek();renderList()};els.next.onclick=()=>{weekStart=addDays(weekStart,7);renderWeek();renderList()};
  window.addEventListener('focus',refreshFromServer);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshFromServer()});setInterval(refreshFromServer,15000);
  renderWeek();renderList();
}

function renderProfessionalDashboard(){
  const plans=readCachedDeliveryPlans().filter(p=>p&&p.date).sort((a,b)=>String(a.date+' '+(a.time||'')).localeCompare(String(b.date+' '+(b.time||'')))).slice(0,5);
  const planned=document.getElementById('plannedKpi'); if(planned)planned.textContent=plans.length;
  const upcoming=document.getElementById('upcomingDeliveries');
  if(upcoming){
    upcoming.innerHTML=plans.length?`<table><thead><tr><th>Date</th><th>Client</th><th>Destination</th><th>Chariot</th><th>Chauffeur</th></tr></thead><tbody>${plans.map(p=>{const c=CHARIOTS.find(x=>String(x.qr_id)===String(p.qr));return `<tr><td><span class="upcoming-badge">${esc(new Date(String(p.date)+'T00:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}))}${p.time?' · '+esc(p.time):''}</span></td><td>${esc(c?.client||'Sans client')}</td><td>${esc(p.destination||'—')}</td><td>${esc(c?.chassis||c?.qr_id||p.qr)}</td><td>${esc(p.driver||'—')}</td></tr>`}).join('')}</tbody></table>`:'<div class="dash-empty">Aucune livraison planifiée.</div>';
  }
  const caps=['2.5T','3T','3.8T','5T','7T','10T','12T'];
  const counts=caps.map(cap=>CHARIOTS.filter(c=>fmtCapacity(c.capacity)===cap||String(c.capacity||'').trim().toUpperCase()===cap).length);
  const max=Math.max(1,...counts);
  const total=CHARIOTS.length;
  const bars=document.getElementById('capacityBars');
  const summary=document.getElementById('capacitySummary');
  if(summary)summary.innerHTML=`<strong>${total}</strong><span>chariot${total!==1?'s':''} au total</span>`;
  if(bars)bars.innerHTML=caps.map((cap,i)=>`<div class="capacity-bar-item"><div class="capacity-value">${counts[i]}</div><div class="capacity-bar"><span style="height:${Math.max(8,Math.round(counts[i]/max*110))}px"></span></div><div class="capacity-label">${esc(cap)}</div></div>`).join('');
}
