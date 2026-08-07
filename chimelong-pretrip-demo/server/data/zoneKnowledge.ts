import type { AnimalId } from '../../shared/types/pretrip'
import { zoneExperienceConfigs } from '#shared/data/zoneExperience'

export interface ZoneKnowledge {
  id: AnimalId
  persona: string
  dailyFood: string
  lifeHabits: string
  recommendations: string
  fallback: string
}

export const zoneKnowledge = Object.fromEntries(
  Object.entries(zoneExperienceConfigs).map(([id, config]) => [id, {
    id,
    persona: config.persona,
    dailyFood: config.dailyFood,
    lifeHabits: config.lifeHabits,
    recommendations: config.recommendations,
    fallback: config.fallback,
  }]),
) as Record<AnimalId, ZoneKnowledge>
