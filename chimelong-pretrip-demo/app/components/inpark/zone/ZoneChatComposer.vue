<script setup lang="ts">
import type { Companion } from '../../../../shared/types/pretrip'
import type { ParkChatMessage } from '../../../../shared/types/park'

const props = defineProps<{
  companion: Companion
  messages: ParkChatMessage[]
  quickQuestions: string[]
  loading: boolean
  error: string
}>()

const emit = defineEmits<{ send: [question: string] }>()
const input = shallowRef('')

function submit(question = input.value) {
  const value = question.trim()
  if (!value || props.loading) return
  emit('send', value)
  input.value = ''
}
</script>

<template>
  <section class="zone-chat" aria-label="园区伙伴对话">
    <header><img :src="companion.chatCharacterImage" :alt="companion.name"><div><span>{{ companion.name }} · 当前在线</span><strong>看到什么、想去哪里，都可以问我</strong></div><i /></header>
    <div v-if="messages.length" class="messages" aria-live="polite">
      <article v-for="message in messages.slice(-4)" :key="message.id" :class="message.role"><p>{{ message.text }}</p><small v-if="message.mode">{{ message.mode === 'deepseek' ? 'DeepSeek · 配置约束回答' : '本地知识降级回答' }}</small></article>
      <article v-if="loading" class="assistant typing"><b /><b /><b /></article>
    </div>
    <div class="quick-questions"><button v-for="question in quickQuestions" :key="question" type="button" @click="submit(question)">{{ question }}</button></div>
    <form @submit.prevent="submit()"><input v-model="input" maxlength="300" :placeholder="`问${companion.name}：这里有什么值得看？`" aria-label="输入园区问题"><button type="submit" :disabled="loading || !input.trim()">{{ loading ? '···' : '发送' }}</button></form>
    <p v-if="error" class="chat-error">{{ error }}</p>
  </section>
</template>

<style scoped>
.zone-chat { position: fixed; z-index: 45; bottom: 0; left: 50%; width: min(100%,480px); margin: 0; padding: 10px 16px max(12px,env(safe-area-inset-bottom)); border-top: 1px solid color-mix(in srgb,var(--zone-accent) 23%,transparent); background: color-mix(in srgb,var(--zone-soft) 84%,rgba(255,255,255,.92)); box-shadow: 0 -18px 38px rgba(20,36,29,.12); box-sizing: border-box; transform: translateX(-50%); backdrop-filter: blur(18px); }
.zone-chat header { display: flex; align-items: center; gap: 8px; }
.zone-chat header img { width: 38px; height: 38px; object-fit: contain; }
.zone-chat header div { display: grid; flex: 1; gap: 1px; }
.zone-chat header span { color: var(--zone-accent); font-size: 8px; font-weight: 900; }
.zone-chat header strong { color: var(--zone-ink); font-size: 10px; }
.zone-chat header i { width: 7px; height: 7px; border-radius: 50%; background: #4aab70; box-shadow: 0 0 0 4px rgba(74,171,112,.12); }
.messages { display: grid; max-height: min(18dvh,122px); margin: 9px 0; padding-right: 3px; gap: 6px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: color-mix(in srgb,var(--zone-accent) 45%,#d8ccb9) transparent; }
.messages::-webkit-scrollbar { width: 7px; }
.messages::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 999px; background: color-mix(in srgb,var(--zone-accent) 45%,#d8ccb9); background-clip: content-box; }
.messages article { max-width: 88%; padding: 8px 10px; border-radius: 14px 14px 14px 4px; background: rgba(255,255,255,.86); color: var(--zone-ink); }
.messages article.user { justify-self: end; border-radius: 14px 14px 4px; background: var(--zone-ink); color: #fff; }
.messages p { margin: 0; font-size: 10px; line-height: 1.55; }
.messages small { display: block; margin-top: 3px; color: color-mix(in srgb,var(--zone-ink) 54%,transparent); font-size: 7px; }
.typing { display: flex; gap: 4px; }
.typing b { width: 5px; height: 5px; border-radius: 50%; background: var(--zone-accent); animation: chat-bounce .8s ease-in-out infinite; }
.typing b:nth-child(2) { animation-delay: .12s; }.typing b:nth-child(3) { animation-delay: .24s; }
.quick-questions { display: flex; margin: 9px 0 7px; padding-bottom: 4px; gap: 5px; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: thin; scrollbar-color: color-mix(in srgb,var(--zone-accent) 45%,#d8ccb9) transparent; }
.quick-questions::-webkit-scrollbar { height: 7px; }
.quick-questions::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 999px; background: color-mix(in srgb,var(--zone-accent) 45%,#d8ccb9); background-clip: content-box; }
.quick-questions button { flex: 0 0 auto; padding: 6px 8px; border: 1px solid color-mix(in srgb,var(--zone-accent) 25%,transparent); border-radius: 99px; background: rgba(255,255,255,.66); color: var(--zone-ink); font-size: 8px; }
form { display: grid; grid-template-columns: 1fr auto; gap: 7px; }
form input { min-width: 0; min-height: 44px; padding: 0 12px; border: 1px solid color-mix(in srgb,var(--zone-accent) 25%,transparent); border-radius: 14px 6px 14px 6px; outline: none; background: rgba(255,255,255,.86); color: var(--zone-ink); font-size: 10px; }
form input:focus { border-color: var(--zone-accent); box-shadow: 0 0 0 3px color-mix(in srgb,var(--zone-accent) 13%,transparent); }
form button { min-width: 58px; border: 0; border-radius: 6px 14px 6px 14px; background: var(--zone-accent); color: #fff; font-size: 10px; font-weight: 900; }
form button:disabled { opacity: .45; }
.chat-error { margin: 6px 0 0; color: #a63f30; font-size: 8px; }
@keyframes chat-bounce { 50% { transform: translateY(-4px); } }
</style>
