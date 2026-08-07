// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    aiApiKey: '',
    aiBaseUrl: 'https://api.deepseek.com',
    aiModel: 'deepseek-v4-flash',
    aiProvider: 'deepseek',
    aiTimeoutMs: 8000,
    imageApiKey: '',
    imageBaseUrl: '',
    imageModel: 'gpt-image-2',
    imageEndpoint: '/images/edits',
    imageTimeoutMs: 180000,
    public: {
      dataMode: '地图距离知识库 · 模拟运营数据',
    },
  },
  nitro: {
    preset: 'node-server',
  },
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: '长隆奇遇伴侣 · 全周期智能游园',
      meta: [
        { name: 'description', content: '从奇遇启程、园中探险到回忆星册的长隆动物 Agent 全周期智能游园体验' },
        { name: 'theme-color', content: '#123c32' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },
})
