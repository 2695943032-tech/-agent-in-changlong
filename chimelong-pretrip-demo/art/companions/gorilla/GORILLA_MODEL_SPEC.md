# Gorilla companion — multiview reproduction v1

- Source reference: `references/gorilla-turnaround-v1.png`.
- Reconstruction inputs: equal-scale front / left / back orthographic views.
- Generator: Hunyuan3D-2mv, geometry only, 50 inference steps, seed `12345`, octree resolution `320`.
- Generated base: `wip/hunyuan/gorilla-base-v1.glb` — 413,360 triangles.
- Editable Blender master: `gorilla-companion-hunyuan-v1.blend`.
- Display GLB: `wip/hunyuan/gorilla-display-v1.glb` — 248,312 triangles, 4,602,608 bytes.
- Mobile AR GLB: `public/models/companions/gorilla-companion-ar-v1.glb` — 88,312 triangles, 1,697,988 bytes.
- Species silhouette retained: crown-like head hair, projecting muzzle, round ears and long powerful arms.
- Clothing silhouette retained: raised hood, sleeveless purple vest, turquoise shorts, waist pouch and layered sneakers.
- Face mask, muzzle, nose, eyes, irises, pupils, brows and pouch pixel are independent raised geometry.
- Surface variation uses procedural geometric displacement; no baked maps or image texture nodes.
- Final display and mobile GLBs were re-imported into Blender and rendered for validation.

The v1 Hunyuan asset is a static geometry deliverable. Rigging and the `idle / greeting / talk / listen` action set remain a later animation stage.

## Native-surface face correction v2

- Editable delivery: `gorilla-companion-face-corrected-v2.blend`.
- Display delivery: `wip/hunyuan/gorilla-display-v2.glb` at 240,000 triangles.
- Mobile runtime: `public/models/companions/gorilla-companion-ar-v2.glb` at 79,999 triangles and approximately 1.50 MB.
- Mask, eyes, brows, nose, and muzzle colors are assigned directly to native polygons instead of floating face shells.
- The projecting muzzle, eye sockets, forehead, and ears remain a single spatially coherent surface at every view angle.
- The decimated mesh is validated before GLB export; the final GLB is re-imported and rendered successfully.
- Validation: `references/face-spatial-v2/` and `references/gorilla-face-mobile-glb-check-v2.png`.
