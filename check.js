
"use strict";
/* ============== 宸ュ叿鍑芥暟 ============== */
const TAU = Math.PI * 2;
const rand = (a,b)=> a + Math.random()*(b-a);
const randi = (a,b)=> Math.floor(rand(a,b));
const clamp = (v,a,b)=> v<a?a:(v>b?b:v);
const dist2 = (ax,ay,bx,by)=> (ax-bx)*(ax-bx)+(ay-by)*(ay-by);
const dist = (ax,ay,bx,by)=> Math.sqrt(dist2(ax,ay,bx,by));
const lerp = (a,b,t)=> a + (b-a)*t;
const angleTo = (ax,ay,bx,by)=> Math.atan2(by-ay, bx-ax);

/* ============== 鐢诲竷 ============== */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mini = document.getElementById('minimap');
const mctx = mini.getContext('2d');
let W = 0, H = 0, VIEW_W = 0, VIEW_H = 0;
function resize() {
  W = window.innerWidth; H = window.innerHeight;
  VIEW_W = Math.min(W, 1280);
  VIEW_H = Math.min(H, 720);
  canvas.width = W; canvas.height = H;
  // 瑙嗗彛锛氬浐瀹氶€昏緫鍒嗚鲸鐜囷紝鎸夋瘮渚嬬缉鏀?  const scale = Math.min(W / VIEW_W, H / VIEW_H);
  // 璁╂父鎴忓尯灞呬腑
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

/* ============== 杈撳叆 ============== */
const keys = {};
const mouse = { x:0, y:0, down:false, worldX:0, worldY:0 };
window.addEventListener('keydown', e=>{
  keys[e.key.toLowerCase()] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
  if (e.key === ' ') tryReload();
  if (e.key.toLowerCase() === 'r') tryReload();
  if (e.key === '1') switchWeapon(0);
  if (e.key === '2') switchWeapon(1);
  if (e.key === '3') switchWeapon(2);
  if (e.key.toLowerCase() === 'q') switchWeapon((player.weaponIdx+player.weapons.length-1)%player.weapons.length);
  if (e.key.toLowerCase() === 'e') switchWeapon((player.weaponIdx+1)%player.weapons.length);
});
window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', e=>{
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
  // 杞崲鍒颁笘鐣屽潗鏍囷紙鑰冭檻鎽勫儚鏈哄亸绉伙級
  mouse.worldX = mouse.x - W/2 + camera.x;
  mouse.worldY = mouse.y - H/2 + camera.y;
});
canvas.addEventListener('mousedown', e=>{ if (e.button === 0) mouse.down = true; });
canvas.addEventListener('mouseup', e=>{ if (e.button === 0) mouse.down = false; });
canvas.addEventListener('contextmenu', e=> e.preventDefault());

/* ============== 鎽勫儚鏈?============== */
const camera = { x:0, y:0, shake:0, shakeX:0, shakeY:0 };
function updateCamera() {
  // 鎽勫儚鏈轰互閫昏緫瑙嗗彛涓績涓洪敋鐐?  camera.x = lerp(camera.x, player.x, 0.12);
  camera.y = lerp(camera.y, player.y, 0.12);
  // 灞忓箷闇囧姩
  if (camera.shake > 0) {
    camera.shake -= 0.5;
    camera.shakeX = rand(-camera.shake, camera.shake);
    camera.shakeY = rand(-camera.shake, camera.shake);
  } else {
    camera.shakeX = camera.shakeY = 0;
  }
}

/* ============== 鍦板浘 ============== */
const TILE = 48;
let mapW = 0, mapH = 0;
let walls = []; // Set of "x,y"
let floor = []; // {x,y,color}
let exits = []; // {x,y,w,h}
let spawnPoints = [];
let levelTheme = { wall:'#3a2a1a', floor:'#2a1a0a', accent:'#a04020' };

function makeMap(levelIdx) {
  // 璁捐 6 涓叧鍗°€傚叧鍗¤秺澶ц秺澶嶆潅銆?  // 杩斿洖: { mapW, mapH, walls:Set, exits:[], spawnPoints:[] }
  const designs = [
    // 绗?鍏? 琛楅亾灏忓尯鍩?    {
      size: [32, 22],
      walls: [
        // 鍥存爮
        ...borderWalls(32,22),
        // 鍐呴儴寤虹瓚
        [4,4,3,2],[9,3,2,3],[15,4,3,2],[22,5,2,2],
        [4,10,4,2],[14,10,2,3],[20,11,3,2],
        [5,16,2,2],[11,15,4,2],[18,17,3,2],[24,15,2,3],
        [3,13,1,1],
      ],
      exit: [28, 18, 2, 2],
      theme: { wall:'#5a4020', floor:'#3a2810', accent:'#a06030', bg:'#1a0e08' }
    },
    // 绗?鍏? 浠撳簱
    {
      size: [36, 24],
      walls: [
        ...borderWalls(36,24),
        [5,4,6,2],[14,3,3,4],[20,5,5,2],
        [3,10,2,6],[8,11,4,2],[15,12,6,2],[24,11,2,4],[29,10,3,2],
        [4,17,3,2],[10,18,5,2],[18,17,3,3],[24,19,4,2],
        [29,17,3,3],
      ],
      exit: [32, 20, 2, 2],
      theme: { wall:'#404a5a', floor:'#202a3a', accent:'#6080a0', bg:'#0a0e1a' }
    },
    // 绗?鍏? 鍏洯/鍖婚櫌
    {
      size: [40, 26],
      walls: [
        ...borderWalls(40,26),
        [6,5,3,1],[12,4,4,3],[19,5,2,4],[24,4,5,2],
        [3,11,2,5],[8,10,3,2],[13,12,2,3],[18,11,4,2],[25,12,3,2],[32,11,4,2],
        [5,18,4,2],[12,19,3,3],[18,18,2,2],[23,19,5,2],[30,18,4,2],
        [3,22,2,2],[15,22,2,2],[28,22,2,2],
      ],
      exit: [36, 22, 2, 2],
      theme: { wall:'#4a3a4a', floor:'#2a1a2a', accent:'#a060a0', bg:'#100810' }
    },
    // 绗?鍏? 鍟嗕笟琛?    {
      size: [44, 26],
      walls: [
        ...borderWalls(44,26),
        [4,4,2,4],[9,3,3,2],[15,4,4,2],[22,3,3,3],[28,4,4,2],
        [35,5,3,2],[40,4,2,4],
        [3,10,2,4],[8,9,3,2],[14,11,5,2],[21,10,3,3],[27,9,4,2],
        [33,11,2,3],[38,10,3,2],
        [4,17,3,2],[10,18,4,2],[16,17,3,3],[22,18,5,2],[30,17,3,2],[36,18,4,2],
        [3,22,2,2],[14,22,2,2],[26,22,2,2],[38,22,2,2],
      ],
      exit: [40, 22, 2, 2],
      theme: { wall:'#604030', floor:'#3a2010', accent:'#c08040', bg:'#1a1008' }
    },
    // 绗?鍏? 鍦伴搧绔?    {
      size: [48, 28],
      walls: [
        ...borderWalls(48,28),
        [4,4,2,6],[9,5,3,2],[15,4,2,4],[20,5,4,2],[27,4,3,3],
        [33,5,4,2],[40,4,4,3],
        [3,12,2,3],[8,11,3,2],[14,13,4,2],[21,12,3,2],[27,13,5,2],
        [35,12,2,3],[40,11,4,2],
        [5,18,3,2],[11,19,4,2],[17,18,3,3],[23,19,4,2],[29,18,3,2],
        [35,19,4,2],[42,18,2,3],
        [3,23,2,2],[16,23,2,2],[28,23,2,2],[40,23,2,2],
      ],
      exit: [44, 24, 2, 2],
      theme: { wall:'#3a3a4a', floor:'#1a1a2a', accent:'#6060a0', bg:'#08080f' }
    },
    // 绗?鍏? 缁堟瀬瀹為獙瀹?    {
      size: [52, 30],
      walls: [
        ...borderWalls(52,30),
        // 澶嶆潅鐨勫疄楠屽甯冨眬
        [4,4,3,2],[10,3,4,3],[17,4,3,2],[23,3,4,3],[30,4,3,2],
        [36,3,4,3],[43,4,3,2],
        [3,9,2,5],[8,10,3,2],[14,11,4,2],[21,10,3,2],[27,11,4,2],
        [34,10,3,2],[40,11,4,2],[47,9,2,5],
        [5,17,4,2],[12,18,3,3],[18,17,5,2],[26,18,3,2],[32,17,4,2],
        [39,18,3,3],[45,17,3,2],
        [4,22,2,4],[9,23,4,2],[16,22,3,3],[22,23,4,2],[29,22,3,2],
        [35,23,4,2],[42,22,3,3],[48,23,2,3],
        [3,28,46,0], // 鏈叧搴曢儴璧板粖
      ],
      exit: [48, 26, 2, 2],
      theme: { wall:'#2a4a3a', floor:'#0a2a1a', accent:'#40c080', bg:'#04100a' }
    }
  ];
  const d = designs[levelIdx];
  const wS = d.walls;
  mapW = d.size[0]; mapH = d.size[1];
  walls = new Set();
  // 鐭╁舰澧?  wS.forEach(([x,y,wd,ht])=>{
    for (let i=0;i<wd;i++) for (let j=0;j<ht;j++) walls.add((x+i)+','+(y+j));
  });
  // 鍑哄彛
  exits = [];
  const [ex,ey,ew,eh] = d.exit;
  for (let i=0;i<ew;i++) for (let j=0;j<eh;j++) exits.add((ex+i)+','+(ey+j));
  // 鐜╁鍑虹敓鐐?  spawnPoints = [{x: 2*TILE + TILE/2, y: 2*TILE + TILE/2}];
  levelTheme = d.theme;
}

function borderWalls(w,h) {
  const arr = [];
  for (let x=0;x<w;x++) { arr.push([x,0,1,1]); arr.push([x,h-1,1,1]); }
  for (let y=0;y<h;y++) { arr.push([0,y,1,1]); arr.push([w-1,y,1,1]); }
  return arr;
}
function isWall(tx, ty) { return walls.has(tx+','+ty); }
function isExit(tx, ty) { return exits.has(tx+','+ty); }
function worldToTile(x,y) { return [Math.floor(x/TILE), Math.floor(y/TILE)]; }
function tileToWorld(tx,ty) { return [tx*TILE + TILE/2, ty*TILE + TILE/2]; }
function collidesAt(x, y, r=10) {
  // 妫€鏌ュ渾褰㈡槸鍚︿笌澧欑鎾?  const checks = [
    [x-r, y-r], [x+r, y-r], [x-r, y+r], [x+r, y+r],
    [x-r, y], [x+r, y], [x, y-r], [x, y+r]
  ];
  for (const [cx,cy] of checks) {
    const [tx,ty] = worldToTile(cx,cy);
    if (isWall(tx,ty)) return true;
  }
  return false;
}
function moveWithCollision(obj, dx, dy) {
  // X 杞?  obj.x += dx;
  if (collidesAt(obj.x, obj.y, obj.r)) obj.x -= dx;
  // Y 杞?  obj.y += dy;
  if (collidesAt(obj.x, obj.y, obj.r)) obj.y -= dy;
}

/* ============== 姝﹀櫒 ============== */
const WEAPONS = {
  pistol: {
    name:'鎵嬫灙', damage:22, fireRate:220, reload:1100, mag:12, ammo:999, spread:0.04,
    bulletSpeed:18, count:1, color:'#ffd060', auto:false, desc:'鏃犻檺澶囧脊,鍩虹姝﹀櫒'
  },
  shotgun: {
    name:'闇板脊鏋?, damage:14, fireRate:780, reload:1600, mag:6, ammo:48, spread:0.22,
    bulletSpeed:16, count:6, color:'#ff8060', auto:false, desc:'杩戞垬涔嬬帇,鑼冨洿鏉€浼?
  },
  rifle: {
    name:'姝ユ灙', damage:38, fireRate:120, reload:1800, mag:30, ammo:180, spread:0.06,
    bulletSpeed:24, count:1, color:'#80ff80', auto:true, desc:'楂橀€熻繛灏?涓窛绂诲帇鍒?
  }
};

/* ============== 鐜╁ ============== */
const player = {
  x:0, y:0, r:14, hp:100, maxHp:100,
  speed:3.4, angle:0,
  weapons: ['pistol'],
  weaponIdx: 0,
  kills:0, score:0, lives:0,
  fireCD:0, reloadCD:0, reloading:false,
  mag:0, ammo:0, totalAmmo:0,
  invincible:0,
  muzzleFlash:0,
  hasWeapon(wn) { return this.weapons.includes(wn); },
  giveWeapon(wn) { if (!this.hasWeapon(wn)) this.weapons.push(wn); }
};

/* ============== 瀹炰綋鏁扮粍 ============== */
let bullets = [];
let enemies = [];
let particles = [];
let pickups = [];
let damageNums = [];

/* ============== 鏁屼汉绫诲瀷 ============== */
const ENEMY_TYPES = {
  walker:  { name:'琛屽案', hp:35, speed:1.1, r:14, color:'#5a8a4a', damage:10, score:50, gold:0.2, sight:520, attackCD:900, attackRange:38 },
  runner:  { name:'杩呭案', hp:25, speed:2.2, r:12, color:'#aac050', damage:8,  score:70, gold:0.3, sight:560, attackCD:600, attackRange:36 },
  tank:    { name:'鑲夊北', hp:160, speed:0.7, r:22, color:'#5a3a2a', damage:18, score:160, gold:0.5, sight:480, attackCD:1300, attackRange:48 },
  spitter: { name:'鍚愰吀', hp:45, speed:1.0, r:14, color:'#a050c0', damage:0,  score:90, gold:0.4, sight:600, attackCD:1500, attackRange:380, ranged:true, projDamage:14, projSpeed:6 },
  boss:    { name:'鏆村悰', hp:1200, speed:0.9, r:34, color:'#aa2020', damage:28, score:2000, gold:1.0, sight:700, attackCD:900, attackRange:60 }
};

function spawnEnemy(type, x, y) {
  const t = ENEMY_TYPES[type];
  enemies.push({
    type, x, y, r:t.r, hp:t.hp, maxHp:t.hp,
    speed:t.speed, damage:t.damage, score:t.score,
    color:t.color, sight:t.sight, attackCD:t.attackCD, attackRange:t.attackRange,
    ranged:!!t.ranged, projDamage:t.projDamage||0, projSpeed:t.projSpeed||0,
    name:t.name,
    hitFlash:0, knockback:{x:0,y:0}, stun:0, anim:0,
    isBoss:type==='boss'
  });
}

/* ============== 瀛愬脊/鎶曞皠鐗?============== */
function spawnBullet(x,y,angle,opts) {
  bullets.push({
    x, y, vx:Math.cos(angle)*opts.speed, vy:Math.sin(angle)*opts.speed,
    life:opts.life||60, damage:opts.damage, color:opts.color||'#ffd060',
    r: opts.r||3, fromPlayer:!!opts.fromPlayer, knockback:opts.knockback||0,
    pierce: opts.pierce||0
  });
}

/* ============== 绮掑瓙 ============== */
function spawnParticle(x,y,vx,vy,life,color,size=3) {
  particles.push({x,y,vx,vy,life,maxLife:life,color,size});
}
function spawnBurst(x,y,color,count=8,spd=4) {
  for (let i=0;i<count;i++) {
    const a = Math.random()*TAU;
    const s = rand(1,spd);
    spawnParticle(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(20,40),color,rand(2,4));
  }
}
function spawnDamageNum(x,y,val,color='#fff') {
  damageNums.push({x,y-8,vy:-1.2,life:50,maxLife:50,val,color});
}

/* ============== 鎷惧彇鐗?============== */
const PICKUP_TYPES = {
  health:  { color:'#ff4060', char:'+', label:'鍖荤枟鍖? },
  ammo:    { color:'#ffc040', char:'鈥?, label:'寮硅嵂' },
  weapon_shotgun: { color:'#ff8060', char:'鈻?, label:'闇板脊鏋? },
  weapon_rifle:   { color:'#80ff80', char:'鈻?, label:'姝ユ灙' }
};
function spawnPickup(x,y,type) {
  pickups.push({x,y,r:12,type,bob:Math.random()*TAU});
}

/* ============== 鍏冲崱绠＄悊 ============== */
let level = 0;
let totalKills = 0;
let totalScore = 0;
let levelZombiesLeft = 0;
let bossSpawned = false;
let gameState = 'menu'; // menu, playing, paused, won, lost, levelEnd
let levelEndTimer = 0;
let messageTimer = 0;
let frame = 0;
let lastTime = performance.now();
let waveTimer = 0;
let spawnedThisWave = 0;
let currentWave = 0;

function startGame() {
  player.hp = 100; player.maxHp = 100;
  player.kills = 0; player.score = 0; player.lives = 0;
  player.weapons = ['pistol']; player.weaponIdx = 0;
  player.invincible = 120;
  totalKills = 0; totalScore = 0;
  level = 0;
  loadLevel(level);
  gameState = 'playing';
  document.getElementById('overlay').style.display = 'none';
}

function loadLevel(idx) {
  makeMap(idx);
  player.x = 2*TILE + TILE/2;
  player.y = 2*TILE + TILE/2;
  camera.x = player.x; camera.y = player.y;
  bullets = []; enemies = []; particles = []; pickups = []; damageNums = [];
  player.fireCD = 0; player.reloadCD = 0; player.reloading = false;
  // 缁欑帺瀹跺垵濮嬫墜鏋苟琛ユ弧
  player.mag = WEAPONS.pistol.mag;
  player.ammo = 999;
  // 姣忓叧鍒濆琛ョ粰
  // 鏁ｅ竷鎷惧彇鐗?  for (let i=0;i<3+idx;i++) {
    let x,y,tries=0;
    do {
      x = randi(2, mapW-2)*TILE + TILE/2;
      y = randi(2, mapH-2)*TILE + TILE/2;
      tries++;
    } while (tries<20 && (collidesAt(x,y,8) || dist2(x,y,player.x,player.y) < 60*60));
    if (Math.random()<0.55) spawnPickup(x,y,'health');
    else spawnPickup(x,y,'ammo');
  }
  // 涓€浜涙鍣ㄦ帀钀?  if (idx >= 1 && !player.hasWeapon('shotgun')) {
    let x,y,tries=0;
    do {
      x = randi(2, mapW-2)*TILE + TILE/2;
      y = randi(2, mapH-2)*TILE + TILE/2;
      tries++;
    } while (tries<20 && (collidesAt(x,y,8) || dist2(x,y,player.x,player.y) < 80*80));
    spawnPickup(x,y,'weapon_shotgun');
  }
  if (idx >= 2 && !player.hasWeapon('rifle')) {
    let x,y,tries=0;
    do {
      x = randi(2, mapW-2)*TILE + TILE/2;
      y = randi(2, mapH-2)*TILE + TILE/2;
      tries++;
    } while (tries<20 && (collidesAt(x,y,8) || dist2(x,y,player.x,player.y) < 80*80));
    spawnPickup(x,y,'weapon_rifle');
  }
  // 鍏冲崱鍍靛案鏁伴噺锛氶€掑浣嗘瘡鍏抽兘淇濇寔鍙帺
  const baseCount = [12, 18, 22, 26, 30, 18][idx];
  levelZombiesLeft = baseCount;
  bossSpawned = false;
  waveTimer = 0; spawnedThisWave = 0; currentWave = 0;
  document.getElementById('levelInfo').textContent = '绗?' + (idx+1) + ' 鍏?;
  document.getElementById('levelInfo').style.opacity = '1';
  setTimeout(()=>{ document.getElementById('levelInfo').style.opacity = '0'; }, 1800);
  showMessage('鎶佃揪鍑哄彛杩涘叆涓嬩竴鍏?');
}

/* ============== 鍏冲崱鍐呮尝娆＄敓鎴?============== */
function spawnWave() {
  if (levelZombiesLeft <= 0) return;
  const waveSize = Math.min(5 + currentWave*2, levelZombiesLeft);
  for (let i=0;i<waveSize;i++) {
    spawnRandomZombie();
    levelZombiesLeft--;
  }
  spawnedThisWave += waveSize;
  currentWave++;
}
function spawnRandomZombie() {
  // 鏍规嵁鍏冲崱閫夋嫨绫诲瀷
  const r = Math.random();
  let type = 'walker';
  if (level >= 1 && r < 0.25) type = 'runner';
  if (level >= 2 && r < 0.45) type = 'tank';
  if (level >= 3 && r < 0.6) type = 'spitter';
  // 鎵惧湴鍥捐竟缂?  let x,y,tries=0;
  do {
    const edge = randi(0,4);
    if (edge===0) { x = randi(1, mapW-1)*TILE + TILE/2; y = TILE*1.2; }
    else if (edge===1) { x = randi(1, mapW-1)*TILE + TILE/2; y = (mapH-1.2)*TILE; }
    else if (edge===2) { x = TILE*1.2; y = randi(1, mapH-1)*TILE + TILE/2; }
    else { x = (mapW-1.2)*TILE; y = randi(1, mapH-1)*TILE + TILE/2; }
    tries++;
  } while (tries<10 && (collidesAt(x,y,12) || dist2(x,y,player.x,player.y) < 350*350));
  spawnEnemy(type, x, y);
}

function spawnBoss() {
  // BOSS 鍑虹幇鍦ㄨ繙绂荤帺瀹剁殑浣嶇疆
  let x,y,tries=0;
  do {
    x = randi(2, mapW-2)*TILE + TILE/2;
    y = randi(2, mapH-2)*TILE + TILE/2;
    tries++;
  } while (tries<20 && (collidesAt(x,y,28) || dist2(x,y,player.x,player.y) < 500*500));
  spawnEnemy('boss', x, y);
  bossSpawned = true;
  showMessage('璀﹀憡: 鏆村悰鍑虹幇!');
}

/* ============== 鐜╁鏇存柊 ============== */
function updatePlayer(dt) {
  // 绉诲姩
  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;
  if (dx || dy) {
    const len = Math.sqrt(dx*dx+dy*dy);
    dx /= len; dy /= len;
    moveWithCollision(player, dx*player.speed, dy*player.speed);
  }
  // 鏈濆悜
  player.angle = angleTo(player.x, player.y, mouse.worldX, mouse.worldY);
  // 姝﹀櫒
  if (player.fireCD > 0) player.fireCD -= dt;
  if (player.reloadCD > 0) player.reloadCD -= dt;
  else if (player.reloading) {
    player.reloading = false;
    const w = WEAPONS[player.weapons[player.weaponIdx]];
    const need = w.mag - player.mag;
    const take = Math.min(need, player.ammo);
    player.mag += take;
    player.ammo -= take;
  }
  if (player.muzzleFlash > 0) player.muzzleFlash -= dt;
  if (player.invincible > 0) player.invincible -= dt;
  // 灏勫嚮
  if (mouse.down) tryFire();
}

function currentWeapon() { return WEAPONS[player.weapons[player.weaponIdx]]; }

function switchWeapon(idx) {
  if (idx < 0 || idx >= player.weapons.length) return;
  if (player.reloading) {
    player.reloading = false; player.reloadCD = 0;
  }
  player.weaponIdx = idx;
}

function tryFire() {
  const wn = player.weapons[player.weaponIdx];
  const w = WEAPONS[wn];
  if (player.fireCD > 0 || player.reloading) return;
  if (player.mag <= 0) {
    tryReload();
    return;
  }
  for (let i=0;i<w.count;i++) {
    const a = player.angle + (Math.random()-0.5)*w.spread*2;
    spawnBullet(player.x, player.y, a, {
      speed: w.bulletSpeed, damage: w.damage, color: w.color,
      life: 70, r: 3, fromPlayer: true, knockback: w.knockback||0
    });
  }
  player.mag--;
  player.fireCD = w.fireRate;
  player.muzzleFlash = 80;
  // 鍚庡潗鍔涜瑙?  camera.shake = Math.max(camera.shake, 2);
  // 鍚庡潗鍔涗綅绉?  const recoil = w.recoil||0;
  if (recoil) {
    player.x -= Math.cos(player.angle) * recoil;
    player.y -= Math.sin(player.angle) * recoil;
  }
  // 鏋彛鐏厜绮掑瓙
  const mx = player.x + Math.cos(player.angle)*22;
  const my = player.y + Math.sin(player.angle)*22;
  spawnParticle(mx, my, Math.cos(player.angle)*3, Math.sin(player.angle)*3, 8, '#ffea60', 4);
  spawnParticle(mx, my, Math.cos(player.angle+0.5)*2, Math.sin(player.angle+0.5)*2, 6, '#ffaa30', 3);
  if (player.mag <= 0) tryReload();
}

function tryReload() {
  const wn = player.weapons[player.weaponIdx];
  const w = WEAPONS[wn];
  if (player.reloading || player.mag >= w.mag || player.ammo <= 0) return;
  if (wn === 'pistol') return; // 鎵嬫灙鏃犻檺
  player.reloading = true;
  player.reloadCD = w.reload;
}

/* ============== 鏁屼汉 AI ============== */
function updateEnemies(dt) {
  for (let i = enemies.length-1; i >= 0; i--) {
    const e = enemies[i];
    e.anim += dt*0.01;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.stun > 0) e.stun -= dt;
    if (e.attackCD > 0) e.attackCD -= dt;
    // knockback
    e.x += e.knockback.x;
    e.y += e.knockback.y;
    e.knockback.x *= 0.85;
    e.knockback.y *= 0.85;
    if (collidesAt(e.x, e.y, e.r)) {
      e.x -= e.knockback.x;
      e.y -= e.knockback.y;
      e.knockback.x = 0; e.knockback.y = 0;
    }
    // 瑙嗚窛
    const d = dist(e.x, e.y, player.x, player.y);
    if (d < e.sight && e.stun <= 0) {
      const a = angleTo(e.x, e.y, player.x, player.y);
      // 璧?      if (d > e.attackRange) {
        const mx = Math.cos(a)*e.speed;
        const my = Math.sin(a)*e.speed;
        moveWithCollision(e, mx, my);
      } else if (e.attackCD <= 0) {
        // 鏀诲嚮
        if (e.ranged) {
          // 鎶曞皠鐗?          const ang = a + (Math.random()-0.5)*0.1;
          spawnBullet(e.x, e.y, ang, {
            speed: e.projSpeed, damage: e.projDamage, color: '#c060ff',
            life: 80, r: 5, fromPlayer:false
          });
          e.attackCD = ENEMY_TYPES[e.type].attackCD;
        } else {
          // 杩戞垬
          if (player.invincible <= 0) {
            player.hp -= e.damage;
            player.invincible = 18;
            camera.shake = 6;
            spawnBurst(player.x, player.y, '#ff4040', 6, 3);
          }
          e.attackCD = ENEMY_TYPES[e.type].attackCD;
        }
      }
    }
  }
}

/* ============== 瀛愬脊鏇存柊 ============== */
function updateBullets(dt) {
  for (let i = bullets.length-1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;
    if (b.life <= 0) { bullets.splice(i,1); continue; }
    // 澧欑鎾?    const [tx,ty] = worldToTile(b.x, b.y);
    if (isWall(tx,ty)) {
      spawnBurst(b.x, b.y, '#ffaa30', 4, 2);
      bullets.splice(i,1); continue;
    }
    if (b.fromPlayer) {
      // 鎾炴晫浜?      for (let j = enemies.length-1; j >= 0; j--) {
        const e = enemies[j];
        if (dist2(b.x,b.y,e.x,e.y) < (e.r+b.r)*(e.r+b.r)) {
          e.hp -= b.damage;
          e.hitFlash = 100;
          e.stun = 60;
          // 鍑婚€€
          const ka = Math.atan2(b.vy, b.vx);
          e.knockback.x += Math.cos(ka)*b.knockback*0.3;
          e.knockback.y += Math.sin(ka)*b.knockback*0.3;
          spawnBurst(b.x, b.y, '#ff6060', 5, 3);
          spawnDamageNum(e.x, e.y, b.damage, '#ffea60');
          if (e.hp <= 0) {
            // 姝讳骸
            onEnemyDeath(e);
            enemies.splice(j,1);
            player.kills++;
            totalKills++;
          }
          if (b.pierce > 0) { b.pierce--; }
          else { bullets.splice(i,1); break; }
        }
      }
    } else {
      // 鎾炵帺瀹?      if (dist2(b.x,b.y,player.x,player.y) < (player.r+b.r)*(player.r+b.r)) {
        if (player.invincible <= 0) {
          player.hp -= b.damage;
          player.invincible = 20;
          camera.shake = 5;
          spawnBurst(player.x, player.y, '#ff4040', 6, 3);
        }
        bullets.splice(i,1);
      }
    }
  }
}

function onEnemyDeath(e) {
  spawnBurst(e.x, e.y, e.color, 14, 5);
  spawnBurst(e.x, e.y, '#ff8040', 6, 4);
  player.score += e.score;
  totalScore += e.score;
  // 鎺夎惤
  if (Math.random() < 0.18) spawnPickup(e.x, e.y, 'health');
  if (Math.random() < 0.22) spawnPickup(e.x, e.y, 'ammo');
  if (Math.random() < 0.05 && !player.hasWeapon('shotgun')) spawnPickup(e.x, e.y, 'weapon_shotgun');
  if (Math.random() < 0.04 && !player.hasWeapon('rifle'))   spawnPickup(e.x, e.y, 'weapon_rifle');
  // 浼ゅ鏁板瓧
  spawnDamageNum(e.x, e.y, '+'+e.score, '#ffff80');
}

/* ============== 绮掑瓙鏇存柊 ============== */
function updateParticles(dt) {
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.92; p.vy *= 0.92;
    p.life--;
    if (p.life <= 0) particles.splice(i,1);
  }
  for (let i = damageNums.length-1; i >= 0; i--) {
    const d = damageNums[i];
    d.y += d.vy; d.vy *= 0.96; d.life--;
    if (d.life <= 0) damageNums.splice(i,1);
  }
}

/* ============== 鎷惧彇鏇存柊 ============== */
function updatePickups(dt) {
  for (let i = pickups.length-1; i >= 0; i--) {
    const p = pickups[i];
    p.bob += 0.08;
    if (dist2(p.x, p.y, player.x, player.y) < (p.r+player.r+6)*(p.r+player.r+6)) {
      // 鎷惧彇
      if (p.type === 'health') {
        if (player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + 35);
          spawnBurst(p.x, p.y, '#ff4060', 8, 3);
          showMessage('+35 鐢熷懡');
        } else continue;
      } else if (p.type === 'ammo') {
        // 缁欏綋鍓嶆鍣ㄨˉ鍏呭脊鑽紝鎴栫粰鎵€鏈夋鍣ㄨˉ鍏?        let added = false;
        for (const wn of player.weapons) {
          const w = WEAPONS[wn];
          if (wn !== 'pistol') {
            player.ammo += 12;
            added = true;
          }
        }
        if (added) {
          spawnBurst(p.x, p.y, '#ffc040', 8, 3);
          showMessage('+12 寮硅嵂');
        } else continue;
      } else if (p.type === 'weapon_shotgun') {
        player.giveWeapon('shotgun');
        player.weaponIdx = player.weapons.indexOf('shotgun');
        player.mag = WEAPONS.shotgun.mag;
        player.ammo += 24;
        spawnBurst(p.x, p.y, '#ff8060', 12, 4);
        showMessage('鑾峰緱闇板脊鏋?');
      } else if (p.type === 'weapon_rifle') {
        player.giveWeapon('rifle');
        player.weaponIdx = player.weapons.indexOf('rifle');
        player.mag = WEAPONS.rifle.mag;
        player.ammo += 60;
        spawnBurst(p.x, p.y, '#80ff80', 12, 4);
        showMessage('鑾峰緱姝ユ灙!');
      }
      pickups.splice(i,1);
    }
  }
}

/* ============== 鐜╁涓庢晫浜烘帴瑙︿激瀹?============== */
function checkContactDamage() {
  if (player.invincible > 0) return;
  for (const e of enemies) {
    if (!e.ranged && dist2(e.x, e.y, player.x, player.y) < (e.r+player.r)*(e.r+player.r)) {
      player.hp -= e.damage;
      player.invincible = 24;
      camera.shake = 5;
      spawnBurst(player.x, player.y, '#ff4040', 6, 3);
      break;
    }
  }
}

/* ============== 鍑哄彛妫€娴?============== */
function checkExit() {
  if (enemies.length > 0) {
    // 鍏ㄩ儴娓呯悊鎵嶈兘杩囧叧锛堢‘淇濆彲鐜╋級
    if (Math.random() < 0.005) showMessage('鍑绘潃鎵€鏈夊兊灏告墠鑳界寮€ ('+enemies.length+' 鍙墿浣?');
    return;
  }
  // 杩樻病鐢熸垚 BOSS锛氱 3 鍏宠捣浼氬嚭鐜?BOSS
  if (!bossSpawned && level >= 2) {
    spawnBoss();
    return;
  }
  // 缁堝叧 BOSS 姝诲悗鍗宠儨鍒?  if (level >= 5) {
    // 鏈€缁?BOSS 姝诲悗鍗宠儨鍒?    gameState = 'won';
    document.getElementById('overlay').innerHTML =
      '<h1 style="color:#ffd700">鑳滃埄!</h1>' +
      '<h2>浣犳秷鐏簡鍍靛案鍗辨満!</h2>' +
      '<p>鏈€缁堝垎鏁? <b style="color:#ffea60">'+totalScore+'</b></p>' +
      '<p>鎬诲嚮鏉€: <b style="color:#ffea60">'+totalKills+'</b></p>' +
      '<button onclick="restart()">鍐嶆潵涓€灞€</button>';
    document.getElementById('overlay').style.display = 'flex';
    return;
  }
  gameState = 'levelEnd';
  levelEndTimer = 90;
  showMessage('鍏冲崱瀹屾垚! 鍑嗗杩涘叆涓嬩竴鍏?..');
}

/* ============== 娓叉煋 ============== */
function worldToScreen(x,y) {
  return [x - camera.x + W/2 + camera.shakeX, y - camera.y + H/2 + camera.shakeY];
}

function render() {
  // 鑳屾櫙
  ctx.fillStyle = levelTheme.bg;
  ctx.fillRect(0,0,W,H);
  // 瑙嗗彛
  const vw = W, vh = H;
  // 鍦伴潰
  const startX = Math.max(0, Math.floor((camera.x - W/2) / TILE));
  const startY = Math.max(0, Math.floor((camera.y - H/2) / TILE));
  const endX = Math.min(mapW, Math.ceil((camera.x + W/2) / TILE) + 1);
  const endY = Math.min(mapH, Math.ceil((camera.y + H/2) / TILE) + 1);
  for (let ty = startY; ty < endY; ty++) {
    for (let tx = startX; tx < endX; tx++) {
      const [sx, sy] = worldToScreen(tx*TILE, ty*TILE);
      if (isWall(tx,ty)) {
        ctx.fillStyle = levelTheme.wall;
        ctx.fillRect(sx, sy, TILE+1, TILE+1);
        // 椤堕儴楂樺厜
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(sx, sy, TILE+1, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(sx, sy+TILE-3, TILE+1, 4);
        // 鐮栧潡绾圭悊
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(sx+TILE/2-1, sy, 2, TILE+1);
        ctx.fillRect(sx, sy+TILE/2-1, TILE+1, 2);
      } else {
        ctx.fillStyle = levelTheme.floor;
        ctx.fillRect(sx, sy, TILE+1, TILE+1);
        // 妫嬬洏鏍煎彉浣?        if ((tx+ty) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.025)';
          ctx.fillRect(sx, sy, TILE+1, TILE+1);
        }
        // 鍑哄彛
        if (isExit(tx,ty)) {
          ctx.fillStyle = levelTheme.accent;
          ctx.fillRect(sx+2, sy+2, TILE-4, TILE-4);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('EXIT', sx+TILE/2, sy+TILE/2);
        }
      }
    }
  }

  // 鎷惧彇鐗?  for (const p of pickups) {
    const [sx,sy] = worldToScreen(p.x, p.y);
    const bob = Math.sin(p.bob)*3;
    const info = PICKUP_TYPES[p.type];
    // 鍏夋檿
    const grad = ctx.createRadialGradient(sx, sy+bob, 0, sx, sy+bob, 24);
    grad.addColorStop(0, info.color+'cc');
    grad.addColorStop(1, info.color+'00');
    ctx.fillStyle = grad;
    ctx.fillRect(sx-24, sy+bob-24, 48, 48);
    // 涓讳綋
    ctx.fillStyle = info.color;
    ctx.beginPath();
    ctx.arc(sx, sy+bob, p.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 瀛楃
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.char, sx, sy+bob+1);
  }

  // 鏁屼汉
  for (const e of enemies) {
    const [sx,sy] = worldToScreen(e.x, e.y);
    // 闃村奖
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(sx, sy+e.r*0.6, e.r*0.8, e.r*0.3, 0, 0, TAU);
    ctx.fill();
    // 韬綋
    const wobble = Math.sin(e.anim)*1.5;
    ctx.fillStyle = e.hitFlash>0 ? '#fff' : e.color;
    ctx.beginPath();
    ctx.arc(sx, sy+wobble, e.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 鐪肩潧
    const ea = angleTo(e.x, e.y, player.x, player.y);
    const ex = sx + Math.cos(ea)*e.r*0.4;
    const ey = sy + Math.sin(ea)*e.r*0.4 + wobble;
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(ex-3, ey, 2.5, 0, TAU);
    ctx.arc(ex+3, ey, 2.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(ex-3, ey, 1, 0, TAU);
    ctx.arc(ex+3, ey, 1, 0, TAU);
    ctx.fill();
    // 琛€鏉?    if (e.hp < e.maxHp) {
      const bw = e.r*2;
      ctx.fillStyle = '#400';
      ctx.fillRect(sx-bw/2, sy-e.r-10, bw, 4);
      ctx.fillStyle = e.isBoss ? '#ff4040' : '#ff8060';
      ctx.fillRect(sx-bw/2, sy-e.r-10, bw*(e.hp/e.maxHp), 4);
    }
    // BOSS 鍚嶇О
    if (e.isBoss) {
      ctx.fillStyle = '#ff4040';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('鈽?'+e.name+' 鈽?, sx, sy-e.r-14);
    }
  }

  // 瀛愬脊
  for (const b of bullets) {
    const [sx,sy] = worldToScreen(b.x, b.y);
    // 鎷栧熬
    ctx.fillStyle = b.color+'88';
    ctx.beginPath();
    ctx.arc(sx - b.vx*1.2, sy - b.vy*1.2, b.r*0.8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(sx, sy, b.r, 0, TAU);
    ctx.fill();
    if (b.fromPlayer) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, b.r*0.5, 0, TAU);
      ctx.fill();
    }
  }

  // 鐜╁
  {
    const [sx,sy] = worldToScreen(player.x, player.y);
    // 闃村奖
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(sx, sy+player.r*0.7, player.r*0.9, player.r*0.35, 0, 0, TAU);
    ctx.fill();
    // 韬綋
    ctx.fillStyle = player.invincible>0 && Math.floor(player.invincible/4)%2===0 ? '#ff8080' : '#3a8acc';
    ctx.beginPath();
    ctx.arc(sx, sy, player.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#0a3050';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 澶撮儴
    ctx.fillStyle = '#ffd0a0';
    ctx.beginPath();
    ctx.arc(sx, sy, player.r*0.5, 0, TAU);
    ctx.fill();
    // 鏋?    const wn = player.weapons[player.weaponIdx];
    const w = WEAPONS[wn];
    const gx = sx + Math.cos(player.angle)*player.r;
    const gy = sy + Math.sin(player.angle)*player.r;
    const ex = sx + Math.cos(player.angle)*player.r*2.4;
    const ey = sy + Math.sin(player.angle)*player.r*2.4;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = wn==='shotgun'?8:wn==='rifle'?5:4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // 鏋彛鐏厜
    if (player.muzzleFlash > 0) {
      const fx = sx + Math.cos(player.angle)*player.r*2.8;
      const fy = sy + Math.sin(player.angle)*player.r*2.8;
      ctx.fillStyle = '#ffea60';
      ctx.beginPath();
      ctx.arc(fx, fy, 8 + Math.random()*3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, TAU);
      ctx.fill();
    }
  }

  // 绮掑瓙
  for (const p of particles) {
    const [sx,sy] = worldToScreen(p.x, p.y);
    const a = p.life/p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = a;
    ctx.fillRect(sx-p.size/2, sy-p.size/2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // 浼ゅ鏁板瓧
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const d of damageNums) {
    const [sx,sy] = worldToScreen(d.x, d.y);
    const a = d.life/d.maxLife;
    ctx.fillStyle = d.color;
    ctx.globalAlpha = a;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(d.val, sx, sy);
  }
  ctx.globalAlpha = 1;

  // 鍑嗘槦
  {
    const cx = mouse.x, cy = mouse.y;
    ctx.strokeStyle = 'rgba(255,80,80,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx-10, cy); ctx.lineTo(cx-4, cy);
    ctx.moveTo(cx+4, cy); ctx.lineTo(cx+10, cy);
    ctx.moveTo(cx, cy-10); ctx.lineTo(cx, cy-4);
    ctx.moveTo(cx, cy+4); ctx.lineTo(cx, cy+10);
    ctx.stroke();
  }

  // 閲嶆柊瑁呭脊鎻愮ず
  const w = currentWeapon();
  if (player.reloading) {
    const [sx,sy] = worldToScreen(player.x, player.y);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(sx-30, sy-32, 60, 10);
    ctx.fillStyle = '#ffea60';
    const prog = 1 - (player.reloadCD / w.reload);
    ctx.fillRect(sx-30, sy-32, 60*prog, 10);
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('瑁呭脊涓?, sx, sy-40);
  }

  // 娓叉煋灏忓湴鍥?  renderMinimap();
}

function renderMinimap() {
  mctx.fillStyle = 'rgba(0,0,0,0.85)';
  mctx.fillRect(0,0,160,160);
  const sx = 160 / mapW;
  const sy = 160 / mapH;
  // 澧?  mctx.fillStyle = levelTheme.wall;
  for (let ty=0;ty<mapH;ty++) for (let tx=0;tx<mapW;tx++) {
    if (isWall(tx,ty)) mctx.fillRect(tx*sx, ty*sy, sx+1, sy+1);
  }
  // 鍑哄彛
  mctx.fillStyle = levelTheme.accent;
  for (const k of exits) {
    const [x,y] = k.split(',').map(Number);
    mctx.fillRect(x*sx, y*sy, sx+1, sy+1);
  }
  // 鏁屼汉
  mctx.fillStyle = '#f44';
  for (const e of enemies) {
    mctx.fillRect(e.x/TILE*sx-1, e.y/TILE*sy-1, 2, 2);
  }
  // 鐜╁
  mctx.fillStyle = '#0ff';
  mctx.fillRect(player.x/TILE*sx-2, player.y/TILE*sy-2, 4, 4);
  // 杈规
  mctx.strokeStyle = '#4a4';
  mctx.lineWidth = 2;
  mctx.strokeRect(0,0,160,160);
}

/* ============== HUD 鏇存柊 ============== */
function updateHUD() {
  document.getElementById('lvl').textContent = (level+1);
  document.getElementById('kills').textContent = totalKills;
  document.getElementById('score').textContent = totalScore;
  document.getElementById('hpText').textContent = Math.max(0, Math.floor(player.hp));
  document.getElementById('hpFill').style.width = (Math.max(0, player.hp/player.maxHp)*100) + '%';
  const w = currentWeapon();
  document.getElementById('weaponName').textContent = w.name;
  let ammoStr;
  if (player.weapons[player.weaponIdx] === 'pistol') ammoStr = '鈭?/ 鈭?;
  else ammoStr = player.mag + ' / ' + player.ammo + (player.reloading?' (瑁呭脊)':'');
  document.getElementById('ammo').textContent = ammoStr;
}

function showMessage(text) {
  const el = document.getElementById('message');
  el.textContent = text;
  el.style.opacity = '1';
  messageTimer = 120;
}
function updateMessage() {
  if (messageTimer > 0) {
    messageTimer--;
    if (messageTimer <= 0) document.getElementById('message').style.opacity = '0';
  }
}

/* ============== 涓诲惊鐜?============== */
function gameLoop(now) {
  const dt = Math.min(now - lastTime, 50);
  lastTime = now;
  frame++;
  if (gameState === 'playing') {
    updatePlayer(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateParticles(dt);
    updatePickups(dt);
    updateCamera();
    checkContactDamage();
    // 娉㈡鐢熸垚
    if (enemies.length < 4 + currentWave && levelZombiesLeft > 0) {
      waveTimer -= dt;
      if (waveTimer <= 0) {
        spawnWave();
        waveTimer = 2200 - level*200; // 瓒婃潵瓒婂揩
      }
    }
    // 鍑哄彛
    const [ptx, pty] = worldToTile(player.x, player.y);
    if (isExit(ptx, pty)) checkExit();
    // 姝讳骸
    if (player.hp <= 0) {
      player.lives++;      if (player.lives < 5) {
        // 澶嶆椿
        player.hp = player.maxHp;
        player.x = 2*TILE + TILE/2; player.y = 2*TILE + TILE/2;
        player.invincible = 180;
        showMessage('闃典骸! 鍓╀綑鐢熷懡: ' + (5-player.lives));
        spawnBurst(player.x, player.y, '#ff4040', 20, 5);
      } else {
        gameState = 'lost';
        document.getElementById('overlay').innerHTML =
          '<h1>娓告垙缁撴潫</h1>' +
          '<h2 style="color:#f80">浣犺鍍靛案鍚炲櫖浜?..</h2>' +
          '<p>鍑绘潃: <b style="color:#ffea60">'+totalKills+'</b> &nbsp; 鍒嗘暟: <b style="color:#ffea60">'+totalScore+'</b></p>' +
          '<p>鎶佃揪鍏冲崱: <b style="color:#ffea60">'+(level+1)+' / 6</b></p>' +
          '<button onclick="restart()">閲嶆柊寮€濮?/button>';
        document.getElementById('overlay').style.display = 'flex';
      }
    }
    updateHUD();
    updateMessage();
  } else if (gameState === 'levelEnd') {
    updateParticles(dt);
    updateCamera();
    levelEndTimer--;
    if (levelEndTimer <= 0) {
      level++;
      loadLevel(level);
      gameState = 'playing';
    }
  }
  render();
  requestAnimationFrame(gameLoop);
}

function restart() {
  document.getElementById('overlay').style.display = 'none';
  startGame();
}

document.getElementById('startBtn').addEventListener('click', ()=>{
  startGame();
});

// 鍚姩
makeMap(0); // 棰勫姞杞?player.x = 2*TILE + TILE/2; player.y = 2*TILE + TILE/2;
camera.x = player.x; camera.y = player.y;
player.mag = WEAPONS.pistol.mag;
player.ammo = 999;
requestAnimationFrame(gameLoop);

