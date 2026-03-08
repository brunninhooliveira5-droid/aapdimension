import * as THREE from "three";

// ─── Types ───────────────────────────────────────────────────

export interface SlicerParams {
  materialThickness: number;
  direction: "x" | "y" | "z";
  spacing: number;
  toolCompensation: number;
  kerfWidth: number;
  jointType: "none" | "slot" | "tab" | "dogbone" | "malefemale";
  jointWidth: number;
  jointDepth: number;
  jointClearance: number;
  offsetMode: "internal" | "external" | "center";
}

export interface InterlockParams extends SlicerParams {
  slicesX: number;
  slicesY: number;
  slotClearance: number;
  slotDepth: number;
}

export interface RadialParams extends SlicerParams {
  divisions: number;
  angle: number;
  clearance: number;
}

export interface UnfoldParams extends SlicerParams {
  maxAngle: number;
  autoSplit: boolean;
  generateTabs: boolean;
  generateFoldLines: boolean;
}

export interface SliceContour {
  id: number;
  label: string;
  points: [number, number][];
  width: number;
  height: number;
  thickness: number;
  area: number;
}

export interface SlicerResult {
  contours: SliceContour[];
  mode: string;
  stats: {
    totalPieces: number;
    totalArea: number;
    boundingBox: { x: number; y: number; z: number };
  };
}

// ─── Geometry Helpers ────────────────────────────────────────

function getGeometryFromMesh(mesh: THREE.Mesh): THREE.BufferGeometry {
  const geo = mesh.geometry.clone();
  geo.applyMatrix4(mesh.matrixWorld);
  return geo;
}

function getMeshBounds(geometry: THREE.BufferGeometry): THREE.Box3 {
  geometry.computeBoundingBox();
  return geometry.boundingBox!;
}

// ─── Plane-Triangle Intersection ─────────────────────────────

interface IntersectionSegment {
  start: THREE.Vector3;
  end: THREE.Vector3;
}

function intersectTrianglePlane(
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  planeNormal: THREE.Vector3,
  planeD: number
): IntersectionSegment | null {
  const d0 = v0.dot(planeNormal) - planeD;
  const d1 = v1.dot(planeNormal) - planeD;
  const d2 = v2.dot(planeNormal) - planeD;

  const points: THREE.Vector3[] = [];

  const edges: [THREE.Vector3, THREE.Vector3, number, number][] = [
    [v0, v1, d0, d1],
    [v1, v2, d1, d2],
    [v2, v0, d2, d0],
  ];

  for (const [a, b, da, db] of edges) {
    if (da * db < 0) {
      const t = da / (da - db);
      points.push(a.clone().lerp(b, t));
    } else if (Math.abs(da) < 1e-8) {
      points.push(a.clone());
    }
  }

  if (points.length >= 2) {
    return { start: points[0], end: points[1] };
  }
  return null;
}

// ─── Contour Assembly ────────────────────────────────────────

function segmentsToContours(
  segments: IntersectionSegment[],
  planeNormal: THREE.Vector3,
  planeD: number
): [number, number][][] {
  if (segments.length === 0) return [];

  // Project to 2D based on plane normal
  let axisU: THREE.Vector3;
  let axisV: THREE.Vector3;

  if (Math.abs(planeNormal.y) > 0.9) {
    axisU = new THREE.Vector3(1, 0, 0);
    axisV = new THREE.Vector3(0, 0, 1);
  } else if (Math.abs(planeNormal.x) > 0.9) {
    axisU = new THREE.Vector3(0, 1, 0);
    axisV = new THREE.Vector3(0, 0, 1);
  } else {
    axisU = new THREE.Vector3(1, 0, 0);
    axisV = new THREE.Vector3(0, 1, 0);
  }

  const projected2D: { start: [number, number]; end: [number, number] }[] = segments.map((seg) => ({
    start: [seg.start.dot(axisU), seg.start.dot(axisV)] as [number, number],
    end: [seg.end.dot(axisU), seg.end.dot(axisV)] as [number, number],
  }));

  // Simple chain-building
  const tolerance = 0.01;
  const used = new Set<number>();
  const contours: [number, number][][] = [];

  function findNext(current: [number, number]): number {
    for (let i = 0; i < projected2D.length; i++) {
      if (used.has(i)) continue;
      const seg = projected2D[i];
      const ds = Math.hypot(seg.start[0] - current[0], seg.start[1] - current[1]);
      const de = Math.hypot(seg.end[0] - current[0], seg.end[1] - current[1]);
      if (ds < tolerance || de < tolerance) return i;
    }
    return -1;
  }

  for (let i = 0; i < projected2D.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const chain: [number, number][] = [projected2D[i].start, projected2D[i].end];
    let current = chain[chain.length - 1];

    let next = findNext(current);
    let safety = 0;
    while (next !== -1 && safety < segments.length) {
      used.add(next);
      const seg = projected2D[next];
      const ds = Math.hypot(seg.start[0] - current[0], seg.start[1] - current[1]);
      if (ds < tolerance) {
        chain.push(seg.end);
      } else {
        chain.push(seg.start);
      }
      current = chain[chain.length - 1];
      next = findNext(current);
      safety++;
    }

    if (chain.length >= 3) {
      contours.push(chain);
    }
  }

  return contours;
}

// ─── Apply Offset (CNC Compensation) ────────────────────────

function applyOffset(
  contour: [number, number][],
  offset: number,
  mode: "internal" | "external" | "center"
): [number, number][] {
  if (mode === "center" || offset === 0) return contour;
  // Simplified offset: expand or shrink from centroid
  const cx = contour.reduce((s, p) => s + p[0], 0) / contour.length;
  const cy = contour.reduce((s, p) => s + p[1], 0) / contour.length;
  const factor = mode === "external" ? 1 : -1;
  return contour.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-8) return [x, y] as [number, number];
    const nx = dx / dist;
    const ny = dy / dist;
    return [x + nx * offset * factor, y + ny * offset * factor] as [number, number];
  });
}

// ─── Add Joint Features ─────────────────────────────────────

function addSlotFeatures(
  contour: [number, number][],
  _params: SlicerParams,
  _sliceIndex: number
): [number, number][] {
  // Placeholder: joints are a complex feature; return contour as-is for now
  return contour;
}

// ─── STACKED SLICES ──────────────────────────────────────────

export function stackedSlice(
  geometry: THREE.BufferGeometry,
  params: SlicerParams
): SlicerResult {
  const bounds = getMeshBounds(geometry);
  const positions = geometry.getAttribute("position");
  const index = geometry.getIndex();

  const dirAxis = params.direction;
  const min = bounds.min[dirAxis];
  const max = bounds.max[dirAxis];
  const step = params.materialThickness + params.spacing;
  const totalOffset = params.toolCompensation / 2 + params.kerfWidth / 2;

  const planeNormal = new THREE.Vector3(
    dirAxis === "x" ? 1 : 0,
    dirAxis === "y" ? 1 : 0,
    dirAxis === "z" ? 1 : 0
  );

  const contours: SliceContour[] = [];
  let sliceId = 0;

  for (let pos = min + step / 2; pos < max; pos += step) {
    const planeD = pos;
    const segments: IntersectionSegment[] = [];

    const triCount = index ? index.count / 3 : positions.count / 3;

    for (let t = 0; t < triCount; t++) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

      const v0 = new THREE.Vector3().fromBufferAttribute(positions, i0);
      const v1 = new THREE.Vector3().fromBufferAttribute(positions, i1);
      const v2 = new THREE.Vector3().fromBufferAttribute(positions, i2);

      const seg = intersectTrianglePlane(v0, v1, v2, planeNormal, planeD);
      if (seg) segments.push(seg);
    }

    const rawContours = segmentsToContours(segments, planeNormal, planeD);

    for (const raw of rawContours) {
      let processed = applyOffset(raw, totalOffset, params.offsetMode);
      processed = addSlotFeatures(processed, params, sliceId);

      const xs = processed.map((p) => p[0]);
      const ys = processed.map((p) => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const w = maxX - minX;
      const h = maxY - minY;

      contours.push({
        id: sliceId,
        label: `S${sliceId + 1}`,
        points: processed,
        width: Math.round(w * 100) / 100,
        height: Math.round(h * 100) / 100,
        thickness: params.materialThickness,
        area: Math.round(w * h * 100) / 100,
      });
      sliceId++;
    }
  }

  const size = new THREE.Vector3();
  bounds.getSize(size);

  return {
    contours,
    mode: "stacked",
    stats: {
      totalPieces: contours.length,
      totalArea: contours.reduce((s, c) => s + c.area, 0),
      boundingBox: { x: size.x, y: size.y, z: size.z },
    },
  };
}

// ─── INTERLOCKED SLICES ──────────────────────────────────────

export function interlockedSlice(
  geometry: THREE.BufferGeometry,
  params: InterlockParams
): SlicerResult {
  const bounds = getMeshBounds(geometry);
  const size = new THREE.Vector3();
  bounds.getSize(size);

  // Generate X-direction slices
  const xParams = { ...params, direction: "x" as const };
  const savedSpacing = params.spacing;
  xParams.spacing = (size.x - params.materialThickness * params.slicesX) / Math.max(params.slicesX - 1, 1);
  const xResult = stackedSlice(geometry, xParams);

  // Generate Y-direction slices
  const yParams = { ...params, direction: "z" as const };
  yParams.spacing = (size.z - params.materialThickness * params.slicesY) / Math.max(params.slicesY - 1, 1);
  const yResult = stackedSlice(geometry, yParams);

  // Renumber
  const allContours: SliceContour[] = [];
  xResult.contours.forEach((c, i) => {
    allContours.push({ ...c, id: i, label: `X${i + 1}` });
  });
  yResult.contours.forEach((c, i) => {
    const idx = xResult.contours.length + i;
    allContours.push({ ...c, id: idx, label: `Y${i + 1}` });
  });

  return {
    contours: allContours,
    mode: "interlocked",
    stats: {
      totalPieces: allContours.length,
      totalArea: allContours.reduce((s, c) => s + c.area, 0),
      boundingBox: { x: size.x, y: size.y, z: size.z },
    },
  };
}

// ─── RADIAL SLICES ───────────────────────────────────────────

export function radialSlice(
  geometry: THREE.BufferGeometry,
  params: RadialParams
): SlicerResult {
  const bounds = getMeshBounds(geometry);
  const size = new THREE.Vector3();
  bounds.getSize(size);

  const contours: SliceContour[] = [];
  const angleStep = (params.angle || 360) / params.divisions;

  for (let i = 0; i < params.divisions; i++) {
    const angleDeg = i * angleStep;
    const angleRad = (angleDeg * Math.PI) / 180;

    // Create plane normal rotated around Y axis
    const nx = Math.cos(angleRad);
    const nz = Math.sin(angleRad);
    const planeNormal = new THREE.Vector3(nx, 0, nz).normalize();
    const center = new THREE.Vector3();
    bounds.getCenter(center);
    const planeD = center.dot(planeNormal);

    const positions = geometry.getAttribute("position");
    const index = geometry.getIndex();
    const segments: IntersectionSegment[] = [];
    const triCount = index ? index.count / 3 : positions.count / 3;

    for (let t = 0; t < triCount; t++) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
      const v0 = new THREE.Vector3().fromBufferAttribute(positions, i0);
      const v1 = new THREE.Vector3().fromBufferAttribute(positions, i1);
      const v2 = new THREE.Vector3().fromBufferAttribute(positions, i2);
      const seg = intersectTrianglePlane(v0, v1, v2, planeNormal, planeD);
      if (seg) segments.push(seg);
    }

    const rawContours = segmentsToContours(segments, planeNormal, planeD);
    for (const raw of rawContours) {
      const totalOffset = params.toolCompensation / 2 + params.kerfWidth / 2;
      let processed = applyOffset(raw, totalOffset, params.offsetMode);

      const xs = processed.map((p) => p[0]);
      const ys = processed.map((p) => p[1]);
      const w = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);

      contours.push({
        id: contours.length,
        label: `R${i + 1}`,
        points: processed,
        width: Math.round(w * 100) / 100,
        height: Math.round(h * 100) / 100,
        thickness: params.materialThickness,
        area: Math.round(w * h * 100) / 100,
      });
    }
  }

  return {
    contours,
    mode: "radial",
    stats: {
      totalPieces: contours.length,
      totalArea: contours.reduce((s, c) => s + c.area, 0),
      boundingBox: { x: size.x, y: size.y, z: size.z },
    },
  };
}

// ─── UNFOLD (Simplified) ─────────────────────────────────────

export function unfoldMesh(
  geometry: THREE.BufferGeometry,
  params: UnfoldParams
): SlicerResult {
  // Simplified unfold: extract each face as a 2D triangle
  const positions = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const bounds = getMeshBounds(geometry);
  const size = new THREE.Vector3();
  bounds.getSize(size);

  const triCount = index ? index.count / 3 : positions.count / 3;
  const faces: [number, number][][] = [];

  for (let t = 0; t < triCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

    const v0 = new THREE.Vector3().fromBufferAttribute(positions, i0);
    const v1 = new THREE.Vector3().fromBufferAttribute(positions, i1);
    const v2 = new THREE.Vector3().fromBufferAttribute(positions, i2);

    // Flatten triangle to 2D preserving edge lengths
    const e1 = v1.clone().sub(v0);
    const e2 = v2.clone().sub(v0);
    const a = e1.length();
    const b = e2.length();
    const cosAngle = e1.dot(e2) / (a * b);
    const sinAngle = Math.sqrt(1 - cosAngle * cosAngle);

    faces.push([
      [0, 0],
      [a, 0],
      [b * cosAngle, b * sinAngle],
    ]);
  }

  // Pack faces into groups (simplified: group by chunks)
  const groupSize = Math.max(1, Math.ceil(params.maxAngle / 10));
  const contours: SliceContour[] = [];
  
  for (let g = 0; g < faces.length; g += groupSize) {
    const group = faces.slice(g, g + groupSize);
    // Merge group into a single contour (simplified: just use bounding box of all points)
    const allPts: [number, number][] = [];
    let offsetX = 0;
    for (const face of group) {
      const shifted = face.map(([x, y]) => [x + offsetX, y] as [number, number]);
      allPts.push(...shifted);
      const maxX = Math.max(...face.map((p) => p[0]));
      offsetX += maxX + 1;
    }

    if (allPts.length === 0) continue;

    const xs = allPts.map((p) => p[0]);
    const ys = allPts.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);

    // Create a hull-like contour
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    contours.push({
      id: contours.length,
      label: `U${contours.length + 1}`,
      points: [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
      ],
      width: Math.round(w * 100) / 100,
      height: Math.round(h * 100) / 100,
      thickness: params.materialThickness,
      area: Math.round(w * h * 100) / 100,
    });
  }

  return {
    contours,
    mode: "unfold",
    stats: {
      totalPieces: contours.length,
      totalArea: contours.reduce((s, c) => s + c.area, 0),
      boundingBox: { x: size.x, y: size.y, z: size.z },
    },
  };
}

// ─── SVG Export ──────────────────────────────────────────────

export function contoursToSVG(contours: SliceContour[], padding = 10, scale = 1): string {
  if (contours.length === 0) return "<svg></svg>";

  let offsetX = padding;
  const rows: string[] = [];
  let totalW = padding;
  let maxH = 0;

  for (const c of contours) {
    maxH = Math.max(maxH, c.height * scale);
  }

  const svgHeight = maxH + padding * 2 + 20;

  for (const c of contours) {
    const pts = c.points;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);

    const translated = pts.map(([x, y]) => [
      (x - minX) * scale + offsetX,
      (y - minY) * scale + padding,
    ]);

    const d = translated.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ") + " Z";
    rows.push(`<path d="${d}" fill="none" stroke="#333" stroke-width="0.5"/>`);
    rows.push(
      `<text x="${offsetX + (c.width * scale) / 2}" y="${padding + maxH + 15}" text-anchor="middle" font-size="8" fill="#666">${c.label}</text>`
    );

    offsetX += c.width * scale + padding;
    totalW = offsetX;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${svgHeight}" viewBox="0 0 ${totalW} ${svgHeight}">\n${rows.join("\n")}\n</svg>`;
}

// ─── DXF Export (Minimal) ────────────────────────────────────

export function contoursToDXF(contours: SliceContour[]): string {
  const lines: string[] = [
    "0", "SECTION", "2", "ENTITIES",
  ];

  let offsetX = 0;

  for (const c of contours) {
    const pts = c.points;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);

    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      lines.push(
        "0", "LINE",
        "8", c.label,
        "10", String(x1 - minX + offsetX),
        "20", String(y1 - minY),
        "30", "0",
        "11", String(x2 - minX + offsetX),
        "21", String(y2 - minY),
        "31", "0"
      );
    }

    offsetX += c.width + 10;
  }

  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}
