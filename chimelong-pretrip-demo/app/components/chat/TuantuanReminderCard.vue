<script setup lang="ts">
import type { TuantuanReminder } from '../../../shared/types/pretrip'
defineProps<{ reminder: TuantuanReminder }>()
</script>

<template>
  <p class="tuantuan-reminder"><b>团团提醒</b><span>为什么提醒你：{{ reminder.reason }}</span></p>
</template>

<style scoped>
.tuantuan-reminder { display: grid; gap: 3px; margin: 8px 0 0; padding: 8px 9px; border-radius: 10px; background: #fff5df; color: #7d5922; font-size: 10px; line-height: 1.45; }
.tuantuan-reminder b { color: #a3651f; font-size: 11px; }
</style>
