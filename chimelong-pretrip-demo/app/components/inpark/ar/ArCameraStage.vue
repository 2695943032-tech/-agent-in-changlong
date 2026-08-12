<script setup lang="ts">
import type { ArCameraStatus } from '../../../composables/useArCamera'
import type { CompanionId } from '../../../../shared/types/pretrip'
import ArCompanionModel from './ArCompanionModel.vue'

const props = defineProps<{ status: ArCameraStatus, scanning: boolean, detected: boolean, animalName: string, accent: string, companionId: CompanionId, modelAction: 'idle' | 'wave' | 'talk' }>()
const emit = defineEmits<{ requestCamera: [], flipCamera: [], scan: [], capture: [] }>()
const video = useTemplateRef<HTMLVideoElement>('cameraVideo')
const recognitionHudVisible = shallowRef(false)
let recognitionHudTimer: ReturnType<typeof setTimeout> | undefined

watch(() => props.detected, (detected) => {
  if (recognitionHudTimer) clearTimeout(recognitionHudTimer)
  recognitionHudVisible.value = detected
  if (detected) recognitionHudTimer = setTimeout(() => { recognitionHudVisible.value = false }, 2800)
}, { immediate: true })

onBeforeUnmount(() => {
  if (recognitionHudTimer) clearTimeout(recognitionHudTimer)
})
defineExpose({ video })
</script>

<template>
  <section class="camera-stage" :style="{ '--ar-accent': props.accent }" aria-label="AR 实景画面">
    <video ref="cameraVideo" class="camera-feed" autoplay muted playsinline />
    <div class="demo-scene" :class="{ visible: status !== 'active' }" aria-hidden="true"><i class="canopy one" /><i class="canopy two" /><i class="path" /></div>
    <div class="camera-shade" />
    <header class="ar-topbar">
      <button type="button" aria-label="返回园区地图" @click="navigateTo('/inpark')">‹</button>
      <div><span>CHIMELONG AR</span><strong>实景奇遇</strong></div>
      <button type="button" aria-label="切换前后摄像头" @click="emit('flipCamera')">↻</button>
    </header>
    <div class="environment-status"><i /><span>环境感知已开启</span><b>LIVE</b></div>
    <div v-show="!detected || recognitionHudVisible" class="scan-frame" :class="{ scanning, detected }">
      <i class="corner top-left" /><i class="corner top-right" /><i class="corner bottom-left" /><i class="corner bottom-right" />
      <span v-if="scanning" class="scan-line" />
      <div v-if="!detected" class="scan-copy"><small>{{ scanning ? '正在识别环境与动物特征' : '将动物置于取景框内' }}</small><strong>{{ scanning ? '保持稳定…' : '发现身边的奇遇' }}</strong></div>
      <div v-else class="target-lock"><span>已识别</span><strong>{{ animalName }}</strong><small>可信度 98.6%</small></div>
    </div>
    <Transition name="model-reveal">
      <div v-if="detected" class="model-stage"><ArCompanionModel :companion-id="companionId" :action="modelAction" :accent="accent" /></div>
    </Transition>
    <Transition name="hud-fade"><div v-if="detected && recognitionHudVisible" class="spatial-tag left-tag"><i>01</i><span>建议观赏距离</span><strong>8.4 m</strong></div></Transition>
    <Transition name="hud-fade"><div v-if="detected && recognitionHudVisible" class="spatial-tag right-tag"><i>02</i><span>当前状态</span><strong>悠闲进食中</strong></div></Transition>
    <p v-if="status === 'requesting'" class="permission-hint">正在请求相机权限…</p>
    <button v-else-if="status !== 'active'" class="permission-hint action" type="button" @click="emit('requestCamera')">开启相机 · 进入实景</button>
    <div class="camera-actions">
      <button class="side-action" type="button" aria-label="扫描动物" @click="emit('scan')"><span>⌁</span><small>识别</small></button>
      <button class="shutter" type="button" aria-label="拍摄 AR 照片" @click="emit('capture')"><i /></button>
      <button class="side-action" type="button" aria-label="切换摄像头" @click="emit('flipCamera')"><span>↻</span><small>翻转</small></button>
    </div>
  </section>
</template>

<style scoped>
.camera-stage{position:relative;width:100%;height:100%;min-height:100dvh;overflow:hidden;background:#13231c;color:#fff;isolation:isolate}.camera-feed,.demo-scene,.camera-shade{position:absolute;inset:0;width:100%;height:100%}.camera-feed{z-index:-3;object-fit:cover}.demo-scene{z-index:-2;overflow:hidden;opacity:0;background:linear-gradient(180deg,#809d7c 0 28%,#466751 29% 58%,#263c2e 59%);transition:opacity .4s ease}.demo-scene.visible{opacity:1}.demo-scene::before{position:absolute;inset:0;background:radial-gradient(circle at 22% 22%,rgba(255,238,177,.42),transparent 23%),linear-gradient(110deg,transparent 35%,rgba(250,230,163,.18) 36% 43%,transparent 44%);content:'';filter:blur(2px)}.canopy{position:absolute;width:72%;height:35%;border-radius:50%;background:radial-gradient(ellipse,#1e4a30 0 22%,#315c3d 23% 48%,transparent 49%);filter:blur(5px)}.canopy.one{top:18%;left:-25%;transform:rotate(16deg)}.canopy.two{top:28%;right:-34%;transform:rotate(-12deg)}.path{position:absolute;right:10%;bottom:-15%;width:58%;height:64%;background:#7b765b;clip-path:polygon(38% 0,62% 0,100% 100%,0 100%);opacity:.72;filter:blur(3px)}.camera-shade{z-index:-1;background:linear-gradient(180deg,rgba(3,15,11,.72),transparent 24%,transparent 58%,rgba(2,12,9,.92))}
.ar-topbar{position:absolute;z-index:5;top:0;left:0;display:grid;width:100%;grid-template-columns:44px 1fr 44px;align-items:center;padding:max(13px,env(safe-area-inset-top)) 14px 10px;gap:9px}.ar-topbar button{display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(255,255,255,.22);border-radius:14px;background:rgba(5,24,17,.34);color:#fff;font-size:25px;backdrop-filter:blur(12px)}.ar-topbar div{display:grid;justify-items:center;line-height:1.1}.ar-topbar span{color:#d9bd78;font-size:8px;font-weight:900;letter-spacing:.17em}.ar-topbar strong{margin-top:4px;font-family:var(--font-display);font-size:16px}.environment-status{position:absolute;z-index:3;top:calc(72px + env(safe-area-inset-top));left:50%;display:flex;align-items:center;padding:7px 10px;gap:6px;border:1px solid rgba(255,255,255,.15);border-radius:999px;background:rgba(4,20,15,.38);font-size:8px;transform:translateX(-50%);backdrop-filter:blur(12px);white-space:nowrap}.environment-status i{width:6px;height:6px;border-radius:50%;background:#7ee2a2;box-shadow:0 0 0 4px rgba(126,226,162,.13)}.environment-status b{color:#7ee2a2;font-size:7px;letter-spacing:.1em}
.scan-frame{position:absolute;z-index:2;top:20%;right:12%;bottom:27%;left:12%;display:grid;place-items:center}.corner{position:absolute;width:42px;height:42px;border-color:rgba(255,255,255,.72);border-style:solid;transition:border-color .25s ease,filter .25s ease}.top-left{top:0;left:0;border-width:2px 0 0 2px}.top-right{top:0;right:0;border-width:2px 2px 0 0}.bottom-left{bottom:0;left:0;border-width:0 0 2px 2px}.bottom-right{right:0;bottom:0;border-width:0 2px 2px 0}.detected .corner{border-color:var(--ar-accent);filter:drop-shadow(0 0 6px var(--ar-accent))}.scan-line{position:absolute;top:8%;right:4%;left:4%;height:1px;background:linear-gradient(90deg,transparent,var(--ar-accent),transparent);box-shadow:0 0 14px var(--ar-accent);animation:scan 2.1s ease-in-out infinite}.scan-copy,.target-lock{display:grid;padding:11px 14px;justify-items:center;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:rgba(2,17,12,.32);backdrop-filter:blur(10px)}.scan-copy small,.target-lock span,.target-lock small{color:rgba(255,255,255,.65);font-size:8px}.scan-copy strong,.target-lock strong{margin-top:3px;font-family:var(--font-display);font-size:14px}.target-lock{border-color:color-mix(in srgb,var(--ar-accent) 55%,transparent)}.target-lock span{color:var(--ar-accent);font-weight:900}.target-lock strong{font-size:25px}.target-lock small{margin-top:2px}
.model-stage{position:absolute;z-index:1;top:25%;right:19%;bottom:25%;left:19%;pointer-events:none}.model-reveal-enter-active,.model-reveal-leave-active{transition:opacity .6s ease,transform .72s cubic-bezier(.16,1,.3,1)}.model-reveal-enter-from,.model-reveal-leave-to{opacity:0;transform:translateY(22px) scale(.88)}
.spatial-tag{position:absolute;z-index:3;display:grid;min-width:106px;padding:9px 11px;border-left:2px solid var(--ar-accent);background:rgba(4,20,15,.52);backdrop-filter:blur(12px);animation:tag-in .45s var(--ease-out) both}.spatial-tag i{position:absolute;top:-8px;color:rgba(255,255,255,.35);font:900 18px ui-monospace,monospace;font-style:normal}.spatial-tag span{color:rgba(255,255,255,.62);font-size:7px}.spatial-tag strong{font-size:10px}.left-tag{top:35%;left:5%}.right-tag{top:50%;right:4%;animation-delay:.08s}.permission-hint{position:absolute;z-index:5;bottom:20%;left:50%;margin:0;padding:8px 12px;border:0;border-radius:999px;background:rgba(2,17,12,.62);color:rgba(255,255,255,.8);font-size:8px;transform:translateX(-50%);backdrop-filter:blur(12px);white-space:nowrap}.permission-hint.action{border:1px solid rgba(255,255,255,.2)}
.camera-actions{position:absolute;z-index:6;right:0;bottom:max(25px,env(safe-area-inset-bottom));left:0;display:grid;grid-template-columns:64px 84px 64px;align-items:center;justify-content:center;gap:20px}.camera-actions button{border:0;color:#fff}.side-action{display:grid;justify-items:center;gap:4px;background:transparent}.side-action span{display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(255,255,255,.22);border-radius:50%;background:rgba(4,20,15,.38);font-size:20px;backdrop-filter:blur(10px)}.side-action small{font-size:8px}.shutter{display:grid;width:78px;height:78px;padding:5px;place-items:center;border:2px solid rgba(255,255,255,.9)!important;border-radius:50%;background:transparent}.shutter i{width:62px;height:62px;border-radius:50%;background:#fff;transition:transform .16s ease}.shutter:active i{transform:scale(.86)}.hud-fade-enter-active,.hud-fade-leave-active{transition:opacity .28s ease,transform .34s ease}.hud-fade-enter-from,.hud-fade-leave-to{opacity:0;transform:translateY(6px)}@keyframes scan{0%,100%{top:8%;opacity:.35}50%{top:92%;opacity:1}}@keyframes tag-in{from{opacity:0;transform:translateY(8px)}}@media(prefers-reduced-motion:reduce){.scan-line{animation:none}.spatial-tag{animation:none}.model-reveal-enter-active,.model-reveal-leave-active,.hud-fade-enter-active,.hud-fade-leave-active{transition-duration:.01ms}}
</style>
