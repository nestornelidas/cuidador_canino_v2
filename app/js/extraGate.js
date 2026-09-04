/* Cuidador Canino - Gate extra para URL pública (Vercel) */
(function (root) {
  'use strict';
  var LS_HASH = 'cc_extra_pin_hash_v1';
  // Solo activa en https público (no localhost/127.0.0.1) para no molestar en local
  function shouldRun() {
    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '') return false;
    // Si quieres forzar también en local, cambia a true
    return true;
  }
  async function shaHex(s) {
    var data = new TextEncoder().encode(String(s));
    var d = await crypto.subtle.digest('SHA-256', data);
    var u = new Uint8Array(d), out='';
    for (var i=0;i<u.length;i++) out += (u[i]<16?'0':'')+u[i].toString(16);
    return out;
  }
  // PBKDF2 para PIN (más resistente que SHA-256 simple). Formato: pbkdf2$iter$saltB64$hashB64
  var PIN_ITER = 80000;
  function ab2b64(buf){ var u=new Uint8Array(buf), s='', CH=0x8000; for(var i=0;i<u.length;i+=CH) s+=String.fromCharCode.apply(null,u.subarray(i,i+CH)); return btoa(s); }
  function b642ab(b64){ var s=atob(b64), u=new Uint8Array(s.length); for(var i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; }
  async function hashPin(pin){
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var enc = new TextEncoder();
    var km = await crypto.subtle.importKey('raw', enc.encode(String(pin)), {name:'PBKDF2'}, false, ['deriveBits']);
    var bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt: salt, iterations: PIN_ITER, hash:'SHA-256'}, km, 256);
    return 'pbkdf2$'+PIN_ITER+'$'+ab2b64(salt)+'$'+ab2b64(new Uint8Array(bits));
  }
  async function verifyPin(pin, stored){
    if(!stored) return false;
    if(stored.indexOf('pbkdf2$')===0){
      try{
        var p=stored.split('$'); var iter=parseInt(p[1],10); var salt=b642ab(p[2]);
        var km=await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), {name:'PBKDF2'}, false, ['deriveBits']);
        var bits=await crypto.subtle.deriveBits({name:'PBKDF2', salt:salt, iterations:iter, hash:'SHA-256'}, km, 256);
        return ab2b64(new Uint8Array(bits))===p[3];
      }catch(e){ return false; }
    }
    // legacy SHA-256 hex
    var h=await shaHex(pin);
    return h===stored;
  }
  function getHash(){ try{return localStorage.getItem(LS_HASH)||''}catch(e){return ''} }
  function setHash(h){ try{localStorage.setItem(LS_HASH,h)}catch(e){} }
  function overlayEl(){
    var el=document.createElement('div');
    el.id='extraGate';
    el.className='auth-gate';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    return el;
  }
  var SS_OK='cc_extra_pin_ok_session';
  var LS_TS='cc_extra_pin_ts';
  async function getSharedHash(){
    try{
      if(!root.Supa || !root.Supa.isConfigured() || !root.Supa.getClient()) return null;
      var c=root.Supa.getClient();
      var r=await c.from('app_pin').select('pin_hash').eq('id',1).maybeSingle();
      return r.data?.pin_hash || null;
    }catch(e){ return null; }
  }
  async function setSharedHash(h){
    try{
      var c=root.Supa.getClient();
      await c.from('app_pin').upsert({id:1, pin_hash:h}, {onConflict:'id'});
    }catch(e){}
  }
  function boot(){
    return new Promise(function(resolve){
      (async function(){
      if (!shouldRun()) { resolve(); return; }
      if (!root.crypto || !root.crypto.subtle) { resolve(); return; }
      try{ if(sessionStorage.getItem(SS_OK)==='1'){ resolve(); return; } }catch(e){}
      try{ var ts=parseInt(localStorage.getItem(LS_TS)||'0',10); if(ts && Date.now()-ts < 8*60*60*1000 && sessionStorage.getItem(SS_OK)==='1'){ resolve(); return; } }catch(e){}
      var shared=await getSharedHash();
      var localHash=getHash();
      if(!shared && localHash){ await setSharedHash(localHash); shared=localHash; }
      var existing = shared || localHash;
      var isShared = !!shared;
      var gate = overlayEl();
      document.body.appendChild(gate);
      var UI = root.UI;
      if (!existing) {
        gate.innerHTML='<div class="auth-card"><h2>'+UI.icon('lock')+' Establecer PIN de acceso</h2>'+
          '<p class="hint">Este PIN protege la URL pública (Vercel). Solo se guarda en este navegador (hash). Elige 6 dígitos.</p>'+
          '<div class="form-field"><label>PIN (6 dígitos)</label><input type="password" class="input" id="ep1" inputmode="numeric" maxlength="6" autocomplete="off"></div>'+
          '<div class="form-field"><label>Repetir PIN</label><input type="password" class="input" id="ep2" inputmode="numeric" maxlength="6" autocomplete="off"></div>'+
          '<div class="auth-err" id="epErr" hidden></div>'+
          '<div class="form-actions"><button class="btn btn-primary" id="epOk">'+UI.icon('check')+' Guardar PIN</button></div>'+
          '<p class="hint">Podrás cambiarlo en Configuración > Seguridad.</p></div>';
        var err=gate.querySelector('#epErr');
        gate.querySelector('#epOk').addEventListener('click', async function(){
          var p1=gate.querySelector('#ep1').value.trim();
          var p2=gate.querySelector('#ep2').value.trim();
          if(!/^\d{6}$/.test(p1)){ err.textContent='El PIN debe ser 6 dígitos.'; err.hidden=false; return; }
          if(p1!==p2){ err.textContent='Los PIN no coinciden.'; err.hidden=false; return; }
          var h=await hashPin(p1);
          setHash(h);
          try{ sessionStorage.setItem(SS_OK,'1'); localStorage.setItem(LS_TS,String(Date.now())); }catch(e){}
          await setSharedHash(h);
          gate.remove();
          resolve();
        });
        gate.querySelector('#ep1').focus();
      } else if(isShared) { // verificar contra PIN compartido
        gate.innerHTML='<div class="auth-card"><h2>'+UI.icon('lock')+' PIN de acceso</h2>'+'<p class="hint">URL protegida. Introduce el PIN de 6 dígitos.</p>'+'<div class="form-field"><label>PIN</label><input type="password" class="input" id="epIn" inputmode="numeric" maxlength="6" autocomplete="off"></div>'+'<div class="auth-err" id="epErr2" hidden></div>'+'<div class="form-actions"><button class="btn btn-primary" id="epGo">'+UI.icon('check')+' Entrar</button></div></div>';
        var err2=gate.querySelector('#epErr2');
        var tries=0;
        async function goShared(){
          var p=gate.querySelector('#epIn').value.trim();
          var ok=await verifyPin(p, shared);
          if(ok){
            // migra hash legacy a PBKDF2 al primer acierto
            if(shared && shared.indexOf('pbkdf2$')!==0){
              try{ var nh=await hashPin(p); await setSharedHash(nh); localStorage.setItem(LS_HASH,nh); shared=nh; }catch(e){}
            }
            try{ sessionStorage.setItem(SS_OK,'1'); localStorage.setItem(LS_TS,String(Date.now())); if(shared.indexOf('pbkdf2$')!==0) localStorage.setItem(LS_HASH,shared); }catch(e){} gate.remove(); resolve();
          }
          else { tries++; err2.textContent='PIN incorrecto. Intento '+tries+'/3'; err2.hidden=false; if(tries>=3) { err2.textContent='PIN incorrecto. Recarga para reintentar.'; gate.querySelector('#epGo').disabled=true; } }
        }
        gate.querySelector('#epGo').addEventListener('click', goShared);
        gate.querySelector('#epIn').addEventListener('keydown', function(e){ if(e.key==='Enter') goShared(); });
        gate.querySelector('#epIn').focus();
      } else {
        gate.innerHTML='<div class="auth-card"><h2>'+UI.icon('lock')+' PIN de acceso</h2>'+
          '<p class="hint">URL protegida. Introduce el PIN de 6 dígitos.</p>'+
          '<div class="form-field"><label>PIN</label><input type="password" class="input" id="epIn" inputmode="numeric" maxlength="6" autocomplete="off"></div>'+
          '<div class="auth-err" id="epErr2" hidden></div>'+
          '<div class="form-actions"><button class="btn btn-primary" id="epGo">'+UI.icon('check')+' Entrar</button></div></div>';
        var err2=gate.querySelector('#epErr2');
        var tries=0;
        async function go(){
          var p=gate.querySelector('#epIn').value.trim();
          var ok=await verifyPin(p, getHash());
          if(ok){
            // migra legacy a PBKDF2
            var cur=getHash();
            if(cur && cur.indexOf('pbkdf2$')!==0){
              try{ var nh2=await hashPin(p); setHash(nh2); await setSharedHash(nh2); }catch(e){}
            }
            try{ sessionStorage.setItem(SS_OK,'1'); localStorage.setItem(LS_TS,String(Date.now())); }catch(e){} gate.remove(); resolve();
          }
          else { tries++; err2.textContent='PIN incorrecto. Intento '+tries+'/3'; err2.hidden=false; if(tries>=3) { err2.textContent='PIN incorrecto. Recarga para reintentar.'; gate.querySelector('#epGo').disabled=true; } }
        }
        gate.querySelector('#epGo').addEventListener('click', go);
        gate.querySelector('#epIn').addEventListener('keydown', function(e){ if(e.key==='Enter') go(); });
        gate.querySelector('#epIn').focus();
      }
      })();
    });
  }
  root.ExtraGate={ boot: boot, LS_HASH: LS_HASH };
})(typeof window !== 'undefined' ? window : globalThis);
