

## Analysis

The root cause is in `buildWallFaces` — the `tabDir` vector (direction tabs protrude) is calculated as "wall center → edge midpoint", which often points outward from the box instead of into the neighbor wall. This causes tabs to render outside the box, overlapping material incorrectly.

Trying to fix the tab direction for every edge/wall combination is fragile. A fundamentally better approach: **render each wall as a simple slab correctly positioned, then draw joint pattern indicators on the edge faces** to show where fingers interlock.

## Plan

### Rewrite `BoxPreview3D.tsx` with correct assembly logic

**Step 1 — Simple slab rendering (replace `buildWallFaces`)**
- Each wall = 6-face rectangular slab (outer, inner, 4 edge strips)
- No protruding tab geometry — in an assembled box, tabs fill slots flush
- Walls positioned with correct thickness offsets:
  - Front/Back: full W × H, at Z = ±hd
  - Sides: (D-2t) wide × H, at X = ±hw, inset by t in Z
  - Bottom/Top: W × (D-2t), at Y = ±hh

**Step 2 — Joint pattern indicators on edges**
- On each edge strip face, draw alternating colored bands to indicate finger positions
- Tab positions shown in lighter wood color, slot positions in dark color
- This clearly communicates the joint pattern without geometry errors

**Step 3 — Exploded view toggle**
- Add a small "Explodir" button on the canvas overlay
- When active, offset each wall outward by ~15-20mm along its normal
- In exploded mode, finger tabs ARE visible as protruding blocks (since there's space)
- Correct `tabDir` by computing cross product of edge direction × wall normal

**Step 4 — Keep existing interaction (rotate/zoom/grid/labels)**

### Result
- Default assembled view: clean box with joint pattern lines, no geometry overlap
- Exploded view: walls separated, tabs visible protruding correctly into gap

