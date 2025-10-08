import React, { useEffect, useMemo, useRef, useState } from "react";
import { Point, Decoration, SheetDrawing } from '../types';

const toDeg = (rad: number) => (rad * 180) / Math.PI;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function angleBetween(a: Point, b: Point) {
  let d = toDeg(Math.atan2(b.y - a.y, b.x - a.x));
  if (d < 0) d += 360;
  return d;
}

function snapAngle(deg: number, step = 45) {
  const s = Math.round(deg / step) * step;
  return ((s % 360) + 360) % 360;
}

function pointFromPolar(o: Point, len: number, deg: number): Point {
  const r = toRad(deg);
  return { x: o.x + Math.cos(r) * len, y: o.y + Math.sin(r) * len };
}

function douglasPeucker(points: Point[], eps: number): Point[] {
  if (points.length < 3) return points.slice();
  const dmax = (a: Point, b: Point, p: Point) => {
    const A = b.y - a.y;
    const B = a.x - b.x;
    const C = b.x * a.y - a.x * b.y;
    return Math.abs(A * p.x + B * p.y + C) / Math.hypot(A, B);
  };
  let maxDist = 0, idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = dmax(points[0], points[points.length - 1], points[i]);
    if (d > maxDist) { maxDist = d; idx = i; }
  }
  if (maxDist > eps) {
    const left = douglasPeucker(points.slice(0, idx + 1), eps);
    const right = douglasPeucker(points.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

function mergeCollinear(pts: Point[], tolDeg = 5): Point[] {
  if (pts.length < 3) return pts;
  const out: Point[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1], b = pts[i], c = pts[i + 1];
    const ab = angleBetween(a, b), bc = angleBetween(b, c);
    let diff = Math.abs(ab - bc);
    if (diff > 180) diff = 360 - diff;
    if (diff > tolDeg) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function snapPolyline(pts: Point[]): Point[] {
  if (pts.length < 2) return pts;
  const out: Point[] = [pts[0]];
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

function normalizeProfile(pts: Point[]): Point[] {
  if (pts.length < 2) return pts;
  let out = pts.map(p => ({ ...p }));
  return out;
}

const RR_COLORS: { code: string, name: string, hex: string }[] = [
  { code: "RR23", name: "RR23 tumehall", hex: "#565B58" },
  { code: "RR33", name: "RR33 must", hex: "#0B0B0B" },
  { code: "RR29", name: "RR29 punane", hex: "#8D0E1A" },
  { code: "RR37", name: "RR37 roheline", hex: "#395938" },
];

const RAL_MAP: Record<string, string> = {
  "RAL7016": "#383E42",
  "RAL9005": "#0A0A0A",
};

interface DrawingCanvasProps {
  onSave: (drawing: SheetDrawing) => void;
  initialDrawing?: SheetDrawing | null;
  clientColor?: string;
}

export default function DrawingCanvas({ onSave, clientColor = '#2563eb' }: DrawingCanvasProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [sketch, setSketch] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [straightened, setStraightened] = useState(false);
  const [paintColor, setPaintColor] = useState("#2f7d32");
  const [paintLabel, setPaintLabel] = useState("RR23");
  const [mmPerPx] = useState(0.5);
  const tolerancePx = 10;

  function getLocalPoint(e: React.PointerEvent): Point {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e: React.PointerEvent) {
    if (straightened) return;
    const p = getLocalPoint(e);
    setSketch([p]);
    setIsDrawing(true);
  }

  function onMove(e: React.PointerEvent) {
    if (!isDrawing) return;
    const p = getLocalPoint(e);
    setSketch(prev => {
      if (prev.length === 0) return [p];
      const last = prev[prev.length - 1];
      if (dist(last, p) < 3) return prev;
      return [...prev, p];
    });
  }

  function onUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (sketch.length < 2) return;
    let poly = douglasPeucker(sketch, tolerancePx);
    poly = snapPolyline(poly);
    poly = mergeCollinear(poly, 5);
    poly = normalizeProfile(poly);
    setPoints(poly);
    setStraightened(true);
  }

  const totalLenMM = useMemo(() => {
    if (points.length < 2) return 0;
    let sum = 0;
    for (let i = 0; i < points.length - 1; i++) {
      sum += dist(points[i], points[i + 1]);
    }
    return sum * mmPerPx;
  }, [points, mmPerPx]);

  function handleSaveDrawing() {
    const drawing: SheetDrawing = {
      id: `drawing_${Date.now()}`,
      points,
      decorations: [],
      paintSide: null,
      paintColor,
      paintLabel,
      totalLengthMM: Math.round(totalLenMM),
      quantity: 1,
      createdAt: new Date().toISOString(),
    };
    onSave(drawing);
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="sticky top-0 z-10 bg-white border-b px-3 py-2 flex items-center gap-2">
        <button className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm" onClick={() => { setSketch([]); setPoints([]); setStraightened(false); }}>Uus</button>
        {straightened && (
          <> 
            <div className="text-sm">Kogupikkus: <b>{Math.round(totalLenMM)}</b> mm</div>
            <button className="ml-auto px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ backgroundColor: clientColor }} onClick={handleSaveDrawing}>✓ Salvesta joonis</button>
          </>
        )}
      </div>
      <svg ref={svgRef} className="w-full h-[600px] touch-none bg-white" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e5e7eb" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" />
        {sketch.length > 0 && !straightened && (
          <polyline points={sketch.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#6b7280" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        )}
        {straightened && points.length >= 2 && (
          <> 
            {points.slice(0, -1).map((a, i) => {
              const b = points[i + 1];
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#111827" strokeWidth={4} />;
            })}
            {points.map((p, idx) => <circle key={idx} cx={p.x} cy={p.y} r={5} fill="#2563eb" />)}
          </>
        )}
      </svg>
    </div>
  );
}