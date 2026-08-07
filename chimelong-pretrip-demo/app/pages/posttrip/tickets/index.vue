<script setup lang="ts">
import type { CatalogResponse } from '../../../../shared/types/pretrip'
import type { JourneyRecord } from '../../../../shared/types/journey'

useHead({ title: '奇遇票根册 · 长隆奇遇伙伴' })
const { data: catalog } = await useFetch<CatalogResponse>('/api/catalog', { key: 'ticket-album-catalog' })
const journeys = useJourneyRecords()
const ticketRecords = computed(() => JSON.parse(JSON.stringify(journeys.collection.value.records)) as JourneyRecord[])
</script>

<template>
  <JourneyTicketAlbum v-if="catalog" :records="ticketRecords" :catalog="catalog" @delete="journeys.deleteTicket" />
</template>
