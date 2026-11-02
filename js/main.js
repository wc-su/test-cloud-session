// 畫面流程與操作：選職業 → 連續戰鬥（每場之間挑強化）→ 魔王 → 破關／戰敗。

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
  choices: document.getElementById('choices'),
  choicesTitle: document.getElementById('choices-title'),
  choicesList: document.getElementById('choices-list'),
};

let player = null; // 整場遊戲沿用的角色
let battle = null; // 目前這一場戰鬥
let busy = false; // 敵人行動中，暫停玩家輸入
let currentChoices = []; // 目前畫面上的選項，供鍵盤選擇

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
    btn.addEventListener('click', () => startGame(cls.id));
    el.classList.appendChild(btn);
  });
}

function showScreen(screen) {
  el.titleScreen.hidden = screen !== 'title';
  el.battleScreen.hidden = screen !== 'battle';
}

function startGame(classId) {
  player = createPlayer(classId);
  el.log.innerHTML = '';
  showScreen('battle');
  startBattle(0);
}

function backToTitle() {
  player = null;
  battle = null;
  hideChoices();
  showScreen('title');
}

// ---------- 戰鬥 ----------

function startBattle(enemyIndex) {
  battle = createBattle(player, enemyIndex);
  busy = false;
  hideChoices();
  el.result.hidden = true;
  el.actions.hidden = false;
  resizeCanvas(el.canvas);
  addLogs([`── ${stageLabel(battle)} ──`, battle.enemy.intro]);
  refresh();
}

function stageLabel(b) {
  return b.isBoss ? '魔王戰' : `第 ${b.enemyIndex + 1} 戰`;
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
  el.actions.hidden = true;

  if (battle.result === 'lose') {
    showResult('戰敗……', '別灰心，換個戰術再從頭挑戰一次吧。');
    showChoices('', [{ name: '回到選擇職業', onPick: backToTitle }]);
    return;
  }

  if (isLastEnemy(battle.enemyIndex)) {
    showResult('破關！', `你擊敗了${battle.enemy.name}，銀河恢復了和平。`);
    showChoices('', [{ name: '再玩一次', onPick: backToTitle }]);
    return;
  }

  showResult('勝利！', '選擇一項強化，並稍作休整後繼續前進。');
  const nextIndex = battle.enemyIndex + 1;
  const options = rollUpgrades().map((up) => ({
    name: up.name,
    desc: up.desc,
    onPick: () => {
      const { hpGain, mpGain } = applyUpgradeAndRecover(player, up);
      addLogs([`獲得「${up.name}」：${up.desc}。休整後回復 ${hpGain} HP、${mpGain} MP。`]);
      startBattle(nextIndex);
    },
  }));
  showChoices('選擇強化', options);
}

function showResult(title, text) {
  el.resultTitle.textContent = title;
  el.resultText.textContent = text;
  el.result.hidden = false;
}

// ---------- 選項面板（強化、再玩一次） ----------

function showChoices(title, options) {
  currentChoices = options;
  el.choicesTitle.textContent = title;
  el.choicesTitle.hidden = !title;
  el.choicesList.innerHTML = '';
  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = `
      <span class="choice-name"><kbd>${i + 1}</kbd> ${opt.name}</span>
      ${opt.desc ? `<span class="choice-desc">${opt.desc}</span>` : ''}`;
    btn.addEventListener('click', () => pickChoice(i));
    el.choicesList.appendChild(btn);
  });
  el.choices.hidden = false;
  el.choicesList.firstElementChild?.focus();
}

function hideChoices() {
  currentChoices = [];
  el.choices.hidden = true;
}

function pickChoice(index) {
  const opt = currentChoices[index];
  if (opt) opt.onPick();
}

// ---------- 事件綁定 ----------

el.btnPhysical.addEventListener('click', () => onAction('physical'));
el.btnMagic.addEventListener('click', () => onAction('magic'));
el.btnDefend.addEventListener('click', () => onAction('defend'));

document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const n = Number(e.key);
  if (!Number.isInteger(n) || n < 1) return;

  if (!el.titleScreen.hidden) {
    const cls = Object.values(CLASSES)[n - 1];
    if (cls) startGame(cls.id);
  } else if (!el.choices.hidden) {
    pickChoice(n - 1);
  } else {
    const map = { 1: 'physical', 2: 'magic', 3: 'defend' };
    if (map[n]) onAction(map[n]);
  }
});

window.addEventListener('resize', () => {
  if (!battle) return;
  resizeCanvas(el.canvas);
  drawScene(el.canvas, battle);
});

renderClassList();
showScreen('title');
