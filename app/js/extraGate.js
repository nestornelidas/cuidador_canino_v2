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
      var c=root.Supa.getClient(); var u=(await c.auth.getUser()).data?.user; if(!u) return null;
      var r=await c.from('user_config').select('pin_hash').eq('user_id', u.id).maybeSingle();
      return r.data?.pin_hash || null;
    }catch(e){ return null; }
  }
  async function setSharedHash(h){
    try{
      var c=root.Supa.getClient(); var u=(await c.auth.getUser()).data?.user; if(!u) return;
      await c.from('user_config').upsert({user_id: u.id, pin_hash: h, crypto_state: JSON.parse(localStorage.getItem('cuidador_canino_crypto_v1')||'{}')}, {onConflict:'user_id'});
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
      var existing = shared || getHash();
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
          var h=await shaHex(p1);
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
          var h=await shaHex(p);
          if(h===shared){ try{ sessionStorage.setItem(SS_OK,'1'); localStorage.setItem(LS_TS,String(Date.now())); localStorage.setItem(LS_HASH,h); }catch(e){} gate.remove(); resolve(); }
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
          var h=await shaHex(p);
          if(h===getHash()){ try{ sessionStorage.setItem(SS_OK,'1'); localStorage.setItem(LS_TS,String(Date.now())); }catch(e){} gate.remove(); resolve(); }
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
