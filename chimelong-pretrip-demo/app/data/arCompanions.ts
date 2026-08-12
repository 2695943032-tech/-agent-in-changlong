import type { CompanionId } from '../../shared/types/pretrip'

export interface ArCompanionScript {
  greeting: string
  discovery: string
  safety: string
  idleLines: string[]
  quickQuestions: string[]
}

export const arCompanionScripts: Record<CompanionId, ArCompanionScript> = {
  panda: {
    greeting: '嘘——团团已经把声音调小啦。我们慢一点，看看它今天先挑嫩竹叶，还是先啃竹秆。',
    discovery: '你发现熊猫村啦！注意它前掌握竹子的方式，那块像拇指一样的腕骨可是秘密工具。',
    safety: '站在护栏外安静观察，不投喂、不敲玻璃，动物会更愿意展示自然状态。',
    idleLines: ['跟着团团深呼吸，我们做安静的观察员。', '看见有趣动作就告诉我，我帮你记进奇遇档案。'],
    quickQuestions: ['它为什么能抓住竹子？', '现在适合拍照吗？', '给我一个观察任务'],
  },
  tiger: {
    greeting: '凯凯就位。先别急着找老虎，观察草木阴影里有没有一段不自然的条纹。',
    discovery: '锁定虎园目标！每只老虎的纹路都独一无二，就像属于它自己的身份证。',
    safety: '保持在观赏线后，不用闪光灯，也不要用声音吸引动物靠近。',
    idleLines: ['真正厉害的追踪者先观察，再行动。', '风吹草动也可能是线索，慢慢扫过画面。'],
    quickQuestions: ['虎纹有什么作用？', '哪里观察视野最好？', '老虎现在在做什么？'],
  },
  koala: {
    greeting: '悠米来了。抬头找树杈，我们不催它——慢慢生活也是一种很棒的本领。',
    discovery: '发现考拉！它长时间休息，是为了把桉树叶里有限的能量用得更久。',
    safety: '保持轻声，关闭闪光灯；安静的环境能让它睡得更安心。',
    idleLines: ['没看到也没关系，找找树枝交叉的位置。', '我们把步子放慢，惊喜通常藏在安静里。'],
    quickQuestions: ['考拉为什么总在睡？', '它只吃桉树叶吗？', '帮我找最佳观察角度'],
  },
  elephant: {
    greeting: '澜澜听见你的脚步了。我们先站稳，再观察象鼻今天是在闻气味、取食，还是互相问候。',
    discovery: '识别到亚洲象！象鼻既能感知细微气味，也能完成取食、饮水和触觉交流。',
    safety: '请勿跨越护栏或伸手投喂，给象群保留舒适、稳定的活动空间。',
    idleLines: ['先看象鼻，再看耳朵和身体方向。', '如果同行伙伴累了，我也能帮你找最近的休息点。'],
    quickQuestions: ['象鼻到底有多灵活？', '象群怎样交流？', '附近有休息区吗？'],
  },
  giraffe: {
    greeting: '长乐从高处发现你啦。把镜头稍微抬高，我们去找正在树梢间移动的长脖子。',
    discovery: '发现长颈鹿！注意它深色而灵活的舌头，能绕开枝刺卷下喜欢的树叶。',
    safety: '请在指定区域观察和互动，不追赶、不擅自投喂，给它留出转身空间。',
    idleLines: ['抬头，世界会多出一层风景。', '试着观察它迈步时同一侧的前后腿。'],
    quickQuestions: ['它的舌头为什么这么长？', '怎么拍到全身合影？', '给我一个高空观察任务'],
  },
  gorilla: {
    greeting: '阿悟登场！别只盯着体型，看看它的眼神、手势和同伴距离，那才是交流密码。',
    discovery: '发现灵长类伙伴！一个拍胸或转头动作，要结合当时的同伴与环境一起理解。',
    safety: '避免直视、拍打玻璃或模仿挑衅动作，让它们按照自己的节奏相处。',
    idleLines: ['动作只是半句话，环境才是另外一半。', '找到两个正在互动的个体了吗？我们一起解读。'],
    quickQuestions: ['它们怎么表达情绪？', '猩猩会使用工具吗？', '出一道互动观察题'],
  },
}
