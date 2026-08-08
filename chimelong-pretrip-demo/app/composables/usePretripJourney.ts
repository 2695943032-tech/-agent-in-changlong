import type {
  ChatStep,
  ChatTurnResponse,
  Companion,
  CompanionId,
  PlanResponse,
  RestaurantId,
  ScenarioId,
  VisitorProfile,
} from '../../shared/types/pretrip'
import { cloneVisitorProfile, formatPlanRequestError } from '../utils/profile'

export interface JourneyMessage {
  id: string
  role: 'assistant' | 'user'
  text: string
  kind: 'greeting' | 'answer' | 'reply' | 'question'
  mode?: 'template' | 'deepseek'
}

type JourneyView = 'select-agent' | 'chat' | 'generating' | 'result'

interface HistoryEntry {
  chatStepIndex: number
  profile: VisitorProfile
  messages: JourneyMessage[]
  recommendedRestaurantId: RestaurantId | null
}

interface JourneyState {
  version: 4
  view: JourneyView
  companionId: CompanionId | null
  profile: VisitorProfile
  chatStepIndex: number
  messages: JourneyMessage[]
  history: HistoryEntry[]
  recommendedRestaurantId: RestaurantId | null
  scenarioId: ScenarioId
  plan: PlanResponse | null
}

export const chatSteps: ChatStep[] = ['party', 'pace', 'time', 'animals', 'dining', 'supplement', 'confirm']

const STORAGE_KEY = 'chimelong-pretrip-journey-v4'
const LEGACY_STORAGE_KEYS = ['chimelong-pretrip-journey-v3']

function createEmptyProfile(): VisitorProfile {
  return {
    partyType: 'unknown',
    adultCount: null,
    childCount: null,
    children: [],
    pace: null,
    startTime: '10:00',
    endTime: '22:00',
    animalPriority: [],
    diningChoice: null,
    freeText: '',
  }
}

function createInitialState(): JourneyState {
  return {
    version: 4,
    view: 'select-agent',
    companionId: null,
    profile: createEmptyProfile(),
    chatStepIndex: 0,
    messages: [],
    history: [],
    recommendedRestaurantId: null,
    scenarioId: 'normal',
    plan: null,
  }
}

function createMessage(
  role: JourneyMessage['role'],
  text: string,
  kind: JourneyMessage['kind'],
  mode?: JourneyMessage['mode'],
): JourneyMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    kind,
    ...(mode ? { mode } : {}),
  }
}

function cloneMessages(messages: JourneyMessage[]): JourneyMessage[] {
  return messages.map(message => ({ ...message }))
}

function questionFor(step: ChatStep): string {
  const questions: Record<ChatStep, string> = {
    party: '先认识一下同行伙伴：这次是谁一起出发？',
    pace: '你们想用什么节奏逛动物园？我会结合人数给出推荐。',
    time: '预计几点入园、几点离园？时间会决定能保留多少高优先级点位。',
    animals: '依次点击最想看的动物，数字1—6代表优先保留级别。',
    dining: '需要在园内用餐吗？我会结合路线标出更顺路的选择。',
    supplement: '还有什么想特别告诉我？例如孩子下午容易累。',
    confirm: '信息已经齐了。确认后，我会用地图距离知识库生成实际游览顺序。',
  }
  return questions[step]
}

export function usePretripJourney() {
  const state = useState<JourneyState>('pretrip-journey-v3', createInitialState)
  const errorMessage = shallowRef<string | null>(null)
  const isReplying = shallowRef(false)
  const restored = shallowRef(false)

  const currentChatStep = computed<ChatStep>(() => chatSteps[state.value.chatStepIndex] ?? 'confirm')

  if (import.meta.client) {
    onMounted(() => {
      if (restored.value) return
      restored.value = true
      LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      try {
        const parsed = JSON.parse(saved) as JourneyState
        if (parsed.version === 4) {
          // Older sessions may still point at the removed full-screen result view.
          // Preserve the generated plan, but reopen it inside the chat experience.
          state.value = { ...parsed, view: parsed.view === 'result' ? 'chat' : parsed.view, history: [] }
        }
      }
      catch {
        // Preserve legacy payloads so a future migration can still recover them.
      }
    })

    watch(state, value => localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...value, history: [] })), { deep: true })
  }

  function chooseCompanion(companion: Companion) {
    state.value = {
      ...createInitialState(),
      view: 'chat',
      companionId: companion.id,
      messages: [
        createMessage('assistant', companion.greeting, 'greeting'),
        createMessage('assistant', questionFor('party'), 'question'),
      ],
    }
    errorMessage.value = null
  }

  async function answerCurrent(nextProfile: VisitorProfile, answerSummary: string) {
    if (!state.value.companionId || currentChatStep.value === 'confirm' || isReplying.value) return

    state.value.history.push({
      chatStepIndex: state.value.chatStepIndex,
      profile: cloneVisitorProfile(state.value.profile),
      messages: cloneMessages(state.value.messages),
      recommendedRestaurantId: state.value.recommendedRestaurantId,
    })
    state.value.profile = cloneVisitorProfile(nextProfile)
    state.value.messages.push(createMessage('user', answerSummary || '暂时跳过', 'answer'))
    isReplying.value = true
    errorMessage.value = null

    try {
      const response = await $fetch<ChatTurnResponse>('/api/pretrip/chat', {
        method: 'POST',
        body: {
          companionId: state.value.companionId,
          step: currentChatStep.value,
          profile: state.value.profile,
          answerSummary,
        },
      })
      state.value.messages.push(createMessage('assistant', response.message, 'reply', response.mode))
      if (response.recommendedRestaurantId) state.value.recommendedRestaurantId = response.recommendedRestaurantId
    }
    catch {
      state.value.messages.push(createMessage('assistant', '好的，我已经记下。即使暂时没有连接大模型，路线规划也会继续完成。', 'reply', 'template'))
    }
    finally {
      isReplying.value = false
    }

    state.value.chatStepIndex = Math.min(chatSteps.length - 1, state.value.chatStepIndex + 1)
    state.value.messages.push(createMessage('assistant', questionFor(currentChatStep.value), 'question'))
  }

  function previousStep() {
    const previous = state.value.history.pop()
    if (!previous) {
      reset()
      return
    }
    state.value.chatStepIndex = previous.chatStepIndex
    state.value.profile = previous.profile
    state.value.messages = previous.messages
    state.value.recommendedRestaurantId = previous.recommendedRestaurantId
    errorMessage.value = null
  }

  async function generatePlan(scenarioId: ScenarioId = state.value.scenarioId) {
    if (!state.value.companionId) return
    state.value.view = 'generating'
    state.value.scenarioId = scenarioId
    errorMessage.value = null
    const startedAt = Date.now()

    try {
      const plan = await $fetch<PlanResponse>('/api/pretrip/plan', {
        method: 'POST',
        body: {
          profile: state.value.profile,
          companionId: state.value.companionId,
          scenarioId,
        },
      })
      const remainingDelay = Math.max(0, 850 - (Date.now() - startedAt))
      if (remainingDelay > 0) await new Promise(resolve => setTimeout(resolve, remainingDelay))
      state.value.plan = plan
      state.value.view = 'chat'
      state.value.messages.push(createMessage('assistant', `路线已经规划好啦：${plan.stops.length} 个点位、预计步行 ${plan.walkingMeters} 米。点开下面的位置卡，就能查看园区地图和路线。`, 'reply', 'template'))
    }
    catch (error) {
      errorMessage.value = formatPlanRequestError(error)
      state.value.view = 'chat'
    }
  }

  async function regenerate(scenarioId: ScenarioId) {
    await generatePlan(scenarioId)
  }

  function reset() {
    state.value = createInitialState()
    errorMessage.value = null
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
  }

  function markInPark() {
    if (!state.value.plan || state.value.messages.some(message => message.id === 'park-arrival')) return
    state.value.messages.push({
      id: 'park-arrival',
      role: 'assistant',
      kind: 'reply',
      mode: 'template',
      text: '我感应到你已经到园啦！路线的第一站已经准备好，想出发时告诉我“开始导航”，我会把地图和路线直接发到这里。',
    })
  }

  return {
    state,
    currentChatStep,
    isReplying: readonly(isReplying),
    errorMessage: readonly(errorMessage),
    chooseCompanion,
    answerCurrent,
    previousStep,
    generatePlan,
    regenerate,
    markInPark,
    reset,
  }
}
