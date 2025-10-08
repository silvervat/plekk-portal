// Punkti tüüp joonistamiseks
export type Point = { x: number; y: number }; 

// Pleki dekoratsioonid (tagasipöörded, tugevuspained)
export type DecorationKind = 'HEM_CLOSED' | 'HEM_OPEN' | 'CREASE';
export type Decoration = {
  pos: 'start' | 'end';
  kind: DecorationKind;
  sizeMM: 5 | 10;
};

// Pleki joonise andmed
export type SheetDrawing = {
  id: string;
  points: Point[];
  decorations: Decoration[];
  paintSide: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | null;
  paintColor: string;
  paintLabel: string;
  totalLengthMM: number;
  quantity: number;
  notes?: string;
  createdAt: string;
};

// Materjali kalkulatsioon
export type MaterialCalculation = {
  blankLengthMM: number;
  blankWidthMM: number;
  drawingLengthMM: number;
  quantity: number;
  maxPiecesPerBlank: number;
  blanksNeeded: number;
  totalAreaM2: number;
  wastePercentage: number;
};

// Tellimuse staatus
export type OrderStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'RECEIVED'
  | 'IN_PRODUCTION'
  | 'QUESTION'
  | 'COMPLETED'
  | 'DELIVERED';

// Tellimus
export type Order = {
  id: string;
  orderNumber: string;
  clientId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  drawings: SheetDrawing[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  productionStarted?: string;
  productionCompleted?: string;
  questions?: OrderQuestion[];
  materialUsage?: MaterialUsage[];
  notes?: string;
};

// Küsimus tellimuse kohta
export type OrderQuestion = {
  id: string;
  askedBy: string;
  question: string;
  answer?: string;
  answeredAt?: string;
  createdAt: string;
};

// Materjali kasutus
export type MaterialUsage = {
  materialType: string;
  quantityUsed: number;
  waste: number;
  orderId: string;
};

// Kliendi konfiguratsioon
export type ClientConfig = {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  contactEmail: string;
  contactPhone?: string;
};

// Kasutaja roll
export type UserRole = 'CUSTOMER' | 'WORKER' | 'ADMIN';

// Kasutaja sessioon
export type UserSession = {
  clientId: string;
  role: UserRole;
  userName?: string;
  userEmail?: string;
};
