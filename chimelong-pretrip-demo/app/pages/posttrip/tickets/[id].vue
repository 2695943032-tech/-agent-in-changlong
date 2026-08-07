<script setup lang="ts">
import type { CatalogResponse } from '../../../../shared/types/pretrip'

useHead({ title: '票根详情 · 长隆奇遇伙伴' })
const route = useRoute()
const journeys = useJourneyRecords()
const { data: catalog } = await useFetch<CatalogResponse>('/api/catalog', { key: 'ticket-detail-catalog' })
const journey = computed(() => journeys.collection.value.records.find(item => item.ticket?.id === String(route.params.id)) ?? null)
const companion = computed(() => catalog.value?.companions.find(item => item.id === journey.value?.ticket?.companionId) ?? null)
const journeyView = shallowRef<import('../../../../shared/types/journey').JourneyRecord | null>(null)
watch(journey, value => { journeyView.value = value ? JSON.parse(JSON.stringify(value)) as import('../../../../shared/types/journey').JourneyRecord : null }, { immediate: true })
</script>

<template>
  <JourneyTicketDetail v-if="journeyView?.ticket && companion" :journey="journeyView" :companion="companion" />
  <main v-else class="missing-ticket"><h1>没有找到这张票根</h1><NuxtLink to="/posttrip/tickets">返回票根册</NuxtLink></main>
</template>

<style scoped>.missing-ticket { display: grid; min-height: 100dvh; place-content: center; place-items: center; gap: 12px; background: var(--paper); }.missing-ticket h1 { font-family: var(--font-display); }.missing-ticket a { color: var(--forest); }</style>
