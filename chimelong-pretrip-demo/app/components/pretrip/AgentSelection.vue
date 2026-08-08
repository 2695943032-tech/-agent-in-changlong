<script setup lang="ts">
import type { Companion } from '../../../shared/types/pretrip'

defineProps<{
  companions: Companion[]
  aiConfigured: boolean
  aiModel: string
}>()

const emit = defineEmits<{
  select: [companion: Companion]
}>()
</script>

<template>
  <section class="selection-shell">
    <JourneyBackHome stage="01 · 奇遇启程" />
    <div class="selection-hero">
      <span class="selection-kicker">长隆空间智能动物 Agent</span>
      <h1>先选一位<br><em>陪你聊天的动物伙伴</em></h1>
      <p>它会一问一答了解同行人数、游玩节奏、动物优先级和餐饮选择，再生成真正可走的路线。</p>
      <div class="knowledge-badge">
        <span class="knowledge-dot" />
        9条地图距离已写入路线知识库
      </div>
    </div>

    <div class="selection-content">
      <div class="section-heading">
        <span>STEP 01</span>
        <h2>今天想和谁一起出发？</h2>
      </div>

      <div class="agent-list">
        <button
          v-for="companion in companions"
          :key="companion.id"
          class="agent-card"
          type="button"
          :style="{ '--agent-accent': companion.accent }"
          @click="emit('select', companion)"
        >
          <span class="agent-portrait" :class="`portrait-${companion.id}`">
            <img :src="companion.selectionImage" :alt="`${companion.name}，${companion.species}`">
            <small>{{ companion.species }}</small>
          </span>
          <span class="agent-copy">
            <small>{{ companion.personality }}</small>
            <strong>{{ companion.name }}</strong>
            <span>{{ companion.greeting }}</span>
          </span>
          <span class="agent-arrow" aria-hidden="true">→</span>
        </button>
      </div>

      <div class="ai-status" :class="{ active: aiConfigured }">
        <span>{{ aiConfigured ? 'AI' : '本地' }}</span>
        <div>
          <strong>{{ aiConfigured ? 'DeepSeek角色对话已启用' : '当前使用稳定模板模式' }}</strong>
          <small>{{ aiConfigured ? aiModel : '填写 .env 后自动切换 DeepSeek，不影响离线路线规划' }}</small>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.selection-shell {
  height: 100dvh;
  overflow: hidden;
}

.selection-hero {
  position: relative;
  padding: calc(44px + env(safe-area-inset-top)) 22px 14px;
  overflow: hidden;
  border-radius: 0;
  background:
    radial-gradient(circle at 84% 20%, rgba(239, 190, 107, 0.24), transparent 25%),
    linear-gradient(145deg, #0d342b, #194d3e);
  color: #fff;
}

.selection-hero::after {
  position: absolute;
  right: -70px;
  bottom: -85px;
  width: 230px;
  height: 230px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  content: '';
}

.selection-kicker {
  color: #eac37d;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.13em;
}

.selection-hero h1 {
  margin: 10px 0 12px;
  font-family: var(--font-display);
  font-size: clamp(32px, 9.5vw, 40px);
  line-height: 1.2;
}

.selection-hero h1 em {
  color: #f0c984;
  font-style: normal;
}

.selection-hero p,.knowledge-badge { display: none; }

.knowledge-badge {
  display: inline-flex;
  align-items: center;
  margin-top: 18px;
  padding: 8px 11px;
  gap: 7px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.8);
  border-radius: 9px;
  font-size: 11px;
}

.knowledge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7ed29f;
  box-shadow: 0 0 0 4px rgba(126, 210, 159, 0.12);
}

.selection-content { height: calc(100dvh - 168px - env(safe-area-inset-top)); padding: 16px 14px 10px; }

.section-heading span {
  color: var(--accent-dark);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.section-heading h2 {
  margin: 4px 0 16px;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 24px;
}

.agent-list { display: grid; height: calc(100% - 60px); grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 10px; }

.agent-card {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) 26px;
  align-items: center;
  min-height: 0;
  padding: 9px;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--agent-accent) 32%, var(--line));
  border-radius: var(--radius-panel);
  background: var(--surface);
  box-shadow: none;
  color: inherit;
  text-align: left;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.agent-card:hover {
  box-shadow: var(--shadow-soft);
  transform: translateY(-2px);
}

.agent-portrait {
  position: relative;
  display: block;
  width: 58px;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 14px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--agent-accent) 22%, #fff), #fff);
  text-align: center;
}

.agent-portrait img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.agent-portrait small {
  position: absolute;
  right: 7px;
  bottom: 7px;
  padding: 4px 7px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 4px 12px rgba(18, 60, 50, 0.12);
  color: var(--forest);
  font-size: 10px;
  font-weight: 800;
  backdrop-filter: blur(8px);
}

.agent-card:hover .agent-portrait img {
  transform: scale(1.045) rotate(-1deg);
}

.agent-copy {
  display: grid;
  gap: 3px;
}

.agent-copy > small {
  color: var(--agent-accent);
  font-size: 8px;
  font-weight: 800;
}

.agent-copy > strong {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 18px;
}

.agent-copy > span {
  display: -webkit-box;
  overflow: hidden;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.agent-arrow {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 10px;
  background: color-mix(in srgb, var(--agent-accent) 15%, #fff);
  color: var(--agent-accent);
  font-weight: 900;
}

.ai-status {
  display: none;
  align-items: center;
  margin-top: 17px;
  padding: 12px;
  gap: 10px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
}

.ai-status > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 11px;
  background: #e5e7df;
  color: var(--muted);
  font-size: 10px;
  font-weight: 900;
}

.ai-status.active > span {
  background: var(--forest-soft);
  color: var(--forest);
}

.ai-status div {
  display: grid;
  gap: 2px;
}

.ai-status strong {
  color: var(--ink);
  font-size: 12px;
}

.ai-status small {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.45;
}

@media (max-width: 390px) {
  .agent-card {
    grid-template-columns: 88px 1fr 26px;
    min-height: 126px;
    padding: 10px;
    gap: 10px;
  }

  .agent-portrait {
    width: 88px;
  }
}
</style>
