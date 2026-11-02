// 遊戲資料：職業與敵人。
// 所有數值集中在這裡，之後調整平衡只需要改這個檔案。

const CLASSES = {
  warrior: {
    id: 'warrior',
    name: '裝甲戰士',
    icon: '🦾',
    description: '穿著動力裝甲的前線兵。血量與防禦高，擅長物理攻擊。',
    maxHp: 130,
    maxMp: 20,
    attack: 20,
    defense: 10,
    spell: { name: '震盪斬', cost: 10, power: 26 },
  },
  mage: {
    id: 'mage',
    name: '能量法師',
    icon: '🔮',
    description: '操控高能電漿的術士。身體脆弱，但魔法威力強大。',
    maxHp: 85,
    maxMp: 60,
    attack: 9,
    defense: 5,
    spell: { name: '電漿射線', cost: 12, power: 34 },
  },
};

// resist：受到該類型攻擊時的傷害倍率。大於 1 表示弱點，小於 1 表示抗性。
const ENEMIES = [
  {
    id: 'crawler',
    name: '異星爬蟲',
    icon: '👾',
    maxHp: 60,
    attack: 14,
    defense: 6,
    resist: { physical: 1, magic: 1 },
  },
];

// 戰鬥規則常數
const RULES = {
  physicalDefenseFactor: 0.5, // 物理攻擊會被扣除「防禦 × 0.5」
  magicDefenseFactor: 0.25, // 魔法攻擊較能穿透防禦
  variance: 0.1, // 傷害浮動 ±10%
  defendDamageRate: 0.5, // 防禦時受到的傷害倍率
  defendMpRestoreRate: 0.25, // 防禦時回復最大 MP 的比例
  defendMpRestoreMin: 6, // 防禦時至少回復的 MP
};
