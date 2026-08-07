<script setup lang="ts">
import type { Companion, CompanionId, AnimalId } from '../../../shared/types/pretrip'

defineProps<{
  companions: Companion[]
  unlockedIds: readonly CompanionId[]
  activeId: CompanionId | null
  badgeZoneIds: readonly AnimalId[]
}>()

const emit = defineEmits<{
  close: []
  select: [companionId: CompanionId]
}>()
</script>

<template>
  <div class="sheet-backdrop" @click.self="emit('close')">
    <section class="collection-sheet" role="dialog" aria-modal="true" aria-label="奇遇伙伴图鉴">
      <header>
        <div><span>ADVENTURE COLLECTION</span><strong>我的奇遇伙伴</strong></div>
        <button type="button" aria-label="关闭图鉴" @click="emit('close')">×</button>
      </header>
      <p>每抵达一个动物区域，就会有一位新伙伴加入手机。点击已解锁伙伴即可切换常驻角色。</p>
      <div class="collection-grid">
        <button
          v-for="companion in companions"
          :key="companion.id"
          :class="{ locked: !unlockedIds.includes(companion.id), active: activeId === companion.id }"
          :style="{ '--agent-accent': companion.accent }"
          type="button"
          :disabled="!unlockedIds.includes(companion.id)"
          @click="emit('select', companion.id)"
        >
          <span class="portrait-wrap">
            <img :src="companion.selectionImage" :alt="companion.name">
            <i v-if="!unlockedIds.includes(companion.id)">锁</i>
            <i v-else-if="activeId === companion.id">常驻</i>
          </span>
          <strong>{{ companion.name }}</strong>
          <small>{{ unlockedIds.includes(companion.id) ? companion.personality : `前往${companion.species.replace('伙伴', '区')}解锁` }}</small>
        </button>
      </div>
      <div class="badge-summary"><span>{{ badgeZoneIds.length }}/6</span><div><strong>奇遇徽章</strong><small>完成每个区域的观察任务继续收集</small></div></div>
    </section>
  </div>
</template>

<style scoped>
.sheet-backdrop { position: fixed; z-index: 70; inset: 0; display: grid; align-items: end; background: rgba(8,30,24,.48); backdrop-filter: blur(5px); }
.collection-sheet { width: min(100%, 480px); max-height: 88dvh; margin: 0 auto; padding: 22px 18px max(24px, env(safe-area-inset-bottom)); overflow-y: auto; border-radius: 20px 20px 0 0; background: var(--paper); box-shadow: 0 -20px 50px rgba(8,30,24,.24); animation: sheet-up 280ms var(--ease-out); }
.collection-sheet header { display: flex; align-items: center; justify-content: space-between; }
.collection-sheet header div { display: grid; gap: 3px; }
.collection-sheet header span { color: var(--accent-dark); font-size: 9px; font-weight: 900; letter-spacing: .13em; }
.collection-sheet header strong { color: var(--ink); font-family: var(--font-display); font-size: 22px; }
.collection-sheet header button { display: grid; width: 40px; height: 40px; place-items: center; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: var(--forest); font-size: 20px; }
.collection-sheet > p { margin: 10px 0 16px; color: var(--muted); font-size: 11px; line-height: 1.6; }
.collection-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.collection-grid > button { display: grid; padding: 9px; gap: 3px; border: 1px solid color-mix(in srgb, var(--agent-accent) 28%, var(--line)); border-radius: 14px; background: var(--surface); color: inherit; text-align: left; }
.portrait-wrap { position: relative; display: block; width: 100%; aspect-ratio: 1.45; overflow: hidden; border-radius: 13px; background: color-mix(in srgb, var(--agent-accent) 14%, #fff); }
.portrait-wrap img { width: 100%; height: 100%; object-fit: cover; }
.portrait-wrap i { position: absolute; right: 6px; bottom: 6px; padding: 4px 7px; border-radius: 6px; background: rgba(18,60,50,.9); color: #fff; font-size: 9px; font-style: normal; font-weight: 900; }
.collection-grid strong { color: var(--ink); font-family: var(--font-display); font-size: 15px; }
.collection-grid small { overflow: hidden; color: var(--muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.collection-grid button.locked { filter: grayscale(.75); opacity: .58; }
.collection-grid button.active { border-color: var(--agent-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--agent-accent) 18%, transparent); }
.badge-summary { display: flex; align-items: center; margin-top: 13px; padding: 12px; gap: 10px; border-radius: 16px; background: var(--forest-soft); }
.badge-summary > span { display: grid; width: 43px; height: 43px; place-items: center; border-radius: 14px; background: var(--forest); color: #f1c77d; font-family: var(--font-display); font-size: 13px; font-weight: 900; }
.badge-summary div { display: grid; gap: 2px; }
.badge-summary strong { color: var(--ink); font-size: 12px; }
.badge-summary small { color: var(--muted); font-size: 10px; }
@keyframes sheet-up { from { opacity: 0; transform: translateY(40px); } }
@media (prefers-reduced-motion: reduce) { .collection-sheet { animation: none; } }
</style>
