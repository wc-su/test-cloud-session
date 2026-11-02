// 戰鬥畫面繪製（Canvas）。
// 以 640×360 的邏輯座標繪製，再依畫面大小與裝置像素比縮放，確保清晰。

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 360;

// 星空位置固定產生一次，避免每次重繪都跳動
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1) * VIEW_WIDTH, y: r(2) * VIEW_HEIGHT * 0.6, size: r(3) * 1.6 + 0.4 };
});

function resizeCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(width * (VIEW_HEIGHT / VIEW_WIDTH) * dpr);
  const ctx = canvas.getContext('2d');
  const scale = (width / VIEW_WIDTH) * dpr;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function drawBackground(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, '#05060f');
  sky.addColorStop(0.6, '#141a3a');
  sky.addColorStop(1, '#0a0d20');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  ctx.fillStyle = '#ffffff';
  for (const s of STARS) {
    ctx.globalAlpha = 0.3 + s.size * 0.35;
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

function drawPlatform(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(80, 220, 255, 0.15)';
  ctx.strokeStyle = 'rgba(80, 220, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.22, 0, 0, Math.PI * 2);
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

function drawBar(ctx, x, y, w, h, value, max, color) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * (value / max), h);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function hpColor(ratio) {
  if (ratio > 0.5) return '#3ee08f';
  if (ratio > 0.2) return '#f5c542';
  return '#ff5470';
}

function drawInfoPanel(ctx, x, y, fighter, showMp) {
  const w = 220;
  const h = showMp ? 74 : 52;
  ctx.fillStyle = 'rgba(8, 12, 30, 0.8)';
  ctx.strokeStyle = 'rgba(80, 220, 255, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e8f6ff';
  ctx.font = 'bold 15px system-ui, "Noto Sans TC", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(fighter.name, x + 12, y + 8);

  ctx.font = '12px system-ui, "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#9fb3c8';
  ctx.fillText('HP', x + 12, y + 32);
  ctx.textAlign = 'right';
  ctx.fillText(`${fighter.hp} / ${fighter.maxHp}`, x + w - 12, y + 8);
  drawBar(ctx, x + 36, y + 32, w - 48, 10, fighter.hp, fighter.maxHp, hpColor(fighter.hp / fighter.maxHp));

  if (showMp) {
    ctx.fillStyle = '#9fb3c8';
    ctx.textAlign = 'left';
    ctx.fillText('MP', x + 12, y + 52);
    ctx.textAlign = 'right';
    ctx.fillText(`${fighter.mp} / ${fighter.maxMp}`, x + w - 12, y + 52);
    drawBar(ctx, x + 36, y + 54, w - 108, 8, fighter.mp, fighter.maxMp, '#4aa8ff');
  }
}

function drawScene(canvas, battle) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawBackground(ctx);

  const { player, enemy } = battle;

  // 敵人：右上
  drawPlatform(ctx, 470, 190, 90);
  if (enemy.hp > 0) drawSprite(ctx, enemy.icon, 470, 185, 96);
  drawInfoPanel(ctx, 24, 24, enemy, false);

  // 玩家：左下
  drawPlatform(ctx, 160, 320, 80);
  if (player.defending) {
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(160, 278, 58, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (player.hp > 0) drawSprite(ctx, player.icon, 160, 312, 80);
  drawInfoPanel(ctx, VIEW_WIDTH - 244, VIEW_HEIGHT - 98, player, true);
}
