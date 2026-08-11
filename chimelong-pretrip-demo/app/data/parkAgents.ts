import type { CompanionId } from '../../shared/types/pretrip'

export interface ParkAgentDefinition {
  id: CompanionId
  role: string
  zones: string[]
  specialties: string[]
  arrivalPrompt: string
}

/**
 * 动物伙伴的职责配置。地图到达、主动提醒和任务文案均从这里读取，
 * 不再由多个 if/else 临时决定，避免六个 Agent 只有头像不同。
 */
export const parkAgents: ParkAgentDefinition[] = [
  { id: 'panda', role: '亲子规划与儿童科普', zones: ['panda'], specialties: ['亲子路线', '演出提醒', '儿童科普'], arrivalPrompt: '我来帮你把亲子节奏、下一场演出和孩子的休息时间安排得更从容。' },
  { id: 'tiger', role: '虎园、刺激体验与错峰建议', zones: ['tiger'], specialties: ['刺激体验', '错峰建议', '虎园热度'], arrivalPrompt: '虎园此刻的热度和最佳观察位置，我会替你盯着。' },
  { id: 'koala', role: '休息、慢游与餐饮', zones: ['koala'], specialties: ['慢游', '儿童餐', '休息点'], arrivalPrompt: '想慢一点逛、找儿童餐或休息区，都可以交给我。' },
  { id: 'elephant', role: '安全、母婴、无障碍与服务导航', zones: ['elephant'], specialties: ['母婴室', '无障碍', '服务导航'], arrivalPrompt: '厕所、母婴室、无障碍路线和安全服务，我会优先帮你处理。' },
  { id: 'giraffe', role: '观察任务与拍照引导', zones: ['giraffe'], specialties: ['观察任务', '拍照机位', '合照'], arrivalPrompt: '抬头看看长颈鹿的进食和步态，完成观察后还能解锁纪念徽章。' },
  { id: 'gorilla', role: '互动任务与答题', zones: ['gorilla'], specialties: ['互动问答', '观察挑战', '徽章'], arrivalPrompt: '我们用一个小问题，发现黑猩猩的社交秘密吧。' },
]

export function getParkAgent(id: CompanionId) {
  return parkAgents.find(agent => agent.id === id)
}
