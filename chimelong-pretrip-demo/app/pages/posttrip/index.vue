<script setup lang="ts">
import type { CatalogResponse } from '../../../shared/types/pretrip'
import MemoryBook from '../../components/posttrip/MemoryBook.vue'
import { createDemoJourneyRecord } from '../../utils/journeyRecord'

useHead({ title: '回忆星册 · 长隆奇遇伙伴' })
const journeys = useJourneyRecords()
const park = useParkJourney()
const pretrip = usePretripJourney()
const { data: catalog } = await useFetch<CatalogResponse>('/api/catalog', { key: 'memory-book-catalog' })
const demo = createDemoJourneyRecord()
const journey = computed(() => journeys.completedRecords.value[0] ?? journeys.activeRecord.value ?? demo)
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
