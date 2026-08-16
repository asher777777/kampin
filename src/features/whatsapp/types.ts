export interface WhatsAppSettings {
  idInstance: string;
  apiToken: string;
}

export type WhatsAppConnectionStatus = "authorized" | "notAuthorized" | "checking" | "qr" | "error";

export interface WhatsAppConnectionState {
  status: WhatsAppConnectionStatus;
  phoneNumber?: string;
  avatar?: string;
  name?: string;
  qrCode?: string; // base64 QR code image string
  error?: string;
}

export interface WhatsAppRecipient {
  name: string;
  phone: string;
  status: string;
  messageId?: string;
  apiResponse?: string;
  personalizedContent?: string;
}

export interface WhatsAppCampaign {
  id?: string;
  userId: string;
  messageContent: string;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  formName?: string | null;
  pageName?: string | null;
  recipients?: WhatsAppRecipient[];
}
