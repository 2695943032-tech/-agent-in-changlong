<script setup lang="ts">
import type { Companion, CompanionId } from '../../../shared/types/pretrip'
import type { TripMode } from '../../../shared/types/park'

const props = defineProps<{
  companions: Companion[]
  hasPlan: boolean
  selectedCompanionId: CompanionId | null
}>()

const emit = defineEmits<{
  chooseMode: [mode: TripMode]
  requestPlan: []
  quickStart: [companionId: CompanionId]
}>()

const showQuickPicker = shallowRef(false)

const selectedCompanion = computed(() => props.companions.find(item => item.id === props.selectedCompanionId) ?? props.companions[0])
</script>

<template>
  <section class="entry-gate">
    <JourneyBackHome stage="02 · 入园选择" />
    <div class="entry-visual">
      <span class="entry-kicker">WELCOME TO THE PARK</span>
      <h1>园门已打开<br><em>奇遇正在发生</em></h1>
      <p>{{ hasPlan ? `${selectedCompanion?.name ?? '奇遇伙伴'}已经把游前计划带到园区。` : '还没有规划也没关系，先决定今天想怎么探索。' }}</p>
      <div class="entry-portraits" aria-hidden="true">
        <img v-for="companion in companions.slice(0, 4)" :key="companion.id" :src="companion.selectionImage" alt="">
      </div>
    </div>

    <div v-if="hasPlan" class="entry-actions">
      <span>游前计划已同步</span>
      <h2>今天想按路线走吗？</h2>
      <button class="primary-choice" type="button" @click="emit('chooseMode', 'follow')">
        <b>按计划探险</b>
        <small>高亮路线、下一站与实时进度</small>
        <i>→</i>
      </button>
      <button class="secondary-choice" type="button" @click="emit('chooseMode', 'free')">
        <b>随心逛逛</b>
        <small>保留伙伴与偏好，自由点击地图</small>
        <i>→</i>
      </button>
    </div>

    <div v-else-if="!showQuickPicker" class="entry-actions">
      <span>还没有游前计划</span>
      <h2>想让奇遇小助手先规划一下吗？</h2>
      <button class="primary-choice" type="button" @click="emit('requestPlan')">
        <b>好呀，先帮我规划</b>
        <small>回到奇遇启程，用几轮对话生成路线</small>
        <i>→</i>
      </button>
      <button class="secondary-choice" type="button" @click="showQuickPicker = true">
        <b>不用啦，直接去玩</b>
        <small>快速选一位伙伴后进入自由地图</small>
        <i>→</i>
      </button>
    </div>

    <div v-else class="quick-picker">
      <span>10秒快速绑定</span>
      <h2>谁先陪你进入园区？</h2>
      <div class="quick-grid">
        <button
          v-for="companion in companions"
          :key="companion.id"
          type="button"
          :style="{ '--agent-accent': companion.accent }"
          @click="emit('quickStart', companion.id)"
        >
          <img :src="companion.selectionImage" :alt="companion.name">
          <strong>{{ companion.name }}</strong>
          <small>{{ companion.species }}</small>
        </button>
      </div>
      <button class="skip-choice" type="button" @click="emit('quickStart', 'panda')">先跳过，默认由熊猫团团陪我 →</button>
    </div>
  </section>
</template>

<style scoped>
.entry-gate { width: min(100%, 480px); min-height: 100dvh; margin: 0 auto; overflow: hidden; background: var(--paper); }
.entry-visual { position: relative; min-height: 390px; padding: calc(92px + env(safe-area-inset-top)) 23px 28px; overflow: hidden; border-radius: 0; background: radial-gradient(circle at 82% 20%, rgba(241,199,125,.2), transparent 24%), linear-gradient(150deg, #08271f, #174c3b); color: #fff; }
.entry-kicker { color: #eac37d; font-size: 10px; font-weight: 900; letter-spacing: .14em; }
.entry-visual h1 { position: relative; z-index: 2; margin: 14px 0 11px; font-family: var(--font-display); font-size: 36px; line-height: 1.2; }
.entry-visual h1 em { color: #f0c984; font-style: normal; }
.entry-visual p { position: relative; z-index: 2; max-width: 290px; margin: 0; color: rgba(255,255,255,.7); font-size: 12px; line-height: 1.7; }
.entry-portraits { position: absolute; right: -35px; bottom: -28px; display: flex; width: 360px; height: 190px; align-items: flex-end; justify-content: flex-end; }
.entry-portraits img { position: relative; width: 112px; height: 112px; margin-left: -46px; object-fit: cover; border: 4px solid rgba(255,255,255,.8); border-radius: 27px; box-shadow: 0 14px 30px rgba(5,27,21,.3); transform: rotate(-6deg); }
.entry-portraits img:nth-child(2) { z-index: 2; width: 130px; height: 130px; transform: rotate(4deg); }
.entry-portraits img:nth-child(3) { transform: rotate(-2deg); }
.entry-portraits img:nth-child(4) { transform: rotate(8deg); }
.entry-actions, .quick-picker { padding: 25px 20px 38px; }
.entry-actions > span, .quick-picker > span { color: var(--accent-dark); font-size: 10px; font-weight: 900; letter-spacing: .12em; }
.entry-actions h2, .quick-picker h2 { margin: 5px 0 15px; color: var(--ink); font-family: var(--font-display); font-size: 23px; }
.primary-choice, .secondary-choice { position: relative; display: grid; width: 100%; min-height: 94px; margin-top: 10px; padding: 17px 46px 16px 17px; gap: 4px; border-radius: 15px; text-align: left; }
.primary-choice { border: 0; background: var(--forest); box-shadow: 0 13px 28px rgba(18,60,50,.2); color: #fff; }
.secondary-choice { border: 1px solid var(--line); background: rgba(255,255,255,.84); color: var(--ink); }
.primary-choice b, .secondary-choice b { font-family: var(--font-display); font-size: 15px; }
.primary-choice small { color: rgba(255,255,255,.62); }
.secondary-choice small { color: var(--muted); }
.primary-choice small, .secondary-choice small { font-size: 11px; }
.primary-choice i, .secondary-choice i { position: absolute; top: 50%; right: 18px; font-size: 17px; font-style: normal; transform: translateY(-50%); }
.quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.quick-grid button { display: grid; padding: 7px 7px 10px; gap: 2px; border: 1px solid color-mix(in srgb, var(--agent-accent) 32%, var(--line)); border-radius: 13px; background: var(--surface); color: inherit; text-align: center; }
.quick-grid img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 12px; }
.quick-grid strong { margin-top: 4px; color: var(--ink); font-family: var(--font-display); font-size: 12px; }
.quick-grid small { color: var(--agent-accent); font-size: 9px; font-weight: 800; }
.skip-choice { width: 100%; min-height: 44px; margin-top: 12px; padding: 12px; border: 0; background: transparent; color: var(--muted); font-size: 11px; font-weight: 800; }
</style>
