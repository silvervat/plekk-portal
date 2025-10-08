import React, { useEffect, useMemo, useRef, useState } from "react";
import { Point, Decoration, SheetDrawing } from '../types';

/**
 * PLEKKIDE JOONISE DEMO — Mobiiliversioon
 *
 * – Kritseldus → sirgestus
 * – Lõigu pikkuse muutmine: nihutan kogu "saba" (dx,dy) → teised nurgad/pikkused ei muutu
 * – Värvimine: ühekordne suuna valik noolega; bänneril (tekst + värviproov) klikk = muutmine
 * – Endpoint kontekstimenüü: TAGASIPÖÖRE / TUGEVUSPAINE (punased märgid)
 */

type Pt = Point;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function angleBetween(a: Pt, b: Pt) {
  let d = toDeg(Math.atan2(b.y - a.y, b.x - a.x));
  if (d < 0) d += 360;
  return d;
}
function snapAngle(deg: number, step = 45) {
  const s = Math.round(deg / step) * step;
  return ((s % 360) + 360) % 360;
}
function pointFromPolar(o: Pt, len: number, deg: number): Pt {
  const r = toRad(deg);
  return { x: o.x + Math.cos(r) * len, y: o.y + Math.sin(r) * len };
}

function douglasPeucker(points: Pt[], eps: number): Pt[] {
  if (points.length < 3) return points.slice();
  const dmax = (a: Pt, b: Pt, p: Pt) => {
    const A = b.y - a.y;
    const B = a.x - b.x;
    const C = b.x * a.y - a.x * b.y;
    return Math.abs(A * p.x + B * p.y + C) / Math.hypot(A, B);
  };
  let maxDist = 0,
    idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = dmax(points[0], points[points.length - 1], points[i]);
    if (d > maxDist) {
      maxDist = d;
      idx = i;
    }
  }
  if (maxDist > eps) {
    const left = douglasPeucker(points.slice(0, idx + 1), eps);
    const right = douglasPeucker(points.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

function mergeCollinear(pts: Pt[], tolDeg = 5): Pt[] {
  if (pts.length < 3) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1],
      b = pts[i],
      c = pts[i + 1];
    const ab = angleBetween(a, b),
      bc = angleBetween(b, c);
    let diff = Math.abs(ab - bc);
    if (diff > 180) diff = 360 - diff;
    if (diff > tolDeg) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function snapPolyline(pts: Pt[]): Pt[] {
  if (pts.length < 2) return pts;
  const out: Pt[] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = out[out.length - 1];
    const b = pts[i + 1];
    const L = dist(pts[i], b);
    const A = snapAngle(angleBetween(pts[i], b));
    out.push(pointFromPolar(a, L, A));
  }
  return out;
}

function classifyAngle(deg: number): "H" | "V" | "D" {
  const a = ((Math.round(deg) % 360) + 360) % 360;
  if (a % 180 === 0) return "H";
  if (a % 90 === 0) return "V";
  return "D";
}

function normalizeProfile(pts: Pt[]): Pt[] {
  if (pts.length < 2) return pts;
  let out = pts.map((p) => ({ ...p }));
  const equalizeThreshold = 0.5,
    epsY = 3;

  // 1) silu horisontaalsed tasandid ühele Y-le
  const levels: { y: number; idxs: number[] }[] = [];
  for (let i = 0; i < out.length - 1; i++) {
    const a = out[i],
      b = out[i + 1];
    if (classifyAngle(angleBetween(a, b)) !== "H") continue;
    const y = (a.y + b.y) / 2;
    let g = levels.find((L) => Math.abs(L.y - y) <= epsY);
    if (!g) {
      g = { y, idxs: [] };
      levels.push(g);
    }
    g.idxs.push(i);
  }
  for (const L of levels) {
    const ys: number[] = [];
    for (const i of L.idxs) {
      ys.push(out[i].y, out[i + 1].y);
    }
    const mean = ys.reduce((s, v) => s + v, 0) / ys.length;
    for (const i of L.idxs) {
      out[i].y = mean;
      out[i + 1].y = mean;
    }
  }

  // 2) lihtne tasandus H–D–H–D mustri korral
  for (let i = 0; i < out.length - 4; i++) {
    const A = out[i],
      B = out[i + 1],
      C = out[i + 2],
      D = out[i + 3],
      E = out[i + 4];
    const t1 = classifyAngle(angleBetween(A, B)),
      t2 = classifyAngle(angleBetween(B, C)),
      t3 = classifyAngle(angleBetween(C, D)),
      t4 = classifyAngle(angleBetween(D, E));
    if (t1 === "H" && t2 === "D" && t3 === "H" && t4 === "D") {
      const Ld1 = dist(B, C),
        Ld2 = dist(D, E),
        target = (Ld1 + Ld2) / 2;
      const newC = pointFromPolar(B, target, snapAngle(angleBetween(B, C)));
      const newE = pointFromPolar(D, target, snapAngle(angleBetween(D, E)));
      out[i + 2] = newC;
      out[i + 4] = newE;
      out[i + 3].y = newC.y;
      out[i + 3].x = newC.x + (D.x - C.x);
    }
  }

  // 3) võrdsusta kõigi H- ja D-segmentide pikkused, kui erinevus ≤ 50%
  const segLen: number[] = [],
    segAng: number[] = [],
    segType: ("H" | "V" | "D")[] = [];
  for (let i = 0; i < out.length - 1; i++) {
    const a = out[i],
      b = out[i + 1];
    segLen.push(dist(a, b));
    const ang = snapAngle(angleBetween(a, b));
    segAng.push(ang);
    segType.push(classifyAngle(ang));
  }
  function equalizeType(t: "H" | "D") {
    const idxs = segType.map((x, i) => (x === t ? i : -1)).filter((i) => i >= 0);
    if (idxs.length < 2) return;
    const lens = idxs.map((i) => segLen[i]);
    const minL = Math.min(...lens),
      maxL = Math.max(...lens);
    if (maxL > 0 && (maxL - minL) / maxL <= equalizeThreshold) {
      const avg = lens.reduce((s, v) => s + v, 0) / lens.length;
      for (const i of idxs) segLen[i] = avg;
    }
  }
  equalizeType("H");
  equalizeType("D");
  const rebuilt: Pt[] = [out[0]];
  for (let i = 0; i < segLen.length; i++) {
    const a = rebuilt[rebuilt.length - 1];
    rebuilt.push(pointFromPolar(a, segLen[i], segAng[i]));
  }

  // 4) teisene horisontaalide tasandus
  out = rebuilt;
  const levels2: { y: number; idxs: number[] }[] = [];
  for (let i = 0; i < out.length - 1; i++) {
    const a = out[i],
      b = out[i + 1];
    if (classifyAngle(angleBetween(a, b)) !== "H") continue;
    const y = (a.y + b.y) / 2;
    let g = levels2.find((L) => Math.abs(L.y - y) <= epsY);
    if (!g) {
      g = { y, idxs: [] };
      levels2.push(g);
    }
    g.idxs.push(i);
  }
  for (const L of levels2) {
    const ys: number[] = [];
    for (const i of L.idxs) {
      ys.push(out[i].y, out[i + 1].y);
    }
    const mean = ys.reduce((s, v) => s + v, 0) / ys.length;
    for (const i of L.idxs) {
      out[i].y = mean;
      out[i + 1].y = mean;
    }
  }
  return out;
}

interface DrawingCanvasProps {
  onSave: (drawing: SheetDrawing) => void;
  initialDrawing?: SheetDrawing | null;
  clientColor?: string;
}

export default function DrawingCanvas({ onSave, clientColor = '#2563eb' }: DrawingCanvasProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [sketch, setSketch] = useState<Pt[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Pt[]>([]);
  const [straightened, setStraightened] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<number | null>(null);
  const [popup, setPopup] = useState<{ x: number; y: number } | null>(null);
  const [draftLenMM, setDraftLenMM] = useState("");
  const [draftAng, setDraftAng] = useState("");
  const [angleEditEnabled, setAngleEditEnabled] = useState(false);

  // Värvimine
  const [paintMode, setPaintMode] = useState(false);
  const [arrow, setArrow] = useState<{ start: Pt; end: Pt } | null>(null);
  const [paintPopover, setPaintPopover] = useState<{ x: number; y: number } | null>(null);
  const [paintSide, setPaintSide] = useState<"TOP" | "BOTTOM" | "LEFT" | "RIGHT" | null>(null);
  const [paintColor, setPaintColor] = useState("#2f7d32");
  const [paintLabel, setPaintLabel] = useState("RR23");
  const [paintBadge, setPaintBadge] = useState(false);
  const [paintLocked, setPaintLocked] = useState(false);

  // Endpoint dekoratsioonid
  const [decors, setDecors] = useState<Decoration[]>([]);
  const [epMenu, setEpMenu] = useState<{ x: number; y: number; target: "start" | "end" } | null>(null);
  let longPressTimer: number | undefined = (undefined as any);

  // Kogus
  const [quantity, setQuantity] = useState(1);

  // RR palett
  const RR_COLORS: { code: string; name: string; hex: string }[] = [
    { code: "RR11", name: "RR11 okkaroheline", hex: "#114F38" },
    { code: "RR20", name: "RR20 valge", hex: "#EDEAE3" },
    { code: "RR21", name: "RR21 helehall", hex: "#C0C5C9" },
    { code: "RR22", name: "RR22 hall", hex: "#A9B0B5" },
    { code: "RR23", name: "RR23 tumehall", hex: "#565B58" },
    { code: "RR24", name: "RR24 helekollane", hex: "#E6C660" },
    { code: "RR25", name: "RR25 kollane", hex: "#F0BE27" },
    { code: "RR28", name: "RR28 tumepunane", hex: "#7A0810" },
    { code: "RR29", name: "RR29 punane", hex: "#8D0E1A" },
    { code: "RR30", name: "RR30 helepruun", hex: "#D6CDBF" },
    { code: "RR31", name: "RR31 pruun", hex: "#5F4A3D" },
    { code: "RR32", name: "RR32 tumepruun", hex: "#3F351A" },
    { code: "RR33", name: "RR33 must", hex: "#0B0B0B" },
    { code: "RR34", name: "RR34 helesinine", hex: "#789CA8" },
    { code: "RR35", name: "RR35 sinine", hex: "#1F3F5F" },
    { code: "RR36", name: "RR36 heleroheline", hex: "#8DB179" },
    { code: "RR37", name: "RR37 roheline", hex: "#395938" },
    { code: "RR40", name: "RR40 hõbe", hex: "#B4B4B4" },
    { code: "RR41", name: "RR41 tumehõbe", hex: "#616D79" },
    { code: "RR42", name: "RR42 kuldne", hex: "#B79A6B" },
    { code: "RR43", name: "RR43 vask", hex: "#8D6B2E" },
    { code: "RR44", name: "RR44 metallik sinine", hex: "#586470" },
    { code: "RR750", name: "RR750 telliskivi punane", hex: "#7C3F1D" },
    { code: "RAL5011", name: "RAL5011 terassinine", hex: "#1E2230" },
  ];
  const RAL_MAP: Record<string, string> = {
    RAL7016: "#383E42",
    RAL7021: "#2F3438",
    RAL7024: "#45494E",
    RAL7035: "#D7D7D7",
    RAL8004: "#8E402A",
    RAL3009: "#6D3B3C",
    RAL9005: "#0A0A0A",
    RAL9010: "#F2F2F2",
  };

  const [mmPerPx, setMmPerPx] = useState(0.5);
  const tolerancePx = 10,
    maxSegments = 8;

  function getLocalPoint(e: React.PointerEvent | PointerEvent): Pt {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e: React.PointerEvent) {
    const p = getLocalPoint(e);
    if (paintMode) {
      setArrow({ start: p, end: p });
      setIsDrawing(true);
      return;
    }
    if (straightened) return;
    setSketch([p]);
    setIsDrawing(true);
    setSelectedEdge(null);
    setPopup(null);
  }
  function onMove(e: React.PointerEvent) {
    if (!isDrawing) return;
    const p = getLocalPoint(e);
    if (paintMode) {
      setArrow((a) => (a ? { start: a.start, end: p } : null));
      return;
    }
    setSketch((prev) => {
      if (prev.length === 0) return [p];
      const last = prev[prev.length - 1];
      if (dist(last, p) < 3) return prev;
      return [...prev, p];
    });
  }
  function onUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (paintMode) {
      if (!arrow) return;
      const ang = angleBetween(arrow.start, arrow.end);
      let side: any = "TOP";
      if (ang >= 45 && ang < 135) side = "BOTTOM";
      else if (ang >= 135 && ang < 225) side = "LEFT";
      else if (ang >= 225 && ang < 315) side = "TOP";
      else side = "RIGHT";
      setPaintSide(side);
      const wrap = wrapRef.current,
        svg = svgRef.current;
      if (wrap && svg) {
        const wr = wrap.getBoundingClientRect(),
          sr = svg.getBoundingClientRect();
        setPaintPopover({ x: sr.left + arrow.end.x - wr.left, y: sr.top + arrow.end.y - wr.top });
      }
      setPaintBadge(true);
      setPaintLocked(true);
      return;
    }
    if (sketch.length < 2) return;
    let poly = douglasPeucker(sketch, tolerancePx);
    poly = snapPolyline(poly);
    poly = mergeCollinear(poly, 5);
    while (poly.length - 1 > maxSegments) {
      let minIdx = 0,
        minLen = Infinity;
      for (let i = 0; i < poly.length - 1; i++) {
        const L = dist(poly[i], poly[i + 1]);
        if (L < minLen) {
          minLen = L;
          minIdx = i;
        }
      }
      poly.splice(minIdx + 1, 1);
      poly = snapPolyline(poly);
      poly = mergeCollinear(poly, 5);
    }
    poly = normalizeProfile(poly);
    setPoints(poly);
    setStraightened(true);
  }

  function resetAll() {
    setSketch([]);
    setPoints([]);
    setStraightened(false);
    setSelectedEdge(null);
    setPopup(null);
    setArrow(null);
    setPaintPopover(null);
    setPaintSide(null);
    setPaintBadge(false);
    setPaintLocked(false);
    setDecors([]);
    setQuantity(1);
  }

  const edges = useMemo(() => {
    const arr: { i: number; a: Pt; b: Pt; lenPx: number; ang: number; mid: Pt }[] = [];
    if (!straightened || points.length < 2) return arr;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i],
        b = points[i + 1];
      arr.push({ i, a, b, lenPx: dist(a, b), ang: angleBetween(a, b), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } });
    }
    return arr;
  }, [points, straightened]);
  
  const totalLenMM = useMemo(() => edges.reduce((s, e) => s + e.lenPx, 0) * mmPerPx, [edges, mmPerPx]);

  function selectEdge(i: number) {
    const e = edges.find((x) => x.i === i);
    if (!e) return;
    setSelectedEdge(i);
    setDraftLenMM(String(Math.round(e.lenPx * mmPerPx)));
    setDraftAng(String(Math.round(e.ang)));
    const wrap = wrapRef.current,
      svg = svgRef.current;
    if (wrap && svg) {
      const wr = wrap.getBoundingClientRect(),
        sr = svg.getBoundingClientRect();
      setPopup({ x: sr.left + e.mid.x - wr.left, y: sr.top + e.mid.y - wr.top });
    }
  }

  function applyEdgeEdits() {
    if (selectedEdge == null) return;
    const i = selectedEdge;
    const e = edges.find((x) => x.i === i);
    if (!e) return;
    const lenMM = parseFloat(draftLenMM.replace(",", "."));
    const lenPx = isFinite(lenMM) ? clamp(lenMM / mmPerPx, 1, 50000) : e.lenPx;
    const A = angleEditEnabled ? ((Math.round(parseFloat(draftAng.replace(",", "."))) % 360) + 360) % 360 : snapAngle(e.ang);
    const start = points[i];
    const oldEnd = points[i + 1];
    const desiredEnd = pointFromPolar(start, lenPx, A);
    const next = [...points];
    const dx = desiredEnd.x - oldEnd.x,
      dy = desiredEnd.y - oldEnd.y;
    for (let k = i + 1; k < next.length; k++) {
      next[k] = { x: next[k].x + dx, y: next[k].y + dy };
    }
    setPoints(mergeCollinear(next, 3));
  }

  function handleSaveDrawing() {
    const drawing: SheetDrawing = {
      id: `drawing_${Date.now()}`,
      points,
      decorations: decors,
      paintSide,
      paintColor,
      paintLabel,
      totalLengthMM: Math.round(totalLenMM),
      quantity,
      createdAt: new Date().toISOString(),
    };
    onSave(drawing);
  }

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("#edge-popup")) return;
      if (el.closest("[data-edge]") || el.closest("[data-edge-hit]")) return;
      setSelectedEdge(null);
      setPopup(null);
      setEpMenu(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    try {
      console.assert(snapAngle(44) === 45);
      console.assert(snapAngle(91) === 90);
      const mc = mergeCollinear(
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 20, y: 0 },
        ],
        2
      );
      console.assert(mc.length === 2);
    } catch (_) {}
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="sticky top-0 z-10 bg-white border-b px-3 py-2 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm" onClick={resetAll}>
            🔄 Uus
          </button>
          {straightened ? (
            <>
              <div className="text-sm">
                Kogupikkus: <b>{Math.round(totalLenMM)}</b> mm
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Kogus:</label>
                <input 
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-2 py-1 border rounded text-sm"
                />
                <span className="text-xs text-gray-500">tk</span>
              </div>
              <button 
                className="ml-auto px-4 py-2 rounded-xl text-white text-sm font-medium"
                style={{ backgroundColor: clientColor }}
                onClick={handleSaveDrawing}
              >
                ✓ Salvesta joonis
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-700">Kritseldus: lase sõrm lahti → sirgestan</span>
          )}
          <label className="ml-2 text-xs flex items-center gap-2">
            <input
              type="checkbox"
              className="scale-110"
              checked={angleEditEnabled}
              onChange={(e) => setAngleEditEnabled(e.target.checked)}
            />
            Luba nurga muutmine
          </label>
          <button
            disabled={paintLocked && !paintMode}
            className={`px-3 py-2 rounded-xl text-sm ${
              paintMode ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-900"
            } disabled:opacity-50`}
            onClick={() => {
              if (paintLocked) return;
              setPaintMode(!paintMode);
              setArrow(null);
              setPaintPopover(null);
            }}
          >
            🎨 Värvi suund
          </button>
          {paintLocked && <span className="text-xs text-gray-500">Värv määratud — kliki bänneril, et muuta</span>}
        </div>
        <div className="text-xs text-gray-600 flex items-center gap-2">
          Skaala 1px=
          <input
            type="number"
            step="0.1"
            value={mmPerPx}
            onChange={(e) => setMmPerPx(clamp(parseFloat(e.target.value || "0"), 0.05, 10))}
            className="w-20 border rounded-lg px-2 py-1"
          />
          mm
        </div>
      </div>

      <div ref={wrapRef} className="relative flex-1">
        <svg
          ref={svgRef}
          className="w-full h-[72vh] touch-none bg-white"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        >
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e5e7eb" strokeWidth="1" />
            </pattern>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <polygon points="0 0, 8 4, 0 8" fill="#f59e0b" />
            </marker>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" />

          {sketch.length > 0 && !straightened && !paintMode && (
            <polyline
              points={sketch.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#6b7280"
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {straightened && points.length >= 2 && (
            <>
              {paintBadge && paintSide && (
                <g
                  onClick={() => {
                    const wrap = wrapRef.current,
                      svg = svgRef.current;
                    if (!wrap || !svg) return;
                    const xs = points.map((p) => p.x),
                      ys = points.map((p) => p.y);
                    const minX = Math.min(...xs),
                      maxX = Math.max(...xs),
                      minY = Math.min(...ys),
                      maxY = Math.max(...ys);
                    const cx = (minX + maxX) / 2,
                      cy = (minY + maxY) / 2;
let ax = cx, ay = cy;
                    const off = 28;
                    if (paintSide === "TOP") {
                      ay = minY - off;
                      ly = minY;
                    }
                    if (paintSide === "BOTTOM") {
                      ay = maxY + off;
                      ly = maxY;
                    }
                    if (paintSide === "LEFT") {
                      ax = minX - off;
                      lx = minX;
                    }
                    if (paintSide === "RIGHT") {
                      ax = maxX + off;
                      lx = maxX;
                    }
                    const wr = wrap.getBoundingClientRect(),
                      sr = svg.getBoundingClientRect();
                    setPaintPopover({ x: ax + sr.left - wr.left, y: ay + sr.top - wr.top });
                  }}
                >
                  {(() => {
                    const xs = points.map((p) => p.x),
                      ys = points.map((p) => p.y);
                    const minX = Math.min(...xs),
                      maxX = Math.max(...xs),
                      minY = Math.min(...ys),
                      maxY = Math.max(...ys);
                    const cx = (minX + maxX) / 2,
                      cy = (minY + maxY) / 2;
                    let ax = cx,
                      ay = cy,
                      lx = cx,
                      ly = cy;
                    const off = 28;
                    if (paintSide === "TOP") {
                      ay = minY - off;
                      ly = minY;
                    }
                    if (paintSide === "BOTTOM") {
                      ay = maxY + off;
                      ly = maxY;
                    }
                    if (paintSide === "LEFT") {
                      ax = minX - off;
                      lx = minX;
                    }
                    if (paintSide === "RIGHT") {
                      ax = maxX + off;
                      lx = maxX;
                    }
                    const w = 160,
                      h = 30,
                      r = 8;
                    return (
                      <g>
                        <line x1={ax} y1={ay + h / 2} x2={lx} y2={ly} stroke={paintColor} strokeWidth={4} />
                        <rect x={ax - w / 2} y={ay - h} width={w} height={h} rx={r} fill="#111827" />
                        <rect x={ax - w / 2 + 8} y={ay - h + 7} width={16} height={16} rx={3} fill={paintColor} stroke="#fff" strokeWidth={1} />
                        <text x={ax - w / 2 + 8 + 20} y={ay - h / 2} fill="#fff" fontSize={13} textAnchor="start" dominantBaseline="middle">
                          {paintLabel}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {points.slice(0, -1).map((a, i) => {
                const b = points[i + 1],
                  active = selectedEdge === i;
                const midX = (a.x + b.x) / 2,
                  midY = (a.y + b.y) / 2;
                return (
                  <g key={i}>
                    <line
                      data-edge
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={active ? "#ef4444" : "#111827"}
                      strokeWidth={active ? 6 : 4}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectEdge(i);
                      }}
                    />
                    <line
                      data-edge-hit
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="rgba(0,0,0,0)"
                      strokeWidth={20}
                      style={{ pointerEvents: "stroke" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectEdge(i);
                      }}
                    />
                    {active && (
                      <text
                        x={midX}
                        y={midY - 10}
                        fontSize={12}
                        textAnchor="middle"
                        fill="#111827"
                        stroke="#fff"
                        strokeWidth={3}
                        paintOrder="stroke"
                      >
                        {Math.round(dist(a, b) * mmPerPx)} mm
                      </text>
                    )}
                  </g>
                );
              })}

              {points.map((p, idx) => {
                const isStart = idx === 0,
                  isEnd = idx === points.length - 1;
                const handlers: any = {};
                if (isStart || isEnd) {
                  handlers.onContextMenu = (e: any) => {
                    e.preventDefault();
                    setEpMenu({ x: e.clientX, y: e.clientY, target: isStart ? "start" : "end" });
                  };
                  handlers.onPointerDown = (e: any) => {
                    const t = window.setTimeout(
                      () => setEpMenu({ x: e.clientX, y: e.clientY, target: isStart ? "start" : "end" }),
                      550
                    );
                    (longPressTimer as any) = t;
                  };
                  handlers.onPointerUp = () => {
                    if (longPressTimer) window.clearTimeout(longPressTimer);
                  };
                  handlers.onPointerMove = () => {
                    if (longPressTimer) window.clearTimeout(longPressTimer);
                  };
                }
                return <circle key={idx} cx={p.x} cy={p.y} r={5} fill="#2563eb" {...handlers} />;
              })}

              {decors.map((d, i) => {
                if (points.length < 2) return null;
                const p = d.pos === "start" ? points[0] : points[points.length - 1];
                const q = d.pos === "start" ? points[1] : points[points.length - 2];
                const ang = angleBetween(p, q);
                const base = d.sizeMM / mmPerPx;
                const skew = 15;
                const dir = d.pos === "start" ? 1 : -1;
                const a1 = snapAngle(ang + dir * 180 - 30);
                if (d.kind === "HEM_CLOSED") {
                  const pt2 = pointFromPolar(p, base, a1);
                  const pt3 = pointFromPolar(pt2, base * 0.7, a1 + 160);
                  return (
                    <polyline
                      key={i}
                      points={`${p.x},${p.y} ${pt2.x},${pt2.y} ${pt3.x},${pt3.y}`}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={3}
                    />
                  );
                }
                if (d.kind === "CREASE") {
                  const aC = a1 + (d.pos === "start" ? -skew : skew);
                  const pt2 = pointFromPolar(p, base, aC);
                  return <line key={i} x1={p.x} y1={p.y} x2={pt2.x} y2={pt2.y} stroke="#ef4444" strokeWidth={3} />;
                }
                const pt2 = pointFromPolar(p, base, a1);
                return <line key={i} x1={p.x} y1={p.y} x2={pt2.x} y2={pt2.y} stroke="#ef4444" strokeWidth={3} />;
              })}
            </>
          )}

          {paintMode && arrow && (
            <line
              x1={arrow.start.x}
              y1={arrow.start.y}
              x2={arrow.end.x}
              y2={arrow.end.y}
              stroke="#f59e0b"
              strokeWidth={3}
              markerEnd="url(#arrowhead)"
            />
          )}
        </svg>

        {popup && selectedEdge != null && (
          <div
            id="edge-popup"
            className="absolute -translate-x-1/2 -translate-y-full bg-white border shadow-lg rounded-xl p-3 w-[240px]"
            style={{ left: popup.x, top: popup.y }}
          >
            <div className="text-sm font-medium mb-2">Serva mõõt</div>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Pikkus (mm)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-2 py-1"
                  value={draftLenMM}
                  onChange={(e) => setDraftLenMM(e.target.value)}
                  placeholder="nt 140"
                />
              </div>
              {!angleEditEnabled ? (
                <div className="text-xs text-gray-500">Nurka: {Math.round(parseFloat(draftAng || "0"))}°</div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Nurka°</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-2 py-1"
                    value={draftAng}
                    onChange={(e) => setDraftAng(e.target.value)}
                    placeholder="90"
                  />
                </div>
              )}
            </div>
            {angleEditEnabled && (
              <div className="flex flex-wrap gap-1 mt-2">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
                  <button
                    key={d}
                    className="px-2 py-1 rounded-lg border text-xs"
                    onClick={() => {
                      setDraftAng(String(d));
                      setTimeout(applyEdgeEdits, 0);
                    }}
                  >
                    {d}°
                  </button>
                ))}
              </div>
            )}
            <div className="flex mt-2">
              <button className="ml-auto px-3 py-1 rounded-lg bg-emerald-600 text-white text-sm" onClick={applyEdgeEdits}>
                OK
              </button>
            </div>
          </div>
        )}

        {paintPopover && paintSide && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full bg-white border shadow-lg rounded-xl p-3 w-[340px] max-h-96 overflow-auto"
            style={{ left: paintPopover.x, top: paintPopover.y }}
          >
            <div className="text-sm font-medium mb-2">
              Värvi külg: <b>{paintSide}</b>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {RR_COLORS.map((c) => (
                <button
                  key={c.code}
                  className="rounded-lg border p-1 flex flex-col items-center gap-1 hover:bg-gray-100"
                  onClick={() => {
                    setPaintColor(c.hex);
                    setPaintLabel(`${c.code}`);
                    setPaintPopover(null);
                    setPaintMode(false);
                    setPaintBadge(true);
                    setPaintLocked(true);
                  }}
                >
                  <div className="w-10 h-6 rounded" style={{ background: c.hex }} />
                  <div className="text-[10px] leading-tight text-gray-800">{c.code}</div>
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-600 mb-1">Või sisesta RAL kood (nt RAL7016)</div>
            <div className="flex gap-2 items-center">
              <input
                className="flex-1 border rounded-lg px-2 py-1 text-sm"
                placeholder="RAL7016"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const code = (e.target as HTMLInputElement).value.toUpperCase();
                    const hex = RAL_MAP[code];
                    if (hex) {
                      setPaintColor(hex);
                      setPaintLabel(code);
                      setPaintPopover(null);
                      setPaintMode(false);
                      setPaintBadge(true);
                      setPaintLocked(true);
                    }
                  }
                }}
              />
              <div className="w-8 h-8 rounded-lg border" style={{ background: paintColor }} title={paintLabel}></div>
              <button className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs" onClick={() => setPaintPopover(null)}>
                OK
              </button>
            </div>
          </div>
        )}

        {epMenu && (
          <div
            className="absolute z-50 bg-white border shadow-xl rounded-xl w-72 p-2"
            style={{ left: epMenu.x, top: epMenu.y }}
            onMouseLeave={() => setEpMenu(null)}
          >
            <div className="text-xs text-gray-500 mb-1">{epMenu.target === "start" ? "Alguse" : "Lõpu"} valikud</div>
            {[
              { t: "TAGASIPÖÖRE 10mm - suletud", k: "HEM_CLOSED", s: 10 },
              { t: "TAGASIPÖÖRE 5mm - avatud", k: "HEM_OPEN", s: 5 },
              { t: "TUGEVUS PAINE 5mm", k: "CREASE", s: 5 },
              { t: "TUGEVUS PAINE 10mm", k: "CREASE", s: 10 },
              { t: "TAGASIPÖÖRE 5mm - suletud", k: "HEM_CLOSED", s: 5 },
            ].map((opt, idx) => (
              <button
                key={idx}
                className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm"
                onClick={() => {
                  setDecors((d) => d.concat([{ pos: epMenu.target, kind: opt.k as any, sizeMM: opt.s as 5 | 10 }]));
                  setEpMenu(null);
                }}
              >
                {opt.t}
              </button>
            ))}
            <div className="mt-1 border-t pt-1 flex gap-2">
              <button
                className="px-2 py-1 text-xs rounded bg-gray-100"
                onClick={() => {
                  setDecors((d) => d.filter((x) => x.pos !== epMenu.target));
                  setEpMenu(null);
                }}
              >
                Eemalda selle otsa märgised
              </button>
              <button className="ml-auto px-2 py-1 text-xs" onClick={() => setEpMenu(null)}>
                Sulge
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
