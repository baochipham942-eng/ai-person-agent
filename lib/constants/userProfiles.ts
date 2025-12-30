// 随机用户昵称和头像
const NICKNAMES = [
    "探索者", "好奇猫", "求知者", "小星星", "思考者",
    "学习达人", "知识猎人", "阅读家", "研究员", "追光者"
];

const EMOJIS = ["🌟", "🎯", "📚", "🔍", "💡", "🚀", "🎨", "🌈", "⭐", "🔮"];

export function getRandomProfile() {
    const nickname = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
    const avatar = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    return { nickname, avatar };
}
