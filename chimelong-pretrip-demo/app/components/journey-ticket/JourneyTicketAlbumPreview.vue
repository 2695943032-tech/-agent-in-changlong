<script setup lang="ts">
import type { Companion } from '../../../shared/types/pretrip'
import type { JourneyRecord } from '../../../shared/types/journey'
import JourneyTicketPreview from './JourneyTicketPreview.vue'

const props = defineProps<{ record: JourneyRecord, companion: Companion }>()
const selectedPhoto = computed(() => props.record.media.find(item => item.id === props.record.ticket?.coverPhotoId))
const { objectUrl: photoUrl } = useJourneyMedia(() => selectedPhoto.value?.storageKey)
</script>

<template>
  <JourneyTicketPreview v-if="record.ticket" :ticket="record.ticket" :companion="companion" :photo-url="photoUrl" />
</template>
