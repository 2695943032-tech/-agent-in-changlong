<script setup lang="ts">
import type { CompanionId } from '../../../../shared/types/pretrip'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const props = defineProps<{ companionId: CompanionId, action: 'idle' | 'wave' | 'talk', accent: string }>()
const canvas = useTemplateRef<HTMLCanvasElement>('modelCanvas')
let renderer: THREE.WebGLRenderer | null = null
let frameId = 0
let mixer: THREE.AnimationMixer | null = null
let activeClip: THREE.AnimationAction | null = null
let loadedModel: THREE.Group | null = null

function material(color: THREE.ColorRepresentation) {
  return new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: .02 })
}

function sphere(group: THREE.Group, color: THREE.ColorRepresentation, scale: [number, number, number], position: [number, number, number]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), material(color))
  mesh.scale.set(...scale); mesh.position.set(...position); mesh.castShadow = true; group.add(mesh)
  return mesh
}

function cylinder(group: THREE.Group, color: THREE.ColorRepresentation, radius: number, length: number, position: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * .9, length, 18), material(color))
  mesh.position.set(...position); mesh.rotation.set(...rotation); mesh.castShadow = true; group.add(mesh)
  return mesh
}

function buildFace(group: THREE.Group, y: number, eyeGap: number, eyeScale = 1) {
  sphere(group, '#171b19', [.09 * eyeScale, .12 * eyeScale, .055], [-eyeGap, y, .72])
  sphere(group, '#171b19', [.09 * eyeScale, .12 * eyeScale, .055], [eyeGap, y, .72])
  sphere(group, '#fffdf5', [.025, .035, .018], [-eyeGap - .018, y + .025, .765])
  sphere(group, '#fffdf5', [.025, .035, .018], [eyeGap - .018, y + .025, .765])
}

function buildCompanion(id: CompanionId) {
  const group = new THREE.Group()
  let arm: THREE.Mesh | null = null
  if (id === 'panda') {
    sphere(group, '#f2efe5', [.72, .86, .56], [0, .12, 0]); sphere(group, '#f5f1e8', [.62, .57, .52], [0, 1.05, .03])
    sphere(group, '#202522', [.22, .24, .18], [-.45, 1.48, -.02]); sphere(group, '#202522', [.22, .24, .18], [.45, 1.48, -.02])
    sphere(group, '#252a27', [.2, .25, .08], [-.23, 1.12, .48]); sphere(group, '#252a27', [.2, .25, .08], [.23, 1.12, .48]); buildFace(group, 1.15, .23, .7)
    cylinder(group, '#252a27', .18, .82, [-.58, .18, .02], [0, 0, -.24]); arm = cylinder(group, '#252a27', .18, .82, [.58, .18, .02], [0, 0, .24])
  }
  else if (id === 'tiger') {
    sphere(group, '#e68a2e', [.7, .9, .55], [0, .1, 0]); sphere(group, '#ec9639', [.6, .58, .5], [0, 1.08, .02]); sphere(group, '#f5dfbd', [.35, .25, .2], [0, .88, .48])
    sphere(group, '#7c3f1f', [.2, .22, .14], [-.43, 1.48, 0]); sphere(group, '#7c3f1f', [.2, .22, .14], [.43, 1.48, 0]); buildFace(group, 1.17, .2)
    for (const y of [-.35, .05, .42]) { cylinder(group, '#34231d', .035, 1.05, [0, y, .51], [0, 0, Math.PI / 2]) }
    arm = cylinder(group, '#d97929', .17, .86, [.61, .18, 0], [0, 0, .28]); cylinder(group, '#d97929', .17, .86, [-.61, .18, 0], [0, 0, -.28])
  }
  else if (id === 'koala') {
    sphere(group, '#91a39b', [.67, .84, .55], [0, .08, 0]); sphere(group, '#a8b7af', [.68, .62, .52], [0, 1.08, .02]); sphere(group, '#82968c', [.33, .35, .18], [-.54, 1.28, -.02]); sphere(group, '#82968c', [.33, .35, .18], [.54, 1.28, -.02])
    sphere(group, '#313c37', [.14, .2, .12], [0, .96, .55]); buildFace(group, 1.2, .23)
    arm = cylinder(group, '#879b91', .17, .84, [.6, .18, 0], [0, 0, .25]); cylinder(group, '#879b91', .17, .84, [-.6, .18, 0], [0, 0, -.25])
  }
  else if (id === 'elephant') {
    sphere(group, '#7799a2', [.75, .88, .6], [0, .05, 0]); sphere(group, '#86a8b0', [.66, .58, .54], [0, 1.03, .04]); sphere(group, '#7698a2', [.4, .5, .12], [-.58, 1.08, 0]); sphere(group, '#7698a2', [.4, .5, .12], [.58, 1.08, 0]); buildFace(group, 1.18, .22)
    cylinder(group, '#7e9fa8', .15, .9, [0, .55, .52], [.38, 0, 0]); arm = cylinder(group, '#6f929b', .18, .88, [.63, .14, 0], [0, 0, .24]); cylinder(group, '#6f929b', .18, .88, [-.63, .14, 0], [0, 0, -.24])
  }
  else if (id === 'giraffe') {
    sphere(group, '#e3ad52', [.62, .72, .48], [0, -.15, 0]); cylinder(group, '#e5b259', .27, 1.25, [0, .75, 0]); sphere(group, '#e8b75f', [.48, .42, .46], [0, 1.5, .02]); sphere(group, '#a87535', [.15, .14, .12], [-.3, 1.83, 0]); sphere(group, '#a87535', [.15, .14, .12], [.3, 1.83, 0]); buildFace(group, 1.56, .18)
    for (const [x, y] of [[-.3,.2],[.25,-.15],[-.16,.75],[.2,1.05]] as const) sphere(group, '#9d6930', [.15,.18,.05], [x,y,.48])
    arm = cylinder(group, '#dca74f', .14, .82, [.54, -.12, 0], [0, 0, .2]); cylinder(group, '#dca74f', .14, .82, [-.54, -.12, 0], [0, 0, -.2])
  }
  else {
    sphere(group, '#4b403b', [.78, .9, .58], [0, .08, 0]); sphere(group, '#51453f', [.62, .57, .5], [0, 1.08, .02]); sphere(group, '#8c7668', [.38, .28, .2], [0, .91, .46]); buildFace(group, 1.19, .2)
    arm = cylinder(group, '#433a36', .22, 1.05, [.66, .12, 0], [0, 0, .3]); cylinder(group, '#433a36', .22, 1.05, [-.66, .12, 0], [0, 0, -.3])
  }
  group.userData.waveArm = arm
  group.scale.setScalar(id === 'giraffe' ? .72 : .82)
  group.position.y = id === 'giraffe' ? -.45 : -.25
  group.userData.baseScaleY = group.scale.y
  return group
}

async function loadDetailedPanda() {
  const gltf = await new GLTFLoader().loadAsync('/models/companions/panda-tuantuan-ar-v1.glb?v=991fa5b')
  const group = gltf.scene
  group.updateMatrixWorld(true)
  const initialBox = new THREE.Box3().setFromObject(group)
  const scale = 2.25 / Math.max(initialBox.getSize(new THREE.Vector3()).y, .001)
  group.scale.setScalar(scale)
  group.userData.baseScaleY = scale
  group.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(group)
  const center = box.getCenter(new THREE.Vector3())
  group.position.set(-center.x, -.82 - box.min.y, -center.z)
  group.userData.baseY = group.position.y
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const item of materials) {
        if (item instanceof THREE.MeshStandardMaterial) {
          item.roughness = Math.min(item.roughness, .62)
          item.envMapIntensity = 1.15
          item.emissive.copy(item.color).multiplyScalar(.055)
          if (item.map) item.map.colorSpace = THREE.SRGBColorSpace
          item.needsUpdate = true
        }
      }
    }
  })
  return group
}

const riggedModelPaths: Partial<Record<CompanionId, string>> = {
  tiger: '/models/companions/tiger-companion-ar-v3.glb?v=3',
  koala: '/models/companions/koala-companion-ar-v1.glb?v=1',
  giraffe: '/models/companions/giraffe-companion-ar-v1.glb?v=1',
}

async function loadRiggedCompanion(id: CompanionId) {
  const path = riggedModelPaths[id]
  if (!path) return null
  const gltf = await new GLTFLoader().loadAsync(path)
  const group = gltf.scene
  group.updateMatrixWorld(true)
  const initialBox = new THREE.Box3().setFromObject(group)
  const targetHeight = id === 'giraffe' ? 2.45 : 2.18
  const scale = targetHeight / Math.max(initialBox.getSize(new THREE.Vector3()).y, .001)
  group.scale.setScalar(scale)
  group.userData.baseScaleY = scale
  group.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(group)
  const center = box.getCenter(new THREE.Vector3())
  group.position.set(-center.x, -.78 - box.min.y, -center.z)
  group.userData.baseY = group.position.y
  group.userData.clips = gltf.animations
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  return group
}

function playModelAction(action: 'idle' | 'wave' | 'talk') {
  if (!mixer || !loadedModel) return
  const clips = loadedModel.userData.clips as THREE.AnimationClip[] | undefined
  const clipName = action === 'wave' ? 'greeting' : action
  const clip = clips?.find(item => item.name === clipName) ?? clips?.find(item => item.name === 'idle')
  if (!clip) return
  const next = mixer.clipAction(clip)
  if (next === activeClip) return
  next.reset().fadeIn(.28).play()
  activeClip?.fadeOut(.28)
  activeClip = next
}

function disposeGroup(group: THREE.Group) {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    child.geometry.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const item of materials) {
      for (const value of Object.values(item)) {
        if (value instanceof THREE.Texture) value.dispose()
      }
      item.dispose()
    }
  })
}

async function mountScene() {
  if (!canvas.value) return
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(31, 1, .1, 100); camera.position.set(0, .75, 6.4)
  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(canvas.value.clientWidth, canvas.value.clientHeight, false); renderer.shadowMap.enabled = true
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.48
  scene.add(new THREE.HemisphereLight('#fff8e8', '#456b61', 3.5))
  const key = new THREE.DirectionalLight('#fff1ce', 5.2); key.position.set(3.4, 5.5, 4.5); key.castShadow = true; scene.add(key)
  const fill = new THREE.DirectionalLight('#d9efff', 2.6); fill.position.set(-4, 2.8, 3); scene.add(fill)
  const rim = new THREE.DirectionalLight(props.accent, 3.1); rim.position.set(1.5, 3, -4); scene.add(rim)
  let model = buildCompanion(props.companionId); scene.add(model)
  if (props.companionId === 'panda') {
    try {
      const detailedModel = await loadDetailedPanda()
      scene.remove(model); disposeGroup(model)
      model = detailedModel; scene.add(model)
    }
    catch (error) {
      console.warn('Detailed panda model failed to load; using stable fallback.', error)
    }
  }
  else if (riggedModelPaths[props.companionId]) {
    try {
      const riggedModel = await loadRiggedCompanion(props.companionId)
      if (riggedModel) {
        scene.remove(model); disposeGroup(model)
        model = riggedModel; scene.add(model)
        loadedModel = model
        mixer = new THREE.AnimationMixer(model)
        playModelAction(props.action)
      }
    }
    catch (error) {
      console.warn('Rigged companion failed to load; using stable fallback.', error)
    }
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.92, 48), new THREE.MeshBasicMaterial({ color: '#071712', transparent: true, opacity: .28, depthWrite: false })); shadow.scale.set(1.35, .42, 1); shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, -.78, .08); scene.add(shadow)
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.04, .012, 8, 64), new THREE.MeshBasicMaterial({ color: props.accent, transparent: true, opacity: .34 })); halo.rotation.x = Math.PI / 2; halo.position.y = -.76; scene.add(halo)
  const clock = new THREE.Clock()
  const animate = () => {
    const delta = clock.getDelta(); const t = clock.elapsedTime; mixer?.update(delta); const baseY = model.userData.baseY ?? (props.companionId === 'giraffe' ? -.45 : -.25)
    const actionEnergy = props.action === 'wave' ? 1 : props.action === 'talk' ? .7 : .28
    const targetY = baseY + Math.sin(t * 1.55) * (.012 + actionEnergy * .012) + Math.max(0, Math.sin(t * 3.1)) * actionEnergy * .008
    model.position.y += (targetY - model.position.y) * .075
    model.rotation.y = Math.sin(t * .48) * .075 + (props.action === 'wave' ? Math.sin(t * 1.4) * .045 : 0)
    model.rotation.z = Math.sin(t * .82) * (.008 + actionEnergy * .009)
    model.rotation.x = Math.sin(t * .62 + .8) * .008
    const arm = model.userData.waveArm as THREE.Mesh | null
    if (arm) arm.rotation.z = (props.action === 'wave' ? .72 + Math.sin(t * 5.4) * .42 : props.action === 'talk' ? .34 + Math.sin(t * 3.8) * .1 : .24)
    const baseScale = model.userData.baseScaleY ?? (props.companionId === 'giraffe' ? .72 : .82)
    const breath = 1 + Math.sin(t * 1.55) * .006
    const talkPulse = props.action === 'talk' ? Math.sin(t * 5.2) * .006 : 0
    model.scale.set(baseScale * (1 - talkPulse * .32), baseScale * (breath + talkPulse), baseScale * (1 - talkPulse * .32))
    halo.rotation.z = t * .14; halo.material.opacity = .28 + Math.sin(t * 1.25) * .06
    shadow.material.opacity = .25 - Math.sin(t * 1.55) * .025
    renderer?.render(scene, camera); frameId = requestAnimationFrame(animate)
  }
  animate()
}

onMounted(mountScene)
watch(() => props.action, playModelAction)
onBeforeUnmount(() => { cancelAnimationFrame(frameId); mixer?.stopAllAction(); mixer = null; activeClip = null; loadedModel = null; renderer?.dispose(); renderer = null })
</script>

<template><canvas ref="modelCanvas" class="companion-model" :aria-label="`${props.companionId} 3D 动物伙伴模型`" /></template>

<style scoped>
.companion-model{display:block;width:100%;height:100%;touch-action:none;filter:drop-shadow(0 24px 24px rgba(0,0,0,.28))}
</style>
