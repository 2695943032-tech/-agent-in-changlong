<script setup lang="ts">
import type {
  AnimalPoi,
  ChatStep,
  Companion,
  PaceOption,
  Restaurant,
  RestaurantId,
  VisitorProfile,
} from '../../../shared/types/pretrip'
import type { JourneyMessage } from '../../composables/usePretripJourney'
import ChatAnswerPanel from './ChatAnswerPanel.vue'
import DraggableCompanion from './DraggableCompanion.vue'

const props = defineProps<{
  companion: Companion
  step: ChatStep
  stepIndex: number
  profile: VisitorProfile
  messages: JourneyMessage[]
  paceOptions: PaceOption[]
  animals: AnimalPoi[]
  restaurants: Restaurant[]
  recommendedRestaurantId: RestaurantId | null
  isReplying: boolean
  errorMessage: string | null
}>()

const emit = defineEmits<{
  answer: [profile: VisitorProfile, summary: string]
  back: []
  reset: []
  generate: []
}>()

const messageList = useTemplateRef<HTMLElement>('messageList')
const progress = computed(() => Math.round(((props.stepIndex + 1) / 7) * 100))
const reactionKey = shallowRef(0)

function reactToChoice() {
  reactionKey.value += 1
}

watch(() => props.messages.length, async () => {
  await nextTick()
  messageList.value?.scrollTo({ top: messageList.value.scrollHeight, behavior: 'smooth' })
})
</script>

<template>
  <section class="chat-shell" :style="{ '--agent-accent': companion.accent }">
    <header class="chat-header">
      <button class="back-button" type="button" aria-label="返回上一步" @click="emit('back')">←</button>
      <div class="header-agent">
        <span class="mini-avatar"><img :src="companion.selectionImage" :alt="companion.name"></span>
        <span><strong>{{ companion.name }}</strong><small>{{ companion.personality }}</small></span>
      </div>
      <button class="reset-button" type="button" @click="emit('reset')">重选</button>
    </header>

    <div class="progress-row">
      <span><i :style="{ width: `${progress}%` }" /></span>
      <small>{{ stepIndex + 1 }}/7</small>
    </div>

    <DraggableCompanion :companion="companion" :reaction-key="reactionKey" />

    <div ref="messageList" class="message-list" aria-live="polite">
      <div
        v-for="message in messages"
        :key="message.id"
        class="message-row"
        :class="message.role"
      >
        <span v-if="message.role === 'assistant'" class="message-avatar">{{ companion.name.slice(0, 1) }}</span>
        <div class="message-bubble">
          <p>{{ message.text }}</p>
          <small v-if="message.mode === 'deepseek'">DeepSeek生成</small>
        </div>
      </div>

      <div v-if="isReplying" class="message-row assistant">
        <span class="message-avatar">{{ companion.name.slice(0, 1) }}</span>
        <div class="typing-bubble" aria-label="伙伴正在思考"><i /><i /><i /></div>
      </div>
    </div>

    <p v-if="errorMessage" class="chat-error">{{ errorMessage }}</p>

    <div class="answer-dock">
      <ChatAnswerPanel
        :step="step"
        :profile="profile"
        :companion-id="companion.id"
        :pace-options="paceOptions"
        :animals="animals"
        :restaurants="restaurants"
        :recommended-restaurant-id="recommendedRestaurantId"
        :disabled="isReplying"
        @answer="(nextProfile, summary) => emit('answer', nextProfile, summary)"
        @generate="emit('generate')"
        @interact="reactToChoice"
      />
    </div>
  </section>
</template>

<style scoped>
.chat-shell {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: auto auto minmax(220px, 1fr) auto;
  min-height: 100dvh;
  overflow: hidden;
  background: var(--paper);
}

.chat-header {
  position: relative;
  z-index: 7;
  display: grid;
  grid-template-columns: 38px 1fr 42px;
  align-items: center;
  min-height: calc(68px + env(safe-area-inset-top));
  padding: max(12px, env(safe-area-inset-top)) 16px 10px;
  gap: 10px;
  border-bottom: 1px solid var(--line);
  background: rgba(243,240,231,.94);
  backdrop-filter: blur(16px);
}

.back-button,
.reset-button {
  height: 40px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface);
  color: var(--forest);
}

.back-button {
  width: 40px;
  font-size: 17px;
}

.reset-button {
  font-size: 11px;
  font-weight: 800;
}

.header-agent {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 9px;
}

.mini-avatar {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 14px;
  background: color-mix(in srgb, var(--agent-accent) 20%, #fff);
}

.mini-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-agent > span:last-child {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.header-agent strong {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 16px;
}

.header-agent small {
  overflow: hidden;
  color: var(--muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-row {
  position: relative;
  z-index: 7;
  display: grid;
  grid-template-columns: 1fr 28px;
  align-items: center;
  padding: 10px 18px 8px;
  gap: 8px;
}

.progress-row > span {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(18, 60, 50, 0.09);
}

.progress-row i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--agent-accent);
  transition: width 220ms ease;
}

.progress-row small {
  color: var(--muted);
  font-size: 10px;
  text-align: right;
}

.message-list {
  display: flex;
  max-height: 45dvh;
  padding: 14px 17px 22px;
  overflow-y: auto;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

.message-row {
  display: flex;
  align-items: flex-end;
  gap: 7px;
}

.message-row.user {
  justify-content: flex-end;
}

.message-avatar {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--agent-accent) 22%, #fff);
  color: var(--forest);
  font-size: 11px;
  font-weight: 900;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 6px 15px 15px 15px;
  background: var(--surface);
  box-shadow: none;
}

.message-row.user .message-bubble {
  border-color: var(--forest);
  border-radius: 15px 6px 15px 15px;
  background: var(--forest);
  color: #fff;
}

.message-bubble p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.message-bubble small {
  display: block;
  margin-top: 5px;
  color: var(--agent-accent);
  font-size: 9px;
  font-weight: 800;
}

.typing-bubble {
  display: flex;
  padding: 11px 13px;
  gap: 4px;
  border-radius: 7px 16px 16px 16px;
  background: #fff;
}

.typing-bubble i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--agent-accent);
  animation: typing 900ms ease-in-out infinite;
}

.typing-bubble i:nth-child(2) { animation-delay: 140ms; }
.typing-bubble i:nth-child(3) { animation-delay: 280ms; }

.answer-dock {
  position: relative;
  z-index: 2;
  padding: 0 12px max(12px, env(safe-area-inset-bottom));
}

.chat-error {
  margin: 0 15px 8px;
  padding: 9px 11px;
  border-radius: 11px;
  background: #fff0eb;
  color: #9c442e;
  font-size: 12px;
}

@keyframes typing {
  50% { opacity: 0.25; transform: translateY(-2px); }
}
</style>
