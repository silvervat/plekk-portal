import React, { useMemo, useRef, useState } from "react";
import { Point, SheetDrawing } from '../types';

const toDeg = (rad: number) => (rad * 180) / Math.PI;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

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

function normalizeProfile(pts: Point[]): Point[] {
  if (pts.length < 2) return pts;
  return pts.map(p => ({ ...p }));
}

// 🎨 A) VÄRVIDE KONSTANDID
const PAINT_COLORS = [
  { code: "RR23", name: "Tumehall", hex: "#565B58" },
  { code: "RR33", name: "Must", hex: "#0B0B0B" },
  { code: "RR29", name: "Punane", hex: "#8D0E1A" },
  { code: "RR37", name: "Roheline", hex: "#395938" },
  { code: "RAL7016", name: "Antratsiithall", hex: "#383E42" },
  { code: "RAL9005", name: "Süsimust", hex: "#0A0A0A" },
  { code: "RAL8017", name: "Šokolaadipruun", hex: "#442F29" },
  { code: "RAL3009", name: "Oksüüdpunane", hex: "#6D342D" },
];

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
  
  // 🎨 A) Värvivalik
  const [paintColor, setPaintColor] = useState("#565B58");
  const [paintLabel, setPaintLabel] = useState("RR23");
  
  // 📊 C) Koguse muutmine
  const [quantity, setQuantity] = useState(1);
  
  // 📏 E) Mõõtude sisestamine
  const [customLength, setCustomLength] = useState<number | null>(null);
  
  const [mmPerPx] = useState(0.5);
  const tolerancePx = 10;

  // 🖱️ D) Punktide drag & drop
  const [draggedPointIdx, setDraggedPointIdx] = useState<number | null>(null);

  function getLocalPoint(e: React.PointerEvent | React.MouseEvent): Point {
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

  // 🖱️ D) Punktide liigutamine
  function onPointDown(idx: number, e: React.MouseEvent) {
    e.stopPropagation();
    setDraggedPointIdx(idx);
  }

  function onPointMove(e: React.MouseEvent) {
    if (draggedPointIdx === null) return;
    const p = getLocalPoint(e);
    setPoints(prev => {
      const updated = [...prev];
      updated[draggedPointIdx] = p;
      return updated;
    });
  }

  function onPointUp() {
    setDraggedPointIdx(null);
  }

  const totalLenMM = useMemo(() => {
    // E) Kui kasutaja sisestas käsitsi pikkuse
    if (customLength !== null && customLength > 0) return customLength;
    
    if (points.length < 2) return 0;
    let sum = 0;
    for (let i = 0; i < points.length - 1; i++) {
      sum += dist(points[i], points[i + 1]);
    }
    return sum * mmPerPx;
  }, [points, mmPerPx, customLength]);

  // 🎨 A) Värvi muutmine
  function handleColorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const color = PAINT_COLORS.find(c => c.code === e.target.value);
    if (color) {
      setPaintLabel(color.code);
      setPaintColor(color.hex);
    }
  }

  function handleSaveDrawing() {
    const drawing: SheetDrawing = {
      id: `drawing_${Date.now()}`,
      points,
      decorations: [],
      paintSide: null,
      paintColor,
      paintLabel,
      totalLengthMM: Math.round(totalLenMM),
      quantity,
      createdAt: new Date().toISOString(),
    };
    onSave(drawing);
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b px-3 py-3 space-y-3">
        {/* Peamine toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm hover:bg-gray-700 transition" 
            onClick={() => { 
              setSketch([]); 
              setPoints([]); 
              setStraightened(false); 
              setCustomLength(null);
              setQuantity(1);
            }}
          >
            🔄 Uus
          </button>
          
          {straightened && (
            <>
              {/* 📏 E) Mõõdu sisestamine */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Pikkus:</label>
                <input 
                  type="number"
                  value={customLength !== null ? customLength : Math.round(totalLenMM)}
                  onChange={(e) => setCustomLength(Number(e.target.value))}
                  className="w-24 px-2 py-1 border rounded text-sm"
                  placeholder="mm"
                />
                <span className="text-xs text-gray-500">mm</span>
              </div>

              {/* 📊 C) Koguse muutmine */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Kogus:</label>
                <input 
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-20 px-2 py-1 border rounded text-sm"
                />
                <span className="text-xs text-gray-500">tk</span>
              </div>

              <button 
                className="ml-auto px-4 py-2 rounded-xl text-white text-sm font-medium hover:opacity-90 transition" 
                style={{ backgroundColor: clientColor }} 
                onClick={handleSaveDrawing}
              >
                ✓ Salvesta joonis
              </button>
            </>
          )}
        </div>

        {/* 🎨 A) Värvivalik */}
        {straightened && (
          <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg">
            <label className="text-sm font-medium text-gray-700">Värv:</label>
            <select 
              value={paintLabel}
              onChange={handleColorChange}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white"
            >
              {PAINT_COLORS.map(color => (
                <option key={color.code} value={color.code}>
                  {color.code} - {color.name}
                </option>
              ))}
            </select>
            <div 
              className="w-8 h-8 rounded border-2 border-gray-300" 
              style={{ backgroundColor: paintColor }}
              title={paintLabel}
            />
          </div>
        )}
      </div>

      {/* Canvas */}
      <svg 
        ref={svgRef} 
        className="w-full h-[600px] touch-none bg-white" 
        onPointerDown={onDown} 
        onPointerMove={onMove} 
        onPointerUp={onUp}
        onMouseMove={onPointMove}
        onMouseUp={onPointUp}
      >
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e5e7eb" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" />
        
        {/* Sketch */}
        {sketch.length > 0 && !straightened && (
          <polyline 
            points={sketch.map(p => `${p.x},${p.y}`).join(" ")} 
            fill="none" 
            stroke="#6b7280" 
            strokeWidth={3} 
            strokeLinejoin="round" 
            strokeLinecap="round" 
          />
        )}
        
        {/* Straightened lines */}
        {straightened && points.length >= 2 && (
          <>
            {points.slice(0, -1).map((a, i) => {
              const b = points[i + 1];
              return (
                <line 
                  key={i} 
                  x1={a.x} 
                  y1={a.y} 
                  x2={b.x} 
                  y2={b.y} 
                  stroke="#111827" 
                  strokeWidth={4} 
                />
              );
            })}
            
            {/* 🖱️ D) Draggable points */}
            {points.map((p, idx) => (
              <circle 
                key={idx} 
                cx={p.x} 
                cy={p.y} 
                r={8} 
                fill={draggedPointIdx === idx ? "#ef4444" : "#2563eb"}
                stroke="white"
                strokeWidth={2}
                className="cursor-move hover:fill-blue-400 transition"
                onMouseDown={(e) => onPointDown(idx, e)}
              />
            ))}
          </>
        )}
      </svg>
    </div>
  );
}
