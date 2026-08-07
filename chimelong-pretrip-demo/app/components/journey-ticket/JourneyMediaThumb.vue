<script setup lang="ts">
const props = defineProps<{ storageKey: string, alt: string, selected?: boolean }>()
const { objectUrl } = useJourneyMedia(() => props.storageKey)
</script>

<template>
  <span class="media-thumb" :class="{ selected }"><img v-if="objectUrl" :src="objectUrl" :alt="alt"><i v-else /></span>
</template>

<style scoped>
.media-thumb { display: block; width: 62px; height: 48px; overflow: hidden; border: 2px solid transparent; border-radius: 12px 4px 12px 4px; background: #e7e2d5; }
.media-thumb.selected { border-color: var(--memory-accent,#b4563d); }
.media-thumb img { width: 100%; height: 100%; object-fit: cover; }
.media-thumb i { display: block; width: 100%; height: 100%; background: linear-gradient(110deg,#e2ded3 35%,#f4f0e6 50%,#e2ded3 65%); background-size: 220% 100%; animation: shimmer 1.4s linear infinite; }
@keyframes shimmer { to { background-position: -220% 0; } }
</style>

