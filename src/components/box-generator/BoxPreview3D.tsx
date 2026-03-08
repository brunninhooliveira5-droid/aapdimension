import { useRef, useEffect, useState, useCallback } from "react";
import type { BoxParams } from "@/lib/box-generator-engine";

interface Props {
  params: BoxParams;
  className?: string;
}

type Vec3 = [number, number, number];

type Face3D = {
  pts: Vec3[];
  fill: string;
  opacity: number;
  label: string;
  isJoint?: boolean;
};

function computeFingerCount(edgeLen: number, minSize: number, maxSize: number): number {
  let best = 3;
  for (let n = 3; n < 60; n += 2) {
    const sz = edgeLen / n;
    if (sz >= minSize && sz <= maxSize) { best = n; break; }
    if (sz < minSize) { best = Math.max(3, n - 2); break; }
  }
  return best;
}

// Vector helpers
const v3add = (a: Vec3, b: Vec3): Vec3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const v3scale = (a: Vec3, s: number): Vec3 => [a[0]*s, a[1]*s, a[2]*s];
const v3lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t
];

/**
 * Build faces for a single wall panel with finger joints on its edges.
 * 
 * The wall is defined by 4 outer-face corners (A,B,C,D) going around the panel,
 * plus a `normal` pointing outward (away from box interior) and `thickness`.
 * 
 * Each edge can have finger joint config:
 *   - null = straight edge
 *   - { fingerCount, isTabs } where isTabs=true means this edge has protruding tabs
 * 
 * For tabs (male): the finger protrudes outward along the edge normal of the NEIGHBOR wall.
 *   We model this by extending the panel boundary outward at tab positions.
 * For slots (female): the finger area is cut inward (we skip drawing material there).
 * 
 * In assembled view, we simply build each wall as a flat slab with notches.
 */

interface EdgeJointConfig {
  fingerCount: number;
  isTabs: boolean;  // true = this edge has protruding tabs
}

interface WallDef {
  // 4 corners of the outer face, wound CCW when viewed from outside
  corners: Vec3[];
  normal: Vec3;       // outward normal
  thickness: number;
  label: string;
  outerColor: string;
  innerColor: string;
  edgeColor: string;
  // Edge joints: [edge01, edge12, edge23, edge30]
  // edge01 = between corners[0] and corners[1], etc.
  edges: (EdgeJointConfig | null)[];
}

/**
 * Build the 3D faces for a wall with finger joints properly cut/extended.
 * 
 * Strategy for assembled box:
 * - Tab edges: the material extends outward by `thickness` at tab finger positions
 *   (these tabs will occupy the slot space of the neighbor wall)
 * - Slot edges: the material is notched inward by `thickness` at slot positions
 *   (these notches receive the tabs from the neighbor)
 * - The base wall slab has material thickness along the `normal` direction (inward)
 */
function buildWallFaces(wall: WallDef): Face3D[] {
  const faces: Face3D[] = [];
  const { corners, normal, thickness, label, outerColor, innerColor, edgeColor, edges } = wall;
  const inward = v3scale(normal, -1);

  // Inner corners
  const innerCorners = corners.map(c => v3add(c, v3scale(inward, thickness)));

  // ── Main outer face ──
  faces.push({ pts: [...corners], fill: outerColor, opacity: 0.92, label });
  // Main inner face (reversed winding)
  faces.push({ pts: [innerCorners[3], innerCorners[2], innerCorners[1], innerCorners[0]], fill: innerColor, opacity: 0.82, label: "" });

  // ── 4 edge strips (thickness sides) ──
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    faces.push({
      pts: [corners[i], corners[j], innerCorners[j], innerCorners[i]],
      fill: edgeColor, opacity: 0.88, label: "",
    });
  }

  // ── Finger joint tabs (protruding blocks) ──
  for (let ei = 0; ei < 4; ei++) {
    const edgeCfg = edges[ei];
    if (!edgeCfg) continue;

    const ej = (ei + 1) % 4;
    const edgeStart = corners[ei];
    const edgeEnd = corners[ej];
    const innerStart = innerCorners[ei];
    const innerEnd = innerCorners[ej];

    const { fingerCount, isTabs } = edgeCfg;

    // Compute edge outward direction (perpendicular to edge, in the wall plane, pointing outward from wall center)
    // This is the direction the tabs protrude into the neighbor
    // For a box edge, tabs extend along the direction that goes INTO the neighbor wall
    // That direction is perpendicular to the edge and lies in the wall outer face plane
    const edgeDir: Vec3 = [
      edgeEnd[0] - edgeStart[0],
      edgeEnd[1] - edgeStart[1],
      edgeEnd[2] - edgeStart[2],
    ];
    const edgeLen = Math.sqrt(edgeDir[0]**2 + edgeDir[1]**2 + edgeDir[2]**2);
    // Normalized edge direction
    const eDirN: Vec3 = [edgeDir[0]/edgeLen, edgeDir[1]/edgeLen, edgeDir[2]/edgeLen];

    // Cross product: normal × edgeDir gives the "outward along edge" direction
    // But we want the direction pointing AWAY from the wall center
    const wallCenter: Vec3 = [
      (corners[0][0]+corners[1][0]+corners[2][0]+corners[3][0])/4,
      (corners[0][1]+corners[1][1]+corners[2][1]+corners[3][1])/4,
      (corners[0][2]+corners[1][2]+corners[2][2]+corners[3][2])/4,
    ];
    const edgeMid: Vec3 = v3lerp(edgeStart, edgeEnd, 0.5);
    // Direction from wall center to edge midpoint
    const toEdge: Vec3 = [edgeMid[0]-wallCenter[0], edgeMid[1]-wallCenter[1], edgeMid[2]-wallCenter[2]];
    const toEdgeLen = Math.sqrt(toEdge[0]**2+toEdge[1]**2+toEdge[2]**2);
    const tabDir: Vec3 = toEdgeLen > 0.001 
      ? [toEdge[0]/toEdgeLen, toEdge[1]/toEdgeLen, toEdge[2]/toEdgeLen]
      : [0, 0, 0];

    for (let fi = 0; fi < fingerCount; fi++) {
      const isFingerTab = (fi % 2 === 0) === isTabs;

      if (isFingerTab && isTabs) {
        // Draw protruding tab block
        const t0 = fi / fingerCount;
        const t1 = (fi + 1) / fingerCount;

        // 4 corners on outer face edge
        const a = v3lerp(edgeStart, edgeEnd, t0);
        const b = v3lerp(edgeStart, edgeEnd, t1);
        // Corresponding inner face corners
        const ai = v3lerp(innerStart, innerEnd, t0);
        const bi = v3lerp(innerStart, innerEnd, t1);

        // Extruded by thickness along tabDir
        const ae = v3add(a, v3scale(tabDir, thickness));
        const be = v3add(b, v3scale(tabDir, thickness));
        const aie = v3add(ai, v3scale(tabDir, thickness));
        const bie = v3add(bi, v3scale(tabDir, thickness));

        // 6 faces of the tab block
        const tabColor = "#c48a2a";
        const tabSide = "#a87420";
        const tabTop = "#d49a35";

        // Front (outer) face of tab
        faces.push({ pts: [ae, be, bie, aie], fill: tabColor, opacity: 0.95, label: "", isJoint: true });
        // Back (connects to wall) face
        faces.push({ pts: [b, a, ai, bi], fill: tabSide, opacity: 0.85, label: "", isJoint: true });
        // Top face
        faces.push({ pts: [a, ae, aie, ai], fill: tabTop, opacity: 0.90, label: "", isJoint: true });
        // Bottom face
        faces.push({ pts: [be, b, bi, bie], fill: tabTop, opacity: 0.90, label: "", isJoint: true });
        // Left side
        faces.push({ pts: [a, b, be, ae], fill: tabSide, opacity: 0.88, label: "", isJoint: true });
        // Right side (inner)
        faces.push({ pts: [aie, bie, bi, ai], fill: tabSide, opacity: 0.85, label: "", isJoint: true });
      }

      if (isFingerTab && !isTabs) {
        // This is a slot (female) — draw a dark recess indicator
        const t0 = fi / fingerCount;
        const t1 = (fi + 1) / fingerCount;

        const a = v3lerp(edgeStart, edgeEnd, t0);
        const b = v3lerp(edgeStart, edgeEnd, t1);
        // Recess inward
        const slotDepth = thickness * 0.3;
        const ar = v3add(a, v3scale(tabDir, -slotDepth));
        const br = v3add(b, v3scale(tabDir, -slotDepth));

        faces.push({ pts: [a, b, br, ar], fill: "#3d2a10", opacity: 0.85, label: "", isJoint: true });
      }
    }
  }

  return faces;
}

export function BoxPreview3D({ params, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ rx: 0.5, ry: -0.7 });
  const [zoom, setZoom] = useState(1);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setRotation((r) => ({
      rx: r.rx + dy * 0.008,
      ry: r.ry + dx * 0.008,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.002)));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);

    const t = params.materialThickness;
    let W = params.width;
    let H = params.height;
    let D = params.depth;

    if (params.dimensionMode === "internal") {
      W += 2 * t;
      H += 2 * t;
      D += 2 * t;
    }

    const maxDim = Math.max(W, H, D);
    const sc = Math.min(cw, ch) * 0.28 / maxDim * zoom;

    const cosRx = Math.cos(rotation.rx), sinRx = Math.sin(rotation.rx);
    const cosRy = Math.cos(rotation.ry), sinRy = Math.sin(rotation.ry);

    const project = (x: number, y: number, z: number): Vec3 => {
      const nx = x * cosRy + z * sinRy;
      const nz = -x * sinRy + z * cosRy;
      const ny = y * cosRx - nz * sinRx;
      const fz = y * sinRx + nz * cosRx;
      return [cw / 2 + nx * sc, ch / 2 - ny * sc, fz];
    };

    // ── Background ──
    const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
    bgGrad.addColorStop(0, "#7cb8e8");
    bgGrad.addColorStop(1, "#a8d4f0");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Grid floor
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 0.5;
    const gridSize = maxDim * 1.5;
    const gridStep = maxDim / 5;
    for (let g = -gridSize; g <= gridSize; g += gridStep) {
      const p1 = project(g, -H / 2, -gridSize);
      const p2 = project(g, -H / 2, gridSize);
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      const p3 = project(-gridSize, -H / 2, g);
      const p4 = project(gridSize, -H / 2, g);
      ctx.beginPath(); ctx.moveTo(p3[0], p3[1]); ctx.lineTo(p4[0], p4[1]); ctx.stroke();
    }

    const isOpen = params.boxType === "open";
    const hasLid = params.boxType === "lid_simple" || params.boxType === "lid_sliding";
    const hw = W / 2, hh = H / 2, hd = D / 2;

    // Wood colors
    const woodFront = "#d4a553";
    const woodSide = "#c49340";
    const woodEdge = "#b07e30";
    const woodLight = "#e2b96a";
    const woodDark = "#a06e28";

    const jt = params.jointType;
    const useFinger = jt === "finger" || jt === "tslot";

    const fcW = computeFingerCount(W, params.fingerMinSize, params.fingerMaxSize);
    const fcH = computeFingerCount(H, params.fingerMinSize, params.fingerMaxSize);
    const fcD = computeFingerCount(D, params.fingerMinSize, params.fingerMaxSize);

    const faces: Face3D[] = [];

    // ──────────────────────────────────────────────────────────
    // ASSEMBLED BOX — walls positioned with thickness offsets
    // 
    // Convention:
    //   Front/Back walls: full width W, full height H
    //   Left/Right walls: depth D-2t (fit between front/back), full height H  
    //   Bottom/Top: width W, depth D-2t (fit between front/back)
    //
    // Joint pairing (male/female):
    //   Front/Back vertical edges → SLOTS (female), receive side wall tabs
    //   Side walls vertical edges → TABS (male), go into front/back slots
    //   Front/Back bottom edge → TABS (male), go into bottom slots  
    //   Bottom front/back edges → SLOTS (female), receive front/back tabs
    //   Side bottom edges → TABS (male), go into bottom slots
    //   Bottom side edges → SLOTS (female), receive side tabs
    // ──────────────────────────────────────────────────────────

    // Helper to make edge configs
    const tabEdge = (fc: number): EdgeJointConfig => ({ fingerCount: fc, isTabs: true });
    const slotEdge = (fc: number): EdgeJointConfig => ({ fingerCount: fc, isTabs: false });

    // ── FRONT WALL ── (Z = +hd, facing +Z)
    // Corners CCW from outside: BL, BR, TR, TL
    // Edges: bottom(0-1), right(1-2), top(2-3), left(3-0)
    {
      const frontH_actual = isOpen || hasLid ? H - t : H;
      const y_bottom = -hh;
      const y_top = -hh + frontH_actual;
      const wall: WallDef = {
        corners: [
          [-hw, y_bottom, hd],  // BL
          [hw, y_bottom, hd],   // BR
          [hw, y_top, hd],      // TR
          [-hw, y_top, hd],     // TL
        ],
        normal: [0, 0, 1],
        thickness: t,
        label: "Frente",
        outerColor: woodFront,
        innerColor: woodSide,
        edgeColor: woodEdge,
        edges: useFinger ? [
          tabEdge(fcW),                                        // bottom → tabs into bottom piece
          slotEdge(computeFingerCount(frontH_actual, params.fingerMinSize, params.fingerMaxSize)),  // right → slots for right wall tabs
          (!isOpen && !hasLid) ? tabEdge(fcW) : null,          // top → tabs into top piece
          slotEdge(computeFingerCount(frontH_actual, params.fingerMinSize, params.fingerMaxSize)),  // left → slots for left wall tabs
        ] : [null, null, null, null],
      };
      faces.push(...buildWallFaces(wall));
    }

    // ── BACK WALL ── (Z = -hd, facing -Z)
    {
      const backH_actual = isOpen || hasLid ? H - t : H;
      const y_bottom = -hh;
      const y_top = -hh + backH_actual;
      const wall: WallDef = {
        corners: [
          [hw, y_bottom, -hd],   // BL (from outside looking at back)
          [-hw, y_bottom, -hd],  // BR
          [-hw, y_top, -hd],     // TR
          [hw, y_top, -hd],      // TL
        ],
        normal: [0, 0, -1],
        thickness: t,
        label: "Traseira",
        outerColor: woodSide,
        innerColor: woodFront,
        edgeColor: woodEdge,
        edges: useFinger ? [
          tabEdge(fcW),
          slotEdge(computeFingerCount(backH_actual, params.fingerMinSize, params.fingerMaxSize)),
          (!isOpen && !hasLid) ? tabEdge(fcW) : null,
          slotEdge(computeFingerCount(backH_actual, params.fingerMinSize, params.fingerMaxSize)),
        ] : [null, null, null, null],
      };
      faces.push(...buildWallFaces(wall));
    }

    // ── LEFT WALL ── (X = -hw, facing -X)
    // Fits between front and back: depth = D - 2*t
    {
      const sideH_actual = isOpen || hasLid ? H - t : H;
      const y_bottom = -hh;
      const y_top = -hh + sideH_actual;
      const sideD = D - 2 * t;
      const z_front = hd - t;
      const z_back = -hd + t;
      const fcSideH = computeFingerCount(sideH_actual, params.fingerMinSize, params.fingerMaxSize);
      const fcSideD = computeFingerCount(sideD, params.fingerMinSize, params.fingerMaxSize);
      const wall: WallDef = {
        corners: [
          [-hw, y_bottom, z_front],  // BL
          [-hw, y_bottom, z_back],   // BR
          [-hw, y_top, z_back],      // TR
          [-hw, y_top, z_front],     // TL
        ],
        normal: [-1, 0, 0],
        thickness: t,
        label: "Esquerda",
        outerColor: woodEdge,
        innerColor: woodSide,
        edgeColor: woodDark,
        edges: useFinger ? [
          tabEdge(fcSideD),                              // bottom → tabs into bottom
          tabEdge(fcSideH),                              // back-side vertical → tabs into back wall
          (!isOpen && !hasLid) ? tabEdge(fcSideD) : null, // top → tabs into top
          tabEdge(fcSideH),                              // front-side vertical → tabs into front wall
        ] : [null, null, null, null],
      };
      faces.push(...buildWallFaces(wall));
    }

    // ── RIGHT WALL ── (X = +hw, facing +X)
    {
      const sideH_actual = isOpen || hasLid ? H - t : H;
      const y_bottom = -hh;
      const y_top = -hh + sideH_actual;
      const sideD = D - 2 * t;
      const z_front = hd - t;
      const z_back = -hd + t;
      const fcSideH = computeFingerCount(sideH_actual, params.fingerMinSize, params.fingerMaxSize);
      const fcSideD = computeFingerCount(sideD, params.fingerMinSize, params.fingerMaxSize);
      const wall: WallDef = {
        corners: [
          [hw, y_bottom, z_back],   // BL (from outside looking at right)
          [hw, y_bottom, z_front],  // BR
          [hw, y_top, z_front],     // TR
          [hw, y_top, z_back],      // TL
        ],
        normal: [1, 0, 0],
        thickness: t,
        label: "Direita",
        outerColor: woodSide,
        innerColor: woodEdge,
        edgeColor: woodDark,
        edges: useFinger ? [
          tabEdge(fcSideD),
          tabEdge(fcSideH),
          (!isOpen && !hasLid) ? tabEdge(fcSideD) : null,
          tabEdge(fcSideH),
        ] : [null, null, null, null],
      };
      faces.push(...buildWallFaces(wall));
    }

    // ── BOTTOM ── (Y = -hh, facing -Y)
    // Width = W, Depth = D-2t (fits between front/back)
    {
      const z_front = hd - t;
      const z_back = -hd + t;
      const bottomD = D - 2 * t;
      const fcBottomD = computeFingerCount(bottomD, params.fingerMinSize, params.fingerMaxSize);
      const wall: WallDef = {
        corners: [
          [-hw, -hh, z_front],  // FL
          [hw, -hh, z_front],   // FR
          [hw, -hh, z_back],    // BR
          [-hw, -hh, z_back],   // BL
        ],
        normal: [0, -1, 0],
        thickness: t,
        label: "Fundo",
        outerColor: woodDark,
        innerColor: woodEdge,
        edgeColor: woodEdge,
        edges: useFinger ? [
          slotEdge(fcW),       // front edge → slots for front wall tabs
          slotEdge(fcBottomD), // right edge → slots for right wall tabs
          slotEdge(fcW),       // back edge → slots for back wall tabs
          slotEdge(fcBottomD), // left edge → slots for left wall tabs
        ] : [null, null, null, null],
      };
      faces.push(...buildWallFaces(wall));
    }

    // ── TOP ── (Y = +hh, facing +Y)
    if (!isOpen && !hasLid) {
      const z_front = hd - t;
      const z_back = -hd + t;
      const topD = D - 2 * t;
      const fcTopD = computeFingerCount(topD, params.fingerMinSize, params.fingerMaxSize);
      const wall: WallDef = {
        corners: [
          [-hw, hh, z_back],   // BL
          [hw, hh, z_back],    // BR
          [hw, hh, z_front],   // FR
          [-hw, hh, z_front],  // FL
        ],
        normal: [0, 1, 0],
        thickness: t,
        label: "Topo",
        outerColor: woodLight,
        innerColor: woodSide,
        edgeColor: woodEdge,
        edges: useFinger ? [
          slotEdge(fcW),
          slotEdge(fcTopD),
          slotEdge(fcW),
          slotEdge(fcTopD),
        ] : [null, null, null, null],
      };
      faces.push(...buildWallFaces(wall));
    }

    // ── LID ──
    if (hasLid) {
      const lidOverhang = 3;
      const y_top = isOpen || hasLid ? -hh + (H - t) : hh;
      const innerCornersLid: Vec3[] = [
        [-hw - lidOverhang, y_top + t * 0.5, -hd - lidOverhang],
        [hw + lidOverhang, y_top + t * 0.5, -hd - lidOverhang],
        [hw + lidOverhang, y_top + t * 0.5, hd + lidOverhang],
        [-hw - lidOverhang, y_top + t * 0.5, hd + lidOverhang],
      ];
      const wall: WallDef = {
        corners: innerCornersLid,
        normal: [0, 1, 0],
        thickness: t,
        label: "Tampa",
        outerColor: "#e8c06a",
        innerColor: woodSide,
        edgeColor: woodEdge,
        edges: [null, null, null, null],
      };
      faces.push(...buildWallFaces(wall));
    }

    // ── Project & sort (painter's algorithm) ──
    const projectedFaces = faces.map((face) => {
      const projected = face.pts.map(([x, y, z]) => project(x, y, z));
      const zAvg = projected.reduce((s, p) => s + p[2], 0) / projected.length;
      return { ...face, projected, zAvg };
    });
    projectedFaces.sort((a, b) => a.zAvg - b.zAvg);

    for (const face of projectedFaces) {
      const pts = face.projected;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();

      // Lighting based on face normal
      const ax = pts[1][0] - pts[0][0], ay = pts[1][1] - pts[0][1];
      const bx = pts[2][0] - pts[0][0], by = pts[2][1] - pts[0][1];
      const nz = ax * by - ay * bx;
      const lightFactor = 0.4 + 0.6 * Math.abs(nz) / (Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by) + 0.001);

      ctx.globalAlpha = face.opacity * Math.min(lightFactor + 0.2, 1);
      ctx.fillStyle = face.fill;
      ctx.fill();

      if (face.isJoint) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#2a1800";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = "#6b4c1e";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Wood grain
        if (face.label && !face.isJoint) {
          const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          const faceW = Math.sqrt((pts[1][0] - pts[0][0]) ** 2 + (pts[1][1] - pts[0][1]) ** 2);
          const faceH = Math.sqrt((pts[2][0] - pts[1][0]) ** 2 + (pts[2][1] - pts[1][1]) ** 2);
          if (faceW > 30 && faceH > 20) {
            ctx.globalAlpha = 0.08;
            ctx.strokeStyle = "#5a3d12";
            ctx.lineWidth = 0.5;
            const grainCount = Math.min(8, Math.floor(faceH / 8));
            for (let g = 1; g <= grainCount; g++) {
              const frac = g / (grainCount + 1);
              const gx1 = pts[0][0] + (pts[3][0] - pts[0][0]) * frac;
              const gy1 = pts[0][1] + (pts[3][1] - pts[0][1]) * frac;
              const gx2 = pts[1][0] + (pts[2][0] - pts[1][0]) * frac;
              const gy2 = pts[1][1] + (pts[2][1] - pts[1][1]) * frac;
              ctx.beginPath();
              ctx.moveTo(gx1, gy1);
              ctx.lineTo(gx2, gy2);
              ctx.stroke();
            }
          }
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = "#3d2a10";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(face.label, cx, cy);
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── Joint type label ──
    const jointLabels: Record<string, string> = {
      finger: "Finger Joint", straight: "Junta Reta", slot: "Slot", tslot: "T-Slot",
    };
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(6, 4, 130, 34);
    ctx.fillStyle = "#2c5e8a";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Encaixe: ${jointLabels[params.jointType] || params.jointType}`, 10, 16);
    ctx.fillText(`Espessura: ${t}${params.unit}`, 10, 30);

    // Dimensions
    ctx.fillStyle = "#2c5e8a";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    const bPt = project(0, -hh - maxDim * 0.18, hd);
    ctx.fillText(`${W.toFixed(0)} × ${D.toFixed(0)} × ${H.toFixed(0)} ${params.unit}`, bPt[0], bPt[1]);

    // Hint
    ctx.fillStyle = "rgba(44,94,138,0.4)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Clique e arraste para rotacionar · Scroll para zoom", cw / 2, ch - 10);
  }, [params, rotation, zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", cursor: dragging.current ? "grabbing" : "grab", touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
