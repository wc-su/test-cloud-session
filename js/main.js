// 畫面流程與操作：選職業 → 戰鬥 → 結果。

const ENEMY_TURN_DELAY = 700; // 敵人行動前的停頓（毫秒）
const MAX_LOG_LINES = 6;

const el = {
  titleScreen: document.getElementById('title-screen'),
  battleScreen: document.getElementById('battle-screen'),
  classList: document.getElementById('class-list'),
  canvas: document.getElementById('battle-canvas'),
  log: document.getElementById('battle-log'),
  actions: document.getElementById('actions'),
  btnPhysical: document.getElementById('btn-physical'),
  btnMagic: document.getElementById('btn-magic'),
  btnDefend: document.getElementById('btn-defend'),
  result: document.getElementById('result'),
  resultTitle: document.getElementById('result-title'),
  resultText: document.getElementById('result-text'),
  btnRestart: document.getElementById('btn-restart'),
};

let battle = null;
let busy = false;

// ---------- 選職業 ----------

function renderClassList() {
  el.classList.innerHTML = '';
  Object.values(CLASSES).forEach((cls, i) => {
    const btn = document.createElement('button');
    btn.className = 'class-card';
    btn.type = 'button';
    btn.innerHTML = `
      <span class="class-icon">${cls.icon}</span>
      <span class="class-name"><kbd>${i + 1}</kbd> ${cls.name}</span>
      <span class="class-desc">${cls.description}</span>
      <span class="class-stats">
        HP ${cls.maxHp}　MP ${cls.maxMp}　攻擊 ${cls.attack}　防禦 ${cls.defense}<br>
        魔法「${cls.spell.name}」：威力 ${cls.spell.power}，消耗 ${cls.spell.cost} MP
      </span>`;
    btn.addEventListener('click', () => startBattle(cls.id));
    el.classList.appendChild(btn);
  });
}

function showScreen(screen) {
  el.titleScreen.hidden = screen !== 'title';
  el.battleScreen.hidden = screen !== 'battle';
}

// ---------- 戰鬥 ----------

function startBattle(classId) {
  battle = createBattle(classId, 0);
  busy = false;
  el.log.innerHTML = '';
  el.result.hidden = true;
  showScreen('battle');
  resizeCanvas(el.canvas);
  addLogs([`警報！${battle.enemy.name}擋住了去路！`]);
  refresh();
}

function addLogs(lines) {
  for (const line of lines) {
    const li = document.createElement('li');
    li.textContent = line;
    el.log.appendChild(li);
  }
  while (el.log.children.length > MAX_LOG_LINES) el.log.firstChild.remove();
}

function refresh() {
  drawScene(el.canvas, battle);
  const { player } = battle;
  el.btnMagic.querySelector('.label').textContent = `${player.spell.name}（${player.spell.cost} MP）`;
  const locked = busy || battle.result !== null;
  el.btnPhysical.disabled = locked;
  el.btnDefend.disabled = locked;
  el.btnMagic.disabled = locked || !canCastSpell(battle);
}

function onAction(action) {
  if (!battle || busy || battle.result) return;
  if (action === 'magic' && !canCastSpell(battle)) return;

  const { ok, logs } = playerAct(battle, action);
  addLogs(logs);
  if (!ok) return;

  if (battle.result) {
    refresh();
    endBattle();
    return;
  }

  busy = true;
  refresh();
  setTimeout(() => {
    addLogs(enemyAct(battle).logs);
    busy = false;
    refresh();
    if (battle.result) endBattle();
  }, ENEMY_TURN_DELAY);
}

function endBattle() {
  const win = battle.result === 'win';
  el.resultTitle.textContent = win ? '勝利！' : '戰敗……';
  el.resultText.textContent = win
    ? `你擊倒了${battle.enemy.name}。（第一階段到此為止，之後會加入更多敵人與魔王。）`
    : '別灰心，換個戰術再試一次吧。';
  el.result.hidden = false;
  el.btnRestart.focus();
}

// ---------- 事件綁定 ----------

el.btnPhysical.addEventListener('click', () => onAction('physical'));
el.btnMagic.addEventListener('click', () => onAction('magic'));
el.btnDefend.addEventListener('click', () => onAction('defend'));
el.btnRestart.addEventListener('click', () => {
  battle = null;
  showScreen('title');
});

document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (!el.titleScreen.hidden) {
    const cls = Object.values(CLASSES)[Number(e.key) - 1];
    if (cls) startBattle(cls.id);
    return;
  }
  const map = { 1: 'physical', 2: 'magic', 3: 'defend' };
  if (map[e.key]) onAction(map[e.key]);
});

window.addEventListener('resize', () => {
  if (!battle) return;
  resizeCanvas(el.canvas);
  drawScene(el.canvas, battle);
});

renderClassList();
showScreen('title');
