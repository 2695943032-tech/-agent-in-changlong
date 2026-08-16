import type {
  ChatStep,
  Companion,
  RestaurantId,
  VisitorProfile,
} from '../../shared/types/pretrip'
import { animals, restaurants } from '../data/catalog'
import { shortestDistance } from './planner'

const templateByStep: Record<ChatStep, (companion: Companion, answer: string) => string> = {
  party: (companion, answer) => `${companion.name}记下啦：${answer}。接下来把今天的游玩节奏调到最舒服。`,
  pace: (companion, answer) => `${answer}很适合这次同行组合，${companion.name}会据此控制点位数量和步行节奏。`,
  time: companion => `收到，${companion.name}会把开放时间、全时段用餐安排和离园时间一起算进去。`,
  gates: (_companion, answer) => `进出园方式已记好：${answer}。我会从入园门开始，尽量覆盖动物主题展区，并在最后带你到离园门。`,
  dining: (_companion, answer) => `${answer}，我会把用餐放在增加步行最少的位置。`,
  supplement: (companion, answer) => answer
    ? `补充需求也收到啦，${companion.name}会在路线说明里特别提醒。`
    : '没有额外要求也没关系，信息已经足够生成路线。',
  confirm: companion => `${companion.name}正在把你的偏好变成一条真正能走的路线。`,
}

export function fallbackAgentReply(companion: Companion, step: ChatStep, answerSummary: string): string {
  return templateByStep[step](companion, answerSummary)
}

export function recommendRestaurant(profile: VisitorProfile): RestaurantId {
  const topAnimal = animals.find(item => item.id === profile.animalPriority[0])
  if (!topAnimal) return 'panda'

  return [...restaurants]
    .map(restaurant => ({
      id: restaurant.id,
      score: shortestDistance(topAnimal.nodeId, restaurant.nodeId) + restaurant.queueMinutes.normal * 2,
    }))
    .sort((left, right) => left.score - right.score)[0]?.id ?? 'panda'
}
