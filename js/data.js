// 遊戲資料：職業、敵人、強化選項與戰鬥規則。
// 所有數值集中在這裡，之後調整平衡只需要改這個檔案。

const CLASSES = {
  warrior: {
    id: 'warrior',
    name: '裝甲戰士',
    icon: '🦾',
    description: '穿著動力裝甲的前線兵。血量與防禦高，擅長物理攻擊。',
    maxHp: 120,
    maxMp: 20,
    attack: 20,
    defense: 10,
    spell: { name: '震盪斬', cost: 10, power: 22 },
  },
  mage: {
    id: 'mage',
    name: '能量法師',
    icon: '🔮',
    description: '操控高能電漿的術士。身體脆弱，但魔法威力強大。',
    maxHp: 95,
    maxMp: 70,
    attack: 9,
    defense: 5,
    spell: { name: '電漿射線', cost: 12, power: 34 },
  },
};

// 依序出場的敵人，最後一隻是魔王。
// resist：受到該類型攻擊時的傷害倍率。大於 1 表示弱點，小於 1 表示抗性。
const ENEMIES = [
  {
    id: 'crawler',
    name: '異星爬蟲',
    icon: '👾',
    intro: '警報！異星爬蟲擋住了去路！',
    maxHp: 60,
    attack: 14,
    defense: 6,
    resist: { physical: 1, magic: 1 },
  },
  {
    id: 'mech',
    name: '巡邏機械兵',
    icon: '🤖',
    intro: '巡邏機械兵鎖定了你。厚重的裝甲似乎不怕物理攻擊，但電路可能經不起能量衝擊。',
    maxHp: 80,
    attack: 17,
    defense: 14,
    resist: { physical: 0.6, magic: 1.5 },
  },
  {
    id: 'vortex',
    name: '能量漩渦體',
    icon: '🌀',
    intro: '能量漩渦體從裂隙中湧出。它會吸收能量攻擊，但實體衝擊能打散它的形體。',
    maxHp: 75,
    attack: 20,
    defense: 4,
    resist: { physical: 1.5, magic: 0.5 },
  },
  {
    id: 'boss',
    name: '星際魔王 澤諾斯',
    icon: '👽',
    intro: '星際魔王 澤諾斯現身了！小心，牠會蓄積能量後發動毀滅性的攻擊。',
    maxHp: 150,
    attack: 17,
    defense: 10,
    resist: { physical: 1, magic: 1 },
    boss: {
      chargeEvery: 3, // 每隔幾回合蓄力一次
      heavyName: '毀滅光束',
      heavyMultiplier: 2.2, // 大招的攻擊力倍率
    },
  },
];

// 每打贏一場（魔王戰除外），從中隨機抽出幾個讓玩家挑一個。
// classes：只有這些職業會抽到；沒寫表示所有職業都會抽到。
const UPGRADES = [
  { id: 'attack', name: '強化動力拳套', desc: '攻擊 +4', classes: ['warrior'], apply: (p) => { p.attack += 4; } },
  { id: 'hp', name: '奈米修復裝甲', desc: '最大 HP +20', apply: (p) => { p.maxHp += 20; p.hp += 20; } },
  { id: 'defense', name: '偏折力場', desc: '防禦 +3', apply: (p) => { p.defense += 3; } },
  { id: 'mp', name: '擴充能量核心', desc: '最大 MP +10', apply: (p) => { p.maxMp += 10; p.mp += 10; } },
  { id: 'spell', name: '超載迴路', desc: '魔法威力 +8', classes: ['mage'], apply: (p) => { p.spell.power += 8; } },
];

// 戰鬥規則常數
const RULES = {
  physicalDefenseFactor: 0.5, // 物理攻擊會被扣除「防禦 × 0.5」
  magicDefenseFactor: 0.25, // 魔法攻擊較能穿透防禦
  variance: 0.1, // 傷害浮動 ±10%
  defendDamageRate: 0.5, // 防禦時受到的傷害倍率
  defendMpRestoreRate: 0.25, // 防禦時回復最大 MP 的比例
  defendMpRestoreMin: 6, // 防禦時至少回復的 MP
  upgradeChoices: 3, // 每次提供幾個強化選項
  recoverRate: 0.3, // 每場勝利後回復最大 HP、MP 的比例
};
