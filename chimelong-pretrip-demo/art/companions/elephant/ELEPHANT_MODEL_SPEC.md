# Elephant companion — multiview reproduction v1

- Source reference: `references/elephant-turnaround-v1.png`.
- Reconstruction inputs: equal-scale front / left / back orthographic views.
- Generator: Hunyuan3D-2mv, geometry only, 50 inference steps, seed `12345`, octree resolution `320`.
- Generated base: `wip/hunyuan/elephant-base-v1.glb` — 439,826 triangles.
- Editable Blender master: `elephant-companion-hunyuan-v1.blend`.
- Display GLB: `wip/hunyuan/elephant-display-v1.glb` — 245,312 triangles, 4,527,364 bytes.
- Mobile AR GLB: `public/models/companions/elephant-companion-ar-v1.glb` — 85,312 triangles, 1,618,716 bytes.
- Species silhouette retained: broad ears, curled trunk, head tuft and childlike proportions.
- Clothing silhouette retained: raised vest collar, cross-body strap, satchel, shorts and layered sneakers.
- Eyes, irises, pupils, brows and pixel accents are independent raised geometry.
- Surface variation uses procedural geometric displacement; no baked maps or image texture nodes.
- Final display and mobile GLBs were re-imported into Blender and rendered for validation.

The v1 Hunyuan asset is a static geometry deliverable. Rigging and the `idle / greeting / talk / listen` action set remain a later animation stage.

## Native-surface face correction v2

- Editable delivery: `elephant-companion-face-corrected-v2.blend`.
- Display delivery: `wip/hunyuan/elephant-display-v2.glb` at 240,000 triangles.
- Mobile runtime: `public/models/companions/elephant-companion-ar-v2.glb` at 80,000 triangles and 1,480,116 bytes.
- Eye, iris, pupil, and brow colors are assigned to native head polygons; the eye sockets and curled trunk retain their original geometric depth.
- Surface-normal and front-depth gates prevent facial/garment colors from spilling onto the ears, trunk, or torso.
- Validation: `references/face-spatial-v2/` and `references/elephant-face-mobile-glb-check-v2.png`.
