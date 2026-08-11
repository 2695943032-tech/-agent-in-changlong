<script setup lang="ts">
import type { ChatAction } from '../../../shared/types/pretrip'

defineProps<{ actions: ChatAction[] }>()
const emit = defineEmits<{ action: [action: ChatAction] }>()
</script>

<template>
  <div v-if="actions.length" class="chat-actions" aria-label="可执行操作">
    <button
      v-for="action in actions"
      :key="action.id"
      type="button"
      :class="['chat-action', action.variant ?? 'secondary']"
      @click="emit('action', action)"
    >{{ action.label }}</button>
  </div>
</template>

<style scoped>
.chat-actions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 9px; }
.chat-action { min-height: 31px; padding: 0 11px; border: 1px solid #bed7bf; border-radius: 999px; background: #f6fbf5; color: #245d3a; font-size: 11px; font-weight: 800; }
.chat-action.primary { border-color: #073d31; background: #073d31; color: #fff; }
.chat-action:active { transform: scale(.97); }
</style>
