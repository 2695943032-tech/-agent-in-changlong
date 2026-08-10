<script setup lang="ts">
import type { CatalogResponse, CompanionId } from '../../../../shared/types/pretrip'
import type { JourneyRecord } from '../../../../shared/types/journey'
import { buildJourneyTicket, createJourneyRecord } from '../../../utils/journeyRecord'

useHead({ title: '奇遇票根册 · 长隆奇遇伙伴' })
const { data: catalog } = await useFetch<CatalogResponse>('/api/catalog', { key: 'ticket-album-catalog' })
const journeys = useJourneyRecords()
const agentUnlocks = useAgentUnlocks()
const parkJourney = useParkJourney()
const pretripJourney = usePretripJourney()
const ticketRecords = computed(() => JSON.parse(JSON.stringify(journeys.collection.value.records)) as JourneyRecord[])
const knownUnlockedIds = computed<CompanionId[]>(() => [...new Set([
  ...agentUnlocks.ids.value,
  ...parkJourney.state.value.unlockedCompanionIds,
  ...journeys.collection.value.records.flatMap(record => record.actualJourney.unlockedCompanionIds),
  ...(pretripJourney.state.value.companionId ? [pretripJourney.state.value.companionId] : []),
])])

function ensureUnlockedTickets(ids: readonly CompanionId[]) {
  for (const companionId of ids) {
    const now = new Date().toISOString()
    const recordId = `agent-ticket-${companionId}-${now.slice(0, 10)}`
    if (journeys.collection.value.records.some(record => record.id === recordId)) continue
    const record = createJourneyRecord({ companionId, plannedZoneIds: [companionId], startedAt: now })
    record.id = recordId
    record.status = 'completed'
    record.completedAt = now
    record.actualJourney.visitedZoneIds = [companionId]
    record.actualJourney.unlockedCompanionIds = [companionId]
    record.ticket = buildJourneyTicket(record, 'companion')
    journeys.ensureRecord(record)
  }
}

watch(knownUnlockedIds, ensureUnlockedTickets, { immediate: true })
</script>

<template>
  <JourneyTicketAlbum v-if="catalog" :records="ticketRecords" :catalog="catalog" @delete="journeys.deleteTicket" />
</template>
