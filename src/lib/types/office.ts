import { Timestamp } from 'firebase/firestore';

export interface SmartOfficeTab {
  id: string;
  title: string;          // e.g. "DATABASE" or "GEMINI"
  subtitle?: string;       // e.g. "Direct DB Server Mode"
  modeType?: 'database' | 'gemini'; // 'database' = Direct DB Fast Mode, 'gemini' = Gemini AI Mode
  mediaType: 'image' | 'video';
  mediaUrl: string;       // URL from Media Library / Firebase Storage
  tools: string[];        // Selected tools for this tab e.g. ["analytics", "scanner", "reporting"]
  permissions: string[];  // Selected permissions e.g. ["read", "write", "execute"]
  loopMedia?: boolean;    // Loop video continuously (default true)
  mutedMedia?: boolean;   // Mute video audio (default true)
  systemPrompt?: string;  // System prompt / AI instructions for this tab's tool
}

export interface UserRolePermissions {
  system_db_read: boolean;
  office_db_read: boolean;
  db_write_edit_delete: boolean;
  code_files_write_edit_delete: boolean;
}

export interface PermissionMatrix {
  system_admin: UserRolePermissions;
  slug_owner: UserRolePermissions;
  guest_non_owner: UserRolePermissions;
}

export interface SavedPromptPreset {
  id: string;
  title: string;        // e.g. "User Audit Table"
  icon: string;         // e.g. "Users" | "Table" | "Sparkles" | "FileText" | "BarChart3"
  promptText: string;   // e.g. "Table with 3 columns with user data Full name - ID - Phone"
}

export interface SmartWorkerConfig {
  permissions: UserRolePermissions;
  permission_matrix?: PermissionMatrix;
  ai_capabilities: string[];
  primary_roles: string[];
  collaboration: string[];
  allowed_collections?: string[];
  systemPrompt?: string;
  conversation_history_id?: string;
  tts_voice_id?: string;
  tone_style?: string;
  bypass_gemini_direct_db?: boolean;
  savedPrompts?: SavedPromptPreset[];
}

export interface SmartOfficeDocument {
  id: string;             // Firestore doc ID / slug
  slug: string;           // Unique URL slug (e.g. "david")
  officeName: string;     // e.g. "David's office."
  agentName: string;      // e.g. "David"
  agentTitle: string;     // e.g. "Check with David."
  headerBrand: string;    // e.g. "M.A.M"
  headerSubtitle: string; // e.g. "Smart digital offices"
  tabs: SmartOfficeTab[];
  smartWorkerConfig?: SmartWorkerConfig;
  savedPrompts?: SavedPromptPreset[];
  ownerId: string;
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  system_admin: {
    system_db_read: true,
    office_db_read: true,
    db_write_edit_delete: true,
    code_files_write_edit_delete: true,
  },
  slug_owner: {
    system_db_read: true,
    office_db_read: true,
    db_write_edit_delete: true,
    code_files_write_edit_delete: false,
  },
  guest_non_owner: {
    system_db_read: false,
    office_db_read: true,
    db_write_edit_delete: false,
    code_files_write_edit_delete: false,
  },
};

export const DEFAULT_ALLOWED_COLLECTIONS = [
  "digital_offices",
  "landing_pages",
  "pages",
  "event_page",
  "post_page",
  "service_page",
  "site_pages",
  "user_pages",
  "users",
  "contacts",
  "transactions"
];

export const DEFAULT_SAVED_PROMPTS: SavedPromptPreset[] = [
  {
    id: "p_1",
    title: "User Table (Full Name, ID, Phone)",
    icon: "Users",
    promptText: "Table with 3 columns with user data Full name - ID - Phone"
  },
  {
    id: "p_2",
    title: "Subscriptions Ledger (Oldest -> Newest)",
    icon: "Table",
    promptText: "List of all subscriptions from oldest to newest"
  },
  {
    id: "p_3",
    title: "System Traffic & Lead Growth Chart",
    icon: "BarChart3",
    promptText: "Show database traffic and conversion growth chart"
  },
  {
    id: "p_4",
    title: "Financial Revenue & CRM Report",
    icon: "Sparkles",
    promptText: "Show total revenue and CRM lead transactions breakdown"
  }
];

export const DEFAULT_SMART_WORKER_CONFIG: SmartWorkerConfig = {
  permissions: {
    system_db_read: true,
    office_db_read: true,
    db_write_edit_delete: false,
    code_files_write_edit_delete: false,
  },
  permission_matrix: DEFAULT_PERMISSION_MATRIX,
  ai_capabilities: [
    "text_response",
    "research",
    "read_documents",
    "generate_images",
    "write_code"
  ],
  primary_roles: [
    "Advisor",
    "Analytics",
    "Automations Manager"
  ],
  collaboration: [
    "dotty-creative-worker",
    "alex-security-worker"
  ],
  allowed_collections: DEFAULT_ALLOWED_COLLECTIONS,
  systemPrompt: "You are an advanced AI Smart Worker operating within the office workspace. You specialize in data analysis, strategy optimization, and automated workflow execution.",
  conversation_history_id: "",
  tts_voice_id: "en-US-Studio-O",
  tone_style: "Professional",
  bypass_gemini_direct_db: false,
  savedPrompts: DEFAULT_SAVED_PROMPTS
};

export const DEFAULT_OFFICE_DATA: SmartOfficeDocument = {
  id: 'david',
  slug: 'david',
  officeName: "David's office.",
  agentName: 'David',
  agentTitle: 'Check with David.',
  headerBrand: 'M.A.M',
  headerSubtitle: 'Smart digital offices',
  smartWorkerConfig: DEFAULT_SMART_WORKER_CONFIG,
  tabs: [
    {
      id: 'tab-1',
      title: 'DATABASE',
      subtitle: 'Direct DB Server Mode (Fast No-Gemini)',
      modeType: 'database',
      mediaType: 'image',
      mediaUrl: '/edoffice/ed.webp',
      tools: ['analytics', 'data_processor', 'conversion_tracker'],
      permissions: ['read', 'write'],
      loopMedia: true,
      mutedMedia: true,
      systemPrompt: 'Direct Database Server Analytics Mode. Fast factual data extraction without Gemini AI.'
    },
    {
      id: 'tab-2',
      title: 'GEMINI',
      subtitle: 'Gemini AI Intelligent Analytics & Strategy',
      modeType: 'gemini',
      mediaType: 'image',
      mediaUrl: '/edoffice/ed.webp',
      tools: ['lead_gen', 'crm_sync', 'auto_responder'],
      permissions: ['read', 'execute'],
      loopMedia: true,
      mutedMedia: true,
      systemPrompt: 'Gemini AI Strategy Mode. Deep context-cached AI analytics and reasoning.'
    }
  ],
  ownerId: 'admin',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
