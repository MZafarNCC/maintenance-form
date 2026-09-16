(() => {
  const $ = id => document.getElementById(id);
  const cfg = window.FORM_CONFIG || {};
  let language = 'en', files = [], busy = false, widget = null, challengeToken = '', requestId = null, requestSnapshot = null;
  const values = {}, types = /\.(jpe?g|png|webp|heic|heif|mp4|mov|webm)$/i;
  const t = () => LANGUAGES[language].ui;
  const configured = () => /^https:\/\//.test(cfg.apiUrl || '') && !!cfg.turnstileSiteKey;
  function error(message) { $('form-error').textContent = message; if(message) $('form-error').focus(); }
  function show(id) { ['language-screen','form-screen','success-screen'].forEach(s => $(s).hidden = s !== id); document.body.dataset.screen=id; if(id==='language-screen'){document.title='LIFE+ by NCSA: Anabeeb Staff Restaurant';$('footer').textContent='© 2026 National Catering Company';} window.scrollTo(0,0); }
  function remember() { for(const input of $('complaint').querySelectorAll('[data-field]')) values[input.name] = input.value; }
  function field(name, kind, required, destination) {
    const wrapper=document.createElement('div'); wrapper.className='field'+(kind==='textarea'?' full':'');
    const label=document.createElement('label'); label.htmlFor=name; label.textContent=LANGUAGES[language].labels[name]+(required?' *':'');
    const el=document.createElement(kind==='select'?'select':kind==='textarea'?'textarea':'input');
    el.id=el.name=name; el.dataset.field=''; el.required=required;
    if(kind==='select') {
      el.add(new Option(t().choose,''));
      const list=name==='location'?'locations':'categories';
      LANGUAGES[language][list].forEach((label,i)=>el.add(new Option(label,LANGUAGES.en[list][i])));
    } else { el.maxLength=name==='description'?4000:name==='name'?150:80; if(kind!=='textarea') el.type='text'; el.autocomplete=name==='name'?'name':'off'; }
    el.value=values[name]||''; wrapper.append(label,el); $(destination).append(wrapper);
  }
  function fileList() {
    $('file-list').replaceChildren();
    files.forEach((file,i)=>{const li=document.createElement('li'),name=document.createElement('span'),remove=document.createElement('button');
      name.textContent=file.name+' · '+(file.size/1048576).toFixed(1)+' MB'; remove.type='button';remove.textContent=t().remove;
      remove.onclick=()=>{files.splice(i,1);fileList();};li.append(name,remove);$('file-list').append(li);});
  }
  function challenge() {
    challengeToken='';
    if(!configured()) return;
    if(!window.turnstile) {
      if(!document.getElementById('turnstile-script')) {
        const script=document.createElement('script');script.id='turnstile-script';script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.onload=challenge;script.onerror=()=>error(t().network);document.head.append(script);
      }return;
    }
    if(widget!==null) window.turnstile.remove(widget);
    widget=window.turnstile.render('#challenge',{sitekey:cfg.turnstileSiteKey,language:language==='tl'?'en':language,action:'complaint',callback:token=>{challengeToken=token;},'expired-callback':()=>{challengeToken='';},'error-callback':()=>{challengeToken='';}});
  }
  function render(code) {
    remember(); language=code; const l=LANGUAGES[code],u=l.ui;
    document.documentElement.lang=code;document.documentElement.dir=l.dir;document.title=l.title;
    const text={'brand':u.brand,'badge':u.badge,'change-language':u.change,'form-eyebrow':u.badge,'form-title':l.title,'intro':l.intro,'details-heading':u.details,'issue-heading':u.issue,'attachments-heading':u.attachments,'upload-label':u.upload,'upload-help':u.uploadHelp,'automatic':l.labels.reported+' — '+u.automatic,'required-help':u.required,'submit':u.submit,'setup-notice':u.setup,'footer':'© 2026 National Catering Company'};
    for(const [id,value] of Object.entries(text)) $(id).textContent=value;
    $('personal-fields').replaceChildren();$('issue-fields').replaceChildren();
    ['name','room','building','floor'].forEach(n=>field(n,'input',n!=='floor','personal-fields'));
    ['location','category'].forEach(n=>field(n,'select',true,'issue-fields'));field('description','textarea',true,'issue-fields');
    $('setup-notice').hidden=configured();$('submit').disabled=!configured();error('');fileList();show('form-screen');challenge();
    $('form-title').tabIndex=-1;$('form-title').focus();
  }
  const countryCodes={en:'GB',hi:'IN',ar:'SA',ur:'PK',tl:'PH'};
  ['en','hi','ar','ur','tl'].forEach(code=>{const l=LANGUAGES[code];
    const button=document.createElement('button');button.className='language-card';button.type='button';button.dataset.language=code;
    const badge=document.createElement('span');badge.className='language-code';badge.textContent=countryCodes[code];badge.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.className='language-name';label.lang=code;label.dir=l.dir;label.textContent=code==='tl'?'Filipino':l.native;
    button.append(badge,label);
    button.onclick=()=>render(code);$('languages').append(button);
  });
  $('change-language').onclick=()=>{if(busy)return;remember();document.documentElement.dir='ltr';document.documentElement.lang='en';show('language-screen');};
  $('media').onchange=e=>{
    const next=[...files,...e.target.files];e.target.value='';
    if(next.length>3||next.some(f=>!types.test(f.name)||f.size>10*1048576||f.size===0)||next.reduce((n,f)=>n+f.size,0)>25*1048576){error(t().fileError);return;}
    files=next;error('');fileList();
  };
  $('complaint').onsubmit=async e=>{
    e.preventDefault();if(busy||!configured())return;remember();
    for(const el of $('complaint').querySelectorAll('[data-field]')) if((el.required&&!el.value.trim())||!el.checkValidity()){error(t().invalid);el.focus();return;}
    if(!challengeToken){error(t().security);return;}
    const payload={language,...values};
    const snapshot=JSON.stringify([payload,files.map(f=>[f.name,f.size,f.lastModified])]);
    if(requestSnapshot!==snapshot){requestId=crypto.randomUUID();requestSnapshot=snapshot;}
    const body=new FormData();body.set('payload',JSON.stringify(payload));body.set('requestId',requestId);body.set('challenge',challengeToken);body.set('website',$('complaint').elements.website.value);files.forEach(f=>body.append('files',f));
    busy=true;$('form-fields').disabled=true;$('change-language').disabled=true;$('submit').textContent=t().sending;error('');
    try{
      const res=await fetch(cfg.apiUrl.replace(/\/$/,'')+'/submit',{method:'POST',body});const result=await res.json();
      if(!res.ok||result.ok!==true||typeof result.reference!=='string')throw new Error('unconfirmed');
      $('success-title').textContent=t().success;$('success-message').textContent=LANGUAGES[language].confirmation;
      $('reference-label').textContent=t().reference;$('reference-number').textContent=result.reference;$('another').textContent=t().another;
      show('success-screen');$('success-screen').focus();
    }catch{error(t().network);}
    finally{busy=false;$('form-fields').disabled=false;$('change-language').disabled=false;$('submit').textContent=t().submit;challengeToken='';if(widget!==null&&window.turnstile)window.turnstile.reset(widget);}
  };
  $('another').onclick=()=>{Object.keys(values).forEach(k=>delete values[k]);$('complaint').reset();files=[];requestId=null;requestSnapshot=null;render(language);};
})();
