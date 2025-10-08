import { Order, UserSession, SheetDrawing } from '../types';

const STORAGE_KEYS = {
  ORDERS: 'plekk_orders',
  SESSION: 'plekk_session',
  DRAFT_DRAWINGS: 'plekk_draft_drawings',
};

// === TELLIMUSED ===

export function getAllOrders(clientId?: string): Order[] {
  const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
  if (!data) return [];
  const orders: Order[] = JSON.parse(data);
  
  if (clientId) {
    return orders.filter(o => o.clientId === clientId);
  }
  return orders;
}

export function getOrderById(orderId: string): Order | null {
  const orders = getAllOrders();
  return orders.find(o => o.id === orderId) || null;
}

export function saveOrder(order: Order): void {
  const orders = getAllOrders();
  const existingIndex = orders.findIndex(o => o.id === order.id);
  
  if (existingIndex >= 0) {
    orders[existingIndex] = { ...order, updatedAt: new Date().toISOString() };
  } else {
    orders.push(order);
  }
  
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

export function deleteOrder(orderId: string): void {
  const orders = getAllOrders().filter(o => o.id !== orderId);
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const orders = getAllOrders();
  const count = orders.length + 1;
  return `ORD-${year}-${String(count).padStart(4, '0')}`;
}

// === SESSIOON ===

export function getSession(): UserSession | null {
  const data = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (!data) return null;
  return JSON.parse(data);
}

export function saveSession(session: UserSession): void {
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

// === MUSTAND JOONISED ===

export function getDraftDrawings(clientId: string): SheetDrawing[] {
  const key = `${STORAGE_KEYS.DRAFT_DRAWINGS}_${clientId}`;
  const data = localStorage.getItem(key);
  if (!data) return [];
  return JSON.parse(data);
}

export function saveDraftDrawings(clientId: string, drawings: SheetDrawing[]): void {
  const key = `${STORAGE_KEYS.DRAFT_DRAWINGS}_${clientId}`;
  localStorage.setItem(key, JSON.stringify(drawings));
}

export function clearDraftDrawings(clientId: string): void {
  const key = `${STORAGE_KEYS.DRAFT_DRAWINGS}_${clientId}`;
  localStorage.removeItem(key);
}