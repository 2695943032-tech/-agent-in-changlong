<script setup lang="ts">
import ZoneExperience from '../../../components/inpark/zone/ZoneExperience.vue'

const route = useRoute()
const zoneId = computed(() => String(route.params.id ?? ''))
useHead({ title: '园区奇遇站 · 长隆奇遇伙伴' })
</script>

<template>
  <ZoneExperience :zone-id="zoneId" />
</template>
