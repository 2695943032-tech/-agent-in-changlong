<script setup lang="ts">
import type { CatalogResponse } from '../../../shared/types/pretrip'
import { createDemoJourneyRecord } from '../../utils/journeyRecord'

useHead({ title: '编辑奇遇票根 · 长隆奇遇伙伴' })
const { data: catalog } = await useFetch<CatalogResponse>('/api/catalog', { key: 'ticket-editor-catalog' })
const journeys = useJourneyRecords()
const selectedJourney = computed(() => journeys.completedRecords.value[0] ?? journeys.activeRecord.value ?? createDemoJourneyRecord())
onMounted(() => journeys.ensureRecord(selectedJourney.value))
</script>

<template>
  <JourneyTicketEditor v-if="catalog" :journey="selectedJourney" :companions="catalog.companions" />
</template>
