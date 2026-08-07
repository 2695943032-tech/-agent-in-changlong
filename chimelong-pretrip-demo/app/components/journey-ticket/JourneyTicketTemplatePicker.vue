<script setup lang="ts">
import type { JourneyTicketTemplate } from '../../../shared/types/journey'
import { journeyTicketTemplates } from '#shared/data/ticketTemplates'

defineProps<{ modelValue: JourneyTicketTemplate }>()
const emit = defineEmits<{ 'update:modelValue': [value: JourneyTicketTemplate] }>()
</script>

<template>
  <section class="template-picker editor-section">
    <header><span>04 · TICKET STYLE</span><h3>票根样式</h3></header>
    <div class="template-list">
      <button v-for="(template,index) in journeyTicketTemplates" :key="template.id" type="button" :class="{ active: modelValue === template.id }" @click="emit('update:modelValue',template.id)">
        <i>{{ String(index + 1).padStart(2,'0') }}</i><span><strong>{{ template.name }}</strong><small>{{ template.description }}</small></span><b>{{ modelValue === template.id ? '✓' : '→' }}</b>
      </button>
    </div>
  </section>
</template>

<style scoped>
.editor-section { width: 100%; min-width: 0; max-width: 100%; padding: 17px; overflow: hidden; border: 1px solid rgba(51,54,47,.12); border-radius: 8px 22px 8px 22px; background: rgba(255,255,255,.74); }header { display: grid; gap: 2px; margin-bottom: 12px; }header span { color: var(--memory-accent); font-size: 8px; font-weight: 900; letter-spacing: .1em; }h3 { margin: 0; font-family: var(--font-display); font-size: 19px; }
.template-list { display: grid; gap: 6px; }.template-list button { display: grid; grid-template-columns: 30px 1fr 24px; align-items: center; min-height: 58px; padding: 8px 10px; gap: 8px; border: 1px solid rgba(51,54,47,.1); border-radius: 13px 5px 13px 5px; background: #f7f2e8; color: #293b33; text-align: left; transition: transform .2s var(--ease-out),background .2s ease; }.template-list button:active { transform: scale(.985); }.template-list button.active { border-color: var(--memory-accent); background: color-mix(in srgb,var(--memory-accent) 10%,#fff); }.template-list i { color: var(--memory-accent); font: 900 11px ui-monospace,monospace; font-style: normal; }.template-list span { display: grid; gap: 2px; }.template-list strong { font-size: 11px; }.template-list small { color: #727870; font-size: 8px; }.template-list b { color: var(--memory-accent); text-align: right; }
</style>
