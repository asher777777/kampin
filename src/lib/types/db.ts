import { Timestamp } from 'firebase/firestore';

// Base interface for all documents
export interface BaseDocument {
  id: string;
  ownerId: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ---------------------------------------------------------
// Users
// ---------------------------------------------------------
export interface UserSettings {
  theme?: 'light' | 'dark' | 'system';
  whatsappToken?: string;
  googleCalendarToken?: string;
  kesherApiToken?: string;
}

export interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  onboardingCompleted: boolean;
  settings: UserSettings;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

// ---------------------------------------------------------
// Contacts (CRM)
// ---------------------------------------------------------
export interface ContactDocument extends BaseDocument {
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  tags: string[];
  source?: string;
  customFields?: Record<string, any>;
}

// Sub-collection: contacts/{contactId}/notes
export interface ContactNote {
  id: string;
  content: string;
  ownerId: string; // matches the general firestore rules
  createdAt: Timestamp | Date;
}

// ---------------------------------------------------------
// Services
// ---------------------------------------------------------
export interface ServiceDocument extends BaseDocument {
  name: string;
  description: string;
  price: number;
  currency: 'ILS' | 'USD';
  imageUrl?: string;
  isActive: boolean;
  slug: string;
}

// ---------------------------------------------------------
// Transactions (Receipts, Expenses, Donations)
// ---------------------------------------------------------
export interface TransactionItem {
  description: string;
  quantity: number;
  price: number;
}

export interface TransactionDocument extends BaseDocument {
  contactId?: string;
  type: 'INCOME' | 'EXPENSE' | 'DONATION';
  amount: number;
  currency: 'ILS' | 'USD';
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'FAILED';
  date: Timestamp | Date;
  items: TransactionItem[];
  kesherDocumentId?: string;
  receiptUrl?: string;
  paymentMethod?: string;
}

// ---------------------------------------------------------
// Automations
// ---------------------------------------------------------
export interface AutomationTrigger {
  type: 'NEW_CONTACT' | 'TAG_ADDED' | 'PAYMENT_RECEIVED' | string;
  config?: Record<string, any>;
}

export interface AutomationAction {
  type: 'SEND_WHATSAPP' | 'SEND_EMAIL' | 'ADD_TASK' | string;
  config: Record<string, any>;
}

export interface AutomationDocument extends BaseDocument {
  name: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
}

// ---------------------------------------------------------
// Campaigns
// ---------------------------------------------------------
export interface CampaignAudience {
  tags?: string[];
  excludeTags?: string[];
}

export interface CampaignMetrics {
  sent: number;
  delivered: number;
  failed: number;
}

export interface CampaignDocument extends BaseDocument {
  name: string;
  type: 'WHATSAPP' | 'EMAIL';
  audience: CampaignAudience;
  content: string;
  status: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  scheduledAt?: Timestamp | Date;
  metrics: CampaignMetrics;
}

// ---------------------------------------------------------
// Events (Calendar)
// ---------------------------------------------------------
export interface EventDocument extends BaseDocument {
  contactId?: string;
  title: string;
  description?: string;
  type: 'MEETING' | 'CALL' | 'TASK';
  startTime: Timestamp | Date;
  endTime: Timestamp | Date;
  isCompleted?: boolean;
  googleEventId?: string;
}

// ---------------------------------------------------------
// Landing Pages
// ---------------------------------------------------------
export interface LandingPageSection {
  type: string;
  content: Record<string, any>;
}

export interface LandingPageSeo {
  title?: string;
  description?: string;
  shareImage?: string;
}

export interface LandingPageDocument extends BaseDocument {
  slug: string;
  title: string;
  theme?: string;
  components: LandingPageSection[];
  isPublished: boolean;
  seoDetails?: LandingPageSeo;
}

// ---------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------
export interface AuditLogDocument {
  id: string;
  ownerId: string;
  action: string;
  collection: string;
  documentId: string;
  details: Record<string, any>;
  timestamp: Timestamp | Date;
  ipAddress?: string;
}
