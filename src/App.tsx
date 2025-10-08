import { useState } from 'react'
import { getCurrentClient } from './config/clients'
import { getSession, saveSession } from './utils/storage'
import DrawingCanvas from './components/DrawingCanvas'
import { SheetDrawing } from './types'
import { exportDrawingsToPDF } from './utils/pdfExport'

function App() {
  const client = getCurrentClient()
  const [session] = useState(() => getSession())
  const [drawings, setDrawings] = useState<SheetDrawing[]>([])
  const [view, setView] = useState<'home' | 'draw'>('home')
  const [editingDrawing, setEditingDrawing] = useState<SheetDrawing | null>(null)

  // Kui pole sessiooni, loo demo sessioon
  if (!session) {
    saveSession({
      clientId: client.id,
      role: 'CUSTOMER',
      userName: 'Demo Kasutaja',
      userEmail: 'demo@test.ee'
    })
  }

  const handleSaveDrawing = (drawing: SheetDrawing) => {
    if (editingDrawing) {
      // Uuenda olemasolevat joonist
      setDrawings(prev => prev.map(d => d.id === editingDrawing.id ? drawing : d))
      setEditingDrawing(null)
      alert('Joonis uuendatud! ✓')
    } else {
      // Lisa uus joonis
      setDrawings(prev => [...prev, drawing])
      alert('Joonis salvestatud! ✓')
    }
    setView('home')
  }

  const handleEditDrawing = (drawing: SheetDrawing) => {
    setEditingDrawing(drawing)
    setView('draw')
  }

  const handleDeleteDrawing = (id: string) => {
    if (confirm('Kas oled kindel, et soovid selle joonise kustutada?')) {
      setDrawings(prev => prev.filter(d => d.id !== id))
      alert('Joonis kustutatud!')
    }
  }

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    setDrawings(prev => prev.map(d => 
      d.id === id ? { ...d, quantity: Math.max(1, newQuantity) } : d
    ))
  }

  // 📄 B) PDF Export
  const handleExportPDF = () => {
    if (drawings.length === 0) {
      alert('Pole jooniseid eksportimiseks!')
      return
    }
    exportDrawingsToPDF(drawings, client.name)
  }

  const totalQuantity = drawings.reduce((sum, d) => sum + d.quantity, 0)
  const totalLength = drawings.reduce((sum, d) => sum + (d.totalLengthMM * d.quantity), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: client.primaryColor }}
            >
              {client.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
              <p className="text-xs text-gray-500">Plekkide tellimuse portaal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setView('home'); setEditingDrawing(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'home' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏠 Avaleht
            </button>
            <button 
              onClick={() => { setView('draw'); setEditingDrawing(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'draw' 
                  ? 'text-white' 
                  : 'text-white hover:opacity-90'
              }`}
              style={{ backgroundColor: view === 'draw' ? client.primaryColor : client.primaryColor + 'CC' }}
            >
              + Uus joonis
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'home' ? (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Tere tulemast! 👋
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Siin saad joonistada plekke, määrata värve ja esitada tellimusi.
                  </p>
                  <button 
                    onClick={() => setView('draw')}
                    className="px-6 py-3 rounded-xl text-white font-medium text-lg shadow-lg hover:shadow-xl transition-shadow"
                    style={{ backgroundColor: client.primaryColor }}
                  >
                    🎨 Alusta joonistamist
                  </button>
                </div>
                
                {/* Statistika */}
                {drawings.length > 0 && (
                  <div className="ml-8 bg-gray-50 rounded-xl p-6 min-w-[280px]">
                    <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase">Tellimuse kokkuvõte</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">Jooniseid:</span>
                        <span className="font-bold text-lg">{drawings.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">Plekke kokku:</span>
                        <span className="font-bold text-lg">{totalQuantity} tk</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 text-sm">Kogupikkus:</span>
                        <span className="font-bold text-lg">{Math.round(totalLength)} mm</span>
                      </div>
                      <div className="pt-3 mt-3 border-t">
                        <button 
                          onClick={handleExportPDF}
                          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          📄 Ekspordi PDF
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Saved Drawings */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Salvestatud joonised ({drawings.length})
                </h3>
                {drawings.length > 0 && (
                  <button 
                    onClick={handleExportPDF}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    📄 Ekspordi kõik PDF-ina
                  </button>
                )}
              </div>
              
              {drawings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Ühtegi joonist pole veel salvestatud.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {drawings.map((drawing, idx) => (
                    <div 
                      key={drawing.id} 
                      className="border rounded-xl p-4 hover:shadow-lg transition-shadow bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-gray-900 text-lg">
                          Joonis #{idx + 1}
                        </span>
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: drawing.paintColor }}
                        >
                          {drawing.paintLabel}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-700 space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span>📏 Pikkus:</span>
                          <b>{drawing.totalLengthMM} mm</b>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>🔢 Kogus:</span>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleUpdateQuantity(drawing.id, drawing.quantity - 1)}
                              className="w-6 h-6 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold"
                            >
                              −
                            </button>
                            <b className="min-w-[40px] text-center">{drawing.quantity} tk</b>
                            <button 
                              onClick={() => handleUpdateQuantity(drawing.id, drawing.quantity + 1)}
                              className="w-6 h-6 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span>📐 Punkte:</span>
                          <b>{drawing.points.length}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>📅 Loodud:</span>
                          <b>{new Date(drawing.createdAt).toLocaleDateString('et-EE')}</b>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditDrawing(drawing)}
                          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          ✏️ Muuda
                        </button>
                        <button 
                          onClick={() => handleDeleteDrawing(drawing.id)}
                          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          🗑️ Kustuta
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
              <h4 className="font-bold text-blue-900 mb-3">ℹ️ Kuidas kasutada?</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>1. Vajuta <b>"Uus joonis"</b> nuppu</li>
                <li>2. Joonista plekkide kuju sõrmega/hiirega</li>
                <li>3. Süsteem sirgendab automaatselt</li>
                <li>4. Määra värv, mõõdud ja kogus</li>
                <li>5. Salvesta ja esita tellimusse</li>
                <li>6. Ekspordi PDF, et saata tehasesse</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
            <DrawingCanvas 
              onSave={handleSaveDrawing}
              initialDrawing={editingDrawing}
              clientColor={client.primaryColor}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
          <p className="mb-2">
            <b>{client.name}</b> | {client.contactEmail} | {client.contactPhone}
          </p>
          <p className="text-xs text-gray-500">
            Powered by Plekk Portal © 2025
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
