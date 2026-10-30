const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

// Live command-centre clock
function updateClock(){ const now=new Date(); $('#clock').textContent=now.toLocaleTimeString('en-IN',{hour12:false}); }
updateClock(); setInterval(updateClock,1000);

// Animate the dashboard counters when they enter the viewport
const counters = $$('[data-count]');
const counterObserver = new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(!entry.isIntersecting) return;
    const el=entry.target, target=Number(el.dataset.count), duration=1300, start=performance.now();
    function tick(time){const progress=Math.min((time-start)/duration,1);el.textContent=Math.floor(target*(1-Math.pow(1-progress,3))).toString().padStart(target>99?3:2,'0');if(progress<1)requestAnimationFrame(tick);}
    requestAnimationFrame(tick);counterObserver.unobserve(el);
  });
},{threshold:.5});
counters.forEach(el=>counterObserver.observe(el));

// Portal navigation replaces the conventional navigation bar.
const portal=$('#portalMenu');
const portalOpen=$('#portalOpen');
function openPortal(){portal.classList.add('open');portal.setAttribute('aria-hidden','false');$('#portalClose').focus();}
function closePortal(){portal.classList.remove('open');portal.setAttribute('aria-hidden','true');portalOpen.focus();}
portalOpen.addEventListener('click',openPortal);
$('#portalClose').addEventListener('click',closePortal);
portal.addEventListener('click',event=>{if(event.target===portal)closePortal();});
$$('.portal-links a').forEach(link=>link.addEventListener('click',()=>{portal.classList.remove('open');portal.setAttribute('aria-hidden','true');}));


// Incident filters
$$('.filter').forEach(button=>button.addEventListener('click',()=>{
  $$('.filter').forEach(item=>item.classList.remove('active'));button.classList.add('active');
  const filter=button.dataset.filter;
  $$('.incident-card').forEach(card=>card.style.display=(filter==='all'||card.dataset.status===filter)?'':'none');
}));

// Case detail modal
const modal=$('#caseModal');
function closeModal(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}
$$('.details-btn').forEach(button=>button.addEventListener('click',()=>{
  $('#modalTitle').textContent=button.dataset.case;modal.classList.add('open');modal.setAttribute('aria-hidden','false');
}));
$('#modalClose').addEventListener('click',closeModal);$('#modalOk').addEventListener('click',closeModal);
modal.addEventListener('click',event=>{if(event.target===modal)closeModal();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeModal();if(portal.classList.contains('open'))closePortal();}});

// Report form: demo submission, stored only in this browser session
$('#reportForm').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form).entries());
  const reference='EN-'+Math.floor(1000+Math.random()*9000);
  $('#formMessage').textContent=`TRANSMISSION RECEIVED. YOUR REFERENCE: ${reference}`;
  $('#toast').textContent=`✓ REPORT ${reference} SUCCESSFULLY TRANSMITTED`;
  $('#toast').classList.add('show');
  form.reset();
  setTimeout(()=>$('#toast').classList.remove('show'),4000);
  // Add a visible new signal to the feed
  const signal=document.createElement('div');signal.className='signal';
  const icon=document.createElement('span');icon.className='signal-icon amber-bg';icon.textContent='⌁';
  const details=document.createElement('div');const title=document.createElement('b');title.textContent='New civilian report received';
  const location=document.createElement('small');location.textContent=`${data.location} · ${reference}`;
  details.append(title,location);const time=document.createElement('time');time.textContent='NOW';
  signal.append(icon,details,time);$('#signalList').prepend(signal);
});

// Original Halloween-style ambience. Browsers may block audible autoplay;
// we attempt playback on load, then unlock it on the first visitor interaction.
let audioContext=null, soundEnabled=false, ambientNodes=[], ambientMaster=null, unlockBound=false;
function startHalloweenAmbience(){
  audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();
  if(audioContext.state==='suspended') audioContext.resume();
  if(soundEnabled && ambientMaster) return;
  soundEnabled=true;
  const master=audioContext.createGain();
  master.gain.value=0.0001;
  master.connect(audioContext.destination);
  master.gain.setTargetAtTime(0.075,audioContext.currentTime,1.8);
  ambientMaster=master;

  // Deep wind-like drone with slow modulation.
  const drone=audioContext.createOscillator();
  const droneGain=audioContext.createGain();
  const droneFilter=audioContext.createBiquadFilter();
  drone.type='sine'; drone.frequency.value=48;
  droneFilter.type='lowpass'; droneFilter.frequency.value=170;
  droneGain.gain.value=.7;
  drone.connect(droneFilter); droneFilter.connect(droneGain); droneGain.connect(master); drone.start();

  const second=audioContext.createOscillator();
  const secondGain=audioContext.createGain();
  second.type='triangle'; second.frequency.value=73.42;
  second.detune.value=-8; secondGain.gain.value=.16;
  second.connect(secondGain); secondGain.connect(master); second.start();

  const lfo=audioContext.createOscillator();
  const lfoGain=audioContext.createGain();
  lfo.frequency.value=.075; lfoGain.gain.value=18;
  lfo.connect(lfoGain); lfoGain.connect(drone.frequency); lfo.start();

  // Distant, eerie bell notes, softly repeating.
  const bellTimer=setInterval(()=>{
    if(!soundEnabled || !audioContext || audioContext.state!=='running') return;
    const now=audioContext.currentTime;
    const bell=audioContext.createOscillator(), bellGain=audioContext.createGain();
    const bellFilter=audioContext.createBiquadFilter();
    const tones=[392,466.16,587.33,523.25,349.23];
    bell.type='sine';
    bell.frequency.value=tones[Math.floor(Math.random()*tones.length)];
    bellFilter.type='lowpass'; bellFilter.frequency.value=1300;
    bellGain.gain.setValueAtTime(.0001,now);
    bellGain.gain.exponentialRampToValueAtTime(.018,now+.04);
    bellGain.gain.exponentialRampToValueAtTime(.0001,now+2.4);
    bell.connect(bellFilter); bellFilter.connect(bellGain); bellGain.connect(master);
    bell.start(now); bell.stop(now+2.5);
  },4200);
  ambientNodes=[drone,droneGain,droneFilter,second,secondGain,lfo,lfoGain];
  ambientNodes.bellTimer=bellTimer;
  updateSoundButton();
}
function stopHalloweenAmbience(){
  soundEnabled=false;
  if(ambientMaster && audioContext){
    ambientMaster.gain.setTargetAtTime(.0001,audioContext.currentTime,.35);
  }
  if(ambientNodes.bellTimer) clearInterval(ambientNodes.bellTimer);
  const nodes=[...ambientNodes]; ambientNodes=[];
  window.setTimeout(()=>nodes.forEach(node=>{try{node.stop?.();node.disconnect?.();}catch(e){}}),1500);
  ambientMaster=null;
  updateSoundButton();
}
function updateSoundButton(){
  const label=$('#soundToggle span');
  if(label) label.textContent=soundEnabled?'Halloween sound on':'Enable Halloween sound';
  const button=$('#soundToggle');
  if(button) button.style.borderColor=soundEnabled?'#d84b4b':'';
}
function tryAutoplayAmbience(){
  try{
    startHalloweenAmbience();
    if(audioContext && audioContext.state==='suspended'){
      audioContext.resume().then(()=>updateSoundButton()).catch(()=>{});
    }
  }catch(error){
    soundEnabled=false;
    updateSoundButton();
  }
}
function unlockAmbience(){
  if(soundEnabled && audioContext?.state==='running') return;
  tryAutoplayAmbience();
  window.removeEventListener('pointerdown',unlockAmbience);
  window.removeEventListener('keydown',unlockAmbience);
}
$('#soundToggle')?.addEventListener('click',()=>{
  if(soundEnabled) stopHalloweenAmbience();
  else tryAutoplayAmbience();
});
window.addEventListener('pointerdown',unlockAmbience,{once:true});
window.addEventListener('keydown',unlockAmbience,{once:true});
window.addEventListener('load',()=>window.setTimeout(tryAutoplayAmbience,450),{once:true});

// Gentle reveal animation for sections
const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('revealed');revealObserver.unobserve(entry.target);}
}),{threshold:.12});
$$('.stat-card,.panel,.incident-card,.step,.team-card,.report-layout').forEach(el=>{
  el.style.opacity='0';el.style.transform='translateY(16px)';el.style.transition='opacity .65s ease, transform .65s ease';
  revealObserver.observe(el);
});
document.addEventListener('scroll',()=>$$('.revealed').forEach(el=>{el.style.opacity='1';el.style.transform='translateY(0)';}),{passive:true});
revealObserver.takeRecords().forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');entry.target.style.opacity='1';entry.target.style.transform='translateY(0)';}});

// Cinematic opening sequence: dismisses automatically, with no blocking dependency.
const introScreen=$('#introScreen');
window.setTimeout(()=>introScreen?.classList.add('hide'),2200);
introScreen?.addEventListener('click',()=>introScreen.classList.add('hide'));

// Demo controls: refresh signal feed and simulate a new alert on the map.
const demoSignals=[
  ['Unusual temperature spike detected','Sector 09 · Noida, IN'],
  ['Unidentified signal frequency','Zone 02 · London, UK'],
  ['Perimeter breach simulation','District 11 · Tokyo, JP'],
  ['Containment team status updated','Sector 03 · New York, US']
];
$('#refreshFeed')?.addEventListener('click',()=>{
  const [titleText,locationText]=demoSignals[Math.floor(Math.random()*demoSignals.length)];
  const signal=document.createElement('div');signal.className='signal';
  const icon=document.createElement('span');icon.className='signal-icon amber-bg';icon.textContent='⌁';
  const details=document.createElement('div');const title=document.createElement('b');title.textContent=titleText;
  const location=document.createElement('small');location.textContent=locationText;
  details.append(title,location);const time=document.createElement('time');time.textContent='NOW';
  signal.append(icon,details,time);$('#signalList').prepend(signal);
  while($('#signalList').children.length>6)$('#signalList').lastElementChild.remove();
  $('#toast').textContent='↻ SIGNAL FEED UPDATED';$('#toast').classList.add('show');
  setTimeout(()=>$('#toast').classList.remove('show'),2200);
});
$('#mapAlert')?.addEventListener('click',()=>{
  const marker=document.createElement('div');marker.className='map-point simulated-point';
  marker.style.cssText=`top:${20+Math.random()*60}%;left:${10+Math.random()*75}%;`;
  const dot=document.createElement('b');const label=document.createElement('span');label.textContent='NEW SIGNAL / DEMO';
  marker.append(dot,label);$('.map-visual').append(marker);
  $('#toast').textContent='⚠ SIMULATED ANOMALY ADDED TO MAP';$('#toast').classList.add('show');
  setTimeout(()=>$('#toast').classList.remove('show'),2800);
});
