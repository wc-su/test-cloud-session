// 畫面流程與操作：
// 選職業 → 開場白 → 連續戰鬥（每場之間挑強化）→ 魔王 → 破關／戰敗。

const ENEMY_TURN_DELAY = 750; // 敵人行動前的停頓（毫秒）
const DEFEAT_DELAY = 900; // 有人倒下後，等倒下動畫播完再顯示結果
const MAX_LOG_LINES = 6;

const $ = (id) => document.getElementById(id);
const el = {
  titleScreen: $('title-screen'),
  introScreen: $('intro-screen'),
  battleScreen: $('battle-screen'),
  classList: $('class-list'),
  introLines: $('intro-lines'),
  btnIntro: $('btn-intro'),
  stageLabel: $('stage-label'),
  canvas: $('battle-canvas'),
  enemyStatus: $('enemy-status'),
  playerStatus: $('player-status'),
  log: $('battle-log'),
  actions: $('actions'),
  btnPhysical: $('btn-physical'),
  btnMagic: $('btn-magic'),
  btnDefend: $('btn-defend'),
  result: $('result'),
  resultTitle: $('result-title'),
  resultText: $('result-text'),
  choices: $('choices'),
  choicesTitle: $('choices-title'),
  choicesList: $('choices-list'),
};

let player = null; // 整場遊戲沿用的角色
let battle = null; // 目前這一場戰鬥
let busy = false; // 動畫或敵人行動中，暫停玩家輸入
let turnCount = 0; // 整場遊戲累計回合數
let currentChoices = []; // 目前畫面上的選項，供鍵盤選擇

// ---------- 畫面切換 ----------

function showScreen(screen) {
  el.titleScreen.hidden = screen !== 'title';
  el.introScreen.hidden = screen !== 'intro';
  el.battleScreen.hidden = screen !== 'battle';
}

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

// ---------- 開場白 ----------

function startGame(classId) {
  player = createPlayer(classId);
  turnCount = 0;
  const boss = ENEMIES[ENEMIES.length - 1];
  const lines = [
    '西元 3172 年，人類的殖民星系遭到不明勢力入侵。',
    `入侵者的首領「${boss.name}」率領異星軍團，正逼近人類最後的防線。`,
    `身為${player.name}的你，奉命獨自突破敵陣。`,
    '打倒魔王，守住銀河的未來吧！',
  ];
  el.introLines.innerHTML = '';
  lines.forEach((text, i) => {
    const p = document.createElement('p');
    p.textContent = text;
    p.style.animationDelay = `${i * 0.6}s`;
    el.introLines.appendChild(p);
  });
  el.btnIntro.style.animationDelay = `${lines.length * 0.6}s`;
  showScreen('intro');
  el.btnIntro.focus();
}

function beginBattles() {
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
  resetEffects();
  hideChoices();
  el.result.hidden = true;
  el.actions.hidden = false;
  resizeCanvas(el.canvas);

  const label = battle.isBoss ? '魔王戰' : `第 ${enemyIndex + 1} / ${ENEMIES.length - 1} 戰`;
  el.stageLabel.textContent = label;
  el.stageLabel.classList.toggle('boss', battle.isBoss);
  addLogs([`── ${label} ──`, battle.enemy.intro]);
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

function resistHint(resist) {
  const weak = [];
  const strong = [];
  if (resist.physical > 1) weak.push('物理');
  if (resist.magic > 1) weak.push('魔法');
  if (resist.physical < 1) strong.push('物理');
  if (resist.magic < 1) strong.push('魔法');
  const parts = [];
  if (weak.length) parts.push(`弱點：${weak.join('、')}`);
  if (strong.length) parts.push(`抗性：${strong.join('、')}`);
  return parts.join('｜');
}

function setBar(fill, value, max) {
  const ratio = max > 0 ? value / max : 0;
  fill.style.width = `${ratio * 100}%`;
  if (fill.classList.contains('hp')) {
    fill.classList.toggle('mid', ratio <= 0.5 && ratio > 0.2);
    fill.classList.toggle('low', ratio <= 0.2);
  }
}

function updateStatus() {
  const { enemy } = battle;
  const e = el.enemyStatus;
  e.querySelector('.status-name').textContent = `${enemy.icon} ${enemy.name}`;
  e.querySelector('.status-hp-num').textContent = `${enemy.hp} / ${enemy.maxHp}`;
  setBar(e.querySelector('.bar-fill.hp'), enemy.hp, enemy.maxHp);
  e.querySelector('.status-hint').textContent = resistHint(enemy.resist);

  const p = el.playerStatus;
  p.querySelector('.status-name').textContent = `${player.icon} ${player.name}`;
  p.querySelector('.status-hp-num').textContent = `${player.hp} / ${player.maxHp}`;
  p.querySelector('.status-mp-num').textContent = `${player.mp} / ${player.maxMp}`;
  setBar(p.querySelector('.bar-fill.hp'), player.hp, player.maxHp);
  setBar(p.querySelector('.bar-fill.mp'), player.mp, player.maxMp);
}

function refresh() {
  updateStatus();
  el.btnMagic.querySelector('.label').textContent = `${player.spell.name}（${player.spell.cost} MP）`;
  const locked = busy || battle.result !== null;
  el.btnPhysical.disabled = locked;
  el.btnDefend.disabled = locked;
  el.btnMagic.disabled = locked || !canCastSpell(battle);
}

function play(outcome) {
  addLogs(outcome.logs);
  outcome.events.forEach(playEvent);
}

function onAction(action) {
  if (!battle || busy || battle.result) return;
  if (action === 'magic' && !canCastSpell(battle)) return;

  const outcome = playerAct(battle, action);
  if (!outcome.ok) {
    addLogs(outcome.logs);
    return;
  }
  turnCount += 1;
  play(outcome);
  busy = true;
  refresh();

  if (battle.result) {
    setTimeout(endBattle, DEFEAT_DELAY);
    return;
  }

  setTimeout(() => {
    play(enemyAct(battle));
    if (battle.result) {
      refresh();
      setTimeout(endBattle, DEFEAT_DELAY);
      return;
    }
    busy = false;
    refresh();
  }, ENEMY_TURN_DELAY);
}

function endBattle() {
  el.actions.hidden = true;

  if (battle.result === 'lose') {
    showResult('戰敗……', `${player.name}在${battle.enemy.name}面前倒下了。調整戰術，再挑戰一次吧。`);
    showChoices('', [{ name: '回到選擇職業', onPick: backToTitle }]);
    return;
  }

  if (isLastEnemy(battle.enemyIndex)) {
    showResult('破關！', `${battle.enemy.name}被擊敗，異星軍團撤退了。你以 ${turnCount} 個回合守住了銀河。`);
    showChoices('', [{ name: '再玩一次', onPick: backToTitle }]);
    return;
  }

  showResult('勝利！', '選擇一項強化，並稍作休整後繼續前進。');
  const nextIndex = battle.enemyIndex + 1;
  const options = rollUpgrades(player).map((up) => ({
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
el.btnIntro.addEventListener('click', beginBattles);

document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const n = Number(e.key);
  if (!Number.isInteger(n) || n < 1) return;

  if (!el.titleScreen.hidden) {
    const cls = Object.values(CLASSES)[n - 1];
    if (cls) startGame(cls.id);
  } else if (!el.introScreen.hidden) {
    if (n === 1) beginBattles();
  } else if (!el.choices.hidden) {
    pickChoice(n - 1);
  } else {
    const map = { 1: 'physical', 2: 'magic', 3: 'defend' };
    if (map[n]) onAction(map[n]);
  }
});

window.addEventListener('resize', () => {
  if (battle) resizeCanvas(el.canvas);
});

renderClassList();
showScreen('title');
startRenderLoop(el.canvas, () => (el.battleScreen.hidden ? null : battle));
