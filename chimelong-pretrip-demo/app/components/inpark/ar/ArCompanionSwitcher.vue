<script setup lang="ts">
import type { Companion, CompanionId } from '../../../../shared/types/pretrip'

const props = defineProps<{
  companions: Companion[]
  activeId: CompanionId
}>()

const emit = defineEmits<{
  select: [companionId: CompanionId]
}>()
</script>

<template>
  <nav class="companion-switcher" aria-label="选择 AR 伙伴">
    <span class="switcher-label">AR 伙伴</span>
    <div class="companion-list">
      <button
        v-for="companion in props.companions"
        :key="companion.id"
        class="companion-option"
        :class="{ active: companion.id === props.activeId }"
        :style="{ '--companion-accent': companion.accent }"
        type="button"
        :aria-pressed="companion.id === props.activeId"
        :aria-label="`切换到${companion.name}`"
        @click="emit('select', companion.id)"
      >
        <img :src="companion.selectionImage" :alt="companion.name">
        <strong>{{ companion.name }}</strong>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.companion-switcher{position:absolute;z-index:12;top:calc(108px + env(safe-area-inset-top));right:12px;left:12px;display:flex;align-items:center;padding:7px 8px;gap:7px;border:1px solid rgba(255,255,255,.16);border-radius:16px;background:rgba(4,20,15,.56);box-shadow:0 10px 28px rgba(0,0,0,.18);backdrop-filter:blur(16px)}
.switcher-label{flex:0 0 auto;padding:0 3px;color:rgba(255,255,255,.7);font-size:8px;font-weight:900;letter-spacing:.08em;writing-mode:vertical-rl}
.companion-list{display:flex;min-width:0;flex:1;justify-content:space-around;gap:4px}
.companion-option{display:grid;min-width:48px;padding:3px 4px 5px;justify-items:center;gap:2px;border:1px solid transparent;border-radius:11px;background:transparent;color:rgba(255,255,255,.72);transition:background .2s ease,border-color .2s ease,transform .2s ease}
.companion-option img{width:32px;height:32px;object-fit:contain;filter:grayscale(.18);transition:filter .2s ease,transform .2s ease}
.companion-option strong{font-size:8px;line-height:1}
.companion-option.active{border-color:color-mix(in srgb,var(--companion-accent) 70%,white);background:color-mix(in srgb,var(--companion-accent) 24%,rgba(4,20,15,.7));color:#fff;transform:translateY(-1px)}
.companion-option.active img{filter:none;transform:scale(1.08)}
@media(max-width:360px){.companion-switcher{right:8px;left:8px}.companion-option{min-width:42px}.companion-option img{width:28px;height:28px}}
</style>
