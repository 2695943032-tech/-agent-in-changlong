<script setup lang="ts">
import type { Companion } from '../../../shared/types/pretrip'
import type { ParkZoneContent } from '../../../shared/types/park'

defineProps<{
  companion: Companion
  activeCompanion: Companion
  zone: ParkZoneContent
  alreadyKnown: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="unlock-backdrop">
    <section class="unlock-card" :style="{ '--agent-accent': companion.accent }">
      <span class="unlock-kicker">{{ alreadyKnown ? '专属重逢剧情' : 'NEW AGENT UNLOCKED' }}</span>
      <div class="meeting-portraits">
        <img :src="activeCompanion.selectionImage" :alt="activeCompanion.name">
        <i>×</i>
        <img :src="companion.selectionImage" :alt="companion.name">
      </div>
      <h2>{{ alreadyKnown ? `${companion.name}回到自己的主场啦` : `${companion.name}加入奇遇小队` }}</h2>
      <p v-if="alreadyKnown">“终于带你来到我的家！这次我会送你一段只有在这里才能听见的故事。”</p>
      <p v-else>“{{ activeCompanion.name }}，接下来这片区域就交给我吧！我已经把最值得观察的小秘密准备好了。”</p>
      <div class="unlock-reward"><span>新发现</span><strong>{{ zone.badgeName }}</strong><small>完成区域任务即可正式获得</small></div>
      <button type="button" @click="emit('close')">{{ alreadyKnown ? '开始我的主场任务' : '收下伙伴，继续探险' }} →</button>
    </section>
  </div>
</template>

<style scoped>
.unlock-backdrop { position: fixed; z-index: 80; inset: 0; display: grid; align-items: center; padding: 20px; background: rgba(8,30,24,.55); backdrop-filter: blur(7px); }
.unlock-card { width: min(100%, 410px); margin: 0 auto; padding: 23px 20px 19px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--agent-accent) 30%, #fff); border-radius: 18px; background: radial-gradient(circle at 86% 13%, color-mix(in srgb, var(--agent-accent) 18%, transparent), transparent 25%), #fffaf1; box-shadow: 0 25px 70px rgba(6,25,20,.34); text-align: center; animation: unlock-pop 420ms var(--ease-out); }
.unlock-kicker { color: var(--agent-accent); font-size: 10px; font-weight: 900; letter-spacing: .14em; }
.meeting-portraits { display: flex; align-items: center; justify-content: center; margin: 15px 0 12px; }
.meeting-portraits img { width: 112px; height: 112px; object-fit: cover; border: 4px solid #fff; border-radius: 30px; box-shadow: 0 12px 28px rgba(18,60,50,.14); transform: rotate(-5deg); }
.meeting-portraits img:last-child { margin-left: -12px; transform: rotate(5deg); }
.meeting-portraits i { z-index: 2; display: grid; width: 32px; height: 32px; margin: 0 -8px; place-items: center; border-radius: 50%; background: var(--forest); color: #f1c77d; font-style: normal; font-weight: 900; }
.unlock-card h2 { margin: 0; color: var(--ink); font-family: var(--font-display); font-size: 22px; }
.unlock-card > p { margin: 8px auto 13px; color: var(--muted); font-size: 12px; line-height: 1.65; }
.unlock-reward { display: grid; padding: 11px; gap: 2px; border-radius: 15px; background: color-mix(in srgb, var(--agent-accent) 10%, #fff); }
.unlock-reward span { color: var(--agent-accent); font-size: 9px; font-weight: 900; }
.unlock-reward strong { color: var(--ink); font-size: 14px; }
.unlock-reward small { color: var(--muted); font-size: 10px; }
.unlock-card > button { width: 100%; min-height: 48px; margin-top: 13px; padding: 13px; border: 0; border-radius: 11px; background: var(--forest); color: #fff; font-size: 12px; font-weight: 900; }
@keyframes unlock-pop { from { opacity: 0; transform: translateX(55px) scale(.88); } }
@media (prefers-reduced-motion: reduce) { .unlock-card { animation: none; } }
</style>
