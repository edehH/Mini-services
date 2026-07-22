export interface Trip {
  id: string;
  origin: string;
  destination: string;
  grossPrice: number;
  commission: number;
  timestamp: number;
  notes?: string;
}

export interface WorkDay {
  id: string;
  date: string;
  trips: Trip[];
  totalGross: number;
  totalCommission: number;
  settledAt: number;
}

export interface DriverWarning {
  id: string;
  type: 'warning' | 'suspension' | 'note'; // تنبيه | تعليق/حظر مؤقت | ملاحظة
  text: string;
  durationHours?: number; // مدة الحظر بالساعات
  createdAt: number;
  expiresAt?: number; // وقت انتهاء الحظر/التعليق
  createdBy?: string;
  active: boolean;
}

export type DriverClassification = 'ممتاز' | 'جيد جداً' | 'جيد' | 'تحت الملاحظة' | 'موقوف مؤقتاً' | 'مخالف';

export interface Rider {
  id: string;
  name: string;
  phone: string;
  currentTrips: Trip[];
  isDev?: boolean;
  isSuspended?: boolean;
  photo?: string; // base64 photo
  prepaidBalance?: number; // Balance charged/deposited beforehand
  warnings?: DriverWarning[];
  banUntil?: number; // timestamp until which driver is suspended
  classification?: DriverClassification;
  notes?: string;
  lastActivityAt?: number; // Timestamp of most recent activity/message/transaction
}

export interface ArchiveRecord {
  riderId: string;
  riderName: string;
  workDays: WorkDay[];
}

export interface Expense {
  id: string;
  amount: number;
  reason: string;
  timestamp: number;
}

export enum AppState {
  SPLASH = 'SPLASH',
  DASHBOARD = 'DASHBOARD',
  RIDER_DETAILS = 'RIDER_DETAILS',
  VAULT_LOCK = 'VAULT_LOCK',
  VAULT_PORTAL = 'VAULT_PORTAL',
  ARCHIVE_RIDER_LIST = 'ARCHIVE_RIDER_LIST',
  ARCHIVE_WORK_DAYS = 'ARCHIVE_WORK_DAYS',
  ARCHIVE_DAY_TRIPS = 'ARCHIVE_DAY_TRIPS',
  RIDER_PORTAL = 'RIDER_PORTAL',
  SCANNER = 'SCANNER',
  SALES_RECORD = 'SALES_RECORD',
  EXPENSES_LIST = 'EXPENSES_LIST',
  IMAGE_GEN = 'IMAGE_GEN'
}