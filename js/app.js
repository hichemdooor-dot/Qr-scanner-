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
const withTimeout=(promise,ms)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('TIMEOUT')),ms))]);
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
async function logUserConnection(action){
  try{
    if(!currentUser)return;
    const normalizedAction=action==='Déconnexion'?'Déconnexion':'Connexion';
    const payload={
      user_id:currentUser.id,
      user_email:currentUser.email||getUserDisplayName(),
      action:normalizedAction,
      user_agent:navigator.userAgent,
      created_at:new Date().toISOString()
    };
    const {error}=await supabaseClient.from('sbi_user_connection_logs').insert(payload);
    if(error)console.warn('Journal connexion non enregistré',error);
  }catch(e){console.warn('Journal connexion non enregistré',e)}
}

async function login(){const email=$('#email')?.value.trim(),password=$('#password')?.value,msg=$('#msg');if(!email||!password){if(msg)msg.textContent='Email et mot de passe requis.';return}if(msg)msg.textContent='Connexion...';try{const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)throw error;const {data:s,error:se}=await supabaseClient.rpc('get_my_sbi_status');if(se)throw se;if(s?.disabled){await supabaseClient.auth.signOut();throw new Error('Accès bloqué : votre compte est désactivé.')}currentUser=data.user;currentUser.user_metadata=currentUser.user_metadata||{};currentUser.user_metadata.sbi_role=s?.role||'user';await logUserConnection('Connexion');location.href='dashboard.html'}catch(e){if(msg)msg.textContent=friendlySupabaseError(e)}}
async function logout(){try{if(currentUser)await logUserConnection('Déconnexion')}catch(e){}await supabaseClient.auth.signOut();location.href='index.html'}
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


const CHARIOT_SELECT_FIELDS='*';
async function loadChariots(){
  // Keep the original Supabase query as the primary path because this is the
  // schema/query that the working version of the application used.
  try{
    const result=await withTimeout(
      supabaseClient.from('chariots').select('*').order('id',{ascending:false}),
      10000
    );
    const {data,error}=result||{};
    if(error)throw error;
    CHARIOTS=Array.isArray(data)?data:[];
    // Newest first. Prefer the same ordering semantics as the original app,
    // while still using timestamps when present.
    CHARIOTS.sort((a,b)=>{
      const da=new Date(a.created_at||a.updated_at||0).getTime();
      const db=new Date(b.created_at||b.updated_at||0).getTime();
      if(Number.isFinite(da)&&Number.isFinite(db)&&db!==da)return db-da;
      return Number(b.id||0)-Number(a.id||0);
    });
    try{localStorage.setItem('sbi_chariots_cache_v2',JSON.stringify({savedAt:Date.now(),rows:CHARIOTS}))}catch(_){ }
    return CHARIOTS;
  }catch(primaryError){
    // Only use a fallback when the original query actually fails.
    try{
      const result=await withTimeout(supabaseClient.from('chariots').select('*'),10000);
      const {data,error}=result||{};
      if(error)throw error;
      CHARIOTS=Array.isArray(data)?data:[];
      CHARIOTS.sort((a,b)=>{
        const da=new Date(a.created_at||a.updated_at||0).getTime();
        const db=new Date(b.created_at||b.updated_at||0).getTime();
        if(Number.isFinite(da)&&Number.isFinite(db)&&db!==da)return db-da;
        return Number(b.id||0)-Number(a.id||0);
      });
      try{localStorage.setItem('sbi_chariots_cache_v2',JSON.stringify({savedAt:Date.now(),rows:CHARIOTS}))}catch(_){ }
      return CHARIOTS;
    }catch(fallbackError){
      // Do not silently convert a connection/permission error into a fake 0.
      try{
        const cached=JSON.parse(localStorage.getItem('sbi_chariots_cache_v2')||localStorage.getItem('sbi_chariots_cache_v1')||'null');
        if(Array.isArray(cached?.rows)&&cached.rows.length){CHARIOTS=cached.rows;return CHARIOTS}
      }catch(_){ }
      throw fallbackError||primaryError;
    }
  }
}

function getUserDisplayName(){return currentUser?.user_metadata?.full_name||currentUser?.user_metadata?.name||currentUser?.email?.split('@')[0]||'Utilisateur'}
function getUserRoleLabel(){return isAdmin()?'Administrateur':'Utilisateur'}
function renderConnectedUser(){const name=getUserDisplayName(),role=getUserRoleLabel();if($('#welcomeUser'))$('#welcomeUser').textContent=name;if($('#userTopName'))$('#userTopName').textContent=name;if($('#userTopRole'))$('#userTopRole').textContent=role;if($('#userTopAvatar'))$('#userTopAvatar').textContent=String(name).trim().charAt(0).toUpperCase()||'U';document.querySelectorAll('.admin-only-nav').forEach(el=>el.classList.toggle('hidden',!isAdmin()));if(isAdmin()){$('#userMenuAdmin')?.classList.remove('hidden')}}
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
const AUTO_WORKFLOW_FORWARD={
  'en fabrication':'En stock',
  'en stock':'Réservé',
  'reserve':'Préparation livraison',
  'preparation livraison':'Prêt à livrer',
  'pret a livrer':'Livré'
};
function statusFromStock(stock,client=''){if(String(client||'').trim())return 'Réservé';return normalizeStatus(stock)==='fabrication'?'En fabrication':(String(stock||'').trim()?'En stock':'En fabrication');}
function automaticStatusForChariot(old,p){
  if(!old)return statusFromStock(p.stock,p.client);
  const oldStatus=normalizeStatus(old.status),stock=normalizeStatus(p.stock),client=String(p.client||'').trim();
  if(['preparation livraison','pret a livrer','livre','bloque / non conforme'].includes(oldStatus))return old.status;
  if(oldStatus==='reserve'&&!client&&!getDeliveryPlan(old.qr_id))return stock==='fabrication'?'En fabrication':(p.stock?'En stock':old.status);
  if(oldStatus==='en stock'&&client)return 'Réservé';
  if(oldStatus==='en fabrication'&&stock!=='fabrication'&&p.stock)return 'En stock';
  if(oldStatus==='en fabrication'&&client)return 'Réservé';
  return old.status||statusFromStock(p.stock,p.client);
}
async function transitionChariotStatus(qrId,nextStatus,reason=''){
  if(!requireValidLicense())return false;
  if(!currentUser){alert('Connexion requise.');return false}
  const c=CHARIOTS.find(x=>String(x.qr_id)===String(qrId));
  if(!c){alert('Chariot introuvable.');return false}
  const from=normalizeStatus(c.status),to=normalizeStatus(nextStatus);
  if(from===to)return true;
  if(AUTO_WORKFLOW_FORWARD[from]!==nextStatus&&!(isAdmin()&&['livre','bloque / non conforme'].includes(to))){alert(`Transition non autorisée : ${c.status||'—'} → ${nextStatus}.`);return false}
  const now=new Date(),updatedAt=now.toISOString(),payload={status:nextStatus,updated_at:updatedAt};
  if(to==='livre')payload.delivery_date=localDateISO(now);
  const {error}=await supabaseClient.from('chariots').update(payload).eq('qr_id',qrId);
  if(error){alert('Erreur : '+friendlySupabaseError(error));return false}
  try{await supabaseClient.from('maintenance').insert({qr_id:qrId,date:localDateISO(now),technicien:getUserDisplayName(),type:'Statut',travaux:reason||`Statut : ${c.status||'—'} → ${nextStatus}`,created_by:currentUser.id})}catch(e){console.warn('Historique de statut non enregistré',e)}
  Object.assign(c,payload);return true;
}
function setupAutomaticStatusField(old){
  const display=document.getElementById('statusDisplay'),hidden=document.getElementById('statusAuto');if(!display||!hidden)return;
  const stock=document.querySelector('[name="stock"]')?.value||'',client=document.querySelector('[name="client"]')?.value||'',value=String(old?.status||statusFromStock(stock,client));
  display.value=value;hidden.value=value;
  if(!isAdmin()){display.disabled=true;display.title='Statut géré automatiquement par le workflow.';}
  else{display.disabled=false;display.title='Admin : intervention manuelle possible.';display.addEventListener('change',()=>{hidden.value=display.value});}
}
function renderWorkflowAction(c,planned){
  const b=document.getElementById('workflowAction');if(!b)return;
  b.style.display='none';b.onclick=null;b.textContent='';b.className='btn';
  const st=normalizeStatus(c.status),id=String(c.qr_id||'');
  if(st==='en fabrication'){b.textContent='Passer en stock';b.style.display='inline-flex';b.title='Choisir le stock pour passer automatiquement à « En stock ». ';b.onclick=()=>location.href='nouveau-chariot.html?id='+encodeURIComponent(id)}
  else if(st==='en stock'){b.textContent=String(c.client||'').trim()?'Réserver':'Affecter un client';b.style.display='inline-flex';b.title='Le statut devient automatiquement « Réservé » lorsqu’un client est renseigné.';b.onclick=()=>location.href='nouveau-chariot.html?id='+encodeURIComponent(id)}
  else if(st==='reserve'){b.textContent=planned?'Passer en préparation':'Planifier';b.style.display='inline-flex';b.title=planned?'Passer automatiquement à « Préparation livraison ».':'Créer la planification de livraison.';b.onclick=()=>planned?workflowPrepareFromDetail(id):location.href='planning-livraisons.html?qr='+encodeURIComponent(id)}
  else if(st==='preparation livraison'){b.textContent='Prêt à livrer';b.style.display='inline-flex';b.title='Marquer automatiquement la préparation comme terminée.';b.onclick=()=>markReadyToDeliver(id)}
}
async function workflowPrepareFromDetail(qrId){const c=CHARIOTS.find(x=>String(x.qr_id)===String(qrId));if(!c)return;if(!getDeliveryPlan(qrId)){alert('Planifiez d’abord une livraison pour ce chariot.');return}if(!confirm(`Passer ${c.chassis||qrId} en « Préparation livraison » ?`))return;const ok=await transitionChariotStatus(qrId,'Préparation livraison');if(ok)location.reload();}
async function markReadyToDeliver(qrId){const c=CHARIOTS.find(x=>String(x.qr_id)===String(qrId));if(!c)return;if(normalizeStatus(c.status)!=='preparation livraison'){alert('Le chariot doit être en « Préparation livraison ».');return}if(!confirm(`Marquer ${c.chassis||qrId} comme « Prêt à livrer » ?`))return;const ok=await transitionChariotStatus(qrId,'Prêt à livrer');if(ok)location.reload();}

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
      const {error:insertError}=await supabaseClient.from('maintenance').insert({qr_id:p.qr,date:p.date,technicien:getUserDisplayName(),type:'Planification livraison',travaux:JSON.stringify({id:logicalId,qr:String(p.qr),date:String(p.date),time:String(p.time||''),driver:String(p.driver||''),destination:String(p.destination||''),note:String(p.note||'')}),created_by:currentUser?.id||null});
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
function localISODateGlobal(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function isStock(c){return normalizeStatus(c.status)==='en stock'&&!String(c.client||'').trim()}
function card(c){const id=String(c.qr_id||'');const delivered=isDelivered(c);const canDeliver=isAdmin()&&!delivered;const href='chariot.html?id='+encodeURIComponent(id);return `<div class="item"><a class="item-open-link" href="${href}" aria-label="Ouvrir le chariot ${esc(id)}"></a><div class="item-main"><div class="item-title">${esc(id)}</div><div class="meta">${esc(c.chassis||'—')} • ${esc(c.engine||'—')} • ${esc(fmtCapacity(c.capacity))}</div>${c.client?`<div class="client-line"><strong>Client :</strong> ${esc(c.client)}</div>`:''}<div class="recent-time">${c.updated_at?'Mis à jour : '+new Date(c.updated_at).toLocaleString('fr-FR'):''}</div></div><span class="badge ${statusClass(c.status)}">${esc(c.status||c.stock||'—')}</span>${canDeliver?`<button class="btn delivered-action" onclick="event.stopPropagation();markDelivered('${esc(id)}')">Livrer</button>`:''}</div>`}
async function dashboardPage(){
  if(!await session())return;
  renderConnectedUser();
  if($('#dashDate'))$('#dashDate').textContent=new Date().toLocaleString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});

  let dataLoadError=null;
  try{
    await loadChariots();
  }catch(e){
    dataLoadError=e;
    console.error('Chargement des chariots du dashboard impossible',e);
  }

  // Render the main fleet KPIs immediately. Delivery/activity are loaded
  // independently so a slow secondary query cannot leave the whole dashboard
  // showing its static 0 / Chargement... placeholders.
  if($('#stock'))$('#stock').textContent=dataLoadError?'—':CHARIOTS.filter(isStock).length;
  if($('#delivered'))$('#delivered').textContent=dataLoadError?'—':CHARIOTS.filter(isDelivered).length;
  if($('#plannedKpi'))$('#plannedKpi').textContent=0;
  renderDashboardLatest();

  if(dataLoadError){
    const msg='Erreur de chargement des chariots : '+friendlySupabaseError(dataLoadError);
    if($('#latestRows'))$('#latestRows').innerHTML=`<tr><td colspan="5" class="dash-empty">${esc(msg)}</td></tr>`;
    if($('#activityList'))$('#activityList').innerHTML='<div class="dash-empty">Données indisponibles.</div>';
    if($('#dashboardUpcomingTimeline'))$('#dashboardUpcomingTimeline').innerHTML='<div class="dash-empty">Données indisponibles.</div>';
    return;
  }

  // Load the dashboard delivery preview directly from the shared Planning
  // source; do not wait for the full planning-page loader or local migration.
  try{
    // Dashboard deliveries are loaded independently from the shared planning.
    // This avoids leaving the section stuck on "Chargement..." when another
    // dashboard query is slow or fails.
    await renderUpcomingDeliveriesFromPlanning();
  }catch(e){
    console.warn('Prochaines livraisons dashboard',e);
    if($('#plannedKpi'))$('#plannedKpi').textContent='—';
    if($('#dashboardUpcomingTimeline'))$('#dashboardUpcomingTimeline').innerHTML='<div class="dash-empty">Impossible de charger les livraisons prévues.</div>';
  }

  try{await loadDashboardNotifications()}catch(e){
    console.warn('Activité dashboard',e);
    if($('#activityList'))$('#activityList').innerHTML='<div class="dash-empty">Aucune activité récente.</div>';
  }
}
function renderDashboardWatch(){
  const set=(id,value)=>{const el=$('#'+id);if(el)el.textContent=String(value)};
  const today=localISODateGlobal(new Date());
  const planned=[...DELIVERY_PLANS].filter(p=>p&&p.date&&p.qr);
  const plannedQrs=new Set(planned.map(p=>String(p.qr)));
  const getMachine=(qr)=>CHARIOTS.find(c=>String(c.qr_id)===String(qr));
  const deliveriesToday=planned.filter(p=>p.date===today).length;
  const toPrepare=planned.filter(p=>!isDelivered(getMachine(p.qr))).length;
  const reservedUnplanned=CHARIOTS.filter(c=>normalizeStatus(c.status)==='reserve'&&!isDelivered(c)&&!plannedQrs.has(String(c.qr_id))).length;
  const lateDeliveries=planned.filter(p=>p.date<today&&!isDelivered(getMachine(p.qr))).length;
  const deliveredToday=CHARIOTS.filter(c=>isDelivered(c)&&String(c.delivery_date||'')===today).length;
  set('watchToday',deliveriesToday);
  set('watchPrepare',toPrepare);
  set('watchUnplanned',reservedUnplanned);
  set('watchLate',lateDeliveries);
  set('watchDeliveredToday',deliveredToday);
}
function renderDashboardLatest(){
  const rows=[...CHARIOTS].sort((a,b)=>new Date(b.created_at||b.updated_at||0)-new Date(a.created_at||a.updated_at||0)).slice(0,5);
  $('#latestRows').innerHTML=rows.map(c=>{const href='chariot.html?id='+encodeURIComponent(c.qr_id||'');return `<tr onclick="location.href='${href}'" style="cursor:pointer"><td><a class="dash-chariot-link" href="${href}"><b>${esc(c.chassis||c.qr_id||'—')}</b>${c.client?`<div class="dash-client"><strong>Client :</strong> ${esc(c.client)}</div>`:''}</a></td><td>${esc(c.engine||'—')}</td><td>${esc(fmtCapacity(c.capacity))}</td><td><span class="dash-status ${isDelivered(c)?'delivered':''}">${esc(c.status||'—')}</span></td><td>${c.created_at?new Date(c.created_at).toLocaleDateString('fr-FR'):c.updated_at?new Date(c.updated_at).toLocaleDateString('fr-FR'):'—'}</td></tr>`}).join('')||'<tr><td colspan="5" class="dash-empty">Aucun chariot.</td></tr>';
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
  try{
    const r=await withTimeout(supabaseClient.from('maintenance').select('id,qr_id,date,technicien,type,travaux,created_at,created_by').order('created_at',{ascending:false}).limit(8),8000);
    if(!r.error){
      data=r.data||[];
      if(!data.length){
        try{
          const restRows=await restGetTableRows('maintenance','select=id,qr_id,date,technicien,type,travaux,created_at,created_by&order=created_at.desc&limit=8',8);
          if(restRows.length)data=restRows;
        }catch(_){}
      }
      try{localStorage.setItem('sbi_activity_cache_v1',JSON.stringify({savedAt:Date.now(),rows:data}))}catch(_){}
    }
  }catch(e){
    try{const c=JSON.parse(localStorage.getItem('sbi_activity_cache_v1')||'null');if(Array.isArray(c?.rows))data=c.rows}catch(_){}
    if(!data.length){try{data=await restGetTableRows('maintenance','select=id,qr_id,date,technicien,type,travaux,created_at,created_by&order=created_at.desc&limit=8',8)}catch(_) {}}
  }
  const rows=data.filter(x=>{
    const type=String(x.type||'').toLowerCase();
    const qr=String(x.qr_id||'').trim().toLowerCase();
    if(!x.qr_id||qr==='system')return false;
    if(type.includes('connexion utilisateur')||type.includes('déconnexion utilisateur'))return false;
    if(type.includes('demande changement mot de passe'))return false;
    return true;
  }).slice(0,6);
  const unread=rows.filter(x=>!localStorage.getItem('sbi_notif_read_'+x.id)).length;
  const bell=$('#notificationCount'); if(bell) bell.textContent=unread>99?'99+':String(unread);
  const titleCount=$('#notificationCountTitle'); if(titleCount) titleCount.textContent=String(unread);
  const notificationsList=$('#notificationsList');
  if(notificationsList) notificationsList.innerHTML=rows.length?`<div class="alerts-table-wrap"><table class="alerts-table"><thead><tr><th>Chariot</th><th>Type</th><th>Statut</th><th>Date</th></tr></thead><tbody>${rows.slice(0,5).map((x)=>{
    const c=CHARIOTS.find(v=>String(v.qr_id)===String(x.qr_id));
    const ev=formatMaintenanceEvent(x,c);
    const type=String(x.type||ev.title||'Intervention').replace(/Planification livraison/i,'Livraison').replace(/Modification chariot/i,'Modification');
    const status=ev.kind==='delivered'?'Livré':ev.kind==='cancel'?'Annulée':ev.kind==='delivery'?'Planifiée':'À faire';
    const statusClass=status==='Livré'?'delivered':status==='Planifiée'?'planned':status==='Annulée'?'cancelled':'todo';
    const href='chariot.html?id='+encodeURIComponent(x.qr_id); return `<tr onclick="location.href='${href}'" style="cursor:pointer"><td><a class="dash-chariot-link" href="${href}"><b>${esc(c?.chassis||x.qr_id||'—')}</b></a></td><td>${esc(type)}</td><td><span class="alert-status ${statusClass}">${esc(status)}</span></td><td>${esc(formatPlannedDate(x.date)||'—')}</td></tr>`;
  }).join('')}</tbody></table></div>`:'<div class="dash-empty">Aucune alerte récente.</div>';
  const acts=rows.slice(0,5);
  const activityList=$('#activityList');
  if(!activityList)return;
  activityList.innerHTML=acts.length?acts.map((x,i)=>{
    const c=CHARIOTS.find(v=>String(v.qr_id)===String(x.qr_id));
    const ev=formatMaintenanceEvent(x,c);
    const line=ev.kind==='delivered'?'green':ev.kind==='delivery'?'blue':ev.kind==='cancel'?'orange':i%3===1?'orange':'';
    const href=x.qr_id?'chariot.html?id='+encodeURIComponent(x.qr_id):'historique.html'; return `<div class="activity-item"><span class="activity-line ${line}"></span><span class="activity-icon">${ev.icon}</span><div class="activity-main"><a class="dash-chariot-link" href="${href}"><b>${esc(ev.title)}</b></a><div>${esc(ev.details)}</div></div><span class="activity-time">${x.created_at?relativeTime(x.created_at):''}</span></div>`;
  }).join(''):'<div class="dash-empty">Aucune activité.</div>';
}
function relativeTime(iso){const ms=Date.now()-new Date(iso).getTime(),m=Math.max(0,Math.floor(ms/60000));if(m<1)return'À l’instant';if(m<60)return`Il y a ${m} min`;const h=Math.floor(m/60);if(h<24)return`Il y a ${h} h`;const d=Math.floor(h/24);return`Il y a ${d} j`}
function markDashboardNotificationsRead(){document.querySelectorAll('.notification-row').forEach(row=>row.classList.remove('notification-new'));document.querySelectorAll('#notificationsList [data-notification-id]').forEach(b=>{const id=b.getAttribute('data-notification-id');if(id)localStorage.setItem('sbi_notif_read_'+id,'1')});const bell=$('#notificationCount');if(bell)bell.textContent='0';const titleCount=$('#notificationCountTitle');if(titleCount)titleCount.textContent='0'}

let NOTIFICATIONS_PAGE_ROWS=[];
function notificationReadKey(id){return 'sbi_notif_read_'+String(id)}
function isNotificationRead(id){return localStorage.getItem(notificationReadKey(id))==='1'}
function markNotificationRead(id){if(id!=null)localStorage.setItem(notificationReadKey(id),'1')}
function notificationActorName(x){
  const raw=String(x?.technicien||'').trim();
  if(raw) return raw;
  return 'Utilisateur';
}
function notificationIconSvg(kind){
  const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  if(kind==='delivery') return `<svg ${common}><path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>`;
  if(kind==='edit') return `<svg ${common}><path d="M14 5l5 5"/><path d="M4 20l1.2-4.8L15.8 4.6a2 2 0 0 1 2.8 2.8L8 18.8 4 20z"/></svg>`;
  if(kind==='delivered') return `<svg ${common}><path d="M20 6L9 17l-5-5"/><circle cx="12" cy="12" r="9"/></svg>`;
  if(kind==='cancel') return `<svg ${common}><circle cx="12" cy="12" r="9"/><path d="M8 8l8 8M16 8l-8 8"/></svg>`;
  return `<svg ${common}><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>`;
}
function renderNotificationGroup(listEl,rows,isNew){
  const box=$(listEl); if(!box)return;
  if(!rows.length){
    box.innerHTML='<div class="notification-group-empty">'+(isNew?'Aucune nouvelle notification.':'Aucune ancienne notification.')+'</div>';
    return;
  }
  box.innerHTML=rows.map(x=>{
    const c=CHARIOTS.find(v=>String(v.qr_id)===String(x.qr_id));
    const ev=formatMaintenanceEvent(x,c);
    const time=x.created_at?relativeTime(x.created_at):'';
    const actor=notificationActorName(x);
    const href=x.qr_id?'chariot.html?id='+encodeURIComponent(x.qr_id):'historique.html';
    return `<article class="notification-page-row ${isNew?'is-new':'is-old'}">
      <div class="notification-page-icon" data-kind="${esc(ev.kind)}">${notificationIconSvg(ev.kind)}</div>
      <div class="notification-page-body">
        <div class="notification-page-title">${esc(ev.title)} ${isNew?'<span class="new-badge">Nouveau</span>':''}</div>
        <div class="notification-page-meta">${esc(ev.details||'')}${time?' · '+esc(time):''}</div>
        <div class="notification-page-actor"><span>Utilisateur :</span> ${esc(actor)}</div>
      </div>
      <button class="view-chariot" type="button" data-notification-id="${esc(x.id)}" onclick="markNotificationRead('${esc(x.id)}');location.href='${href}'"><span>Voir le chariot</span><span class="notification-arrow" aria-hidden="true">›</span></button>
    </article>`;
  }).join('');
}
function renderNotificationsPage(){
  const unread=NOTIFICATIONS_PAGE_ROWS.filter(x=>!isNotificationRead(x.id));
  const old=NOTIFICATIONS_PAGE_ROWS.filter(x=>isNotificationRead(x.id));
  const pageCount=$('#notificationsPageCount'),newCount=$('#newNotificationsCount'),oldCount=$('#oldNotificationsCount'),markBtn=$('#markAllReadBtn');
  if(pageCount)pageCount.textContent=unread.length>99?'99+':String(unread.length);
  if(newCount)newCount.textContent=String(unread.length);
  if(oldCount)oldCount.textContent=String(old.length);
  if(markBtn){markBtn.disabled=unread.length===0;markBtn.classList.toggle('disabled',unread.length===0)}
  renderNotificationGroup('#newNotificationsList',unread,true);
  renderNotificationGroup('#oldNotificationsList',old,false);
  const bell=$('#notificationCount');if(bell)bell.textContent=unread.length>99?'99+':String(unread.length);
}
function markAllNotificationsRead(){
  if(!NOTIFICATIONS_PAGE_ROWS.length)return;
  NOTIFICATIONS_PAGE_ROWS.forEach(x=>markNotificationRead(x.id));
  renderNotificationsPage();
}
async function notificationsPage(){
  if(!await session())return;
  renderConnectedUser();
  const newBox=$('#newNotificationsList'),oldBox=$('#oldNotificationsList');
  if(newBox)newBox.innerHTML='<div class="dash-empty">Chargement...</div>';
  if(oldBox)oldBox.innerHTML='<div class="dash-empty">Chargement...</div>';
  let data=[];
  try{
    const r=await withTimeout(supabaseClient.from('maintenance').select('id,qr_id,date,technicien,type,travaux,created_at,created_by').order('created_at',{ascending:false}).limit(100),8000);
    if(!r.error)data=r.data||[];
    if(r.error)throw r.error;
  }catch(e){
    try{data=await restGetTableRows('maintenance','select=id,qr_id,date,technicien,type,travaux,created_at,created_by&order=created_at.desc&limit=100',100)}catch(_){data=[]}
  }
  NOTIFICATIONS_PAGE_ROWS=(data||[]).filter(x=>{
    const type=String(x.type||'').toLowerCase();
    const qr=String(x.qr_id||'').trim().toLowerCase();
    if(!x.qr_id)return false;
    if(qr==='system')return false;
    if(type.includes('connexion utilisateur')||type.includes('déconnexion utilisateur'))return false;
    if(type.includes('demande changement mot de passe'))return false;
    return true;
  });
  renderNotificationsPage();
}
async function chariotsPage(){if(!await session())return;await loadChariots();const initialSearch=new URLSearchParams(window.location.search).get('search')||'';const searchEl=$('#search');if(searchEl&&initialSearch){searchEl.value=initialSearch;}const ids=['engineFilter','capacityFilter','mastFilter','heightFilter'];function fill(){const defs=[['engineFilter','engine','Moteur : Tous'],['capacityFilter','capacity','Capacité : Toutes'],['mastFilter','mast_type','Mât : Tous'],['heightFilter','lifting_height','Hauteur : Toutes']];defs.forEach(([id,k,label])=>{const e=$('#'+id),old=e.value;if(!e)return;let vals;if(id==='capacityFilter'){vals=['2.5T','3T','3.8T','5T','7T','10T','12T']}else{vals=[...new Set(CHARIOTS.map(c=>String(c[k]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))}e.innerHTML=`<option value="">${label}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(vals.includes(old))e.value=old})}function render(){fill();let rows=CHARIOTS;const sf=$('#statusFilter')?.value||'';if(sf==='stock')rows=rows.filter(isStock);if(sf==='delivered')rows=rows.filter(isDelivered);const q=$('#search')?.value.trim().toLowerCase()||'';const fs=[['engineFilter','engine'],['capacityFilter','capacity'],['mastFilter','mast_type'],['heightFilter','lifting_height']];rows=rows.filter(c=>(!q||[c.qr_id,c.chassis,c.engine,c.client,c.capacity].some(v=>String(v||'').toLowerCase().includes(q)))&&fs.every(([id,k])=>!$('#'+id)?.value||norm(c[k])===norm($('#'+id).value)));$('#count').textContent=rows.length+' chariot'+(rows.length!==1?'s':'');$('#list').innerHTML=rows.map(card).join('')||'<div class="empty">Aucun résultat.</div>'}$('#search').addEventListener('input',render);$('#statusFilter').addEventListener('change',render);ids.forEach(id=>$('#'+id).addEventListener('change',render));$('#clearFilters').onclick=()=>{ids.forEach(id=>$('#'+id).value='');$('#statusFilter').value='';$('#search').value='';render()};render()}
async function detailPage(){
  if(!await session())return;
  await loadChariots();
  try{await loadDeliveryPlans()}catch(e){DELIVERY_PLANS=readCachedDeliveryPlans()}
  const id=new URLSearchParams(location.search).get('id');
  current=CHARIOTS.find(c=>String(c.qr_id)===String(id));
  if(!current){$('#detail').innerHTML='<div class="empty">Chariot introuvable.</div>';return}
  $('#title').textContent=current.qr_id;$('#status').textContent=current.status||'—';
  const planned=getDeliveryPlan(current.qr_id),plannedDate=planned?.date?formatPlannedDate(planned.date):'—',plannedTime=planned?.time||'—',plannedDriver=planned?.driver||'—',plannedDestination=planned?.destination||'—';
  const groups=[['Identification',[['N° châssis',current.chassis],['N° de série',current.serial_number],['N° moteur',current.engine_number],['Moteur',current.engine]]],['Caractéristiques',[['Capacité',fmtCapacity(current.capacity)],['Hauteur de levage',current.lifting_height],['Dimensions des fourches',current.fork_dimension],['Type de mât',String(current.mast_type||'').toUpperCase()],['Type de pneu',current.tire_type],['Couleur',current.color]]],['Informations stock',[['Stock',current.stock],['Statut',current.status],['Client',current.client],['Date planifiée',plannedDate],['Heure planifiée',plannedTime],['Chauffeur planifié',plannedDriver],['Destination planifiée',plannedDestination],['Date de livraison',current.delivery_date]]],['Observations',[['Observations',current.observations]]]];
  $('#detail').innerHTML=groups.map(g=>`<div class="section"><h3>${esc(g[0])}</h3><div class="details">${g[1].map(([k,v])=>`<div class="kv"><small>${esc(k)}</small><b>${esc(v||'—')}</b></div>`).join('')}</div></div>`).join('');
  $('#edit').onclick=()=>location.href='nouveau-chariot.html?id='+encodeURIComponent(current.qr_id);
  renderWorkflowAction(current,!!planned);
  const deliverBtn=$('#deliver');
  if(deliverBtn){if(isDelivered(current)||!isAdmin())deliverBtn.style.display='none';else{deliverBtn.style.display='inline-flex';deliverBtn.onclick=()=>markDelivered(current.qr_id)}}
  await renderMaintenanceHistory()
}
async function renderMaintenanceHistory(){const box=$('#history');if(!box||!current)return;const {data,error}=await supabaseClient.from('maintenance').select('id,date,technicien,type,travaux,created_at').eq('qr_id',current.qr_id).order('date',{ascending:false}).order('created_at',{ascending:false});if(error){box.innerHTML='<div class="notice red">Erreur historique : '+esc(error.message)+'</div>';return}box.innerHTML=(data||[]).filter(x=>!DELIVERY_PLAN_TYPES.includes(String(x.type||''))).map(x=>`<div class="log"><b>${esc(x.date)} — ${esc(x.type||'Intervention')}</b><small>${esc(x.technicien||'—')}</small><div style="margin-top:7px">${esc(x.travaux||'—')}</div>${isAdmin()&&x.id?`<div class="actions"><button class="btn light" onclick="deleteMaintenance('${esc(x.id)}')">Supprimer</button></div>`:''}</div>`).join('')||'<div class="muted">Aucune intervention enregistrée.</div>'}
async function addMaintenance(){if(!requireValidLicense())return;if(!current){alert('Sélectionnez un chariot.');return}if(!currentUser){alert('Connectez-vous.');return}const types=[...document.querySelectorAll('#typeMultiOptions input:checked')].map(x=>x.value).join(', '),travaux=$('#travaux')?.value.trim()||'';if(!types&&!travaux){alert('Sélectionnez un type de modification ou indiquez les détails.');return}const {error}=await supabaseClient.from('maintenance').insert({qr_id:current.qr_id,date:$('#date')?.value||new Date().toISOString().slice(0,10),technicien:$('#technicien')?.value.trim()||currentUser.email,type:types,travaux,created_by:currentUser.id});if(error){alert('Erreur : '+error.message);return}document.querySelectorAll('#typeMultiOptions input').forEach(x=>x.checked=false);if($('#travaux'))$('#travaux').value='';await renderMaintenanceHistory()}
async function deleteMaintenance(id){if(!requireAdmin())return;if(!confirm('Supprimer définitivement cette intervention ?'))return;const {error}=await supabaseClient.from('maintenance').delete().eq('id',id);if(error)alert('Erreur : '+error.message);else await renderMaintenanceHistory()}
function nextQr(){let n=Math.max(0,...CHARIOTS.map(c=>Number(String(c.qr_id||'').match(/^CH-(\d+)$/i)?.[1]||0)))+1;return'CH-'+String(n).padStart(4,'0')}
async function newPage(){
  if(!await session())return;
  await loadChariots();
  const id=new URLSearchParams(location.search).get('id');
  const old=CHARIOTS.find(c=>String(c.qr_id)===String(id));
  if(old){editingQrId=old.qr_id;$('#formTitle').textContent='Modifier '+old.qr_id;for(const [k,v] of Object.entries(old)){const el=document.querySelector(`[name="${k}"]`);if(el)el.value=v??''}}
  else{$('[name="qr_id"]').value=nextQr();editingQrId=null;}
  setupAutomaticStatusField(old);
  document.querySelectorAll('#chariotForm input,#chariotForm select,#chariotForm textarea').forEach(el=>el.addEventListener('input',updateSaveButtonState));
  document.querySelectorAll('#chariotForm select').forEach(el=>el.addEventListener('change',updateSaveButtonState));
  updateSaveButtonState()
}
function updateSaveButtonState(){const ok=['chassis','color','engine','capacity','fork_dimension','tire_type'].every(k=>String(document.querySelector(`[name="${k}"]`)?.value||'').trim());$('#saveBtn')?.classList.toggle('save-ready',ok)}
async function saveChariot(){
  if(!requireValidLicense())return;if(!currentUser){alert('Connectez-vous pour gérer les chariots.');return}
  const f=$('#chariotForm'),p=Object.fromEntries(new FormData(f).entries());
  for(const [k,label] of [['chassis','N° châssis'],['color','Couleur'],['engine','Type de moteur'],['capacity','Capacité'],['fork_dimension','Fourche'],['tire_type','Type de pneu']])if(!String(p[k]||'').trim()){alert(label+' obligatoire.');return}
  const oldId=new URLSearchParams(location.search).get('id')||'',old=CHARIOTS.find(c=>String(c.qr_id)===String(oldId));
  const requestedStatus=String(p.status||'').trim();
  const displayStatus=String(p.status_display||'').trim();
  p.status=(old&&isAdmin()&&displayStatus&&normalizeStatus(displayStatus)!==normalizeStatus(old.status))?displayStatus:automaticStatusForChariot(old,p);
  delete p.status_display;
  const duplicate=CHARIOTS.find(c=>norm(c.chassis)===norm(p.chassis)&&norm(c.engine)===norm(p.engine)&&String(c.qr_id)!==String(oldId));
  if(duplicate){alert(`Le numéro de châssis « ${p.chassis} » existe déjà avec le même moteur (${p.engine}) — ${duplicate.qr_id}.`);return}
  p.updated_at=new Date().toISOString();p.delivery_date=p.delivery_date||null;p.qr_id=p.qr_id||nextQr();
  const {error}=oldId?await supabaseClient.from('chariots').update(p).eq('qr_id',oldId):await supabaseClient.from('chariots').insert(p);
  if(error){alert('Erreur : '+error.message);return}
  if(oldId&&old){
    const labels={chassis:'N° châssis',serial_number:'N° de série',engine_number:'N° moteur',engine:'Moteur',capacity:'Capacité',lifting_height:'Hauteur de levage',fork_dimension:'Fourche',mast_type:'Type de mât',tire_type:'Type de pneu',color:'Couleur',stock:'Stock',status:'Statut',client:'Client',delivery_date:'Date de livraison',observations:'Observations'};
    const changes=Object.keys(labels).filter(k=>String(old[k]??'')!==String(p[k]??'')).map(k=>`${labels[k]} : ${old[k]||'—'} → ${p[k]||'—'}`);
    if(changes.length){try{await supabaseClient.from('maintenance').insert({qr_id:p.qr_id,date:new Date().toISOString().slice(0,10),technicien:getUserDisplayName(),type:'Modification chariot',travaux:changes.join(' • '),created_by:currentUser.id})}catch(e){console.warn('Notification modification non enregistrée',e)}}
  }else{
    try{await supabaseClient.from('maintenance').insert({qr_id:p.qr_id,date:new Date().toISOString().slice(0,10),technicien:getUserDisplayName(),type:'Création chariot',travaux:`Chariot créé • Châssis : ${p.chassis||'—'} • Moteur : ${p.engine||'—'} • Statut initial : ${p.status||'—'}`,created_by:currentUser.id})}catch(e){console.warn('Historique création non enregistré',e)}
  }
  location.href='chariot.html?id='+encodeURIComponent(p.qr_id)
}
async function markDelivered(qrId){if(!requireValidLicense()||!requireAdminForDelivery())return;const c=CHARIOTS.find(x=>String(x.qr_id)===String(qrId));if(!c)return alert('Chariot introuvable.');if(isDelivered(c))return;if(!confirm('Passer le chariot '+qrId+' directement au statut « Livré » ?'))return;const payload={status:'Livré',delivery_date:new Date().toISOString().slice(0,10),updated_at:new Date().toISOString()};const {error}=await supabaseClient.from('chariots').update(payload).eq('qr_id',qrId);if(error){alert('Erreur : '+error.message);return}try{await supabaseClient.from('maintenance').insert({qr_id:qrId,date:payload.delivery_date,technicien:getUserDisplayName(),type:'Statut',travaux:`Statut : ${c.status||'—'} → Livré`,created_by:currentUser.id})}catch(e){console.warn('Notification livraison non enregistrée',e)}c.status=payload.status;c.delivery_date=payload.delivery_date;c.updated_at=payload.updated_at;if(typeof chariotsPage==='function'&&document.getElementById('list')){const input=document.getElementById('search');const filter=document.getElementById('filter');if(input&&filter){let rows=CHARIOTS;const f=filter.value||'all';if(f==='stock')rows=rows.filter(isStock);if(f==='delivered')rows=rows.filter(isDelivered);const q=input.value.trim().toLowerCase();if(q)rows=rows.filter(x=>[x.qr_id,x.chassis,x.engine,x.client,x.capacity].some(v=>String(v||'').toLowerCase().includes(q)));document.getElementById('count').textContent=rows.length+' chariot'+(rows.length!==1?'s':'');document.getElementById('list').innerHTML=rows.map(card).join('')||'<div class="empty">Aucun résultat.</div>';}}else location.reload();}
async function deleteChariot(){if(!requireValidLicense()||!requireAdmin())return;const id=new URLSearchParams(location.search).get('id')||$('#qr_id')?.value;if(!id)return;const c=CHARIOTS.find(x=>String(x.qr_id)===String(id));if(!confirm('Supprimer définitivement le chariot '+id+' ?'))return;try{await supabaseClient.from('maintenance').insert({qr_id:id,date:new Date().toISOString().slice(0,10),technicien:getUserDisplayName(),type:'Suppression chariot',travaux:`Chariot supprimé • Châssis : ${c?.chassis||'—'} • Moteur : ${c?.engine||'—'} • Client : ${c?.client||'—'}`,created_by:currentUser.id})}catch(e){console.warn('Historique suppression non enregistré',e)}const {error}=await supabaseClient.from('chariots').delete().eq('qr_id',id);if(error){alert('Erreur : '+friendlySupabaseError(error));return}location.href='chariots.html'}
async function stockPage(){if(!await session())return;await loadChariots();const ids=['engineFilter','capacityFilter','mastFilter','heightFilter'];function fill(){const rows=CHARIOTS.filter(isStock);const defs=[['engineFilter','engine','Moteur : Tous'],['capacityFilter','capacity','Capacité : Toutes'],['mastFilter','mast_type','Mât : Tous'],['heightFilter','lifting_height','Hauteur : Toutes']];defs.forEach(([id,k,label])=>{const e=$('#'+id),old=e.value,vals=[...new Set(rows.map(c=>String(c[k]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));e.innerHTML=`<option value="">${label}</option>`+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(vals.includes(old))e.value=old})}function render(){fill();let rows=CHARIOTS.filter(isStock);const q=$('#stockSearch')?.value.trim().toLowerCase()||'';const fs=[['engineFilter','engine'],['capacityFilter','capacity'],['mastFilter','mast_type'],['heightFilter','lifting_height']];rows=rows.filter(c=>(!q||[c.qr_id,c.chassis,c.engine,c.client,c.capacity].some(v=>String(v||'').toLowerCase().includes(q)))&&fs.every(([id,k])=>!$('#'+id).value||norm(c[k])===norm($('#'+id).value)));$('#stockCount').textContent=rows.length+' chariot'+(rows.length!==1?'s':'')+' en stock';$('#stockList').innerHTML=rows.map(card).join('')||'<div class="empty">Aucun chariot en stock.</div>'}$('#stockSearch').addEventListener('input',render);ids.forEach(id=>$('#'+id).addEventListener('change',render));$('#clearFilters').onclick=()=>{ids.forEach(id=>$('#'+id).value='');$('#stockSearch').value='';render()};render()}
async function deliveredPage(){if(!await session())return;await loadChariots();function render(){const q=$('#deliveredSearch').value.trim().toLowerCase();const rows=CHARIOTS.filter(isDelivered).filter(c=>!q||[c.qr_id,c.chassis,c.engine,c.client].some(v=>String(v||'').toLowerCase().includes(q))).sort((a,b)=>{const da=new Date(a.delivery_date||0).getTime();const db=new Date(b.delivery_date||0).getTime();if(db!==da)return db-da;return new Date(b.updated_at||0).getTime()-new Date(a.updated_at||0).getTime()});$('#deliveredCount').textContent=rows.length+' chariot'+(rows.length!==1?'s':'')+' livré'+(rows.length!==1?'s':'');$('#deliveredList').innerHTML=rows.map(card).join('')||'<div class="empty">Aucun chariot livré.</div>'}$('#deliveredSearch').addEventListener('input',render);render()}
async function qrPage(){if(!await session())return;await loadChariots();const sel=$('#qrSelect');const rows=[...CHARIOTS].sort((a,b)=>Number(b.id)-Number(a.id));sel.innerHTML='<option value="">Choisir un chariot...</option>'+rows.map(c=>`<option value="${esc(c.qr_id)}">${esc(c.qr_id)} — ${esc(c.chassis||'')} — ${esc(c.engine||'')} — ${esc(fmtCapacity(c.capacity))}</option>`).join('');sel.value=rows[0]?.qr_id||'';renderQR(sel.value);sel.onchange=()=>renderQR(sel.value)}
function renderQR(id){const box=$('#qr');if(!box)return;box.innerHTML='';const c=CHARIOTS.find(x=>x.qr_id===id);if(!c){$('#qrLabel').textContent='';return}const url=location.origin+location.pathname.replace('qr-codes.html','chariot.html')+'?id='+encodeURIComponent(id);new QRCode(box,{text:url,width:220,height:220,correctLevel:QRCode.CorrectLevel.M});$('#qrLabel').textContent=id}
function printSelectedQrCode(){const box=$('#qr');const source=box?.querySelector('canvas,img');if(!source){alert('QR code introuvable.');return}const src=source.tagName.toLowerCase()==='canvas'?source.toDataURL('image/png'):source.src;const w=window.open('','_blank','width=600,height=700');if(!w){alert('Autorisez les fenêtres popup.');return}w.document.write(`<html><head><title>QR Code</title><style>@page{margin:0}body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center}img{width:70mm;height:70mm}</style></head><body><img src="${src}"></body></html>`);w.document.close();w.onload=()=>{w.print();setTimeout(()=>w.close(),300)}}
let GLOBAL_HISTORY_ROWS=[];
function historyTypeLabel(type){const t=String(type||'').trim();if(!t)return'Modification';return t.replace(/Planification livraison/gi,'Livraison planifiée').replace(/Annulation planification livraison/gi,'Annulation livraison').replace(/Modification chariot/gi,'Modification chariot').replace(/Statut/gi,'Changement de statut');}
function historyIcon(type){const t=String(type||'').toLowerCase();if(t.includes('livraison')&&t.includes('annulation'))return'↩';if(t.includes('livraison'))return'▣';if(t.includes('statut'))return'↻';if(t.includes('création')||t.includes('creation'))return'+';if(t.includes('suppression'))return'×';return'✎'}
function historyChariot(row){return CHARIOTS.find(c=>String(c.qr_id||'')===String(row.qr_id||''))||null}
function historyDisplayDate(row){const iso=row.created_at||row.date;if(!iso)return'—';try{return new Date(iso).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(_){return String(iso)}}
function historySearchText(row){const c=historyChariot(row);return[row.qr_id,c?.chassis,c?.client,c?.engine,c?.engine_number,row.technicien,row.type,row.travaux].map(v=>String(v||'')).join(' ').toLowerCase()}
function renderGlobalHistory(){const box=$('#historyList');if(!box)return;const q=String($('#historySearch')?.value||'').trim().toLowerCase(),type=String($('#historyType')?.value||''),from=String($('#historyFrom')?.value||''),to=String($('#historyTo')?.value||'');const rows=GLOBAL_HISTORY_ROWS.filter(r=>{if(q&&!historySearchText(r).includes(q))return false;if(type&&String(r.type||'')!==type)return false;const day=String(r.date||r.created_at||'').slice(0,10);if(from&&day<from)return false;if(to&&day>to)return false;return true});const count=$('#historyCount');if(count)count.textContent=`${rows.length} modification${rows.length!==1?'s':''}`;if(!rows.length){box.innerHTML='<div class="history-empty"><div class="history-empty-icon">✓</div><b>Aucun événement trouvé</b><span>Modifiez les filtres ou effectuez une autre recherche.</span></div>';return}box.innerHTML=rows.map(r=>{const c=historyChariot(r),href=r.qr_id?'chariot.html?id='+encodeURIComponent(r.qr_id):'#',user=String(r.technicien||'Utilisateur'),label=historyTypeLabel(r.type),details=String(r.travaux||'').trim()||'Modification enregistrée.';return`<article class="history-event"><div class="history-event-icon">${esc(historyIcon(r.type))}</div><div class="history-event-main"><div class="history-event-top"><span class="history-event-type">${esc(label)}</span><span class="history-event-date">${esc(historyDisplayDate(r))}</span></div><div class="history-event-machine">${r.qr_id?`<a href="${href}" class="history-machine-link">${esc(c?.chassis||r.qr_id)}</a>`:'—'}${c?.qr_id?`<span class="history-qr">QR : ${esc(c.qr_id)}</span>`:''}</div><div class="history-event-details">${esc(details)}</div><div class="history-event-user">Utilisateur : <strong>${esc(user)}</strong></div></div></article>`}).join('')}
function populateHistoryTypeFilter(){const sel=$('#historyType');if(!sel)return;const current=sel.value,types=[...new Set(GLOBAL_HISTORY_ROWS.map(x=>String(x.type||'').trim()).filter(Boolean))].sort((a,b)=>historyTypeLabel(a).localeCompare(historyTypeLabel(b),'fr',{sensitivity:'base'}));sel.innerHTML='<option value="">Tous les types</option>'+types.map(t=>`<option value="${esc(t)}">${esc(historyTypeLabel(t))}</option>`).join('');sel.value=types.includes(current)?current:''}
async function historyPage(){if(!await session())return;await loadChariots();const box=$('#historyList');if(box)box.innerHTML='<div class="dash-empty">Chargement de l’historique...</div>';let data=[];try{const r=await withTimeout(supabaseClient.from('maintenance').select('id,qr_id,date,technicien,type,travaux,created_at,created_by').order('created_at',{ascending:false}).limit(1000),10000);if(r.error)throw r.error;data=r.data||[]}catch(e){try{data=await restGetTableRows('maintenance','select=id,qr_id,date,technicien,type,travaux,created_at,created_by&order=created_at.desc&limit=1000',1000)}catch(_){data=[]}}GLOBAL_HISTORY_ROWS=(data||[]).filter(x=>{const type=String(x.type||'').toLowerCase();if(!x.qr_id||String(x.qr_id).toLowerCase()==='system')return false;if(type.includes('connexion utilisateur')||type.includes('déconnexion utilisateur'))return false;if(type.includes('demande changement mot de passe'))return false;return true});populateHistoryTypeFilter();['historySearch','historyType','historyFrom','historyTo'].forEach(id=>{const el=$('#'+id);if(el){el.addEventListener('input',renderGlobalHistory);el.addEventListener('change',renderGlobalHistory)}});$('#historyReset')?.addEventListener('click',()=>{['historySearch','historyType','historyFrom','historyTo'].forEach(id=>{const el=$('#'+id);if(el)el.value=''});renderGlobalHistory()});renderGlobalHistory()}
async function loadConnectionHistory(){
  const box=$('#connectionHistory');
  if(!box)return;
  try{
    const {data,error}=await withTimeout(
      supabaseClient
        .from('sbi_user_connection_logs')
        .select('id,user_id,user_email,action,user_agent,created_at')
        .order('created_at',{ascending:false})
        .limit(500),
      8000
    );
    if(error)throw error;
    const rows=data||[];
    if(!rows.length){box.innerHTML='<div class="empty">Aucune connexion enregistrée.</div>';return}

    const groups=new Map();
    rows.forEach(x=>{
      const user=String(x.user_email||x.user_id||'Utilisateur').trim()||'Utilisateur';
      if(!groups.has(user))groups.set(user,[]);
      groups.get(user).push(x);
    });

    const sortedGroups=[...groups.entries()].sort((a,b)=>{
      const ad=new Date(a[1][0]?.created_at||0).getTime();
      const bd=new Date(b[1][0]?.created_at||0).getTime();
      return bd-ad;
    });

    box.innerHTML=sortedGroups.map(([user,events])=>{
      const latest=events[0];
      const latestAction=String(latest.action||'Connexion')==='Connexion'?'Connexion':'Déconnexion';
      const latestDt=latest.created_at?new Date(latest.created_at):null;
      const latestWhen=latestDt&&!Number.isNaN(latestDt.getTime())?latestDt.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):String(latest.created_at||'—');
      const eventHtml=events.map(x=>{
        const action=String(x.action||'Connexion')==='Connexion'?'Connexion':'Déconnexion';
        const dt=x.created_at?new Date(x.created_at):null;
        const when=dt&&!Number.isNaN(dt.getTime())?dt.toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}):String(x.created_at||'—');
        const device=String(x.user_agent||'').slice(0,180)||'—';
        return `<div class="connection-event"><div class="connection-event-main"><div class="connection-event-line"><span class="badge ${action==='Connexion'?'connection-green':'red'}">${esc(action)}</span><strong>${esc(when)}</strong></div><div class="meta"><span title="${esc(device)}"><strong>Appareil :</strong> ${esc(device)}</span></div></div></div>`;
      }).join('');
      return `<section class="connection-user-group"><div class="connection-user-head"><div><div class="connection-user-email">${esc(user)}</div><div class="meta">${events.length} événement${events.length>1?'s':''} · Dernière activité : ${esc(latestWhen)}</div></div><span class="badge ${latestAction==='Connexion'?'connection-green':'red'}">${esc(latestAction)}</span></div><div class="connection-user-events">${eventHtml}</div></section>`;
    }).join('');
  }catch(e){
    box.innerHTML='<div class="notice red">Impossible de charger l’historique des connexions. Exécutez une fois le fichier <strong>SUPABASE_USER_CONNECTION_LOGS.sql</strong> dans Supabase SQL Editor.</div>';
  }
}

async function gestionPage(){if(!await session())return;if(!requireAdmin()){$('#users').innerHTML='<div class="notice red">Accès administrateur requis.</div>';return}await loadSbiUsers();await loadPasswordRequests();await loadConnectionHistory()}
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
  renderDashboardWatch();
  const els={week:$('#weekDays'),list:$('#deliveryList'),range:$('#rangeTitle'),modal:$('#deliveryModal'),form:$('#deliveryForm'),search:$('#deliverySearch'),searchResults:$('#deliverySearchResults'),clearSearch:$('#clearDeliverySearch'),chariot:$('#deliveryChariot'),date:$('#deliveryDate'),time:$('#deliveryTime'),driver:$('#deliveryDriver'),destination:$('#deliveryDestination'),note:$('#deliveryNote'),noteCount:$('#deliveryNoteCount'),close:$('#closeDeliveryModal'),today:$('#todayBtn'),prev:$('#prevWeek'),next:$('#nextWeek'),plan:$('#planBtn'),cancel:$('#cancelDelivery'),todayCount:$('#todayCount'),weekCount:$('#weekCount'),plannedCount:$('#plannedCount')};
  let selectedDate=localDateISO(new Date()), weekStart=startOfWeek(new Date()), refreshBusy=false;
  function localDateISO(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
  function parseDate(s){const [y,m,d]=String(s).split('-').map(Number);return new Date(y||2000,(m||1)-1,d||1)}
  function startOfWeek(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());const n=x.getDay();const diff=n===6?0:-(n+1);x.setDate(x.getDate()+diff);return x}
  function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
  function formatLong(s){return parseDate(s).toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
  function syncPlans(next){plans=Array.isArray(next)?[...next]:[];cacheDeliveryPlans(plans)}
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
  function weekPlans(){const a=localDateISO(weekStart),b=localDateISO(addDays(weekStart,5));return plans.filter(p=>p.date>=a&&p.date<=b)}
  function renderStats(){const today=localDateISO(new Date());els.todayCount.textContent=plans.filter(p=>p.date===today).length;els.weekCount.textContent=weekPlans().length;els.plannedCount.textContent=plans.length}
  function renderWeek(){const dates=Array.from({length:6},(_,i)=>addDays(weekStart,i));els.range.textContent=`Semaine du ${dates[0].toLocaleDateString('fr-FR',{day:'2-digit',month:'long'})} au ${dates[5].toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}`;els.week.innerHTML=dates.map(d=>{const iso=localDateISO(d);const dayPlans=plans.filter(p=>p.date===iso);const n=dayPlans.length;const delivered=dayPlans.filter(p=>isDelivered(getMachine(p.qr))).length;return `<button type="button" class="delivery-day ${iso===selectedDate?'active':''}" data-date="${iso}"><div class="dow">${esc(d.toLocaleDateString('fr-FR',{weekday:'long'}))}</div><div class="date">${esc(d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}))}</div><div class="num">${n} livraison${n!==1?'s':''}</div><div class="delivered-num">${delivered} chariot${delivered!==1?'s':''} livré${delivered!==1?'s':''}</div></button>`}).join('');els.week.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{selectedDate=b.dataset.date;renderWeek();renderList()})}
  function renderList(){let rows=plans.filter(p=>p.date===selectedDate).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));els.list.innerHTML=rows.length?rows.map(p=>{const c=getMachine(p.qr);const href='chariot.html?id='+encodeURIComponent(p.qr||'');return `<div class="delivery-row"><div class="delivery-time">${esc(p.time||'—')}</div><div class="delivery-main"><a class="delivery-chariot-link" href="${href}"><div class="delivery-title">${esc(c?.chassis||p.qr||'Chariot')}</div></a><div class="delivery-meta">${esc(c?.engine||'—')} · ${esc(fmtCapacity(c?.capacity))} · ${esc(c?.client||'Sans client')}</div>${p.driver?`<div class="delivery-meta"><strong>Chauffeur :</strong> ${esc(p.driver)}</div>`:''}${p.destination?`<div class="delivery-meta"><strong>Destination :</strong> ${esc(p.destination)}</div>`:''}${p.note?`<div class="delivery-meta">${esc(p.note)}</div>`:''}</div><div class="delivery-actions">${isAdmin()&&!isDelivered(c)?`<button class="btn deliver-plan-btn" type="button" data-deliver-plan="${esc(p.qr)}" data-plan-id="${esc(p.id)}">Livrer</button>`:''}<button class="btn light" type="button" data-edit="${esc(p.id)}">Modifier</button><button class="btn light" type="button" data-delete="${esc(p.id)}">Supprimer</button></div></div>`}).join(''):`<div class="delivery-empty">Aucune livraison planifiée pour ${esc(formatLong(selectedDate))}.</div>`;els.list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEdit(b.dataset.edit));els.list.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>removePlan(b.dataset.delete));els.list.querySelectorAll('[data-deliver-plan]').forEach(b=>b.onclick=()=>deliverPlanned(b.dataset.deliverPlan,b.dataset.planId));renderStats()}
  async function deliverPlanned(qr,id){if(!requireAdminForDelivery())return;const c=getMachine(qr);if(!c)return alert('Chariot introuvable.');if(isDelivered(c))return;if(!confirm('Passer le chariot '+(c.chassis||qr)+' directement au statut « Livré » ?'))return;const now=new Date(),deliveryDate=localDateISO(now),updatedAt=now.toISOString();const {error}=await supabaseClient.from('chariots').update({status:'Livré',delivery_date:deliveryDate,updated_at:updatedAt}).eq('qr_id',qr);if(error){alert('Erreur : '+friendlySupabaseError(error));return}try{await supabaseClient.from('maintenance').insert({qr_id:qr,date:deliveryDate,technicien:getUserDisplayName(),type:'Statut',travaux:`Statut : ${c.status||'—'} → Livré`,created_by:currentUser.id})}catch(e){console.warn('Notification livraison non enregistrée',e)}c.status='Livré';c.delivery_date=deliveryDate;c.updated_at=updatedAt;cacheDeliveryPlans(plans);renderWeek();renderList();alert('Chariot '+(c.chassis||qr)+' passé au statut « Livré ».')}
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
  async function removePlan(id){if(!confirm('Supprimer cette livraison du planning ?'))return;const p=plans.find(x=>x.id===id);if(!p)return;const payload={id:p.id,qr:p.qr,date:p.date,time:p.time||'',note:p.note||''};const {error}=await supabaseClient.from('maintenance').insert({qr_id:p.qr,date:p.date,technicien:getUserDisplayName(),type:'Annulation planification livraison',travaux:JSON.stringify(payload),created_by:currentUser?.id||null});if(error){alert('Erreur : '+friendlySupabaseError(error));return}try{await loadDeliveryPlans()}catch(e){}syncPlans(DELIVERY_PLANS);renderWeek();renderList()}
  els.form.onsubmit=async e=>{e.preventDefault();const qr=els.chariot.value,date=els.date.value||localDateISO(new Date()),time=els.time.value||'',driver=els.driver.value.trim(),destination=els.destination.value.trim(),note=els.note.value.trim();if(!qr){alert('Veuillez sélectionner un chariot.');return}const edit=els.form.dataset.edit;const duplicate=plans.some(p=>String(p.qr)===String(qr)&&p.id!==edit);if(duplicate){alert('Ce chariot est déjà planifié pour une livraison.');return}const logicalId=edit||('dp_'+Date.now()+'_'+Math.random().toString(36).slice(2,8));const payload={id:logicalId,qr:String(qr),date:String(date),time:String(time||''),driver:String(driver||''),destination:String(destination||''),note:String(note||'')};const previous=edit?plans.find(x=>String(x.id)===String(edit)):null;let planHistory='';if(previous){const changed=[];for(const [k,label] of [['date','Date'],['time','Heure'],['driver','Chauffeur'],['destination','Destination'],['note','Note']]){const a=String(previous[k]||''),b=String(payload[k]||'');if(a!==b)changed.push(`${label} : ${a||'—'} → ${b||'—'}`)}planHistory=changed.join(' • ')}const {error}=await supabaseClient.from('maintenance').insert({qr_id:qr,date,technicien:getUserDisplayName(),type:'Planification livraison',travaux:JSON.stringify(payload),created_by:currentUser?.id||null});if(error){alert('Erreur : '+friendlySupabaseError(error));return}if(edit&&planHistory){try{await supabaseClient.from('maintenance').insert({qr_id:qr,date,technicien:getUserDisplayName(),type:'Modification planification livraison',travaux:planHistory,created_by:currentUser?.id||null})}catch(e){console.warn('Historique modification planification non enregistré',e)}}try{await loadDeliveryPlans()}catch(e){alert('Planification enregistrée mais actualisation impossible : '+friendlySupabaseError(e))}syncPlans(DELIVERY_PLANS);selectedDate=date;weekStart=startOfWeek(parseDate(date));closeModal();refreshChariotOptions();renderWeek();renderList()};
  els.cancel.onclick=closeModal;els.close?.addEventListener('click',closeModal);els.clearSearch?.addEventListener('click',()=>{els.search.value='';renderSearchResults();els.search.focus()});els.modal.addEventListener('click',e=>{if(e.target===els.modal)closeModal()});els.search?.addEventListener('input',renderSearchResults);els.search?.addEventListener('search',renderSearchResults);els.chariot?.addEventListener('change',()=>{if(els.search){els.search.value='';els.searchResults.innerHTML=''}});els.note?.addEventListener('input',updateNoteCount);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!els.modal.classList.contains('hidden'))closeModal()});els.plan.onclick=()=>openModal(selectedDate, new URLSearchParams(location.search).get('qr')||'');els.today.onclick=()=>{selectedDate=localDateISO(new Date());weekStart=startOfWeek(new Date());renderWeek();renderList()};els.prev.onclick=()=>{weekStart=addDays(weekStart,-7);renderWeek();renderList()};els.next.onclick=()=>{weekStart=addDays(weekStart,7);renderWeek();renderList()};
  window.addEventListener('focus',refreshFromServer);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshFromServer()});setInterval(refreshFromServer,15000);
  renderWeek();renderList();
}

async function renderUpcomingDeliveriesFromPlanning(){
  const today=localISODateGlobal(new Date());
  let planRows=[];
  let cancelRows=[];
  let serverLoaded=false;

  try{
    const [plannedRes,cancelRes]=await Promise.all([
      withTimeout(supabaseClient.from('maintenance').select('id,qr_id,date,type,travaux,created_at,created_by').eq('type','Planification livraison').order('created_at',{ascending:true}).limit(1000),7000),
      withTimeout(supabaseClient.from('maintenance').select('id,qr_id,date,type,travaux,created_at,created_by').eq('type','Annulation planification livraison').order('created_at',{ascending:true}).limit(1000),7000)
    ]);
    if(plannedRes?.error)throw plannedRes.error;
    if(cancelRes?.error)throw cancelRes.error;
    planRows=plannedRes.data||[];
    cancelRows=cancelRes.data||[];
    serverLoaded=true;
  }catch(e){
    console.warn('Lecture planning direct impossible',e);
  }

  const cancelled=new Set();
  for(const row of cancelRows){
    const payload=parseDeliveryEvent(row);
    if(payload?.id)cancelled.add(String(payload.id));
  }

  let plans=[];
  for(const row of planRows){
    const payload=parseDeliveryEvent(row);
    if(!payload||!payload.qr||!payload.date||cancelled.has(String(payload.id)))continue;
    plans.push(payload);
  }

  if(!serverLoaded){
    const cached=readCachedDeliveryPlans();
    plans=Array.isArray(cached)?cached.filter(p=>p&&p.qr&&p.date):[];
  }else{
    cacheDeliveryPlans(plans);
  }

  const getMachine=(qr)=>CHARIOTS.find(x=>String(x.qr_id)===String(qr));
  const upcoming=plans
    .filter(p=>String(p.date)>=today&&!isDelivered(getMachine(p.qr)))
    .sort((a,b)=>String(a.date+' '+(a.time||'99:99')).localeCompare(String(b.date+' '+(b.time||'99:99'))));

  const planned=document.getElementById('plannedKpi');
  if(planned)planned.textContent=String(upcoming.length);

  const el=document.getElementById('dashboardUpcomingTimeline');
  if(!el)return;

  const rows=upcoming.slice(0,4);
  if(!rows.length){
    el.innerHTML='<div class="dash-empty">Aucune livraison à venir dans le planning.</div>';
    return;
  }

  const todayObj=parseLocalDate(today);
  const tomorrowObj=parseLocalDate(today); tomorrowObj.setDate(tomorrowObj.getDate()+1);
  const dayLabel=(iso)=>{
    const d=parseLocalDate(iso);
    if(d.getTime()===todayObj.getTime())return "Aujourd'hui";
    if(d.getTime()===tomorrowObj.getTime())return 'Demain';
    return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}).replace('.', '');
  };

  el.innerHTML=rows.map((p,index)=>{
    const c=getMachine(p.qr);
    const chassis=c?.chassis||c?.qr_id||p.qr;
    const time=String(p.time||'').trim()||'—';
    const destination=String(p.destination||'').trim()||'Destination non définie';
    const client=String(c?.client||'').trim();
    return `<a class="timeline-item" href="chariot.html?id=${encodeURIComponent(p.qr)}">\
      <div class="timeline-date"><strong>${esc(time)}</strong><span>${esc(dayLabel(p.date))}</span></div>\
      <div class="timeline-track"><span class="timeline-dot ${index===0?'active':''}"></span>${index<rows.length-1?'<span class="timeline-line"></span>':''}</div>\
      <div class="timeline-main"><div class="timeline-title">${esc(chassis)}</div><div class="timeline-meta">${esc(destination)}${client?' · '+esc(client):''}</div></div>\
      <span class="timeline-status">Prévu</span>\
    </a>`;
  }).join('');
}

// Kept as a compatibility wrapper for older code paths.
function renderProfessionalDashboard(){
  renderUpcomingDeliveriesFromPlanning().catch(e=>console.warn('Rendu dashboard',e));
}
