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
  purpose?: string;
  isDraft?: boolean;
  files?: CommunityFile[];
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
