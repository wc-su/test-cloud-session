// 戰鬥邏輯：不碰畫面，只處理數值與回合。
// 每個動作回傳 logs（文字訊息）與 events（給畫面播放特效用的結構化事件）。

// 玩家角色在整場遊戲中沿用，強化與受傷都會延續到下一場
function createPlayer(classId) {
  const cls = CLASSES[classId];
  return {
    ...cls,
    spell: { ...cls.spell }, // 複製一份，避免強化時改到原始資料
    hp: cls.maxHp,
    mp: cls.maxMp,
    defending: false,
  };
}

function createBattle(player, enemyIndex) {
  const enemy = ENEMIES[enemyIndex];
  player.defending = false;
  return {
    player,
    enemy: { ...enemy, hp: enemy.maxHp, turns: 0, charging: false },
    enemyIndex,
    isBoss: Boolean(enemy.boss),
    result: null, // null：進行中，'win'：勝利，'lose'：失敗
  };
}

function rollVariance(rng) {
  return 1 - RULES.variance + rng() * RULES.variance * 2;
}

function calcDamage(power, defense, defenseFactor, resist, rng) {
  const base = Math.max(1, power - defense * defenseFactor);
  return Math.max(1, Math.round(base * resist * rollVariance(rng)));
}

function resistEffect(resist) {
  if (resist > 1) return 'weak';
  if (resist < 1) return 'resist';
  return 'normal';
}

function resistMessage(resist) {
  if (resist > 1) return '效果絕佳！';
  if (resist < 1) return '效果不佳……';
  return '';
}

function canCastSpell(battle) {
  return battle.player.mp >= battle.player.spell.cost;
}

// action：'physical'、'magic'、'defend'
function playerAct(battle, action, rng = Math.random) {
  const { player, enemy } = battle;
  const logs = [];
  const events = [];

  if (action === 'physical') {
    const resist = enemy.resist.physical;
    const dmg = calcDamage(player.attack, enemy.defense, RULES.physicalDefenseFactor, resist, rng);
    enemy.hp = Math.max(0, enemy.hp - dmg);
    events.push({ type: 'damage', target: 'enemy', amount: dmg, effect: resistEffect(resist) });
    logs.push(`${player.name}發動物理攻擊！${resistMessage(resist)}對${enemy.name}造成 ${dmg} 點傷害。`);
  } else if (action === 'magic') {
    if (!canCastSpell(battle)) {
      return { ok: false, logs: ['MP 不足，無法施放魔法。'], events };
    }
    const resist = enemy.resist.magic;
    player.mp -= player.spell.cost;
    const dmg = calcDamage(player.spell.power, enemy.defense, RULES.magicDefenseFactor, resist, rng);
    enemy.hp = Math.max(0, enemy.hp - dmg);
    events.push({ type: 'damage', target: 'enemy', amount: dmg, effect: resistEffect(resist), magic: true });
    logs.push(`${player.name}施放「${player.spell.name}」！${resistMessage(resist)}對${enemy.name}造成 ${dmg} 點傷害。`);
  } else if (action === 'defend') {
    player.defending = true;
    const restore = Math.min(
      player.maxMp - player.mp,
      Math.max(RULES.defendMpRestoreMin, Math.round(player.maxMp * RULES.defendMpRestoreRate)),
    );
    player.mp += restore;
    events.push({ type: 'defend', target: 'player', amount: restore });
    logs.push(`${player.name}擺出防禦姿態，回復 ${restore} 點 MP。`);
  } else {
    throw new Error(`未知的行動：${action}`);
  }

  if (enemy.hp <= 0) {
    battle.result = 'win';
    events.push({ type: 'defeat', target: 'enemy' });
    logs.push(`${enemy.name}被擊倒了！`);
  }
  return { ok: true, logs, events };
}

function enemyAct(battle, rng = Math.random) {
  const { player, enemy } = battle;
  const logs = [];
  const events = [];
  const boss = enemy.boss;
  let heavy = false;

  let power = enemy.attack;
  let skillName = '攻擊';

  if (boss && enemy.charging) {
    enemy.charging = false;
    power = Math.round(enemy.attack * boss.heavyMultiplier);
    skillName = `「${boss.heavyName}」`;
    heavy = true;
  } else if (boss && (enemy.turns + 1) % boss.chargeEvery === 0) {
    enemy.charging = true;
    enemy.turns += 1;
    player.defending = false;
    events.push({ type: 'charge', target: 'enemy' });
    logs.push(`${enemy.name}正在蓄積能量……下一回合將發動「${boss.heavyName}」！`);
    return { logs, events };
  }

  let dmg = calcDamage(power, player.defense, RULES.physicalDefenseFactor, 1, rng);
  if (player.defending) dmg = Math.max(1, Math.round(dmg * RULES.defendDamageRate));
  player.hp = Math.max(0, player.hp - dmg);
  events.push({ type: 'damage', target: 'player', amount: dmg, effect: heavy ? 'heavy' : 'normal', blocked: player.defending });
  logs.push(`${enemy.name}發動${skillName}！${player.name}受到 ${dmg} 點傷害${player.defending ? '（防禦減傷）' : ''}。`);
  player.defending = false;
  enemy.turns += 1;

  if (player.hp <= 0) {
    battle.result = 'lose';
    events.push({ type: 'defeat', target: 'player' });
    logs.push(`${player.name}倒下了……`);
  }
  return { logs, events };
}

// ---------- 戰鬥之間 ----------

function isLastEnemy(enemyIndex) {
  return enemyIndex >= ENEMIES.length - 1;
}

// 從該職業可用的強化選項中，隨機抽出不重複的幾個
function rollUpgrades(player, rng = Math.random) {
  const pool = UPGRADES.filter((u) => !u.classes || u.classes.includes(player.id));
  const picks = [];
  while (picks.length < RULES.upgradeChoices && pool.length > 0) {
    picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return picks;
}

// 套用強化後，再依比例回復 HP 與 MP；回傳實際回復量
function applyUpgradeAndRecover(player, upgrade) {
  upgrade.apply(player);
  const hpGain = Math.min(player.maxHp - player.hp, Math.round(player.maxHp * RULES.recoverRate));
  const mpGain = Math.min(player.maxMp - player.mp, Math.round(player.maxMp * RULES.recoverRate));
  player.hp += hpGain;
  player.mp += mpGain;
  return { hpGain, mpGain };
}
