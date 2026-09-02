export interface WhatsAppSettings {
  idInstance: string;
  apiToken: string;
}

export type WhatsAppConnectionStatus = "authorized" | "notAuthorized" | "notConfigured" | "checking" | "qr" | "error";

export interface WhatsAppConnectionState {
  status: WhatsAppConnectionStatus;
  phoneNumber?: string;
  avatar?: string;
  name?: string;
  qrCode?: string; // base64 QR code image string
  error?: string;
}

export interface WhatsAppRecipient {
  contactId?: string;
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
  name?: string;
  messageContent: string;
  mediaUrl?: string;
  communityId?: string;
  communityName?: string;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  formName?: string | null;
  pageName?: string | null;
  recipients?: WhatsAppRecipient[];
}
