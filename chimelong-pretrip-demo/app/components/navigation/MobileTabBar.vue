<script setup lang="ts">
const route = useRoute()

// 编辑票根是沉浸式工作台：它有自己的保存/入册底栏，不能再叠加全局导航。
const hidden = computed(() => route.path.startsWith('/admin') || /^\/posttrip\/ticket\/?$/.test(route.path))
const activeTab = computed(() => {
  if (route.path === '/') return 'home'
  if (route.path === '/me' || route.path.startsWith('/posttrip')) return 'me'
  if (route.path === '/pretrip' && route.query.tab === 'map') return 'map'
  return 'chat'
})

const tabs = [
  { id: 'home', label: '首页', to: '/', icon: 'home' },
  { id: 'chat', label: '聊天', to: '/pretrip?tab=chat', icon: 'chat' },
  { id: 'map', label: '地图', to: '/pretrip?tab=map', icon: 'map' },
  { id: 'me', label: '我的', to: '/me', icon: 'me' },
] as const
</script>

<template>
  <Teleport to="body">
    <nav v-if="!hidden" class="mobile-tab-bar" aria-label="主要导航">
      <NuxtLink v-for="tab in tabs" :key="tab.id" :to="tab.to" :class="{ active: activeTab === tab.id }">
        <svg v-if="tab.icon === 'home'" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3.8l8.5 6.7v9.2h-6v-5.8h-5v5.8h-6z" /></svg>
        <svg v-else-if="tab.icon === 'chat'" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5h16v11H9l-5 4v-15Z" /></svg>
        <svg v-else-if="tab.icon === 'map'" viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 5.5 5-2 7 2.5 5-2v14.5l-5 2-7-2.5-5 2zM8.5 3.5V18m7-12v14.5" /></svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.5-5 3-7.5 7.5-7.5s7 2.5 7.5 7.5" /></svg>
        <span>{{ tab.label }}</span>
      </NuxtLink>
    </nav>
  </Teleport>
</template>

<style scoped>
.mobile-tab-bar {
  position: fixed;
  z-index: 90;
  right: 50%;
  bottom: 0;
  display: grid;
  width: min(100%, 480px);
  min-height: calc(62px + env(safe-area-inset-bottom));
  padding: 6px 12px env(safe-area-inset-bottom);
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid rgba(21, 61, 49, .12);
  /* 底部导航是独立的遮挡层，不透出聊天输入框或其他悬浮内容。 */
  background: #faf8f1;
  box-shadow: 0 -10px 30px rgba(17, 48, 39, .08);
  backdrop-filter: none;
  transform: translateX(50%);
}
.mobile-tab-bar a { position: relative; display: grid; place-content: center; place-items: center; gap: 3px; color: #7c8982; font-size: 9px; font-weight: 700; text-decoration: none; }
.mobile-tab-bar svg { width: 22px; height: 22px; overflow: visible; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.mobile-tab-bar a.active { color: #0b4a3c; }
.mobile-tab-bar a.active svg { filter: drop-shadow(0 4px 7px rgba(11, 74, 60, .2)); stroke-width: 2.2; }
.mobile-tab-bar a.active::after { position: absolute; bottom: calc(3px + env(safe-area-inset-bottom)); width: 16px; height: 2px; border-radius: 9px; background: #d89a38; content: ''; }
/* 导航本身含图标、文字与安全区，按 88px 预留；此前只预留 62px 会压住聊天的确认按钮。 */
:global(.app-with-tabs .chat-shell) { height: calc(100dvh - 88px - env(safe-area-inset-bottom)); min-height: calc(100dvh - 88px - env(safe-area-inset-bottom)); }
:global(.app-with-tabs .map-modal) { bottom: calc(62px + env(safe-area-inset-bottom)); height: min(calc(100dvh - 74px - env(safe-area-inset-bottom)), 850px); }
</style>
