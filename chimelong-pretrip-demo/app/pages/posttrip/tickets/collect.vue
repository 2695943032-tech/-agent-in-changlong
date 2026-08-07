<script setup lang="ts">
import type { CatalogResponse } from '../../../../shared/types/pretrip'
import { createDemoJourneyRecord } from '../../../utils/journeyRecord'
import JourneyTicketCollectAnimation from '../../../components/journey-ticket/JourneyTicketCollectAnimation.vue'

useHead({ title: '加入票根册 · 长隆奇遇伙伴' })

const route = useRoute()
const { data: catalog } = await useFetch<CatalogResponse>('/api/catalog', { key: 'ticket-collect-catalog' })
const journeys = useJourneyRecords()

const requestedTicketId = computed(() => String(route.query.ticket ?? ''))
const selectedRecord = computed(() => {
  const ticketId = requestedTicketId.value || (import.meta.client ? sessionStorage.getItem('chimelong-collect-ticket-id') ?? '' : '')
  return journeys.collection.value.records.find(item => item.ticket?.id === ticketId)
    ?? journeys.completedRecords.value.find(item => item.ticket)
    ?? journeys.activeRecord.value
    ?? createDemoJourneyRecord()
})
const selectedRecordView = computed(() => JSON.parse(JSON.stringify(selectedRecord.value)) as ReturnType<typeof createDemoJourneyRecord>)
const companion = computed(() => catalog.value?.companions.find(item => item.id === selectedRecord.value.ticket?.companionId) ?? catalog.value?.companions[0] ?? null)
</script>

<template>
  <JourneyTicketCollectAnimation v-if="catalog && selectedRecordView.ticket && companion" :record="selectedRecordView" :companion="companion" />
  <main v-else class="collect-missing">
    <h1>还没有可入册的票根</h1>
    <NuxtLink to="/posttrip/ticket">返回制作票根</NuxtLink>
  </main>
</template>

<style scoped>
.collect-missing { display: grid; min-height: 100dvh; place-content: center; place-items: center; gap: 12px; background: var(--paper); text-align: center; }
.collect-missing h1 { margin: 0; font-family: var(--font-display); font-size: 24px; }
.collect-missing a { padding: 11px 15px; border-radius: 13px 4px 13px 4px; background: #263c33; color: #fff; font-size: 10px; text-decoration: none; }
</style>
