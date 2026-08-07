<script setup lang="ts">
const title = defineModel<string>('title', { required: true })
const message = defineModel<string | undefined>('message', { required: true })
const showMessage = defineModel<boolean>('showMessage', { required: true })

const suggestions = [
  '今天遇见的每一位朋友，都值得被记住。',
  '路线改变了一点，但奇遇一点也没有减少。',
  '和动物伙伴一起走过的路，会变成今天的星光。',
  '下一次，也要一起出发。',
  '今天的徽章，证明我们认真看过这个世界。',
]
</script>

<template>
  <section class="message-editor editor-section">
    <header>
      <span>02 · WORDS</span>
      <h3>标题与留言</h3>
    </header>
    <label>
      <span>票根标题 <b>{{ title.length }}/24</b></span>
      <input v-model="title" maxlength="24">
    </label>
    <label>
      <span>旅程留言 <b>{{ (message ?? '').length }}/60</b></span>
      <textarea v-model="message" maxlength="60" rows="3" />
    </label>
    <label class="toggle">
      <input v-model="showMessage" type="checkbox">
      <i />
      <span>在票根左下角显示留言</span>
    </label>
    <div class="suggestions">
      <button v-for="suggestion in suggestions" :key="suggestion" type="button" @click="message = suggestion">{{ suggestion }}</button>
    </div>
  </section>
</template>

<style scoped>
.editor-section { width: 100%; min-width: 0; max-width: 100%; padding: 17px; overflow: hidden; border: 1px solid rgba(51,54,47,.12); border-radius: 8px 22px 8px 22px; background: rgba(255,255,255,.74); }
header { display: grid; gap: 2px; margin-bottom: 13px; }
header span { color: var(--memory-accent); font-size: 8px; font-weight: 900; letter-spacing: .1em; }
h3 { margin: 0; font-family: var(--font-display); font-size: 19px; }
label { display: grid; margin-top: 10px; gap: 5px; }
label > span { display: flex; justify-content: space-between; color: #4f5d56; font-size: 9px; }
label b { color: #9b958b; font: 500 8px ui-monospace,monospace; }
input,textarea { width: 100%; padding: 11px 12px; border: 1px solid rgba(51,54,47,.15); border-radius: 12px 5px 12px 5px; outline: none; background: #f8f4eb; color: #24342d; font-size: 11px; }
textarea { resize: vertical; line-height: 1.6; }
input:focus,textarea:focus { border-color: var(--memory-accent); box-shadow: 0 0 0 3px color-mix(in srgb,var(--memory-accent) 12%,transparent); }
.toggle { display: flex; align-items: center; gap: 7px; }
.toggle input { position: absolute; opacity: 0; pointer-events: none; }
.toggle i { position: relative; width: 33px; height: 19px; border-radius: 99px; background: #d1cdc3; transition: background .2s ease; }
.toggle i::after { position: absolute; top: 3px; left: 3px; width: 13px; height: 13px; border-radius: 50%; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,.16); content: ''; transition: transform .25s var(--ease-out); }
.toggle input:checked + i { background: var(--memory-accent); }
.toggle input:checked + i::after { transform: translateX(14px); }
.toggle span { display: block; font-size: 9px; }
.suggestions { display: flex; width: 100%; min-width: 0; margin-top: 12px; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.suggestions button { flex: 0 0 auto; max-width: 185px; padding: 7px 9px; border: 1px solid rgba(51,54,47,.12); border-radius: 99px; background: transparent; color: #5d665f; font-size: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
