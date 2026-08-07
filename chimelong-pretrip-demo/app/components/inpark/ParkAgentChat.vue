<script setup lang="ts">
import type { Companion } from '../../../shared/types/pretrip'
import type { ParkChatMessage } from '../../../shared/types/park'

const props = defineProps<{
  companion: Companion
  messages: readonly ParkChatMessage[]
  loading: boolean
  error: string
  nextZoneName: string
  distanceMeters: number | null
  walkingMinutes: number | null
}>()

const emit = defineEmits<{ send: [question: string] }>()
const input = ref('')
const blocked = /(系统\s*(提示|指令)?|角色\s*指令|prompt|system\s*prompt|忽略.{0,8}(规则|指令))/i
const localError = ref('')
const quickQuestions = ['这里的动物今天吃什么？', '这个展区有什么观察重点？', '前面排队很长，帮我调整路线', '我有点累，想先休息']

function submit(value = input.value) {
  const question = value.trim()
  localError.value = ''
  if (!question || props.loading) return
  if (blocked.test(question)) {
    localError.value = '请直接描述你在园区遇到的情况。'
    return
  }
  emit('send', question)
  input.value = ''
}
</script>

<template>
  <section class="agent-chat">
    <header>
      <div class="avatar"><img :src="companion.selectionImage" :alt="companion.name"></div>
      <div><span>随行对话 · {{ companion.name }}</span><strong>告诉我现场情况，我来改路线</strong></div>
      <i :class="{ online: !loading }" />
    </header>

    <div class="route-fact">
      <div><span>下一站</span><strong>{{ nextZoneName }}</strong></div>
      <div><span>真实路网</span><strong>{{ distanceMeters === null ? '待定位' : `${distanceMeters}m` }}</strong></div>
      <div><span>预计步行</span><strong>{{ walkingMinutes === null ? '—' : `${walkingMinutes}分钟` }}</strong></div>
      <div><span>建议游玩</span><strong>55分钟</strong></div>
    </div>

    <div class="messages" aria-live="polite">
      <article v-if="!messages.length" class="welcome">
        <strong>我会记住这段游园对话。</strong>
        <p>可问每日食谱、生活习性、周边餐饮，也可以让我处理排队、疲劳和赶时间。</p>
      </article>
      <article v-for="message in messages" :key="message.id" :class="message.role">
        <p>{{ message.text }}</p><small v-if="message.role === 'assistant'">{{ message.mode === 'deepseek' ? 'DeepSeek · 配置约束回答' : '离线安全回答' }}</small>
      </article>
      <article v-if="loading" class="assistant typing"><b /><b /><b /></article>
    </div>

    <div class="quick-questions">
      <button v-for="question in quickQuestions" :key="question" type="button" :disabled="loading" @click="submit(question)">{{ question }}</button>
    </div>

    <form @submit.prevent="submit()">
      <input v-model="input" maxlength="300" autocomplete="off" placeholder="例如：熊猫园排队太久，换一站吧">
      <button type="submit" :disabled="loading || !input.trim()">{{ loading ? '思考中' : '发送' }}</button>
    </form>
    <p v-if="localError || error" class="error">{{ localError || error }}</p>
  </section>
</template>

<style scoped>
.agent-chat { margin-top: 12px; overflow: hidden; border: 1px solid #d9d1c1; border-radius: 22px; background: #fffaf0; box-shadow: 0 16px 38px rgba(19,59,47,.09); }
header { display: flex; align-items: center; padding: 13px 14px; gap: 10px; border-bottom: 1px solid #e4dccd; }
.avatar { width: 39px; height: 39px; overflow: hidden; border-radius: 13px; background: #dce5d4; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
header div:nth-child(2) { display: grid; flex: 1; gap: 2px; }
header span { color: #b44d36; font-size: 9px; font-weight: 900; letter-spacing: .08em; }
header strong { color: #173f34; font-size: 12px; }
header > i { width: 7px; height: 7px; border-radius: 50%; background: #d6aa5b; }
header > i.online { background: #42a36c; box-shadow: 0 0 0 4px rgba(66,163,108,.12); }
.route-fact { display: grid; grid-template-columns: repeat(4,1fr); padding: 11px 9px; gap: 4px; background: #174b3b; }
.route-fact div { display: grid; padding: 0 6px; gap: 2px; border-right: 1px solid rgba(255,255,255,.12); }
.route-fact div:last-child { border: 0; }
.route-fact span { color: rgba(255,255,255,.58); font-size: 7px; }
.route-fact strong { overflow: hidden; color: #fff7df; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.messages { display: grid; max-height: 270px; min-height: 108px; padding: 13px; gap: 8px; overflow-y: auto; }
.messages article { max-width: 84%; padding: 9px 11px; border-radius: 14px 14px 14px 4px; background: #e8eddf; color: #253d34; }
.messages article.user { justify-self: end; border-radius: 14px 14px 4px; background: #174b3b; color: #fff; }
.messages p { margin: 0; font-size: 11px; line-height: 1.55; }
.messages small { display: block; margin-top: 4px; color: #75837c; font-size: 7px; }
.messages .welcome { max-width: none; background: #f3eee2; }
.messages .welcome strong { font-size: 11px; }
.messages .welcome p { margin-top: 4px; color: #69776f; font-size: 9px; }
.typing { display: flex; width: 50px; gap: 4px; }
.typing b { width: 5px; height: 5px; border-radius: 50%; background: #648073; animation: bounce .9s ease-in-out infinite; }
.typing b:nth-child(2) { animation-delay: .12s; }.typing b:nth-child(3) { animation-delay: .24s; }
.quick-questions { display: flex; padding: 0 12px 12px; gap: 6px; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: thin; scrollbar-color: #c9b79a transparent; }
.quick-questions::-webkit-scrollbar { height: 8px; }
.quick-questions::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 999px; background: #c9b79a; background-clip: content-box; }
.quick-questions::-webkit-scrollbar-track { background: transparent; }
.quick-questions button { flex: 0 0 auto; padding: 7px 9px; border: 1px solid #ded5c4; border-radius: 99px; background: transparent; color: #50665c; font-size: 8px; }
form { position: sticky; z-index: 3; bottom: 0; display: flex; padding: 10px 12px; gap: 7px; border-top: 1px solid #e4dccd; background: #fffaf0; }
form input { min-width: 0; flex: 1; padding: 11px 12px; border: 1px solid #d8cfbf; border-radius: 12px; outline: none; background: #f8f4ea; color: #173f34; font-size: 10px; }
form input:focus { border-color: #2f6a55; box-shadow: 0 0 0 3px rgba(47,106,85,.1); }
form button { padding: 0 14px; border: 0; border-radius: 12px; background: #c95237; color: #fff; font-size: 10px; font-weight: 900; }
form button:disabled { opacity: .45; }
.error { margin: -3px 13px 10px; color: #b33c2e; font-size: 8px; }
@keyframes bounce { 50% { transform: translateY(-4px); } }
@media (prefers-reduced-motion: reduce) { .typing b { animation: none; } }
</style>
