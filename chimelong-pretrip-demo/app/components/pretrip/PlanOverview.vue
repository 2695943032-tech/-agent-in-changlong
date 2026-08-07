<script setup lang="ts">
import type {
  AnimalPoi,
  PlanResponse,
  Scenario,
  ScenarioId,
} from '../../../shared/types/pretrip'
import ItineraryTimeline from './ItineraryTimeline.vue'
import RouteMap from './RouteMap.vue'

const props = defineProps<{
  plan: PlanResponse
  scenarios: Scenario[]
  animals: AnimalPoi[]
}>()

const emit = defineEmits<{
  regenerate: [scenarioId: ScenarioId]
  reset: []
  clearCache: []
  ready: []
}>()

const shareStatus = shallowRef('分享行程')
const animalName = (id: string) => props.animals.find(item => item.id === id)?.name ?? id

const shareText = computed(() => {
  const route = props.plan.stops.map((stop, index) => `${index + 1}. ${stop.startTime} ${stop.name}`).join('\n')
  return `${props.plan.title}\n${props.plan.summary}\n\n${route}\n\n${props.plan.disclosure}`
})

async function sharePlan() {
  try {
    if (navigator.share) {
      await navigator.share({ title: props.plan.title, text: shareText.value })
      shareStatus.value = '已调起分享'
    }
    else {
      await navigator.clipboard.writeText(shareText.value)
      shareStatus.value = '已复制行程'
    }
  }
  catch {
    shareStatus.value = '分享已取消'
  }
  setTimeout(() => { shareStatus.value = '分享行程' }, 1800)
}
</script>

<template>
  <section class="plan-shell" :style="{ '--agent-accent': plan.companion.accent }">
    <JourneyBackHome stage="01 · 路线就绪" />
    <div class="plan-hero">
      <div class="top-actions">
        <button class="restart-top" type="button" @click="emit('reset')">重新开始</button>
        <button class="clear-cache-top" type="button" @click="emit('clearCache')">清除缓存</button>
      </div>
      <div class="plan-companion">{{ plan.companion.name }}</div>
      <div class="plan-mode"><span />{{ plan.mode === 'deepseek-assisted' ? 'DeepSeek辅助说明' : '稳定规则规划' }}</div>
      <h1>{{ plan.title }}</h1>
      <p>{{ plan.summary }}</p>
    </div>

    <div class="scenario-switcher" aria-label="运营场景切换">
      <button
        v-for="scenario in scenarios"
        :key="scenario.id"
        type="button"
        :class="{ active: plan.scenarioId === scenario.id }"
        @click="plan.scenarioId !== scenario.id && emit('regenerate', scenario.id)"
      >
        <span>{{ scenario.emoji }}</span>{{ scenario.name }}
      </button>
    </div>

    <div class="plan-stats">
      <div><strong>{{ plan.stops.length }}</strong><span>行程节点</span></div>
      <div><strong>{{ plan.walkingMeters }}</strong><span>预计步行/米</span></div>
      <div><strong>{{ plan.queueMinutes }}</strong><span>模拟等待/分</span></div>
    </div>

    <div class="order-comparison">
      <div>
        <span>你的优先级</span>
        <ol><li v-for="id in plan.userPriority" :key="id">{{ animalName(id) }}</li></ol>
      </div>
      <div>
        <span>实际游览顺序</span>
        <ol><li v-for="id in plan.actualAnimalOrder" :key="id">{{ animalName(id) }}</li></ol>
      </div>
    </div>
    <p class="order-note">优先级决定时间不足时先保留谁；实际顺序按地图距离优化，因此两列可以不同。</p>

    <RouteMap :stops="plan.stops" />
    <ItineraryTimeline :stops="plan.stops" />

    <section v-if="plan.selectedRestaurant" class="restaurant-result">
      <span class="restaurant-mark">{{ plan.selectedRestaurant.emoji }}</span>
      <div>
        <small>用餐已融入路线 · {{ plan.selectedRestaurant.cuisine }}</small>
        <strong>{{ plan.selectedRestaurant.name }}</strong>
        <p>{{ plan.selectedRestaurant.description }}</p>
      </div>
    </section>

    <section v-if="plan.skippedAnimals.length" class="skipped-section">
      <span>本次未排入</span>
      <article v-for="item in plan.skippedAnimals" :key="item.id">
        <strong>#{{ item.rank }} {{ item.name }}</strong>
        <p>{{ item.reason }}</p>
      </article>
    </section>

    <div class="warning-card">
      <strong>演示数据说明</strong>
      <p v-for="warning in plan.warnings" :key="warning">{{ warning }}</p>
    </div>

    <div class="plan-actions">
      <button class="start-action" type="button" @click="emit('ready')">我已经准备好冒险啦 <span>→</span></button>
      <button class="share-action" type="button" @click="sharePlan">{{ shareStatus }}</button>
      <button class="reset-action" type="button" @click="emit('reset')">重新规划</button>
    </div>
  </section>
</template>

<style scoped>
.plan-shell {
  padding: 0 18px 44px;
}

.plan-hero {
  position: relative;
  margin: 0 -18px 16px;
  padding: calc(88px + env(safe-area-inset-top)) 22px 30px 100px;
  overflow: hidden;
  border-radius: 0;
  background:
    radial-gradient(circle at 86% 15%, color-mix(in srgb, var(--agent-accent) 28%, transparent), transparent 27%),
    var(--forest);
  color: #fff;
}

.top-actions {
  position: absolute;
  top: calc(72px + env(safe-area-inset-top));
  right: 17px;
  display: flex;
  gap: 6px;
}

.restart-top,
.clear-cache-top {
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.68);
  font-size: 10px;
}

.clear-cache-top {
  border-color: rgba(255, 188, 169, 0.3);
  background: rgba(156, 54, 38, 0.18);
  color: #ffd6ca;
}

.plan-companion {
  position: absolute;
  top: calc(106px + env(safe-area-inset-top));
  left: 20px;
  display: grid;
  width: 62px;
  height: 62px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 75%, #fff);
  border-radius: 21px;
  background: color-mix(in srgb, var(--agent-accent) 28%, #fff);
  color: var(--forest);
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 900;
}

.plan-mode {
  display: flex;
  align-items: center;
  margin-bottom: 7px;
  gap: 5px;
  color: #e8c58a;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.plan-mode span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7ed29f;
}

.plan-hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  line-height: 1.3;
}

.plan-hero p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  line-height: 1.6;
}

.scenario-switcher {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 4px;
  gap: 4px;
  border-radius: 12px;
  background: rgba(18, 60, 50, 0.07);
}

.scenario-switcher button {
  min-height: 44px;
  padding: 9px 5px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: var(--muted);
  font-size: 10px;
  font-weight: 800;
}

.scenario-switcher button.active {
  background: #fff;
  box-shadow: 0 5px 15px rgba(25, 54, 44, 0.08);
  color: var(--forest);
}

.scenario-switcher span { margin-right: 3px; }

.plan-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 14px 0;
  padding: 13px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.plan-stats div {
  display: grid;
  place-items: center;
  gap: 2px;
}

.plan-stats div + div { border-left: 1px solid var(--line); }
.plan-stats strong { color: var(--forest); font-family: var(--font-display); font-size: 19px; }
.plan-stats span { color: var(--muted); font-size: 10px; }

.order-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
}

.order-comparison > div { padding: 13px; }
.order-comparison > div + div { border-left: 1px solid var(--line); }
.order-comparison span { color: var(--accent-dark); font-size: 10px; font-weight: 900; }
.order-comparison ol { display: flex; margin: 8px 0 0; padding: 0; flex-wrap: wrap; gap: 5px; list-style: none; counter-reset: rank; }
.order-comparison li { counter-increment: rank; padding: 5px 7px; border-radius: 6px; background: var(--forest-soft); color: var(--forest); font-size: 10px; }
.order-comparison li::before { content: counter(rank) '. '; font-weight: 900; }
.order-note { margin: 8px 2px 16px; color: var(--muted); font-size: 10px; line-height: 1.55; }

.restaurant-result {
  display: grid;
  grid-template-columns: 48px 1fr;
  align-items: center;
  margin-top: 23px;
  padding: 14px;
  gap: 11px;
  border: 1px solid #ead7b5;
  border-radius: 14px;
  background: #fff8e9;
}

.restaurant-mark { display: grid; width: 46px; height: 46px; place-items: center; border-radius: 14px; background: var(--forest); color: #fff; font-family: var(--font-display); font-size: 17px; }
.restaurant-result div { display: grid; gap: 2px; }
.restaurant-result small { color: var(--accent-dark); font-size: 10px; font-weight: 800; }
.restaurant-result strong { color: var(--ink); font-size: 14px; }
.restaurant-result p { margin: 0; color: var(--muted); font-size: 10px; line-height: 1.5; }

.skipped-section { display: grid; margin-top: 22px; gap: 7px; }
.skipped-section > span { color: var(--accent-dark); font-size: 10px; font-weight: 900; letter-spacing: 0.1em; }
.skipped-section article { padding: 10px 12px; border: 1px solid var(--line); border-radius: 13px; background: rgba(255, 255, 255, 0.68); }
.skipped-section strong { color: var(--ink); font-size: 12px; }
.skipped-section p { margin: 3px 0 0; color: var(--muted); font-size: 10px; }

.warning-card { margin-top: 22px; padding: 14px; border: 1px solid #ead7b5; border-radius: 16px; background: #fff8e9; }
.warning-card strong { color: #7d5a20; font-size: 12px; }
.warning-card p { margin: 5px 0 0; color: #8b7650; font-size: 10px; line-height: 1.55; }

.plan-actions { display: grid; grid-template-columns: 1.4fr 1fr; gap: 9px; margin-top: 16px; }
.plan-actions button { min-height: 48px; padding: 13px; border-radius: 12px; font-size: 12px; font-weight: 800; }
.start-action { grid-column: 1 / -1; border: 0; background: var(--accent); box-shadow: 0 11px 24px rgba(145, 99, 38, 0.2); color: var(--forest-deep); }
.start-action span { margin-left: 5px; font-size: 14px; }
.share-action { border: 0; background: var(--forest); color: #fff; }
.reset-action { border: 1px solid var(--line); background: #fff; color: var(--forest); }
</style>
