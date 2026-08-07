import type { AnimalId } from '../types/pretrip'
import type { ParkZoneContent } from '../types/park'

export interface ZoneExperienceConfig extends ParkZoneContent {
  theme: {
    accent: string
    accentSoft: string
    ink: string
    pattern: 'bamboo' | 'savanna' | 'canopy' | 'stripe' | 'river' | 'leaf'
  }
  persona: string
  dailyFood: string
  lifeHabits: string
  recommendations: string
  fallback: string
  quickQuestions: string[]
  stampText: string
}

export const zoneExperienceConfigs: Record<AnimalId, ZoneExperienceConfig> = {
  panda: {
    id: 'panda', companionId: 'panda', kicker: '竹林慢观察', badgeName: '竹叶观察员',
    welcome: '嘘，先别急着往前走。团团想请你看看：熊猫今天是抱着竹子坐，还是趴着休息？',
    fact: '大熊猫一天会花很长时间进食，手腕处还有帮助抓握竹子的“伪拇指”。',
    task: {
      id: 'panda-observe',
      title: '前掌观察挑战',
      prompt: '熊猫能把竹竿稳稳夹在前掌里。哪项结构最接近完成这个动作的关键辅助？',
      choices: ['腕部延伸形成的“伪拇指”', '能自由对握的真正拇指', '前掌趾间的蹼'],
      correctChoice: '腕部延伸形成的“伪拇指”',
      successMessage: '判断正确。它并没有真正的拇指，而是借助特化的腕骨固定竹子。',
    },
    theme: { accent: '#d3a536', accentSoft: '#f2e7bb', ink: '#223528', pattern: 'bamboo' },
    persona: '温和、耐心的熊猫科普伙伴团团',
    dailyFood: '竹叶和竹笋为主，园区也会搭配少量苹果作为丰富化食物。',
    lifeHabits: '一天会花很长时间进食和休息，独处时通常安静，活动节奏舒缓。',
    recommendations: '熊猫餐厅位于熊猫主题区，适合看完熊猫后就近用餐。',
    fallback: '这里适合放慢脚步观察熊猫进食；如果你累了，我可以先带你去休息。',
    quickQuestions: ['熊猫今天吃什么？', '它为什么一直在休息？', '带我去最近的洗手间'],
    stampText: '团团认证 · 竹林相遇',
  },
  giraffe: {
    id: 'giraffe', companionId: 'giraffe', kicker: '抬头发现世界', badgeName: '高空瞭望员',
    welcome: '长乐从高处发现你啦。站到安全线后，看看长颈鹿会先伸舌头还是先低头。',
    fact: '长颈鹿的舌头可以帮助卷住树叶，深色舌面也有助于适应长时间取食。',
    task: {
      id: 'giraffe-observe',
      title: '高处取食观察',
      prompt: '面对细枝上的叶片，长颈鹿通常会怎样把叶片送入口中？',
      choices: ['先用灵活的长舌缠卷并拉取', '用角顶落整根树枝再进食', '主要靠上门齿直接咬断'],
      correctChoice: '先用灵活的长舌缠卷并拉取',
      successMessage: '观察到位。灵活的长舌能绕过枝刺，把叶片卷入口中。',
    },
    theme: { accent: '#d98f29', accentSoft: '#f7dfae', ink: '#3a2a19', pattern: 'savanna' },
    persona: '视野开阔、擅长观察的长颈鹿伙伴长乐',
    dailyFood: '合欢树叶、胡萝卜和草本颗粒是日常食谱的重要组成。',
    lifeHabits: '会用长舌卷取叶片，白天常在开阔区域活动和取食。',
    recommendations: '西区餐饮点靠近长颈鹿园方向，适合游览西侧动物区后用餐。',
    fallback: '先沿西侧步道观察长颈鹿取食，我也能把下一站改成离你最近的展区。',
    quickQuestions: ['长颈鹿的舌头为什么这么长？', '哪里最适合合影？', '带我去最近的餐厅'],
    stampText: '长乐认证 · 高空来信',
  },
  gorilla: {
    id: 'gorilla', companionId: 'gorilla', kicker: '灵长类行为课', badgeName: '森林解谜家',
    welcome: '阿悟正在等你。观察一下猩猩的手，它们会不会像我们一样灵活地拿东西？',
    fact: '猩猩会使用简单工具，也会通过表情、动作和声音与同伴沟通。',
    task: {
      id: 'gorilla-observe',
      title: '社交信号推理',
      prompt: '一只猩猩朝同伴拍胸，同时改变面部表情。哪种解释更符合灵长类行为？',
      choices: ['动作与表情可能在传递社交信号', '它只是在通过拍击调节体温', '这表示它的毛色即将发生变化'],
      correctChoice: '动作与表情可能在传递社交信号',
      successMessage: '推理正确。要结合动作、表情与现场情境理解它们的交流。',
    },
    theme: { accent: '#7755ad', accentSoft: '#e7daf5', ink: '#28203a', pattern: 'canopy' },
    persona: '机灵、爱闯关的猩猩伙伴阿悟',
    dailyFood: '热带水果、坚果和绿叶蔬菜会组合成每日食谱。',
    lifeHabits: '群体互动丰富，会通过表情、声音和动作交流，也善于使用简单工具。',
    recommendations: '南门入口距离猩猩馆较近，适合入园后优先前往。',
    fallback: '注意观察它们彼此的动作和表情；遇到排队，我可以立即重排后续路线。',
    quickQuestions: ['猩猩会使用工具吗？', '它们怎么交流？', '前面排队很长，帮我改路线'],
    stampText: '阿悟认证 · 森林暗号',
  },
  tiger: {
    id: 'tiger', companionId: 'tiger', kicker: '猛兽追踪课堂', badgeName: '虎纹追踪者',
    welcome: '凯凯提醒你放轻脚步。观察老虎身上的条纹，每一只的纹路都像独一无二的身份卡。',
    fact: '虎纹不仅有助于在草木光影中隐藏，不同个体的纹路也各不相同。',
    task: {
      id: 'tiger-observe',
      title: '虎纹光影推理',
      prompt: '在斑驳树影中，静止的老虎轮廓会变得不明显。条纹在这里主要起什么作用？',
      choices: ['打散身体轮廓，帮助隐蔽', '储存白天吸收的热量', '放大叫声的传播距离'],
      correctChoice: '打散身体轮廓，帮助隐蔽',
      successMessage: '追踪成功。条纹会切分身体轮廓，让它更容易融入明暗交错的环境。',
    },
    theme: { accent: '#d45a33', accentSoft: '#f5d6c9', ink: '#35211b', pattern: 'stripe' },
    persona: '果断、敏锐的老虎探险伙伴凯凯',
    dailyFood: '牛肉、鸡肉和带骨肉类按饲养计划搭配供给。',
    lifeHabits: '喜欢独立活动，会通过气味标记领地，天气较凉时更容易活跃。',
    recommendations: '老虎园在园区北侧，建议与长颈鹿园连线游览以减少折返。',
    fallback: '老虎园在北侧，若当前人多，我建议先去附近展区再回来。',
    quickQuestions: ['老虎今天吃什么？', '虎纹有什么作用？', '这里人太多，换一站吧'],
    stampText: '凯凯认证 · 虎纹密令',
  },
  elephant: {
    id: 'elephant', companionId: 'elephant', kicker: '象群守护课堂', badgeName: '象群守护者',
    welcome: '澜澜听见你的脚步啦。看看象群靠近时，是不是会用鼻子互相触碰和问候？',
    fact: '象鼻既能闻气味，也能取食、吸水和交流，是非常灵活的重要器官。',
    task: {
      id: 'elephant-observe',
      title: '象鼻动作判断',
      prompt: '大象先用象鼻吸水，再把水送入口中。这个观察更准确地说明了什么？',
      choices: ['象鼻能吸取并搬运水，但不会把水直接送进胃里', '象鼻本身就是直接连到胃部的饮水器官', '象鼻只能闻气味，吸水动作没有实际作用'],
      correctChoice: '象鼻能吸取并搬运水，但不会把水直接送进胃里',
      successMessage: '判断准确。象鼻像灵活的取水工具，吸水后还要把水送入口中。',
    },
    theme: { accent: '#2b91a3', accentSoft: '#d4edf0', ink: '#18363a', pattern: 'river' },
    persona: '稳重、可靠的大象伙伴澜澜',
    dailyFood: '干草、甘蔗和香蕉等高纤维食物会按计划组合供给。',
    lifeHabits: '亚洲象群体关系紧密，会用鼻子探索、取食、饮水并进行触觉交流。',
    recommendations: '大象园附近有休息和餐饮选择，适合家庭游客途中休整。',
    fallback: '大象园附近有休息和餐饮选择；你累了就告诉我，我会把休息插入行程。',
    quickQuestions: ['大象一天吃多少？', '象鼻能做什么？', '我有点累，带我去休息'],
    stampText: '澜澜认证 · 河谷回声',
  },
  koala: {
    id: 'koala', companionId: 'koala', kicker: '慢生活研究所', badgeName: '桉叶研究员',
    welcome: '地图保留了原来的豹馆轮廓，这里现在是悠米的考拉奇遇站。先找找它最喜欢停在哪根树枝上。',
    fact: '考拉主要以桉树叶为食，会通过长时间休息来节省能量。',
    task: {
      id: 'koala-observe',
      title: '能量策略推理',
      prompt: '桉树叶能量较低，消化也需要较长时间。考拉每天长时间休息，最合理的解释是？',
      choices: ['通过降低活动量节省能量', '等待毛色随树皮改变', '为长时间水下活动做准备'],
      correctChoice: '通过降低活动量节省能量',
      successMessage: '推理正确。减少不必要的活动，是它适应低能量食物的重要策略。',
    },
    theme: { accent: '#5c9274', accentSoft: '#dbeadc', ink: '#1e382b', pattern: 'leaf' },
    persona: '松弛、细心的考拉伙伴悠米',
    dailyFood: '以新鲜桉树叶为主，饲养员会根据个体偏好选择不同桉树品种。',
    lifeHabits: '每天会长时间休息以节省能量，清晨和傍晚通常更活跃。',
    recommendations: '考拉区域靠近大象园和家庭餐饮点，适合作为连续游览段。',
    fallback: '考拉多数时间在休息，可以安静观察；需要时我能帮你跳过或调整下一站。',
    quickQuestions: ['考拉为什么总在睡觉？', '它们只吃桉树叶吗？', '带我去考拉食街'],
    stampText: '悠米认证 · 桉叶慢邮',
  },
}

export const parkZones = Object.values(zoneExperienceConfigs)
