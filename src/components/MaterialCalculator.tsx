import React, { useState, useMemo } from 'react';
import { MaterialCalculation } from '../types';

interface MaterialCalculatorProps {
  drawingLengthMM: number;
  quantity: number;
  onCalculated?: (calc: MaterialCalculation) => void;
}

export default function MaterialCalculator({ 
  drawingLengthMM, 
  quantity,
  onCalculated 
}: MaterialCalculatorProps) {
  const [blankLengthMM, setBlankLengthMM] = useState(6000);
  const [blankWidthMM, setBlankWidthMM] = useState(1250);

  const calculation: MaterialCalculation = useMemo(() => {
    // Calculate how many pieces fit in one blank
    const maxPiecesPerBlank = Math.floor(blankLengthMM / drawingLengthMM);
    
    // Calculate how many blanks needed
    const blanksNeeded = Math.ceil(quantity / maxPiecesPerBlank);
    
    // Calculate total area in m²
    const totalAreaM2 = (blankLengthMM * blankWidthMM * blanksNeeded) / 1_000_000;
    
    // Calculate waste percentage
    const usedPieces = Math.min(quantity, maxPiecesPerBlank * blanksNeeded);
    const totalCapacity = maxPiecesPerBlank * blanksNeeded;
    const wastePercentage = totalCapacity > 0 
      ? ((totalCapacity - usedPieces) / totalCapacity) * 100 
      : 0;

    const calc: MaterialCalculation = {
      blankLengthMM,
      blankWidthMM,
      drawingLengthMM,
      quantity,
      maxPiecesPerBlank,
      blanksNeeded,
      totalAreaM2,
      wastePercentage
    };

    if (onCalculated) {
      onCalculated(calc);
    }

    return calc;
  }, [blankLengthMM, blankWidthMM, drawingLengthMM, quantity, onCalculated]);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        📐 Materjali kalkulaator
      </h3>

      {/* Input fields */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tooriku pikkus (mm)
          </label>
          <input
            type="number"
            value={blankLengthMM}
            onChange={(e) => setBlankLengthMM(Math.max(1, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min="1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tooriku laius (mm)
          </label>
          <input
            type="number"
            value={blankWidthMM}
            onChange={(e) => setBlankWidthMM(Math.max(1, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min="1"
          />
        </div>
      </div>

      {/* Quick presets */}
      <div className="mb-6">
        <p className="text-xs text-gray-600 mb-2">Kiirvalikud:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '6m × 1.25m', l: 6000, w: 1250 },
            { label: '3m × 1.25m', l: 3000, w: 1250 },
            { label: '2m × 1m', l: 2000, w: 1000 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setBlankLengthMM(preset.l);
                setBlankWidthMM(preset.w);
              }}
              className="px-3 py-1 text-xs bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl p-4 space-y-3 border border-blue-100">
        <div className="flex justify-between items-center pb-2 border-b">
          <span className="text-sm text-gray-600">Joonise pikkus:</span>
          <span className="font-bold text-gray-900">{drawingLengthMM} mm</span>
        </div>
        
        <div className="flex justify-between items-center pb-2 border-b">
          <span className="text-sm text-gray-600">Vajaminev kogus:</span>
          <span className="font-bold text-gray-900">{quantity} tk</span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b bg-green-50 -mx-4 px-4 py-2">
          <span className="text-sm font-medium text-green-900">Tükke ühest toorikust:</span>
          <span className="font-bold text-green-900 text-lg">{calculation.maxPiecesPerBlank} tk</span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b bg-blue-50 -mx-4 px-4 py-2">
          <span className="text-sm font-medium text-blue-900">Toorikuid vaja:</span>
          <span className="font-bold text-blue-900 text-lg">{calculation.blanksNeeded} tk</span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b bg-purple-50 -mx-4 px-4 py-2">
          <span className="text-sm font-medium text-purple-900">Kogupindala:</span>
          <span className="font-bold text-purple-900 text-lg">{calculation.totalAreaM2.toFixed(2)} m²</span>
        </div>

        {calculation.wastePercentage > 0 && (
          <div className="flex justify-between items-center bg-amber-50 -mx-4 px-4 py-2 rounded-b-xl">
            <span className="text-sm font-medium text-amber-900">Raiskamine:</span>
            <span className="font-bold text-amber-900">{calculation.wastePercentage.toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Visual representation */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 mb-2">Visuaalne esitus:</p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: calculation.blanksNeeded }).map((_, i) => (
            <div 
              key={i}
              className="relative bg-gradient-to-br from-gray-200 to-gray-300 rounded border border-gray-400 p-2 text-center"
              style={{ 
                width: `${Math.min(120, blankWidthMM / 15)}px`,
                height: `${Math.min(80, blankLengthMM / 100)}px`
              }}
            >
              <div className="text-[10px] font-bold text-gray-700">
                Toorik #{i + 1}
              </div>
              <div className="text-[9px] text-gray-600">
                {Math.min(calculation.maxPiecesPerBlank, quantity - i * calculation.maxPiecesPerBlank)} tk
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
