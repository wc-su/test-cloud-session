// 戰鬥畫面繪製（Canvas）與特效。
// 以 640×360 的邏輯座標繪製，再依畫面大小與裝置像素比縮放，確保清晰。
// 血條等文字資訊放在 HTML（見 main.js），在手機上才不會縮得太小。

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 360;

// 角色位置：base 是圖示底線，center 是特效中心
const POS = {
  enemy: { x: 470, base: 185, center: 140, size: 96, platformY: 190, platformW: 90 },
  player: { x: 160, base: 312, center: 278, size: 80, platformY: 320, platformW: 80 },
};

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 星空位置固定產生一次，避免每次重繪都跳動
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1) * VIEW_WIDTH, y: r(2) * VIEW_HEIGHT * 0.6, size: r(3) * 1.6 + 0.4, phase: r(4) * Math.PI * 2 };
});

// ---------- 特效狀態 ----------

const fx = {
  floats: [], // 飄出的文字（傷害數字等）
  bursts: [], // 命中時擴散的光圈
  shake: { enemy: 0, player: 0 }, // 受擊震動開始時間
  lunge: { enemy: 0, player: 0 }, // 攻擊前衝開始時間
  screenShake: 0, // 全畫面震動開始時間
  screenFlash: 0, // 全畫面紅光開始時間
  defeat: { enemy: 0, player: 0 }, // 倒下開始時間
};

function resetEffects() {
  fx.floats = [];
  fx.bursts = [];
  fx.shake = { enemy: 0, player: 0 };
  fx.lunge = { enemy: 0, player: 0 };
  fx.screenShake = 0;
  fx.screenFlash = 0;
  fx.defeat = { enemy: 0, player: 0 };
}

// offsetX、offsetY 用來錯開同時出現的文字，避免重疊
function addFloat(target, text, color, { size = 34, delay = 0, offsetX = 0, offsetY = 0, duration = 1100 } = {}) {
  const p = POS[target];
  fx.floats.push({ text, color, size, x: p.x + offsetX, y: p.center - 40 + offsetY, start: performance.now() + delay, duration });
}

// 依戰鬥事件（見 battle.js）播放對應特效
function playEvent(event) {
  const now = performance.now();
  const other = event.target === 'enemy' ? 'player' : 'enemy';

  if (event.type === 'damage') {
    fx.lunge[other] = now;
    fx.shake[event.target] = now + 120; // 等前衝碰到再震動
    const p = POS[event.target];

    if (event.target === 'enemy') {
      const color = event.magic ? '80, 220, 255' : '255, 170, 80';
      fx.bursts.push({ x: p.x, y: p.center, color, start: now + 100 });
      const numColor = { weak: '#ffd166', resist: '#9fb3c8', normal: '#ffffff' }[event.effect];
      addFloat('enemy', `${event.amount}`, numColor, { size: event.effect === 'weak' ? 42 : 34, delay: 100 });
      if (event.effect === 'weak') addFloat('enemy', '弱點！', '#ffd166', { size: 20, delay: 100, offsetY: -38 });
      if (event.effect === 'resist') addFloat('enemy', '抗性', '#9fb3c8', { size: 20, delay: 100, offsetY: -34 });
    } else {
      fx.bursts.push({ x: p.x, y: p.center, color: '255, 84, 112', start: now + 100 });
      addFloat('player', `-${event.amount}`, '#ff5470', { size: event.effect === 'heavy' ? 44 : 34, delay: 100 });
      if (event.blocked) addFloat('player', '防禦', '#78c8ff', { size: 20, delay: 100, offsetY: -38 });
      if (event.effect === 'heavy') {
        fx.screenShake = now + 100;
        fx.screenFlash = now + 100;
      }
    }
  } else if (event.type === 'defend') {
    // 放在角色左側（右側是血條）並縮短時間，避免和接下來的受傷數字重疊
    if (event.amount > 0) addFloat('player', `+${event.amount} MP`, '#4aa8ff', { size: 24, offsetX: -95, offsetY: 30, duration: 700 });
  } else if (event.type === 'defeat') {
    fx.defeat[event.target] = now;
  }
}

// ---------- 繪製 ----------

function resizeCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  if (!width) return;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(width * (VIEW_HEIGHT / VIEW_WIDTH) * dpr);
  const ctx = canvas.getContext('2d');
  const scale = (width / VIEW_WIDTH) * dpr;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

// 0→1 的進度；尚未開始回傳 -1，已結束回傳 2
function progress(now, start, duration) {
  if (!start || now < start) return -1;
  const t = (now - start) / duration;
  return t > 1 ? 2 : t;
}

function drawBackground(ctx, now) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, '#05060f');
  sky.addColorStop(0.6, '#141a3a');
  sky.addColorStop(1, '#0a0d20');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  ctx.fillStyle = '#ffffff';
  for (const s of STARS) {
    const twinkle = REDUCED_MOTION ? 1 : 0.75 + 0.25 * Math.sin(now / 600 + s.phase);
    ctx.globalAlpha = (0.3 + s.size * 0.35) * twinkle;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;

  // 透視格線地板
  const horizon = VIEW_HEIGHT * 0.58;
  ctx.strokeStyle = 'rgba(80, 220, 255, 0.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const y = horizon + (VIEW_HEIGHT - horizon) * (i / 8) ** 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_WIDTH, y);
    ctx.stroke();
  }
  for (let i = -10; i <= 10; i++) {
    ctx.beginPath();
    ctx.moveTo(VIEW_WIDTH / 2 + i * 20, horizon);
    ctx.lineTo(VIEW_WIDTH / 2 + i * 110, VIEW_HEIGHT);
    ctx.stroke();
  }
}

function drawPlatform(ctx, p) {
  ctx.fillStyle = 'rgba(80, 220, 255, 0.15)';
  ctx.strokeStyle = 'rgba(80, 220, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(p.x, p.platformY, p.platformW, p.platformW * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawSprite(ctx, icon, x, y, size) {
  ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff'; // Emoji 會套用 fillStyle 的透明度，必須重設為不透明
  ctx.fillText(icon, x, y);
}

// 計算角色目前的位移與透明度（前衝、受擊震動、倒下）
function spriteState(target, now) {
  let dx = 0;
  let dy = 0;
  let alpha = 1;

  if (!REDUCED_MOTION) {
    const lunge = progress(now, fx.lunge[target], 250);
    if (lunge >= 0 && lunge <= 1) {
      const dir = target === 'player' ? 1 : -1;
      const amount = Math.sin(lunge * Math.PI) * 24;
      dx += amount * dir;
      dy -= amount * dir * 0.4;
    }
    const shake = progress(now, fx.shake[target], 350);
    if (shake >= 0 && shake <= 1) dx += Math.sin(shake * 40) * 8 * (1 - shake);
  }

  // 受擊時閃爍
  const hit = progress(now, fx.shake[target], 350);
  if (hit >= 0 && hit <= 1 && Math.floor(hit * 8) % 2 === 0) alpha = 0.35;

  const defeat = progress(now, fx.defeat[target], 700);
  if (defeat === 2) alpha = 0;
  else if (defeat >= 0) {
    alpha = Math.min(alpha, 1 - defeat);
    dy += defeat * 20;
  }
  return { dx, dy, alpha };
}

function drawFighter(ctx, target, icon, alive, now) {
  const p = POS[target];
  // 沒有倒下動畫紀錄卻已經沒血，直接不畫
  if (!alive && !fx.defeat[target]) return;
  const s = spriteState(target, now);
  if (s.alpha <= 0) return;
  ctx.globalAlpha = s.alpha;
  drawSprite(ctx, icon, p.x + s.dx, p.base + s.dy, p.size);
  ctx.globalAlpha = 1;
}

// 魔王蓄力時的紅色光環與提示
function drawChargeAura(ctx, now) {
  const p = POS.enemy;
  const pulse = REDUCED_MOTION ? 1 : 0.85 + 0.15 * Math.sin(now / 120);
  const radius = 90 * pulse;
  const glow = ctx.createRadialGradient(p.x, p.center, 10, p.x, p.center, radius);
  glow.addColorStop(0, 'rgba(255, 70, 100, 0.6)');
  glow.addColorStop(1, 'rgba(255, 70, 100, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.center, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff8098';
  ctx.font = 'bold 22px system-ui, "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('⚠ 蓄力中', p.x, p.center - 66);
}

function drawDefendShield(ctx) {
  const p = POS.player;
  ctx.strokeStyle = 'rgba(120, 200, 255, 0.85)';
  ctx.fillStyle = 'rgba(120, 200, 255, 0.12)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.center, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawBursts(ctx, now) {
  fx.bursts = fx.bursts.filter((b) => progress(now, b.start, 400) !== 2);
  for (const b of fx.bursts) {
    const t = progress(now, b.start, 400);
    if (t < 0) continue;
    ctx.strokeStyle = `rgba(${b.color}, ${1 - t})`;
    ctx.fillStyle = `rgba(${b.color}, ${(1 - t) * 0.25})`;
    ctx.lineWidth = 4 * (1 - t) + 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 15 + t * 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawFloats(ctx, now) {
  fx.floats = fx.floats.filter((f) => progress(now, f.start, f.duration) !== 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of fx.floats) {
    const t = progress(now, f.start, f.duration);
    if (t < 0) continue;
    const rise = 1 - (1 - t) ** 3; // 先快後慢
    ctx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    ctx.font = `900 ${f.size}px system-ui, "Noto Sans TC", sans-serif`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(5, 6, 15, 0.9)';
    ctx.strokeText(f.text, f.x, f.y - rise * 45);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - rise * 45);
  }
  ctx.globalAlpha = 1;
}

function drawScene(canvas, battle, now = performance.now()) {
  const ctx = canvas.getContext('2d');
  const { player, enemy } = battle;

  ctx.save();
  const shake = REDUCED_MOTION ? -1 : progress(now, fx.screenShake, 450);
  if (shake >= 0 && shake <= 1) {
    const k = 10 * (1 - shake);
    ctx.translate(Math.sin(shake * 50) * k, Math.cos(shake * 43) * k * 0.6);
  }

  ctx.clearRect(-20, -20, VIEW_WIDTH + 40, VIEW_HEIGHT + 40);
  drawBackground(ctx, now);

  drawPlatform(ctx, POS.enemy);
  if (enemy.charging) drawChargeAura(ctx, now);
  drawFighter(ctx, 'enemy', enemy.icon, enemy.hp > 0, now);

  drawPlatform(ctx, POS.player);
  if (player.defending) drawDefendShield(ctx);
  drawFighter(ctx, 'player', player.icon, player.hp > 0, now);

  drawBursts(ctx, now);
  drawFloats(ctx, now);
  ctx.restore();

  // 大招命中時全畫面閃紅光
  const flash = progress(now, fx.screenFlash, 350);
  if (flash >= 0 && flash <= 1) {
    ctx.fillStyle = `rgba(255, 60, 90, ${0.4 * (1 - flash)})`;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
}

// 持續重繪；getBattle 回傳 null 時不繪製
function startRenderLoop(canvas, getBattle) {
  function frame(now) {
    const battle = getBattle();
    if (battle && canvas.clientWidth) drawScene(canvas, battle, now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
