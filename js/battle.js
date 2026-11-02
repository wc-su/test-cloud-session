// 戰鬥邏輯：不碰畫面，只處理數值與回合。
// 每個動作都回傳一串訊息，交給畫面層顯示。

function createBattle(classId, enemyIndex) {
  const cls = CLASSES[classId];
  const enemy = ENEMIES[enemyIndex];
  return {
    player: { ...cls, hp: cls.maxHp, mp: cls.maxMp, defending: false },
    enemy: { ...enemy, hp: enemy.maxHp },
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

  if (action === 'physical') {
    const resist = enemy.resist.physical;
    const dmg = calcDamage(player.attack, enemy.defense, RULES.physicalDefenseFactor, resist, rng);
    enemy.hp = Math.max(0, enemy.hp - dmg);
    logs.push(`${player.name}發動物理攻擊！${resistMessage(resist)}對${enemy.name}造成 ${dmg} 點傷害。`);
  } else if (action === 'magic') {
    if (!canCastSpell(battle)) {
      return { ok: false, logs: ['MP 不足，無法施放魔法。'] };
    }
    const resist = enemy.resist.magic;
    player.mp -= player.spell.cost;
    const dmg = calcDamage(player.spell.power, enemy.defense, RULES.magicDefenseFactor, resist, rng);
    enemy.hp = Math.max(0, enemy.hp - dmg);
    logs.push(`${player.name}施放「${player.spell.name}」！${resistMessage(resist)}對${enemy.name}造成 ${dmg} 點傷害。`);
  } else if (action === 'defend') {
    player.defending = true;
    const restore = Math.min(
      player.maxMp - player.mp,
      Math.max(RULES.defendMpRestoreMin, Math.round(player.maxMp * RULES.defendMpRestoreRate)),
    );
    player.mp += restore;
    logs.push(`${player.name}擺出防禦姿態，回復 ${restore} 點 MP。`);
  } else {
    throw new Error(`未知的行動：${action}`);
  }

  if (enemy.hp <= 0) {
    battle.result = 'win';
    logs.push(`${enemy.name}被擊倒了！`);
  }
  return { ok: true, logs };
}

function enemyAct(battle, rng = Math.random) {
  const { player, enemy } = battle;
  const logs = [];

  let dmg = calcDamage(enemy.attack, player.defense, RULES.physicalDefenseFactor, 1, rng);
  if (player.defending) dmg = Math.max(1, Math.round(dmg * RULES.defendDamageRate));
  player.hp = Math.max(0, player.hp - dmg);
  logs.push(`${enemy.name}發動攻擊！${player.name}受到 ${dmg} 點傷害${player.defending ? '（防禦減傷）' : ''}。`);
  player.defending = false;

  if (player.hp <= 0) {
    battle.result = 'lose';
    logs.push(`${player.name}倒下了……`);
  }
  return { logs };
}
