<template>
  <div class="magic-field" aria-hidden="true">
    <span class="magic-grid" />
    <span class="magic-glow magic-glow-a" />
    <span class="magic-glow magic-glow-b" />
    <span class="magic-grain" />
  </div>
</template>

<style scoped>
.magic-field {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.magic-grid {
  position: absolute;
  inset: -30%;
  background-image:
    linear-gradient(rgba(229, 205, 145, .055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(229, 205, 145, .055) 1px, transparent 1px);
  background-size: 52px 52px;
  mask-image: radial-gradient(ellipse 75% 62% at 70% 20%, #000 16%, transparent 72%);
  transform: perspective(650px) rotateX(58deg) translateY(-10%);
  transform-origin: center top;
  animation: grid-travel 18s linear infinite;
}

.magic-glow {
  position: absolute;
  width: 38vw;
  height: 38vw;
  border-radius: 50%;
  filter: blur(90px);
  opacity: .16;
  animation: glow-breathe 8s ease-in-out infinite alternate;
}

.magic-glow-a { top: -22%; right: -8%; background: #d6a84b; }
.magic-glow-b { bottom: -30%; left: -16%; background: #4a8f72; animation-delay: -3.5s; }

.magic-grain {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.4'/%3E%3C/svg%3E");
  mix-blend-mode: soft-light;
  opacity: .045;
}

@keyframes grid-travel {
  to { transform: perspective(650px) rotateX(58deg) translateY(42px); }
}

@keyframes glow-breathe {
  to { opacity: .24; transform: translate3d(4%, 6%, 0) scale(1.08); }
}

@media (max-width: 680px) {
  .magic-grid { background-size: 38px 38px; mask-image: radial-gradient(ellipse 92% 55% at 65% 18%, #000 10%, transparent 72%); }
  .magic-glow { width: 90vw; height: 90vw; filter: blur(72px); }
}

@media (prefers-reduced-motion: reduce) {
  .magic-grid,
  .magic-glow { animation: none; }
}
</style>
