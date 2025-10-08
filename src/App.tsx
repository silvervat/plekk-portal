import { useState } from 'react'
import { getCurrentClient } from './config/clients'
import { getSession, saveSession } from './utils/storage'
import DrawingCanvas from './components/DrawingCanvas'
import { SheetDrawing } from './types'

function App() {
  const client = getCurrentClient()
  const [session] = useState(() => getSession())
  const [drawings, setDrawings] = useState<SheetDrawing[]>([])
  const [view, setView] = useState<'home' | 'draw'>('home')

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
    setDrawings(prev => [...prev, drawing])
    setView('home')
    alert('Joonis salvestatud! ✓')
  }

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
              onClick={() => setView('home')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'home' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Avaleht
            </button>
            <button 
              onClick={() => setView('draw')}
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

            {/* Saved Drawings */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Salvestatud joonised ({drawings.length})
              </h3>
              {drawings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Ühtegi joonist pole veel salvestatud.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {drawings.map((drawing, idx) => (
                    <div 
                      key={drawing.id} 
                      className="border rounded-xl p-4 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          Joonis #{idx + 1}
                        </span>
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: drawing.paintColor }}
                        >
                          {drawing.paintLabel}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>📏 Pikkus: <b>{drawing.totalLengthMM} mm</b></div>
                        <div>🔢 Kogus: <b>{drawing.quantity} tk</b></div>
                        <div>📍 Punkte: <b>{drawing.points.length}</b></div>
                        {drawing.paintSide && (
                          <div>🎨 Külg: <b>{drawing.paintSide}</b></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
              <h4 className="font-bold text-blue-900 mb-2">ℹ️ Kuidas kasutada?</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>1. Vajuta <b>"Uus joonis"</b> nuppu</li>
                <li>2. Joonista plekkide kuju sõrmega/hiirega</li>
                <li>3. Süsteem sirgendab automaatselt</li>
                <li>4. Määra värv ja mõõdud</li>
                <li>5. Salvesta ja esita tellimusse</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
            <DrawingCanvas 
              onSave={handleSaveDrawing}
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
