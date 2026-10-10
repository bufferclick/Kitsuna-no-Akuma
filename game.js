/* Kitsuna no Akuma — standalone canvas action RPG. No network services are required at runtime. */
(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const W = 1280, H = 720, TILE = 32, WORLD_W = 176, WORLD_H = 118;
const SAVE_KEY = 'kitsuna-no-akuma.save.v1';
const palettes = {
  meadow: ['#263d44','#31534b','#3c664c','#4d7551','#648558'],
  woods: ['#1d3640','#25443f','#31513e','#3b5f43','#496c49'],
  ember: ['#47353d','#624044','#7c4b43','#925c45','#aa724e'],
  shrine: ['#343546','#45445a','#5a5364','#71606b','#8b756e'],
  water: ['#1e394c','#23485a','#275668','#2d6473','#37737d']
};
const regions = [
  {name:'ASHENVALE FRONTIER', sub:'A mist-soft valley of old pacts.', x:0,y:0,w:65,h:58, type:'meadow', danger:1},
  {name:'WHISPERWOOD', sub:'The roots repeat secrets after midnight.', x:65,y:0,w:62,h:77,type:'woods',danger:2},
  {name:'CINDERFALL WILDS',sub:'Burning rain feeds a hungry earth.',x:0,y:58,w:82,h:60,type:'ember',danger:3},
  {name:'MOONGLASS SANCTUM',sub:'A shrine suspended between breaths.',x:127,y:0,w:49,h:118,type:'shrine',danger:4}
];
const enemyTypes = {
  wisp:{name:'Hollow Wisp', hp:45, dmg:8, speed:48, xp:18, shards:5, color:'#98dbdb', size:15, aggro:195},
  wolf:{name:'Bristle Wolf', hp:74, dmg:12, speed:70, xp:28, shards:8, color:'#bf8565', size:19, aggro:235},
  fiend:{name:'Cinder Fiend', hp:118, dmg:18, speed:46, xp:48, shards:15, color:'#dc6261', size:23, aggro:240},
  priest:{name:'Moonless Acolyte', hp:170, dmg:23, speed:37, xp:72, shards:22, color:'#b38ae1', size:24, aggro:280},
  alpha:{name:'Gloomfang Alpha', hp:520, dmg:31, speed:55, xp:330, shards:160, color:'#e37169', size:37, aggro:340, boss:true}
};
const abilities = [
  {key:'J', name:'Sunder', icon:'✕', level:1, cost:0, cd:.4, hint:'Pact blade strike', type:'strike'},
  {key:'Q', name:'Kon', icon:'狐', level:1, cost:22, cd:4.2, hint:'Summon a biting fox maw', type:'kon'},
  {key:'R', name:'Foxfire', icon:'✦', level:2, cost:18, cd:3, hint:'Fling three spirit flames', type:'fire'},
  {key:'F', name:'Mirage Step', icon:'〰', level:3, cost:16, cd:4.5, hint:'Dash, shedding a decoy', type:'step'},
  {key:'C', name:'Moon Snare', icon:'⌬', level:4, cost:28, cd:7, hint:'Bind foes in a lunar seal', type:'snare'},
  {key:'X', name:'Apex Howl', icon:'☽', level:6, cost:38, cd:10, hint:'A devastating fox spirit cry', type:'howl'},
  {key:'V', name:'Ninefold Bloom', icon:'✹', level:8, cost:48, cd:14, hint:'Nine foxfires scour the field', type:'bloom'}
];
const attributes = {
  power:{label:'Power', desc:'Increases blade and bite damage.', value:2},
  agility:{label:'Agility', desc:'Raises dash range and critical chance.', value:2},
  resolve:{label:'Resolve', desc:'Raises maximum health and parry grace.', value:2},
  spirit:{label:'Spirit', desc:'Raises max spirit and pact potency.', value:2},
  fortune:{label:'Fortune', desc:'Improves shard drops and rare echoes.', value:1}
};
const mutations = [
  {id:'ember', icon:'♨', name:'Ember Jaw', req:2, text:'Kon ignites its prey, causing 30% more damage over time.'},
  {id:'glass', icon:'◇', name:'Glass Tails', req:3, text:'Mirage Step leaves a cutting afterimage behind.'},
  {id:'moon', icon:'☾', name:'Moonlit Muzzle', req:4, text:'Your parry restores 12 spirit and turns the night in your favor.'},
  {id:'devour', icon:'☠', name:'Devourer', req:6, text:'Defeated foes restore 4% maximum health.'},
  {id:'nine', icon:'✹', name:'Nine-Tailed Omen', req:8, text:'Unlock Ninefold Bloom and gain one extra foxfire.'},
  {id:'crown', icon:'♛', name:'Crowned Hunger', req:10, text:'Apex Howl critically strikes all marked enemies.'}
];
const questSeeds = [
  {id:'first-blood',name:'A Contract Has Teeth',goal:'Defeat Hollow Wisps',type:'kill',enemy:'wisp',need:3,reward:45,desc:'The fox asks for a first taste of wandering spirits.'},
  {id:'briar',name:'The Briar Road',goal:'Find the Whisperwood gate',type:'visit',region:'WHISPERWOOD',need:1,reward:70,desc:'Follow the old stone road into Whisperwood.'},
  {id:'pack',name:'Fangs in the Fog',goal:'Cull Bristle Wolves',type:'kill',enemy:'wolf',need:5,reward:105,desc:'The village wards fail whenever the wolves grow bold.'},
  {id:'cinder',name:'Cinders Tell No Lies',goal:'Defeat Cinder Fiends',type:'kill',enemy:'fiend',need:5,reward:170,desc:'Burn the corruption out of Cinderfall.'},
  {id:'echo',name:'An Echo in Moonlight',goal:'Reach Moonglass Sanctum',type:'visit',region:'MOONGLASS SANCTUM',need:1,reward:220,desc:'The oldest pact-stone calls your name.'},
  {id:'alpha',name:'The Hunger Below',goal:'Defeat Gloomfang Alpha',type:'kill',enemy:'alpha',need:1,reward:380,desc:'A primordial beast has claimed the sanctum threshold.'},
  {id:'hunter',name:'The Long Hunt',goal:'Defeat 25 enemies',type:'totalKills',need:25,reward:250,desc:'Become a name the wild refuses to forget.'},
  {id:'ascend',name:'The Fox Grows',goal:'Reach level 7',type:'level',need:7,reward:300,desc:'Feed the pact enough strength to molt its old skin.'}
];
const NPCS = [
  {id:'aiko', name:'Aiko, Warden of Cinders', x:455, y:570, color:'#f1b879', dialogue:[
    'So you are the soul who answered the whisper. Keep your hand steady. Foxes love a tremble.',
    'Every contract has teeth, pactbearer. Make certain yours bite outward.',
    'The trail to the east opens after you prove that your blade is not decoration.'
  ]},
  {id:'mori', name:'Mori, Root-Seer', x:2420, y:710, color:'#b999cf', dialogue:[
    'Whisperwood does not hide its paths. It simply asks whether you deserve to see them.',
    'A fox spirit carries hunger, mischief, and mercy. Do not pretend you have only one of these.',
    'I have watched your flame grow. The Moonglass road is ready.'
  ]},
  {id:'kasa', name:'Kasa, Shrine Keeper', x:4920, y:1580, color:'#8dd2c8', dialogue:[
    'At last—the fox-shaped shadow in the old prophecies.',
    'The Gloomfang waits below the broken glass. Do not offer it fear. It has had enough of that.',
    'A strong pact is not a chain. It is a choice made every morning.'
  ]}
];
let game, raf, lastTime = 0;
let keys = Object.create(null), pressed = Object.create(null), mouse = {x:0,y:0};
let audio = {ctx:null, enabled:true, volume:.38};
let activeModal = null, dialogueState = null;

function rnd(n){ const x=Math.sin(n*127.1+311.7)*43758.5453123; return x-Math.floor(x); }
function noise(x,y){ const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy; const a=rnd(ix+iy*719), b=rnd(ix+1+iy*719), c=rnd(ix+(iy+1)*719), d=rnd(ix+1+(iy+1)*719); const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy); return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*.55; }
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function hexLerp(a,b,t){ const ah=parseInt(a.slice(1),16),bh=parseInt(b.slice(1),16); const ar=ah>>16,ag=(ah>>8)&255,ab=ah&255,br=bh>>16,bg=(bh>>8)&255,bb=bh&255; return '#'+[ar+(br-ar)*t,ag+(bg-ag)*t,ab+(bb-ab)*t].map(x=>Math.round(x).toString(16).padStart(2,'0')).join(''); }
function now(){return performance.now()/1000;}

function defaultState(){
 return {
  player:{x:560,y:640,dir:0,hp:120,sp:80,level:1,xp:0,shards:0,attrPoints:0,mutationPoints:0,attributes:JSON.parse(JSON.stringify(attributes)),mutations:[],kills:0,discovered:['ASHENVALE FRONTIER'],invuln:0,attack:0,parry:0,dash:0,stamina:1},
  quests:questSeeds.map(q=>({...q,progress:0,status:q.id==='first-blood'?'active':'locked'})),
  enemies:[], effects:[], projectiles:[], particles:[], messages:[], time:6.33,day:1,paused:false, started:false, musicStarted:false, settings:{shake:true,lowFx:false}, camera:{x:0,y:0,shake:0}, cooldowns:{}, region:'ASHENVALE FRONTIER', stats:{damage:0,parries:0},
 };
}
function hydrateState(saved){
 let base=defaultState();
 if(!saved) return base;
 try { const s=JSON.parse(saved); Object.assign(base.player,s.player||{}); base.player.attributes={...JSON.parse(JSON.stringify(attributes)),...(s.player?.attributes||{})}; base.quests=base.quests.map(q=>({...q,...(s.quests||[]).find(x=>x.id===q.id)})); base.time=s.time||base.time;base.day=s.day||1;base.settings={...base.settings,...s.settings};base.region=s.region||base.region;base.player.discovered=s.player?.discovered||base.player.discovered;base.player.mutations=s.player?.mutations||[];return base; }catch{return base;}
}
function saveGame(){ if(!game) return; const data={player:game.player,quests:game.quests,time:game.time,day:game.day,settings:game.settings,region:game.region}; localStorage.setItem(SAVE_KEY,JSON.stringify(data)); }
function hasSave(){return !!localStorage.getItem(SAVE_KEY);}

function createWorld(){
 const e=[];
 const add=(type,x,y,id)=>{const t=enemyTypes[type];e.push({id:id||`${type}-${x}-${y}`,type,x,y,homeX:x,homeY:y,hp:t.hp,maxHp:t.hp,dir:0,cooldown:rnd(x+y)*2,hit:0,dead:0,slow:0,mark:0,wander:rnd(x*y)*6,spawned:true});};
 [[900,620],[1100,390],[1350,980],[1700,420],[1950,1050],[480,1400],[1310,1670],[2180,1480]].forEach((p,i)=>add('wisp',...p,'wisp'+i));
 [[2050,640],[2380,1080],[2680,1530],[3050,410],[2530,1750],[1840,1850],[960,1860]].forEach((p,i)=>add('wolf',...p,'wolf'+i));
 [[490,2450],[970,2750],[1430,2250],[1940,2760],[2230,2440],[1640,3190],[550,3300]].forEach((p,i)=>add('fiend',...p,'fiend'+i));
 [[4150,700],[4530,1220],[4770,2080],[4360,2750],[5150,3100]].forEach((p,i)=>add('priest',...p,'priest'+i));
 add('alpha',4910,1910,'alpha');
 return e;
}

function resetWorld(newGame=false){
 game=hydrateState(newGame?null:localStorage.getItem(SAVE_KEY));
 game.enemies=createWorld();
 if(!newGame){ for(const en of game.enemies){ if((game.player.killedIds||[]).includes(en.id)) en.dead=999999; } }
 game.player.killedIds=game.player.killedIds||[];
 updateStats();
 renderHotbar(); updateHUD(); updateQuestTracker();
}
function startGame(newGame){
 resetWorld(newGame); $('#mainMenu').classList.add('hidden'); $('#gameUI').classList.remove('hidden'); game.started=true; game.camera.x=game.player.x-W/2; game.camera.y=game.player.y-H/2; toast(newGame?'PACT SEALED — THE HUNT BEGINS':'THE FOX REMEMBERS YOUR TRAIL'); if(!raf){lastTime=performance.now();raf=requestAnimationFrame(loop);} initAudio(); }

function resizeCanvas(){ const dpr=Math.min(devicePixelRatio||1,2); canvas.style.width='100%';canvas.style.height='100%'; /* Internal composition stays 1280×720 for dependable pixel art. */ }
function getRegion(x,y){const tx=x/TILE,ty=y/TILE;return regions.find(r=>tx>=r.x&&tx<r.x+r.w&&ty>=r.y&&ty<r.y+r.h)||regions[0];}
function tileType(tx,ty){ const r=getRegion(tx*TILE,ty*TILE); if((tx>72&&tx<76&&ty>17&&ty<103)||(tx>16&&tx<21&&ty>75&&ty<112))return 'water'; return r.type; }
function cameraPoint(x,y){return {x:Math.round(x-game.camera.x),y:Math.round(y-game.camera.y)};}

function updateStats(){ const p=game.player,a=p.attributes; p.maxHp=90+a.resolve.value*15+p.level*4; p.maxSp=55+a.spirit.value*11+p.level*3; p.hp=clamp(p.hp,0,p.maxHp);p.sp=clamp(p.sp,0,p.maxSp);p.damage=13+a.power.value*5+p.level*2; p.crit=.04+a.agility.value*.018; p.dashPower=170+a.agility.value*15; }
function xpNeed(){return 65+game.player.level*62;}
function gainXP(amount){const p=game.player;p.xp+=amount; let leveled=false;while(p.xp>=xpNeed()){p.xp-=xpNeed();p.level++;p.attrPoints+=2;p.mutationPoints++;updateStats();p.hp=p.maxHp;p.sp=p.maxSp;leveled=true;toast(`LEVEL ${p.level} — THE PACT DEEPENS`);sound('level');unlockByLevel();}if(leveled) saveGame();}
function unlockByLevel(){for(const q of game.quests){if(q.type==='level'&&game.player.level>=q.need) finishQuestProgress(q,q.need);} }
function regionDiscover(r){const p=game.player;if(!p.discovered.includes(r.name)){p.discovered.push(r.name);toast(`NEW REGION — ${r.name}`);sound('discover');for(const q of game.quests)if(q.type==='visit'&&q.region===r.name)finishQuestProgress(q,1);}}
function questById(id){return game.quests.find(q=>q.id===id);}
function activateNextQuest(){ const qs=game.quests; const order=['first-blood','briar','pack','cinder','echo','alpha','hunter','ascend']; for(let i=0;i<order.length-1;i++){let q=questById(order[i]),n=questById(order[i+1]);if(q.status==='complete'&&n.status==='locked'){n.status='active';toast(`NEW HUNT — ${n.name}`);}} const hunt=questById('hunter'),asc=questById('ascend');if(questById('pack').status==='complete'&&hunt.status==='locked')hunt.status='active';if(questById('cinder').status==='complete'&&asc.status==='locked')asc.status='active'; }
function finishQuestProgress(q,increment){if(q.status!=='active')return;q.progress=clamp(q.progress+increment,0,q.need);if(q.progress>=q.need){q.status='complete';game.player.shards+=q.reward;game.player.mutationPoints++;toast(`HUNT COMPLETE — ${q.name} +${q.reward} ✦`);sound('quest');activateNextQuest();saveGame();}updateQuestTracker();}
function onKill(en){const p=game.player,t=enemyTypes[en.type];p.kills++;p.shards+=Math.round(t.shards*(1+p.attributes.fortune.value*.08));gainXP(t.xp);for(const q of game.quests){if(q.status==='active'&&q.type==='kill'&&q.enemy===en.type)finishQuestProgress(q,1);if(q.status==='active'&&q.type==='totalKills')finishQuestProgress(q,1);}if(p.mutations.includes('devour')){heal(p.maxHp*.04);}
 if(en.type==='alpha'){toast('GLOOMFANG FALLS — THE SANCTUM OPENS');} p.killedIds.push(en.id);saveGame();}
function heal(amount){const p=game.player;p.hp=clamp(p.hp+amount,0,p.maxHp);spawnDamage(p.x,p.y,'+'+Math.ceil(amount),'heal');}

function input(dt){
 if(activeModal||dialogueState||game.paused)return;
 const p=game.player;let dx=0,dy=0;if(keys.KeyW||keys.ArrowUp)dy--;if(keys.KeyS||keys.ArrowDown)dy++;if(keys.KeyA||keys.ArrowLeft)dx--;if(keys.KeyD||keys.ArrowRight)dx++;
 if(dx||dy){let l=Math.hypot(dx,dy);dx/=l;dy/=l;p.dir=Math.atan2(dy,dx);let speed=155*(p.dash>0?2.45:1);p.x=clamp(p.x+dx*speed*dt,24,WORLD_W*TILE-24);p.y=clamp(p.y+dy*speed*dt,24,WORLD_H*TILE-24);}
 if((pressed.ShiftLeft||pressed.ShiftRight)&&p.dash<=0){p.dash=.23;p.invuln=.2;game.effects.push({type:'dash',x:p.x,y:p.y,life:.42,max:.42,dir:p.dir});sound('dash');}
 if(pressed.KeyJ) cast('strike'); if(pressed.KeyQ)cast('kon');if(pressed.KeyR)cast('fire');if(pressed.KeyF)cast('step');if(pressed.KeyC)cast('snare');if(pressed.KeyX)cast('howl');if(pressed.KeyV)cast('bloom');if(pressed.Space)parry();if(pressed.KeyE)interact();
}
function canCast(ab){const p=game.player;if(p.level<ab.level){toast(`REQUIRES PACT LEVEL ${ab.level}`);sound('deny');return false;}if((game.cooldowns[ab.type]||0)>0)return false;if(p.sp<ab.cost){toast('NOT ENOUGH SPIRIT');sound('deny');return false;}return true;}
function cast(type){const ab=abilities.find(a=>a.type===type);if(!ab||!canCast(ab))return;const p=game.player;p.sp-=ab.cost;game.cooldowns[type]=ab.cd; if(type==='strike'){p.attack=.22;let range=65,found=false;for(const en of game.enemies)if(!en.dead&&dist(p,en)<range+enemyTypes[en.type].size){const angle=Math.atan2(en.y-p.y,en.x-p.x);if(Math.cos(angle-p.dir)>.0){hurtEnemy(en,p.damage*(Math.random()<p.crit?1.7:1),false);found=true;}}game.effects.push({type:'slash',x:p.x,y:p.y,dir:p.dir,life:.22,max:.22});sound(found?'slash':'swing');return;}
 if(type==='kon'){game.effects.push({type:'kon',x:p.x+Math.cos(p.dir)*95,y:p.y+Math.sin(p.dir)*95,dir:p.dir,life:.7,max:.7,hit:false});sound('kon');}
 if(type==='fire'){let shots=p.mutations.includes('nine')?4:3;for(let i=0;i<shots;i++){let a=p.dir+(i-(shots-1)/2)*.22;game.projectiles.push({type:'fire',x:p.x,y:p.y,vx:Math.cos(a)*330,vy:Math.sin(a)*330,life:1.45,dmg:17+p.attributes.spirit.value*4});}sound('fire');}
 if(type==='step'){p.dash=.34;p.invuln=.35;game.effects.push({type:'mirage',x:p.x,y:p.y,life:1.1,max:1.1,cut:p.mutations.includes('glass')});sound('dash');}
 if(type==='snare'){game.effects.push({type:'snare',x:p.x,y:p.y,life:.6,max:.6,hit:false});sound('snare');}
 if(type==='howl'){game.effects.push({type:'howl',x:p.x,y:p.y,life:.65,max:.65,hit:false});sound('howl');}
 if(type==='bloom'){for(let i=0;i<9;i++){let a=i*Math.PI*2/9;game.projectiles.push({type:'fire',x:p.x,y:p.y,vx:Math.cos(a)*255,vy:Math.sin(a)*255,life:1.65,dmg:20+p.attributes.spirit.value*5,bloom:true});}sound('bloom');}
 renderHotbar();
}
function parry(){const p=game.player;if(p.parry>0)return;p.parry=.3;game.effects.push({type:'parry',x:p.x,y:p.y,life:.3,max:.3});sound('parry');}
function hurtEnemy(en,damage,fromSkill=true){if(en.dead||en.hit>.03)return;let crit=Math.random()<game.player.crit;if(crit)damage*=1.65;en.hp-=damage;en.hit=.13;en.dir=Math.atan2(en.y-game.player.y,en.x-game.player.x);spawnDamage(en.x,en.y,Math.ceil(damage),crit?'crit':'');game.stats.damage+=damage;for(let i=0;i<(game.settings.lowFx?2:5);i++)game.particles.push({x:en.x,y:en.y,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100,life:.35,color:crit?'#ffd584':'#e88272',size:2+Math.random()*3});if(en.hp<=0){en.dead=.7;game.effects.push({type:'death',x:en.x,y:en.y,life:.7,max:.7,color:enemyTypes[en.type].color});sound('kill');onKill(en);}}
function hurtPlayer(damage,en){const p=game.player;if(p.invuln>0)return;if(p.parry>0){en.slow=1.4;en.hit=.3;p.sp=clamp(p.sp+(p.mutations.includes('moon')?12:6),0,p.maxSp);game.stats.parries++;spawnDamage(p.x,p.y,'PARRY','heal');game.effects.push({type:'perfect',x:p.x,y:p.y,life:.45,max:.45});sound('perfect');return;}p.hp-=damage;p.invuln=.4;game.camera.shake=8;spawnDamage(p.x,p.y,Math.ceil(damage),'crit');sound('hurt');if(p.hp<=0)playerDeath();}
function playerDeath(){const p=game.player;p.hp=p.maxHp;p.sp=p.maxSp;p.x=560;p.y=640;p.shards=Math.max(0,p.shards-25);toast('THE FOX PULLS YOU BACK — 25 SHARDS LOST');sound('death');saveGame();}
function spawnDamage(x,y,text,klass=''){const d=document.createElement('span');d.className='damage '+klass;d.textContent=text;const q=cameraPoint(x,y);d.style.left=`${q.x}px`;d.style.top=`${q.y}px`;$('#combatText').appendChild(d);setTimeout(()=>d.remove(),700);}
function interact(){const p=game.player;const n=NPCS.filter(n=>dist(p,n)<76).sort((a,b)=>dist(p,a)-dist(p,b))[0];if(n)openDialogue(n);}
function openDialogue(n){dialogueState={npc:n,index:0};$('#dialogueSpeaker').textContent=n.name.toUpperCase();$('#dialogueText').textContent=n.dialogue[0];$('.dialogue-portrait').textContent=n.name[0];$('#dialogue').classList.remove('hidden');sound('talk');}
function dialogueNext(){if(!dialogueState)return;dialogueState.index++;if(dialogueState.index>=dialogueState.npc.dialogue.length)closeDialogue();else $('#dialogueText').textContent=dialogueState.npc.dialogue[dialogueState.index];sound('talk');}
function closeDialogue(){$('#dialogue').classList.add('hidden');dialogueState=null;}

function update(dt){
 if(!game.started)return;game.time+=dt*.12;if(game.time>=24){game.time-=24;game.day++;}input(dt);const p=game.player;p.invuln=Math.max(0,p.invuln-dt);p.attack=Math.max(0,p.attack-dt);p.parry=Math.max(0,p.parry-dt);p.dash=Math.max(0,p.dash-dt);p.sp=clamp(p.sp+dt*(4.3+p.attributes.spirit.value*.23),0,p.maxSp);for(const a of abilities)game.cooldowns[a.type]=Math.max(0,(game.cooldowns[a.type]||0)-dt);
 const r=getRegion(p.x,p.y);if(r.name!==game.region){game.region=r.name;regionDiscover(r);}game.camera.x+=(p.x-W/2-game.camera.x)*Math.min(1,dt*8);game.camera.y+=(p.y-H/2-game.camera.y)*Math.min(1,dt*8);game.camera.x=clamp(game.camera.x,0,WORLD_W*TILE-W);game.camera.y=clamp(game.camera.y,0,WORLD_H*TILE-H);game.camera.shake=Math.max(0,game.camera.shake-dt*25);
 updateEnemies(dt);updateEffects(dt);updateQuestTracker();updateHUD(); pressed={};
}
function updateEnemies(dt){const p=game.player;for(const en of game.enemies){if(en.dead){en.dead-=dt;continue;}const t=enemyTypes[en.type];en.cooldown-=dt;en.hit=Math.max(0,en.hit-dt);en.slow=Math.max(0,en.slow-dt);en.mark=Math.max(0,en.mark-dt);let d=dist(en,p),a=Math.atan2(p.y-en.y,p.x-en.x);if(d<t.aggro){en.dir=a;if(d>t.size+27){let speed=t.speed*(en.slow>0?.35:1);en.x+=Math.cos(a)*speed*dt;en.y+=Math.sin(a)*speed*dt;}else if(en.cooldown<=0){en.cooldown=1.15+(en.type==='alpha'?.2:.55);hurtPlayer(t.dmg+(en.type==='alpha'&&Math.random()>.6?12:0),en);game.effects.push({type:'enemyHit',x:p.x,y:p.y,life:.25,max:.25});}} else {en.wander-=dt;if(en.wander<=0){en.wander=2+rnd(en.x+en.y)*3;en.dir=rnd(en.y)*Math.PI*2;}en.x+=Math.cos(en.dir)*t.speed*.13*dt;en.y+=Math.sin(en.dir)*t.speed*.13*dt;}
 if(en.type==='alpha'&&d<600){$('#bossBar').classList.remove('hidden');$('#bossName').textContent=t.name;$('#bossHealth').style.width=`${Math.max(0,en.hp/en.maxHp)*100}%`;} }
 const alpha=game.enemies.find(e=>e.type==='alpha');if(!alpha||alpha.dead)$('#bossBar').classList.add('hidden');
}
function updateEffects(dt){
 for(const fx of game.effects){fx.life-=dt;if(fx.type==='kon'&&!fx.hit&&fx.life<.40){fx.hit=true;for(const en of game.enemies)if(!en.dead&&dist(en,fx)<130)hurtEnemy(en,42+game.player.attributes.spirit.value*7);}
 if(fx.type==='snare'&&!fx.hit&&fx.life<.35){fx.hit=true;for(const en of game.enemies)if(!en.dead&&dist(en,fx)<160){en.slow=3;en.mark=3;hurtEnemy(en,12+game.player.attributes.spirit.value*3);}}
 if(fx.type==='howl'&&!fx.hit&&fx.life<.35){fx.hit=true;for(const en of game.enemies)if(!en.dead&&dist(en,fx)<220)hurtEnemy(en,30+game.player.attributes.spirit.value*5);}
 if(fx.type==='mirage'&&fx.cut&&fx.life<.78&&!fx.hit){fx.hit=true;for(const en of game.enemies)if(!en.dead&&dist(en,fx)<80)hurtEnemy(en,18+game.player.attributes.agility.value*3);}}
 game.effects=game.effects.filter(x=>x.life>0);
 for(const pr of game.projectiles){pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;pr.life-=dt;for(const en of game.enemies)if(!en.dead&&dist(pr,en)<enemyTypes[en.type].size+12){hurtEnemy(en,pr.dmg);pr.life=0;break;}}game.projectiles=game.projectiles.filter(x=>x.life>0);
 for(const f of game.particles){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=20*dt;f.life-=dt;}game.particles=game.particles.filter(x=>x.life>0);
}

function draw(){
 if(!game||!game.started){drawMenuBackdrop();return;}ctx.clearRect(0,0,W,H);let shake=game.settings.shake?game.camera.shake:0, sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;ctx.save();ctx.translate(sx,sy);drawWorld();drawDecor();drawNPCs();drawEnemies();drawProjectiles();drawEffects();drawPlayer();drawParticles();ctx.restore();drawVignette();drawMinimap();
}
function drawMenuBackdrop(){ctx.fillStyle='#131326';ctx.fillRect(0,0,W,H);}
function drawWorld(){
 const startX=Math.floor(game.camera.x/TILE)-1,endX=startX+Math.ceil(W/TILE)+3,startY=Math.floor(game.camera.y/TILE)-1,endY=startY+Math.ceil(H/TILE)+3;for(let ty=startY;ty<endY;ty++)for(let tx=startX;tx<endX;tx++){if(tx<0||ty<0||tx>=WORLD_W||ty>=WORLD_H)continue;let type=tileType(tx,ty),pal=palettes[type],n=noise(tx*.27,ty*.27);let c=pal[Math.min(pal.length-1,Math.floor(n*pal.length))];let x=tx*TILE-game.camera.x,y=ty*TILE-game.camera.y;ctx.fillStyle=c;ctx.fillRect(x,y,TILE+1,TILE+1);if(type!=='water'){ctx.fillStyle=n>.63?'#ffffff0c':'#00000008';ctx.fillRect(x+Math.floor(n*20),y+Math.floor(rnd(tx*3+ty)*21),2,2);}else{ctx.fillStyle='#89c3b322';ctx.fillRect(x+4,y+8+(tx%3)*5,12,1);}}
 // roads
 ctx.strokeStyle='#bf9b7040';ctx.lineWidth=12;ctx.beginPath();const rp=cameraPoint(470,620),re=cameraPoint(3440,570);ctx.moveTo(rp.x,rp.y);ctx.bezierCurveTo(1200-game.camera.x,510-game.camera.y,2200-game.camera.x,900-game.camera.y,re.x,re.y);ctx.stroke();
}
function drawDecor(){
 const sx=Math.floor(game.camera.x/TILE)-2, ex=sx+45,sy=Math.floor(game.camera.y/TILE)-2,ey=sy+28;for(let ty=sy;ty<ey;ty++)for(let tx=sx;tx<ex;tx++){if(tx<0||ty<0||tx>=WORLD_W||ty>=WORLD_H)continue;let typ=tileType(tx,ty),v=rnd(tx*91+ty*351);let x=tx*TILE-game.camera.x,y=ty*TILE-game.camera.y;if(typ==='woods'&&v>.68)drawTree(x+16,y+18,1+(v>.9?1:0),'#173432','#285044');else if(typ==='meadow'&&v>.90)drawBush(x+16,y+20,'#47754c');else if(typ==='ember'&&v>.84)drawCrystal(x+16,y+18,'#cf745b');else if(typ==='shrine'&&v>.86)drawCrystal(x+16,y+19,'#a67cd5');}
 // landmark stones
 [[560,510],[2420,690],[4910,1590]].forEach((p,i)=>{let q=cameraPoint(...p);ctx.fillStyle='#5a5164';ctx.fillRect(q.x-12,q.y-19,24,25);ctx.fillStyle='#8d7c72';ctx.fillRect(q.x-9,q.y-23,17,6);ctx.fillStyle='#e5bd69';ctx.fillRect(q.x-2,q.y-13,4,9);});
}
function drawTree(x,y,s=1,trunk='#1b2b29',leaf='#27483d'){ctx.fillStyle=trunk;ctx.fillRect(x-3*s,y-2*s,6*s,14*s);ctx.fillStyle='#102623';ctx.fillRect(x-13*s,y-16*s,26*s,21*s);ctx.fillStyle=leaf;ctx.fillRect(x-11*s,y-19*s,22*s,19*s);ctx.fillRect(x-16*s,y-10*s,31*s,10*s);ctx.fillStyle='#3d6650';ctx.fillRect(x-7*s,y-16*s,9*s,5*s)}
function drawBush(x,y,c){ctx.fillStyle='#203c35';ctx.fillRect(x-11,y-7,23,9);ctx.fillStyle=c;ctx.fillRect(x-8,y-10,18,9);ctx.fillStyle='#6c9058';ctx.fillRect(x-5,y-12,5,3)}
function drawCrystal(x,y,c){ctx.fillStyle='#1d2332';ctx.fillRect(x-7,y-2,14,7);ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x-5,y-2);ctx.lineTo(x-2,y-16);ctx.lineTo(x+2,y-6);ctx.lineTo(x+6,y-12);ctx.lineTo(x+5,y-2);ctx.fill();ctx.fillStyle='#f0c7d0';ctx.fillRect(x-2,y-11,2,5)}
function drawNPCs(){for(const n of NPCS){let q=cameraPoint(n.x,n.y);if(q.x<-40||q.x>W+40||q.y<-50||q.y>H+50)continue;ctx.fillStyle='#0008';ctx.fillRect(q.x-10,q.y+13,20,5);ctx.fillStyle='#343044';ctx.fillRect(q.x-8,q.y-3,16,17);ctx.fillStyle=n.color;ctx.fillRect(q.x-7,q.y-13,14,13);ctx.fillStyle='#f1dbc5';ctx.fillRect(q.x-5,q.y-11,10,7);ctx.fillStyle='#1e1a2a';ctx.fillRect(q.x-4,q.y-10,2,2);ctx.fillRect(q.x+3,q.y-10,2,2);ctx.fillStyle='#f1dc83';ctx.fillRect(q.x-2,q.y-26,4,5);ctx.fillStyle='#e6c56e';ctx.font='7px IBM Plex Mono';ctx.textAlign='center';ctx.fillText('!',q.x,q.y-31);}}
function drawEnemies(){for(const e of game.enemies){if(e.dead)continue;let q=cameraPoint(e.x,e.y),t=enemyTypes[e.type];if(q.x<-50||q.x>W+50||q.y<-50||q.y>H+50)continue;let s=t.size;ctx.fillStyle='#08081466';ctx.fillRect(q.x-s,q.y+s*.64,s*2,s*.27);if(e.mark>0){ctx.strokeStyle='#d6a0f6';ctx.strokeRect(q.x-s-4,q.y-s-5,s*2+8,s*2+7);}if(e.type==='wisp'){ctx.fillStyle='#5dc6c7';ctx.fillRect(q.x-s*.55,q.y-s*.6,s*1.1,s*1.2);ctx.fillStyle='#b8ffff';ctx.fillRect(q.x-3,q.y-s*.85,6,5);ctx.fillStyle='#254f61';ctx.fillRect(q.x-4,q.y,3,3);ctx.fillRect(q.x+2,q.y,3,3);}else if(e.type==='wolf'||e.type==='alpha'){ctx.fillStyle=t.color;ctx.fillRect(q.x-s,q.y-s*.3,s*2,s);ctx.fillRect(q.x-s*.72,q.y-s*.85,s*.9,s*.7);ctx.fillStyle='#562e36';ctx.fillRect(q.x-s*.45,q.y-s*1.25,s*.28,s*.55);ctx.fillRect(q.x+s*.12,q.y-s*1.25,s*.28,s*.55);ctx.fillStyle='#f5d270';ctx.fillRect(q.x-s*.44,q.y-s*.62,3,3);ctx.fillRect(q.x-s*.08,q.y-s*.62,3,3);ctx.fillStyle='#35212b';ctx.fillRect(q.x-s*.75,q.y+s*.55,s*.4,s*.43);ctx.fillRect(q.x+s*.35,q.y+s*.55,s*.4,s*.43);}else{ctx.fillStyle='#30243e';ctx.fillRect(q.x-s*.56,q.y-s*.1,s*1.12,s*1.1);ctx.fillStyle=t.color;ctx.fillRect(q.x-s*.48,q.y-s*.96,s*.96,s*.83);ctx.fillStyle='#efe1d2';ctx.fillRect(q.x-s*.25,q.y-s*.72,s*.5,s*.3);ctx.fillStyle='#1e1c35';ctx.fillRect(q.x-s*.26,q.y-s*.57,3,3);ctx.fillRect(q.x+s*.16,q.y-s*.57,3,3);ctx.fillStyle=t.color;ctx.fillRect(q.x-s*.86,q.y,s*.25,s*.8);ctx.fillRect(q.x+s*.61,q.y,s*.25,s*.8);}
 if(e.hit>0){ctx.fillStyle='#ffffff66';ctx.fillRect(q.x-s,q.y-s,s*2,s*2);}if(e.hp<e.maxHp){ctx.fillStyle='#1b1725';ctx.fillRect(q.x-s,q.y-s-11,s*2,3);ctx.fillStyle='#df6865';ctx.fillRect(q.x-s,q.y-s-11,s*2*(e.hp/e.maxHp),3);}}
}
function drawPlayer(){const p=game.player,q=cameraPoint(p.x,p.y);ctx.fillStyle='#05051177';ctx.fillRect(q.x-12,q.y+15,25,5);if(p.invuln>0&&Math.floor(p.invuln*20)%2===0)return;ctx.save();ctx.translate(q.x,q.y);ctx.rotate(p.dir);ctx.fillStyle='#2a2039';ctx.fillRect(-9,-2,18,19);ctx.fillStyle='#d9595b';ctx.fillRect(-8,-14,16,14);ctx.fillStyle='#f4d3bd';ctx.fillRect(-6,-11,12,8);ctx.fillStyle='#261b2b';ctx.fillRect(2,-9,2,2);ctx.fillStyle='#f0c76e';ctx.fillRect(-9,-20,5,9);ctx.fillRect(4,-20,5,9);ctx.fillStyle='#8459c4';ctx.fillRect(-12,2,4,11);ctx.fillStyle='#e4bd66';ctx.fillRect(7,0,18,3);ctx.fillStyle='#f3e3ca';ctx.fillRect(20,-1,5,5);ctx.restore();if(p.parry>0){ctx.strokeStyle='#97e5df';ctx.lineWidth=3;ctx.beginPath();ctx.arc(q.x,q.y,24+(1-p.parry/.3)*17,0,Math.PI*2);ctx.stroke();}}
function drawProjectiles(){for(const p of game.projectiles){let q=cameraPoint(p.x,p.y);ctx.fillStyle=p.bloom?'#f6c66f':'#8ee3d7';ctx.fillRect(q.x-5,q.y-5,10,10);ctx.fillStyle='#ffffff';ctx.fillRect(q.x-2,q.y-2,4,4);}}
function drawEffects(){for(const f of game.effects){let q=cameraPoint(f.x,f.y),t=1-f.life/f.max;ctx.save();if(f.type==='slash'){ctx.strokeStyle='#f6d98d';ctx.lineWidth=5;ctx.beginPath();ctx.arc(q.x,q.y,37, f.dir-.72,f.dir+.72);ctx.stroke();}else if(f.type==='kon'){let sc=.65+t*.8;ctx.translate(q.x,q.y);ctx.rotate(f.dir);ctx.scale(sc,sc);ctx.fillStyle='#e6a15e';ctx.fillRect(-58,-47,95,84);ctx.fillStyle='#f2c47e';ctx.fillRect(-70,-68,29,38);ctx.fillRect(12,-68,29,38);ctx.fillStyle='#f7dfc1';ctx.fillRect(-40,-20,55,25);ctx.fillStyle='#261827';ctx.fillRect(-32,-24,7,7);ctx.fillRect(-2,-24,7,7);ctx.fillStyle='#47222e';ctx.fillRect(-42,6,60,18);ctx.fillStyle='#fbf1d7';for(let i=0;i<4;i++)ctx.fillRect(-34+i*13,6,4,10);}else if(f.type==='snare'){ctx.strokeStyle='#ac8ae5';ctx.lineWidth=3;ctx.beginPath();ctx.arc(q.x,q.y,70+t*90,0,Math.PI*2);ctx.stroke();for(let i=0;i<8;i++){let a=i*Math.PI/4+t;ctx.fillStyle='#d7c2ff';ctx.fillRect(q.x+Math.cos(a)*(70+t*90)-3,q.y+Math.sin(a)*(70+t*90)-3,6,6);}}else if(f.type==='howl'){ctx.strokeStyle='#e9bc73';ctx.lineWidth=6;ctx.globalAlpha=1-t;ctx.beginPath();ctx.arc(q.x,q.y,45+t*195,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#a486e3';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y,25+t*230,0,Math.PI*2);ctx.stroke();}else if(f.type==='mirage'){ctx.globalAlpha=f.life/f.max*.55;ctx.fillStyle='#b489e9';ctx.fillRect(q.x-9,q.y-14,18,31);ctx.fillStyle='#e2d1f6';ctx.fillRect(q.x-6,q.y-11,12,8);}else if(f.type==='dash'){ctx.strokeStyle='#a38ee5';ctx.lineWidth=3;ctx.globalAlpha=f.life/f.max;ctx.beginPath();ctx.moveTo(q.x-Math.cos(f.dir)*50,q.y-Math.sin(f.dir)*50);ctx.lineTo(q.x+Math.cos(f.dir)*22,q.y+Math.sin(f.dir)*22);ctx.stroke();}else if(f.type==='death'){ctx.fillStyle=f.color+'aa';ctx.globalAlpha=f.life/f.max;ctx.fillRect(q.x-12-t*22,q.y-12-t*22,24+t*44,24+t*44);}else if(f.type==='perfect'){ctx.strokeStyle='#9ff4df';ctx.lineWidth=4;ctx.beginPath();ctx.arc(q.x,q.y,25+t*40,0,Math.PI*2);ctx.stroke();}ctx.restore();}}
function drawParticles(){for(const p of game.particles){let q=cameraPoint(p.x,p.y);ctx.globalAlpha=clamp(p.life/.35,0,1);ctx.fillStyle=p.color;ctx.fillRect(q.x,q.y,p.size,p.size);}ctx.globalAlpha=1;}
function drawVignette(){let hour=game.time;let daylight=clamp(1-Math.abs(hour-12)/8,.18,1);ctx.fillStyle=`rgba(15,16,38,${(1-daylight)*.42})`;ctx.fillRect(0,0,W,H);const g=ctx.createRadialGradient(W/2,H/2,190,W/2,H/2,780);g.addColorStop(.6,'transparent');g.addColorStop(1,'rgba(4,3,11,.52)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
function drawMinimap(){const x=W-177,y=H-143,w=152,h=106;ctx.fillStyle='#110d1db8';ctx.fillRect(x-5,y-5,w+10,h+10);ctx.strokeStyle='#88739b';ctx.strokeRect(x-5,y-5,w+10,h+10);for(const r of regions){let c=palettes[r.type][3];ctx.fillStyle=c;ctx.fillRect(x+r.x/WORLD_W*w,y+r.y/WORLD_H*h,r.w/WORLD_W*w,r.h/WORLD_H*h);}let p=game.player;ctx.fillStyle='#f5d27a';ctx.fillRect(x+p.x/(WORLD_W*TILE)*w-2,y+p.y/(WORLD_H*TILE)*h-2,5,5);ctx.fillStyle='#eee';ctx.font='7px IBM Plex Mono';ctx.textAlign='left';ctx.fillText('WILDS MAP',x,y-9);}

function updateHUD(){if(!game)return;const p=game.player;$('#levelValue').textContent=p.level;$('#healthFill').style.width=`${p.hp/p.maxHp*100}%`;$('#spiritFill').style.width=`${p.sp/p.maxSp*100}%`;$('#xpFill').style.width=`${p.xp/xpNeed()*100}%`;$('#healthText').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;$('#spiritText').textContent=`${Math.ceil(p.sp)} / ${p.maxSp}`;$('#shardCount').textContent=p.shards;$('#regionName').textContent=game.region;let h=Math.floor(game.time),m=Math.floor((game.time-h)*60).toString().padStart(2,'0');$('#clock').textContent=`${String(h).padStart(2,'0')}:${m}`;$('#dayCount').textContent=game.day;let near=NPCS.filter(n=>dist(p,n)<76)[0];if(near&&!dialogueState){$('#interactPrompt').classList.remove('hidden');let q=cameraPoint(near.x,near.y-45);$('#interactPrompt').style.left=`${q.x-36}px`;$('#interactPrompt').style.top=`${q.y}px`;$('#interactText').textContent=`Speak: ${near.name.split(',')[0]}`;}else $('#interactPrompt').classList.add('hidden');}
function updateQuestTracker(){if(!game)return;let active=game.quests.filter(q=>q.status==='active').slice(0,2);$('#questTracker').innerHTML='<p class="panel-label">ACTIVE HUNT</p>'+active.map(q=>`<div class="tracked-quest"><b>${q.name}</b><span>${q.goal}</span><span class="quest-progress">${q.progress} / ${q.need}</span></div>`).join('');}
function renderHotbar(){if(!game)return;const p=game.player;$('#hotbar').innerHTML=abilities.map(a=>{let lock=p.level<a.level;let cd=game.cooldowns[a.type]||0;return `<button class="skill-slot" data-skill="${a.type}" ${lock?'disabled':''} title="${a.name}: ${a.hint}"><span class="key">${a.key}</span><span class="icon">${lock?'🔒':a.icon}</span><span class="label">${lock?'LVL '+a.level:a.name}</span><i class="cooldown" style="height:${cd/a.cd*100}%"></i></button>`;}).join('');}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2500);}

function sound(kind){if(!audio.enabled||!audio.ctx)return;const ac=audio.ctx, t=ac.currentTime,vol=audio.volume;function osc(freq,dur,type='sine',gain=.1,slide=0){let o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+dur);g.gain.setValueAtTime(gain*vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+dur);}if(kind==='slash'||kind==='swing')osc(kind==='slash'?220:150,.10,'square',.14,kind==='slash'?330:90);else if(kind==='kon'){osc(92,.37,'sawtooth',.22,170);setTimeout(()=>osc(470,.14,'triangle',.11,-210),100);}else if(kind==='fire'){osc(620,.12,'triangle',.11,-190);setTimeout(()=>osc(810,.08,'sine',.07,-500),70);}else if(kind==='dash')osc(310,.12,'sawtooth',.08,560);else if(kind==='snare')osc(390,.36,'sine',.13,-160);else if(kind==='howl'){osc(180,.55,'sawtooth',.12,240);osc(490,.46,'sine',.08,-210);}else if(kind==='bloom'){osc(510,.35,'triangle',.16,280);osc(170,.44,'sine',.08,180);}else if(kind==='hurt')osc(92,.22,'square',.16,-35);else if(kind==='kill')osc(280,.17,'triangle',.11,300);else if(kind==='perfect'){osc(710,.14,'sine',.12,210);setTimeout(()=>osc(1040,.2,'triangle',.1,-330),50);}else if(kind==='level'||kind==='quest'){[0,1,2].forEach(i=>setTimeout(()=>osc(440*(1+i*.25),.18,'triangle',.1,70),i*80));}else if(kind==='discover')osc(300,.34,'sine',.1,250);else if(kind==='deny')osc(100,.12,'square',.08,-20);else if(kind==='talk')osc(500,.05,'triangle',.04,20);else if(kind==='death')osc(160,.55,'sawtooth',.15,-110);}
function initAudio(){if(!audio.ctx){audio.ctx=new (window.AudioContext||window.webkitAudioContext)();}if(audio.ctx.state==='suspended')audio.ctx.resume();}

function renderPanel(panel){activeModal=panel;$('#modalShade').classList.remove('hidden');const modal=$('#modal');modal.classList.remove('hidden');const tabs=[['character','✦ CHARACTER'],['fox','狐 FOX DEVIL'],['journal','▤ HUNT LOG'],['map','◇ ATLAS'],['settings','⚙ SETTINGS']];modal.innerHTML=`<div class="modal-head"><div><h2>${tabs.find(t=>t[0]===panel)[1]}</h2><p>${panel==='character'?'Shape the vessel that carries the pact.':panel==='fox'?'Feed the pact. Choose its nature.':panel==='journal'?'Every promise has a trail.':panel==='map'?'The wilds revealed by your footsteps.':'Tune the hunt to your senses.'}</p></div><button class="close-modal" aria-label="Close">×</button></div><div class="modal-body"><aside class="modal-tabs">${tabs.map(t=>`<button data-panel-tab="${t[0]}" class="${t[0]===panel?'active':''}">${t[1]}</button>`).join('')}</aside><main class="modal-content" id="panelContent"></main></div>`;renderPanelContent(panel);modal.querySelector('.close-modal').onclick=closeModal;modal.querySelectorAll('[data-panel-tab]').forEach(b=>b.onclick=()=>renderPanel(b.dataset.panelTab));}
function renderPanelContent(panel){const c=$('#panelContent'),p=game.player;if(panel==='character'){c.innerHTML=`<div class="stat-intro"><div><b>LEVEL ${p.level} PACTBEARER</b><p>Each choice writes itself into your combat style.</p></div><div class="points">ATTRIBUTE POINTS<br><strong>${p.attrPoints}</strong></div></div><div class="attr-list">${Object.entries(p.attributes).map(([id,a])=>`<article class="attribute"><div><b>${a.label.toUpperCase()}</b><p>${a.desc}</p></div><div class="stat-value">${a.value}<button class="plus" data-attr="${id}" ${p.attrPoints?'':'disabled'}>+</button></div></article>`).join('')}</div><div class="detail-grid"><div class="detail"><small>PACT BLADE</small><b>${p.damage} DMG</b></div><div class="detail"><small>CRITICAL CHANCE</small><b>${Math.round(p.crit*100)}%</b></div><div class="detail"><small>DASH DISTANCE</small><b>${p.dashPower}</b></div><div class="detail"><small>MAX HEALTH</small><b>${p.maxHp}</b></div><div class="detail"><small>MAX SPIRIT</small><b>${p.maxSp}</b></div><div class="detail"><small>PARRIES LANDED</small><b>${game.stats.parries}</b></div></div>`;c.querySelectorAll('[data-attr]').forEach(b=>b.onclick=()=>{if(p.attrPoints){p.attributes[b.dataset.attr].value++;p.attrPoints--;updateStats();saveGame();renderPanelContent('character');updateHUD();sound('level');}})}
 if(panel==='fox'){c.innerHTML=`<div class="stat-intro"><div><b>THE FOX DEVIL — STAGE ${1+p.mutations.length}</b><p>Mutations permanently change how your contract hunts.</p></div><div class="points">MUTATION POINTS<br><strong>${p.mutationPoints}</strong></div></div><div class="mutation-grid">${mutations.map(m=>{let unlocked=p.mutations.includes(m.id),available=p.level>=m.req&&p.mutationPoints>0;return `<article class="mutation ${unlocked?'unlocked active':''}"><div class="mut-icon">${m.icon}</div><b>${m.name}</b><p>${m.text}</p>${unlocked?'<button disabled>BOUND</button>':`<button data-mutation="${m.id}" ${available?'':'disabled'}>${p.level<m.req?'LVL '+m.req:'AWAKEN'}</button>`}</article>`}).join('')}</div><p class="tiny" style="margin-top:16px">MUTATION LAW: Releasing a mutation is impossible. The fox does not return what it has eaten.</p>`;c.querySelectorAll('[data-mutation]').forEach(b=>b.onclick=()=>{let m=mutations.find(x=>x.id===b.dataset.mutation);if(p.mutationPoints&&p.level>=m.req){p.mutations.push(m.id);p.mutationPoints--;toast(`MUTATION AWAKENED — ${m.name}`);sound('level');saveGame();renderPanelContent('fox');renderHotbar();}})}
 if(panel==='journal'){c.innerHTML=`<div class="quest-list">${game.quests.map(q=>`<article class="quest-row ${q.status==='complete'?'done':''}"><b>${q.status==='locked'?'◌ ':q.status==='complete'?'✓ ':'◆ '}${q.name}</b><p>${q.desc}</p><span>${q.status==='locked'?'UNSEALED HUNT':q.status==='complete'?`COMPLETE • ${q.reward} SHARDS CLAIMED`:`${q.goal.toUpperCase()} — ${q.progress} / ${q.need}`}</span></article>`).join('')}</div>`;}
 if(panel==='map'){c.innerHTML=`<div class="map-wrap"><canvas id="atlas" class="map-canvas" width="560" height="375"></canvas><span class="map-label" style="top:10%;left:20%">ASHENVALE</span><span class="map-label" style="top:18%;left:50%">WHISPERWOOD</span><span class="map-label" style="bottom:14%;left:18%">CINDERFALL</span><span class="map-label" style="top:48%;right:8%">MOONGLASS</span></div>`;drawAtlas();}
 if(panel==='settings'){c.innerHTML=`<div class="setting-row"><div><b>COMBAT SCREEN SHAKE</b><br><span>Impact feedback for attacks and heavy damage.</span></div><input type="checkbox" id="setShake" ${game.settings.shake?'checked':''}></div><div class="setting-row"><div><b>REDUCED PARTICLES</b><br><span>Favor a clean battlefield on modest hardware.</span></div><input type="checkbox" id="setFx" ${game.settings.lowFx?'checked':''}></div><div class="setting-row"><div><b>SPIRIT AUDIO</b><br><span>Web Audio combat effects.</span></div><input type="checkbox" id="setAudio" ${audio.enabled?'checked':''}></div><div class="setting-row"><div><b>AUDIO VOLUME</b><br><span>Controls pact, blade, and UI sound effects.</span></div><input type="range" id="setVol" min="0" max="1" step=".05" value="${audio.volume}"></div><div class="setting-row"><div><b>LOCAL SAVE</b><br><span>Erase this browser’s pact record. This cannot be undone.</span></div><button class="danger" id="eraseSave">ERASE RECORD</button></div>`;$('#setShake').onchange=e=>{game.settings.shake=e.target.checked;saveGame()};$('#setFx').onchange=e=>{game.settings.lowFx=e.target.checked;saveGame()};$('#setAudio').onchange=e=>audio.enabled=e.target.checked;$('#setVol').oninput=e=>audio.volume=+e.target.value;$('#eraseSave').onclick=()=>{if(confirm('Erase the pact record?')){localStorage.removeItem(SAVE_KEY);toast('RECORD ERASED — RETURN TO TITLE');closeModal();}};}
}
function drawAtlas(){const c=$('#atlas');if(!c)return;const x=c.getContext('2d');x.imageSmoothingEnabled=false;for(const r of regions){x.fillStyle=palettes[r.type][3];x.fillRect(r.x/WORLD_W*c.width,r.y/WORLD_H*c.height,r.w/WORLD_W*c.width,r.h/WORLD_H*c.height);x.fillStyle='#ffffff10';for(let i=0;i<50;i++)x.fillRect((r.x+rnd(i+r.y)*r.w)/WORLD_W*c.width,(r.y+rnd(i+r.x*7)*r.h)/WORLD_H*c.height,2,2);}x.strokeStyle='#e6bf6d';x.lineWidth=2;let p=game.player;x.beginPath();x.arc(p.x/(WORLD_W*TILE)*c.width,p.y/(WORLD_H*TILE)*c.height,5,0,Math.PI*2);x.stroke();x.fillStyle='#f4df9e';x.fillRect(p.x/(WORLD_W*TILE)*c.width-2,p.y/(WORLD_H*TILE)*c.height-2,4,4);}
function closeModal(){activeModal=null;$('#modal').classList.add('hidden');$('#modalShade').classList.add('hidden');}

function loop(t){let dt=Math.min(.033,(t-lastTime)/1000||.016);lastTime=t;update(dt);draw();if(game&&game.started){if(Math.floor(t/1000)%10===0)saveGame();renderCooldowns();}raf=requestAnimationFrame(loop);}
function renderCooldowns(){document.querySelectorAll('.skill-slot[data-skill]').forEach(el=>{let a=abilities.find(x=>x.type===el.dataset.skill),fill=el.querySelector('.cooldown');if(a&&fill)fill.style.height=`${Math.min(1,(game.cooldowns[a.type]||0)/a.cd)*100}%`;});}

function loadSequence(){const shell=['./assets/icon.svg','./manifest.webmanifest','./sw.js'];let shellReady=false,p=0,txt=['GATHERING PIXEL ATLAS','ETCHING PACT SIGILS','CACHING SPIRIT SOUNDS','OPENING ASHENVALE'];/* Fetch the non-render-blocking shell now; the service worker preserves it for future starts. */Promise.all(shell.map(asset=>fetch(asset,{cache:'force-cache'}).catch(()=>null))).finally(()=>{shellReady=true;});let id=setInterval(()=>{let cap=shellReady?100:82;p=Math.min(cap,p+Math.random()*11+5);$('#loadFill').style.width=p+'%';$('#loadPercent').textContent=Math.floor(p)+'%';$('#loadText').textContent=txt[Math.min(3,Math.floor(p/25))];if(p>=100){clearInterval(id);setTimeout(()=>{$('#loading').classList.add('hidden');$('#mainMenu').classList.remove('hidden');$('#continueGame').disabled=!hasSave();},350)}},170);}

// events
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!keys[e.code])pressed[e.code]=true;keys[e.code]=true;if(e.code==='Escape'){if(dialogueState)closeDialogue();else if(activeModal)closeModal();}if(e.code==='KeyE'&&dialogueState)dialogueNext();if(e.code==='Enter'&&!game?.started&&!$('#mainMenu').classList.contains('hidden'))startGame(!hasSave());if(e.code==='KeyC'&&!game?.started&&!$('#mainMenu').classList.contains('hidden')&&hasSave())startGame(false);});
window.addEventListener('keyup',e=>{keys[e.code]=false;});window.addEventListener('blur',()=>{keys={};pressed={};});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)*W/r.width;mouse.y=(e.clientY-r.top)*H/r.height;});
$('#newGame').onclick=()=>startGame(true);$('#continueGame').onclick=()=>startGame(false);$('#openSettings').onclick=()=>{if(!game)resetWorld(false);renderPanel('settings');};$('#openHowTo').onclick=()=>{if(!game)resetWorld(false);renderManual();};document.addEventListener('click',e=>{let s=e.target.closest('[data-skill]');if(s&&game)cast(s.dataset.skill);let b=e.target.closest('[data-panel]');if(b&&game)renderPanel(b.dataset.panel);});
function renderManual(){activeModal='manual';$('#modalShade').classList.remove('hidden');const m=$('#modal');m.classList.remove('hidden');m.innerHTML=`<div class="modal-head"><div><h2>FIELD MANUAL</h2><p>The essentials of surviving a fox devil contract.</p></div><button class="close-modal">×</button></div><main class="modal-content"><div class="stat-intro"><div><b>MOVE LIKE A FOX. STRIKE LIKE A STORM.</b><p>All controls work with a keyboard. Click a hotbar skill if you prefer the mouse.</p></div></div><div class="attr-list"><article class="attribute"><div><b>WASD / ARROWS</b><p>Move across the open wilds. The minimap charts your position.</p></div><div class="stat-value">↕</div></article><article class="attribute"><div><b>J — SUNDER</b><p>Your basic pact blade attack. Face foes before striking.</p></div><div class="stat-value">✕</div></article><article class="attribute"><div><b>SPACE — PARRY</b><p>Deflect an incoming hit to slow your attacker and restore spirit.</p></div><div class="stat-value">◌</div></article><article class="attribute"><div><b>SHIFT — DASH</b><p>Evade attacks. Mirage Step improves this at level 3.</p></div><div class="stat-value">➜</div></article><article class="attribute"><div><b>Q R F C X V — PACT ARTS</b><p>Unlock new fox abilities as your level rises. Skills spend spirit.</p></div><div class="stat-value">狐</div></article><article class="attribute"><div><b>E — SPEAK</b><p>Talk to wardens. Their words point toward the next hunt.</p></div><div class="stat-value">◆</div></article></div></main>`;m.querySelector('.close-modal').onclick=closeModal;}

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
resizeCanvas();loadSequence();
})();
