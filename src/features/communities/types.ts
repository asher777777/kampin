export interface CommunityFile {
  name: string;
  url: string;
  type: string; // "pdf", "image", "doc", etc.
  size?: number;
  uploadedAt: string;
}

export interface Community {
  id?: string;
  ownerId: string;
  name: string;
  color: string;
  icon: string;
  vision?: string; // חזון
  purpose?: string; // מטרה
  gallery?: string[]; // גלריית תמונות
  pageId?: string; // מזהה עמוד
  pageSlug?: string; // נתיב עמוד
  pageUrl?: string; // קישור לעמוד
  mainCampaignId?: string; // קמפיין ראשי
  campaignTitle?: string;
  isDraft?: boolean;
  files?: CommunityFile[];
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
