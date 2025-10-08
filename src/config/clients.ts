import { ClientConfig } from '../types';

// Siin määratakse kõik plekitöökojad, kes süsteemi kasutavad
export const CLIENTS: Record<string, ClientConfig> = {
  'demo': {
    id: 'demo',
    name: 'Demo Plekitöökoda',
    primaryColor: '#2563eb',
    contactEmail: 'info@demoplekk.ee',
    contactPhone: '+372 5555 5555',
  },
  'metalmaster': {
    id: 'metalmaster',
    name: 'Metal Master OÜ',
    primaryColor: '#059669',
    contactEmail: 'tellimus@metalmaster.ee',
    contactPhone: '+372 1234 5678',
  },
  // Lisa siia uusi kliente
};

// URL-ist kliendi ID lugemine: ?client=demo
export function getClientFromURL(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('client') || 'demo';
}

export function getCurrentClient(): ClientConfig {
  const clientId = getClientFromURL();
  return CLIENTS[clientId] || CLIENTS['demo'];
}