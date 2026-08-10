<script setup lang="ts">
import type { AnimalId, CatalogResponse, CompanionId } from '../../../shared/types/pretrip'
import type { JourneyEvent, JourneyRecord } from '../../../shared/types/journey'
import MemoryBook from '../../components/posttrip/MemoryBook.vue'
import { createDemoJourneyRecord } from '../../utils/journeyRecord'
import { zoneExperienceConfigs } from '#shared/data/zoneExperience'

useHead({ title: '回忆星册 · 长隆奇遇伙伴' })
const journeys = useJourneyRecords()
const park = useParkJourney()
const pretrip = usePretripJourney()
const agentUnlocks = useAgentUnlocks()
const fieldObservations = useFieldObservations()
const { data: catalog } = await useFetch<CatalogResponse>('/api/catalog', { key: 'memory-book-catalog' })
const demo = createDemoJourneyRecord()
type SessionTimelineItem = {
  id: string
  type: string
  createdAt?: number
  role?: 'user' | 'assistant'
  text?: string
  agentName?: string
  startLabel?: string
  service?: { name: string }
  location?: {
    kind: 'animal' | 'dining'
    unlocked?: boolean
    scienceAnswer?: string
    zone?: { id: AnimalId, name: string }
    companion?: { id: CompanionId, name: string }
    service?: { name: string }
  }
}
const localTimeline = useState<SessionTimelineItem[]>('pretrip-local-messages', () => [])
const realBaseJourney = computed(() => journeys.completedRecords.value.find(record => !record.id.startsWith('agent-ticket-'))
  ?? (journeys.activeRecord.value && !journeys.activeRecord.value.id.startsWith('agent-ticket-') ? journeys.activeRecord.value : null))
const currentBaseJourney = computed(() => realBaseJourney.value ?? demo)
const unlockedIds = computed<CompanionId[]>(() => [...new Set([
  ...agentUnlocks.ids.value,
  ...park.state.value.unlockedCompanionIds,
  ...(realBaseJourney.value?.actualJourney.unlockedCompanionIds ?? []),
  ...(pretrip.state.value.companionId ? [pretrip.state.value.companionId] : []),
])])

function eventTime(id: string, createdAt?: number) {
  const fromId = Number(id.match(/^(\d{13})/)?.[1])
  return new Date(createdAt ?? (Number.isFinite(fromId) ? fromId : Date.now())).toISOString()
}

const conversationEvents = computed<JourneyEvent[]>(() => {
  const locationEvents = localTimeline.value.flatMap((message): JourneyEvent[] => {
    const occurredAt = eventTime(message.id, message.createdAt)
    if (message.type === 'test-location' && message.location?.kind === 'animal' && message.location.zone) return [{
      id: `session-${message.id}`,
      type: 'zone_arrived',
      occurredAt,
      title: `到达${message.location.zone.name}`,
      detail: [
        message.location.unlocked ? `解锁了${message.location.companion?.name ?? '动物伙伴'} Agent` : '',
        message.location.scienceAnswer ? '完成了动物科普问答' : '',
      ].filter(Boolean).join(' · ') || undefined,
      zoneId: message.location.zone.id,
      companionId: message.location.companion?.id,
    }]
    if (message.type === 'test-location' && message.location?.kind === 'dining') return [{
      id: `session-${message.id}`,
      type: 'rest_started',
      occurredAt,
      title: `到达${message.location.service?.name ?? '园区餐厅'}`,
      detail: '在这里查看了菜单和用餐信息。',
    }]
    return []
  })
  return locationEvents.toSorted((a, b) => a.occurredAt.localeCompare(b.occurredAt))
})

const journey = computed<JourneyRecord>(() => {
  const base = JSON.parse(JSON.stringify(currentBaseJourney.value)) as JourneyRecord
  if (!realBaseJourney.value) {
    base.actualJourney.visitedZoneIds = []
    base.actualJourney.unlockedCompanionIds = []
    base.actualJourney.badgeZoneIds = []
    base.actualJourney.completedTaskIds = []
    base.actualJourney.routePoints = []
    base.actualJourney.routeChanges = []
    base.actualJourney.walkingDistanceMeters = 0
    base.events = []
  }
  const unlocked = unlockedIds.value
  const completedFromChat = localTimeline.value.flatMap((message): AnimalId[] => message.type === 'test-location'
    && message.location?.kind === 'animal'
    && message.location.zone
    && message.location.scienceAnswer
    ? [message.location.zone.id]
    : [])
  const completedObservationIds = [...new Set([...fieldObservations.zoneIds.value, ...completedFromChat])]
  const badgeZoneIds = [...new Set([...base.actualJourney.badgeZoneIds, ...unlocked, ...completedObservationIds])]
  const visitedZoneIds = [...new Set([...base.actualJourney.visitedZoneIds, ...unlocked])]
  base.primaryCompanionId = pretrip.state.value.companionId ?? unlocked[0] ?? base.primaryCompanionId
  base.planSnapshot.zoneIds = pretrip.state.value.plan?.actualAnimalOrder ?? base.planSnapshot.zoneIds
  base.actualJourney.visitedZoneIds = visitedZoneIds
  base.actualJourney.unlockedCompanionIds = unlocked
  base.actualJourney.badgeZoneIds = badgeZoneIds
  base.actualJourney.completedTaskIds = [...new Set([
    ...base.actualJourney.completedTaskIds,
    ...completedObservationIds.map(id => zoneExperienceConfigs[id].task.id),
  ])]
  if (conversationEvents.value.length) base.events = conversationEvents.value
  return base
})
const recoveryKey = computed(() => journeys.collection.value.records
  .map(record => `${record.id}:${record.status}:${record.actualJourney.visitedZoneIds.length}:${record.planSnapshot.zoneIds.length}`)
  .join('|'))

watch(recoveryKey, () => journeys.recoverCompletedRecordsFromPlan(), { immediate: true })

onMounted(() => {
  const parkState = park.state.value
  if (parkState.started) {
    journeys.reconcileParkState(parkState, {
      companionId: parkState.starterCompanionId ?? pretrip.state.value.companionId ?? 'panda',
      plan: pretrip.state.value.plan,
      visitorProfile: pretrip.state.value.profile,
    })
  }
  journeys.recoverCompletedRecordsFromPlan()
  if (!journeys.completedRecords.value.length && !journeys.activeRecord.value) journeys.ensureRecord(demo)
})

function finishJourney() {
  journeys.finish()
}
</script>

<template>
  <MemoryBook v-if="catalog" :journey="journey" :catalog="catalog" @finish="finishJourney" />
</template>
