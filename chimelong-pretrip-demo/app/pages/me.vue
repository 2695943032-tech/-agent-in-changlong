<script setup lang="ts">
import type { CatalogResponse, CompanionId } from '../../shared/types/pretrip'
import { merchCatalog } from '../utils/merchCatalog'

useHead({ title: '我的奇遇 · 长隆奇遇伙伴' })

const { data: catalog } = await useFetch<CatalogResponse>('/api/catalog', { key: 'my-profile-catalog' })
const pretrip = usePretripJourney()
const park = useParkJourney()
const unlocks = useAgentUnlocks()
const journeys = useJourneyRecords()
const bag = useMerchBag()
const bagExpanded = shallowRef(true)
const badgeExpanded = shallowRef(false)

const unlockedIds = computed<CompanionId[]>(() => [...new Set([
  ...unlocks.ids.value,
  ...park.state.value.unlockedCompanionIds,
  ...journeys.collection.value.records.flatMap(record => record.actualJourney.unlockedCompanionIds),
  ...(pretrip.state.value.companionId ? [pretrip.state.value.companionId] : []),
])])
const unlockedCompanions = computed(() => unlockedIds.value.flatMap(id => catalog.value?.companions.find(item => item.id === id) ?? []))
const bagItems = computed(() => bag.ids.value.flatMap((id) => {
  const companion = catalog.value?.companions.find(item => item.id === id)
  return companion ? [{ companion, product: merchCatalog[id] }] : []
}))
const ticketCount = computed(() => Math.max(
  unlockedIds.value.length,
  journeys.collection.value.records.filter(record => record.ticket).length,
))
const primaryCompanion = computed(() => catalog.value?.companions.find(item => item.id === pretrip.state.value.companionId)
  ?? unlockedCompanions.value[0]
  ?? catalog.value?.companions[0])
const visitorSummary = computed(() => {
  const profile = pretrip.state.value.profile
  if (!profile) return '奇遇旅行者'
  return `${profile.adultCount ?? 0} 位成人 · ${profile.childCount ?? 0} 位儿童`
})
</script>

<template>
  <main class="profile-page">
    <header class="profile-hero">
      <span class="profile-avatar"><img v-if="primaryCompanion" :src="primaryCompanion.selectionImage" :alt="primaryCompanion.name"></span>
      <div><small>CHIMELONG JOURNEY PROFILE</small><h1>我的奇遇</h1><p>{{ visitorSummary }}</p></div>
      <NuxtLink to="/pretrip?tab=chat" aria-label="返回伙伴对话">›</NuxtLink>
    </header>

    <section class="profile-metrics" aria-label="奇遇收藏统计">
      <div><strong>{{ bag.ids.value.length }}</strong><span>购物袋</span></div>
      <div><strong>{{ unlockedIds.length }}</strong><span>徽章</span></div>
      <div><strong>{{ ticketCount }}</strong><span>票根</span></div>
    </section>

    <section class="profile-menu">
      <button type="button" @click="bagExpanded = !bagExpanded">
        <i class="bag-icon">袋</i><span><strong>购物袋</strong><small>{{ bag.ids.value.length ? `已加入 ${bag.ids.value.length} 件纪念礼品` : '解锁动物 Agent 后获得购买机会' }}</small></span><b>{{ bagExpanded ? '⌄' : '›' }}</b>
      </button>
      <button type="button" @click="badgeExpanded = !badgeExpanded">
        <i class="badge-icon">章</i><span><strong>我的徽章</strong><small>记录已解锁的动物伙伴</small></span><b>{{ badgeExpanded ? '⌄' : '›' }}</b>
      </button>
      <NuxtLink to="/posttrip/tickets">
        <i class="ticket-icon">票</i><span><strong>奇遇票根</strong><small>每解锁一位伙伴，收藏一张票根</small></span><b>›</b>
      </NuxtLink>
    </section>

    <Transition name="section-rise">
      <section v-if="bagExpanded" class="collection-card">
        <header><div><small>MEMORIAL BAG</small><h2>购物袋</h2></div><span>{{ bagItems.length }} 件</span></header>
        <div v-if="bagItems.length" class="bag-list">
          <article v-for="item in bagItems" :key="item.companion.id">
            <img :src="item.companion.selectionImage" :alt="item.product.name">
            <span><small>{{ item.product.badge }}</small><strong>{{ item.product.name }}</strong><em>{{ item.product.price }}</em></span>
            <button type="button" @click="bag.remove(item.companion.id)">移除</button>
          </article>
        </div>
        <div v-else class="empty-collection"><i>袋</i><strong>购物袋还是空的</strong><p>在园区解锁动物伙伴后，限定纪念品会出现在聊天中。</p><NuxtLink to="/pretrip?tab=chat">去和伙伴聊聊</NuxtLink></div>
      </section>
    </Transition>

    <Transition name="section-rise">
      <section v-if="badgeExpanded" class="collection-card badge-card">
        <header><div><small>AGENT BADGES</small><h2>伙伴徽章</h2></div><span>{{ unlockedCompanions.length }} 枚</span></header>
        <div v-if="unlockedCompanions.length" class="badge-grid">
          <article v-for="companion in unlockedCompanions" :key="companion.id">
            <img :src="companion.selectionImage" :alt="companion.name"><strong>{{ companion.name }}</strong><small>{{ companion.species }}伙伴</small>
          </article>
        </div>
        <div v-else class="empty-collection"><i>章</i><strong>徽章仍在路上</strong><p>抵达动物展区并完成一次现场观察即可留下记录。</p></div>
      </section>
    </Transition>

    <NuxtLink class="memory-entry" to="/posttrip"><span>回忆星册</span><strong>查看今天的路线、观察与伙伴总结</strong><b>打开 ›</b></NuxtLink>
  </main>
</template>

<style scoped>
.profile-page { width: min(100%, 480px); min-height: 100dvh; margin: 0 auto; padding: max(20px, env(safe-area-inset-top)) 16px 30px; background: linear-gradient(180deg,#f7f3e9 0,#edf3eb 44%,#f5f1e7 100%); color: #123c32; }
.profile-hero { display: grid; grid-template-columns: 70px 1fr 35px; min-height: 104px; padding: 17px; align-items: center; gap: 12px; border-radius: 24px; background: #0c4034; box-shadow: 0 20px 45px rgba(13,61,50,.18); color: #fff; }.profile-avatar { display: grid; width: 66px; height: 66px; place-items: center; overflow: hidden; border-radius: 20px; background: #f3dfbb; }.profile-avatar img { width: 100%; height: 100%; object-fit: cover; }.profile-hero div { display: grid; gap: 2px; }.profile-hero small { color: #e6b667; font-size: 7px; font-weight: 900; letter-spacing: .12em; }.profile-hero h1 { margin: 0; font-family: var(--font-display); font-size: 24px; }.profile-hero p { margin: 0; color: rgba(255,255,255,.65); font-size: 10px; }.profile-hero > a { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 50%; background: rgba(255,255,255,.1); color: #fff; font-size: 25px; text-decoration: none; }
.profile-metrics { display: grid; grid-template-columns: repeat(3,1fr); margin: 14px 0; padding: 14px 7px; border: 1px solid rgba(24,67,55,.1); border-radius: 18px; background: rgba(255,255,255,.76); }.profile-metrics div { display: grid; place-items: center; gap: 2px; border-left: 1px solid rgba(24,67,55,.1); }.profile-metrics div:first-child { border-left: 0; }.profile-metrics strong { font-family: Georgia,serif; font-size: 20px; }.profile-metrics span { color: #738078; font-size: 9px; }
.profile-menu { overflow: hidden; border: 1px solid rgba(24,67,55,.1); border-radius: 20px; background: rgba(255,255,255,.82); }.profile-menu > button,.profile-menu > a { display: grid; grid-template-columns: 42px 1fr auto; width: 100%; min-height: 69px; padding: 10px 15px; align-items: center; gap: 11px; border: 0; border-top: 1px solid rgba(24,67,55,.08); background: transparent; color: inherit; text-align: left; text-decoration: none; }.profile-menu > :first-child { border-top: 0; }.profile-menu i { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 13px; font-size: 12px; font-style: normal; font-weight: 900; }.bag-icon { background: #f7e8c9; color: #97601c; }.badge-icon { background: #dff0df; color: #35714c; }.ticket-icon { background: #e5e0f3; color: #675296; }.profile-menu span { display: grid; gap: 3px; }.profile-menu strong { font-size: 13px; }.profile-menu small { color: #7e8983; font-size: 9px; }.profile-menu b { color: #8b958f; font-size: 17px; }
.collection-card { margin-top: 14px; overflow: hidden; border: 1px solid rgba(24,67,55,.1); border-radius: 20px; background: rgba(255,255,255,.86); }.collection-card > header { display: flex; padding: 15px; align-items: end; justify-content: space-between; border-bottom: 1px solid rgba(24,67,55,.08); }.collection-card header div { display: grid; gap: 2px; }.collection-card header small { color: #a36b24; font-size: 7px; font-weight: 900; letter-spacing: .12em; }.collection-card h2 { margin: 0; font-family: var(--font-display); font-size: 17px; }.collection-card header > span { color: #7b8981; font-size: 9px; }.bag-list { display: grid; padding: 10px; gap: 8px; }.bag-list article { display: grid; grid-template-columns: 54px 1fr auto; padding: 8px; align-items: center; gap: 9px; border-radius: 14px; background: #f8f5ed; }.bag-list img { width: 54px; height: 54px; border-radius: 12px; background: #fff; object-fit: cover; }.bag-list span { display: grid; gap: 2px; }.bag-list small { color: #a36b24; font-size: 8px; }.bag-list strong { font-size: 10px; }.bag-list em { color: #ad4f2d; font-size: 10px; font-style: normal; font-weight: 900; }.bag-list button { padding: 6px 7px; border: 1px solid #dfd7c8; border-radius: 8px; background: #fff; color: #8a7666; font-size: 8px; }
.empty-collection { display: grid; min-height: 190px; padding: 25px; place-content: center; place-items: center; text-align: center; }.empty-collection > i { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 16px; background: #eee7d8; color: #967044; font-size: 12px; font-style: normal; font-weight: 900; }.empty-collection strong { margin-top: 9px; font-size: 12px; }.empty-collection p { max-width: 260px; margin: 4px 0 10px; color: #7d8781; font-size: 9px; line-height: 1.6; }.empty-collection a { padding: 8px 10px; border-radius: 9px; background: #16483b; color: #fff; font-size: 9px; text-decoration: none; }
.badge-grid { display: grid; grid-template-columns: repeat(3,1fr); padding: 12px; gap: 8px; }.badge-grid article { display: grid; padding: 9px 5px; place-items: center; gap: 3px; border-radius: 14px; background: #f1f5ee; text-align: center; }.badge-grid img { width: 52px; height: 52px; border-radius: 50%; background: #fff; object-fit: cover; }.badge-grid strong { margin-top: 3px; font-size: 10px; }.badge-grid small { color: #7b8981; font-size: 7px; }
.memory-entry { display: grid; grid-template-columns: 1fr auto; margin-top: 14px; padding: 15px; gap: 3px 12px; border-radius: 18px; background: #e8d6ae; color: #163d33; text-decoration: none; }.memory-entry span { color: #8b5b20; font-size: 8px; font-weight: 900; }.memory-entry strong { font-size: 11px; }.memory-entry b { grid-column: 2; grid-row: 1 / span 2; align-self: center; font-size: 9px; }
.section-rise-enter-active,.section-rise-leave-active { transition: opacity .25s ease, transform .3s ease; }.section-rise-enter-from,.section-rise-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
