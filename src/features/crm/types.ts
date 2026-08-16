export interface CustomTab {
  id: string;
  title: string;
  icon: string;
}

export interface CustomField {
  id: string;
  category: string;
  type: string; // text, date, number, etc.
  label: string;
}

export interface ContactEvent {
  time: string;
  title: string;
  text: string;
}

export interface CalendarEvent {
  id?: string;
  contactId: string;
  userId: string;
  title: string;
  date: string;
  time: string;
  description?: string;
  start: string; // ISO string
  end: string;   // ISO string
  type?: string;
  status?: string;
  followUpDate?: string;
  linkedContacts?: { id: string, name: string }[];
  sendToContact?: boolean;
  metadata?: {
    suggestions?: string[];
    [key: string]: any;
  };
  createdAt?: string;
}

export interface FormSubmission {
  name: string;
  page: string;
  date: string;
}

export interface PaymentRecord {
  id?: string;
  date: string;
  amount: number;
  paymentType: string;
  receiptType?: string;
  kesherStatus?: string;
  receiptLink?: string;
}

export interface Contact {
  id?: string;
  ownerId: string;
  status: "active" | "trashed";
  
  // Core Fields
  conta_name: string;
  f_m?: string;
  conta_phone: string;
  email?: string;
  gender?: string;
  
  // Address Fields
  mh_crm_city?: string;
  mh_crm_street?: string;
  
  // Tag Fields
  tg1?: string;
  tg2?: string;
  tg3?: string;

  // Company Fields
  company_name?: string;
  job_title?: string;
  lead_source?: string;

  // Other Contact Info
  segment?: string;
  work_phone?: string;
  website?: string;
  birth_date?: string; // YYYY-MM-DD
  notes?: string;
  events?: ContactEvent[];
  form_submissions?: FormSubmission[];

  // Form Tracking Fields
  last_form_name?: string;
  last_form_page?: string;
  last_form_submission_date?: string;
  
  // Community Fields
  communityIds?: string[];
  isUser?: boolean;
  systemUserId?: string;
  
  // Message Tracking Fields
  last_message_read_status?: string;

  // WooCommerce Summary Fields
  total_spent?: number;
  order_count?: number;
  last_order_date?: string;
  payments?: PaymentRecord[];
  
  // Payment Details (Default Bank/Check Info)
  payment_details?: {
    checkNumber?: string;
    bankName?: string;
    branchNumber?: string;
    accountNumber?: string;
    transferRef?: string;
  };

  // AI Usage & Stats
  ai_total_input_tokens?: number;
  ai_total_output_tokens?: number;
  ai_total_cost?: number; // USD
  ai_interactions?: {
    date: string;
    summary: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    imageUrl?: string;
  }[];

  // Timestamps
  createdAt?: string;
  updatedAt?: string;

  // Dynamic custom fields
  [key: string]: any;
}
