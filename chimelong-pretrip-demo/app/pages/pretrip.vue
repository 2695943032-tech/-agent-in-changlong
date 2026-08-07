<script setup lang="ts">
useHead({ title: '奇遇启程 · 长隆奇遇伴侣' })
</script>

<template>
  <PretripExperience @ready="navigateTo('/inpark')" />
</template>
