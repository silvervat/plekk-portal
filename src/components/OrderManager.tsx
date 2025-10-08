import { useState, useEffect } from 'react';
import { Order, SheetDrawing, OrderStatus } from '../types';
import { exportDrawingsToPDF } from '../utils/pdfExport';

interface OrderManagerProps {
  clientName: string;
  clientColor: string;
  availableDrawings: SheetDrawing[];
  onCreateOrder?: (order: Order) => void;
}

export default function OrderManager({ 
  clientName, 
  clientColor,
  availableDrawings,
  onCreateOrder 
}: OrderManagerProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDrawings, setSelectedDrawings] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('plekk_orders');
    if (stored) {
      try {
        setOrders(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load orders', e);
      }
    }
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem('plekk_orders', JSON.stringify(orders));
    }
  }, [orders]);

  const handleCreateOrder = () => {
    if (!customerName.trim() || selectedDrawings.length === 0) {
      alert('Palun sisesta kliendi nimi ja vali vähemalt üks joonis!');
      return;
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
    const selectedDrawingObjects = availableDrawings.filter(d => 
      selectedDrawings.includes(d.id)
    );

    const newOrder: Order = {
      id: `order_${Date.now()}`,
      orderNumber,
      clientId: 'demo-client',
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      drawings: selectedDrawingObjects,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    setOrders(prev => [newOrder, ...prev]);
    
    if (onCreateOrder) {
      onCreateOrder(newOrder);
    }

    setShowCreateForm(false);
    setSelectedDrawings([]);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setNotes('');

    alert(`✅ Tellimus ${orderNumber} loodud!`);
  };

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
        : order
    ));
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm('Kas oled kindel, et soovid tellimuse kustutada?')) {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      alert('Tellimus kustutatud!');
    }
  };

  const handleExportOrder = (order: Order) => {
    exportDrawingsToPDF(order.drawings, `${clientName} - ${order.orderNumber}`);
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'SUBMITTED': 'bg-blue-100 text-blue-800',
      'RECEIVED': 'bg-cyan-100 text-cyan-800',
      'IN_PRODUCTION': 'bg-purple-100 text-purple-800',
      'QUESTION': 'bg-amber-100 text-amber-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'DELIVERED': 'bg-emerald-100 text-emerald-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      'DRAFT': 'Mustand',
      'SUBMITTED': 'Esitatud',
      'RECEIVED': 'Vastu võetud',
      'IN_PRODUCTION': 'Tootmises',
      'QUESTION': 'Küsimus',
      'COMPLETED': 'Valmis',
      'DELIVERED': 'Kohale toimetatud',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📦 Tellimuste haldus</h2>
          <p className="text-sm text-gray-600 mt-1">Vaata ja halda kõiki tellimusi</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-3 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition"
          style={{ backgroundColor: clientColor }}
        >
          + Uus tellimus
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Uus tellimus</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kliendi nimi *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nt: AS Ehitus OÜ"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="+372 5123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vali joonised * ({selectedDrawings.length} valitud)
                </label>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                  {availableDrawings.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Pole jooniseid saadaval. Loo esmalt joonised!
                    </p>
                  ) : (
                    availableDrawings.map((drawing, idx) => (
                      <label
                        key={drawing.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDrawings.includes(drawing.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDrawings(prev => [...prev, drawing.id]);
                            } else {
                              setSelectedDrawings(prev => prev.filter(id => id !== drawing.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">Joonis #{idx + 1}</div>
                          <div className="text-xs text-gray-600">
                            {drawing.totalLengthMM}mm × {drawing.quantity}tk | {drawing.paintLabel}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Märkused
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Lisainfo tellimuse kohta..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Tühista
                </button>
                <button
                  onClick={handleCreateOrder}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: clientColor }}
                >
                  Loo tellimus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Tellimusi pole veel</h3>
            <p className="text-gray-600 mb-6">Alusta uue tellimuse loomisest</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 rounded-xl text-white font-medium"
              style={{ backgroundColor: clientColor }}
            >
              + Loo esimene tellimus
            </button>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition">
              <div className="p-6 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{order.orderNumber}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>👤 {order.customerName}</div>
                      {order.customerEmail && <div>📧 {order.customerEmail}</div>}
                      {order.customerPhone && <div>📞 {order.customerPhone}</div>}
                      <div>📅 Loodud: {new Date(order.createdAt).toLocaleDateString('et-EE')}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportOrder(order)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
                    >
                      🗑️ Kustuta
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Joonised ({order.drawings.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {order.drawings.map((drawing, idx) => (
                      <div key={drawing.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm">Joonis #{idx + 1}</span>
                          <span 
                            className="px-2 py-1 rounded text-xs font-bold text-white"
                            style={{ backgroundColor: drawing.paintColor }}
                          >
                            {drawing.paintLabel}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>📏 {drawing.totalLengthMM} mm</div>
                          <div>🔢 {drawing.quantity} tk</div>
                          <div>📐 {drawing.points.length} punkti</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Jooniseid</div>
                    <div className="text-lg font-bold">{order.drawings.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Plekke kokku</div>
                    <div className="text-lg font-bold">
                      {order.drawings.reduce((sum, d) => sum + d.quantity, 0)} tk
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Kogupikkus</div>
                    <div className="text-lg font-bold">
                      {order.drawings.reduce((sum, d) => sum + (d.totalLengthMM * d.quantity), 0)} mm
                    </div>
                  </div>
                </div>

                {order.notes && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-xs font-bold text-amber-900 mb-1">Märkused:</div>
                    <div className="text-sm text-amber-800">{order.notes}</div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t">
                  <label className="block text-xs font-bold text-gray-700 mb-2">Muuda staatust:</label>
                  <div className="flex flex-wrap gap-2">
                    {(['DRAFT', 'SUBMITTED', 'RECEIVED', 'IN_PRODUCTION', 'COMPLETED', 'DELIVERED'] as OrderStatus[]).map(status => (
                      <button
                        key={status}
                        onClick={() => handleUpdateStatus(order.id, status)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                          order.status === status 
                            ? getStatusColor(status) 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
