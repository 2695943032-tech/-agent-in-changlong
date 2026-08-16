<script setup lang="ts">
import MobileTabBar from './components/navigation/MobileTabBar.vue'

// Bump this with each production release so returning visitors receive the
// current Nuxt entry bundle instead of an older immutable cached bundle.
const releaseId = '2026-08-07-collaboration-release-2'
</script>

<template>
  <main class="app-with-tabs" :data-release="releaseId">
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <MobileTabBar />
  </main>
</template>
