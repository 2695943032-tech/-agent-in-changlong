# White tiger companion model v1

## Identity lock

- Shape, face, outfit, and palette references: `public/companions/tiger-selection.png`, `tiger-companion.webp`, and `tiger-dragging.webp`.
- Preserve the white fur, charcoal facial stripes, amber eyes, coral nose and ears, red vest, cream tee, charcoal shorts, white shoes, striped tail, and dark cross-body bag.
- Match the existing rounded low-poly companion family while giving the face, clothing layers, tail, and species markings more definition.

## Runtime contract

- Source: `art/companions/tiger/tiger-companion-v1.blend`.
- Runtime: `public/models/companions/tiger-companion-ar-v1.glb`.
- Preview: `art/companions/tiger/references/tiger-companion-preview-v1.png`.
- Clips: `idle`, `greeting`, `talk`, `listen`.
- Export orientation: Blender Z-up source, glTF Y-up runtime; origin at the ground between the feet.
- Mobile targets: no more than 18,000 triangles and approximately 1 MB when practical.

## Rig extensions

The shared companion skeleton is retained, with dedicated hand bones and a three-bone tail chain. The tail carries low-amplitude motion in `idle`; the greeting clip adds wrist motion; listen raises a hand toward the ear.

## High-poly master

- High-poly source: `art/companions/tiger/tiger-companion-highpoly-v1.blend`.
- High-poly build script: `scripts/blender/build_tiger_highpoly.py`.
- The editable stack is base mesh, authored bevel, Catmull-Clark subdivision, then procedural geometric displacement.
- Fur, woven fabric, leather, and rubber use separate procedural noise scales and displacement strengths.
- Eyes, facial markings, teeth, nose, and pixel accents remain clean to protect the close-up identity.
- Material roughness variation is generated with Blender noise nodes. No image textures, normal-map baking, or displacement baking are required.
- The high-poly master is intended for close renders and future source work. The existing mobile GLB remains the runtime asset.

## Multiview reproduction v3

- Turnaround: `art/companions/tiger/references/tiger-turnaround-v3.png` with equal-height FRONT / LEFT / BACK views.
- Geometry source: Hunyuan3D-2mv, 50 inference steps, fp16, seed `12345`, octree resolution `320` on an RTX 5060 Laptop 8 GB GPU.
- Unreduced base: `art/companions/tiger/wip/hunyuan/tiger-base-v3.glb` at 379,708 triangles.
- Editable delivery: `art/companions/tiger/tiger-companion-hunyuan-v3.blend`.
- Display delivery: `art/companions/tiger/wip/hunyuan/tiger-display-v3.glb` at 243,948 triangles.
- Mobile runtime: `public/models/companions/tiger-companion-ar-v3.glb` at 83,948 triangles and approximately 6.32 MB.
- The forehead mark, eyes, pupils, brows, cheek stripes, nose, and bag pixels are independent raised geometry.
- Surface relief and color use Blender procedural geometry and solid material regions. There are no image texture nodes and no baked texture maps.
- Exported GLBs are re-imported into Blender for final rendering, bounds, floor-contact, triangle-count, and image-dependency validation.
