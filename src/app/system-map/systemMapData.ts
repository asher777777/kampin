import React from 'react';

export interface RouteItem {
  id: string;
  path: string;
  category: 'public' | 'dashboard' | 'admin' | 'office' | 'builder';
  title: string;
  description: string;
  components: string[];
  functions: string[];
  file: string;
  isDynamic?: boolean;
}

export interface ApiItem {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'ALL';
  category: 'kesher' | 'ai' | 'whatsapp' | 'admin' | 'system';
  title: string;
  description: string;
  services: string[];
  file: string;
}

export interface FeatureModule {
  id: string;
  name: string;
  icon: string;
  description: string;
  folder: string;
  actionsFile: string;
  functions: {
    name: string;
    signature: string;
    description: string;
  }[];
  components: string[];
}

export interface CoreLibItem {
  name: string;
  path: string;
  description: string;
  exports: string[];
  functions: string[];
}

export interface MetricStats {
  totalFiles: number;
  totalAppRoutes: number;
  totalApiRoutes: number;
  totalFeatures: number;
  totalFunctions: number;
  totalComponents: number;
}

export const SYSTEM_METRICS: MetricStats = {
  totalFiles: 426,
  totalAppRoutes: 38,
  totalApiRoutes: 21,
  totalFeatures: 12,
  totalFunctions: 180,
  totalComponents: 78,
};

export const APP_ROUTES: RouteItem[] = [
  {
    id: 'root',
    path: '/',
    category: 'public',
    title: 'עמוד הבית הראשי / מיני-סייט',
    description: 'העמוד הראשי של המערכת המציג את תבנית המיני-סייט, אזור Hero, שירותים, קהילה וטפסי יצירת קשר.',
    components: ['HomeClient', 'HomeEditor', 'Navbar', 'Footer', 'WhatsAppButton', 'Hero', 'ServicesGrid', 'CommunitySection'],
    functions: ['Home', 'generateMetadata', 'handleSave', 'handleColorChange'],
    file: 'src/app/page.tsx'
  },
  {
    id: 'dynamic-landing',
    path: '/[id]',
    category: 'public',
    title: 'עמוד נחיתה דינמי של לקוח',
    description: 'מציג דף נחיתה או מיני-סייט מותאם אישית שנבנה במערכת לפי מזהה ייחודי (ID).',
    components: ['HomeClient', 'HomeEditor', 'Navbar', 'Footer'],
    functions: ['LandingPage', 'generateMetadata'],
    file: 'src/app/[id]/page.tsx',
    isDynamic: true
  },
  {
    id: 'post-page',
    path: '/post/[slug]',
    category: 'public',
    title: 'דף פוסט / מאמר תוכן מפורט',
    description: 'מציג מאמר או פוסט בלוג מלא עם תוכן עשיר, תגיות, תמונות וכפתורי שיתוף.',
    components: ['HomeClient', 'PostContent', 'ShareBar'],
    functions: ['PostPage', 'generateMetadata'],
    file: 'src/app/post/[slug]/page.tsx',
    isDynamic: true
  },
  {
    id: 'service-page',
    path: '/service/[slug]',
    category: 'public',
    title: 'דף שירות או מוצר מפורט',
    description: 'עמוד ייעודי לשירות עסקי הכולל מפרט מחיר, פירוט יתרונות וכפתור מעבר לקופה (Checkout).',
    components: ['HomeClient', 'ServiceDetails', 'CheckoutCTA'],
    functions: ['ServicePage', 'generateMetadata'],
    file: 'src/app/service/[slug]/page.tsx',
    isDynamic: true
  },
  {
    id: 'checkout',
    path: '/checkout',
    category: 'public',
    title: 'עמוד קופה ותשלום אונליין',
    description: 'עמוד סליקה מאובטח הפועל ישירות מול מערכת קשר עם אפשרויות כרטיס אשראי והעברה בנקאית.',
    components: ['CheckoutContent', 'KesherPaymentFrame', 'OrderSummary'],
    functions: ['CheckoutPage', 'handlePayment', 'verifyTransaction'],
    file: 'src/app/checkout/page.tsx'
  },
  {
    id: 'checkout-success',
    path: '/checkout/success',
    category: 'public',
    title: 'עמוד אישור עסקה וקבלה',
    description: 'מציג הודעת הצלחה, סיכום פרטי רכישה והפניה לקבלה חשבונאית שהופקה.',
    components: ['SuccessContent', 'ReceiptDownloadButton'],
    functions: ['CheckoutSuccessPage'],
    file: 'src/app/checkout/success/page.tsx'
  },
  {
    id: 'builder',
    path: '/builder',
    category: 'builder',
    title: 'בונה אתרים מונחה צ\'אט AI',
    description: 'אשף אינטראקטיבי המנחה את המשתמש באמצעות בינה מלאכותית לבניית אתר, לוגו, שירותים ובידול עסקי.',
    components: ['LiveBuilderShell', 'LiveBuilderPreview', 'CoinBalanceBadge', 'TypewriterText'],
    functions: ['BuilderPage', 'handlePitchProblemSubmit', 'handleVisionSubmit', 'handleGenerateSingleLogo'],
    file: 'src/app/builder/page.tsx'
  },
  {
    id: 'onboarding',
    path: '/onboarding',
    category: 'builder',
    title: 'אשף קליטה והגדרת פרופיל (Onboarding)',
    description: 'תהליך קליטה הדרגתי צעד-אחר-צעד (1 שאלה לכל שלב) לפי חוקי העיצוב של Golden Flute.',
    components: ['OnboardingWizard', 'StepRenderer', 'GoldFolderAction'],
    functions: ['OnboardingPage', 'handleStepNext', 'saveProfileStep'],
    file: 'src/app/onboarding/page.tsx'
  },
  {
    id: 'dotty',
    path: '/dotty',
    category: 'office',
    title: 'מרחב שיחה עם הסוכנת Dotty',
    description: 'סוכנת AI חכמה המלווה את המשתמש בבניית תהליכים, ניהול משימות והפקת תובנות.',
    components: ['DottyChatComponent', 'ChatStreamBubble', 'SuggestedPrompts'],
    functions: ['DottyPage', 'sendMessage', 'handlePromptClick'],
    file: 'src/app/dotty/page.tsx'
  },
  {
    id: 'edoffice',
    path: '/EDOFFICE',
    category: 'office',
    title: 'חדר היועץ השיווקי Ed',
    description: 'סוכן שיווק AI אישי עם סרטון מומחה אינטראקטיבי ומענה אסטרטגי לצמיחה עסקית.',
    components: ['EdOfficeComponent', 'VideoPlayerAdvisor', 'InteractionsLog'],
    functions: ['EdOfficePage', 'askMarketingAdvisor'],
    file: 'src/app/EDOFFICE/page.tsx'
  },
  {
    id: 'office-slug',
    path: '/office/[slug]',
    category: 'office',
    title: 'משרד עובדים דיגיטליים דינמי',
    description: 'מתחם משרדי של עסק המציג את כלל הסוכנים והעובדים החכמים הזמינים לעבודה.',
    components: ['OfficeView', 'AgentCardList', 'DepartmentFilter'],
    functions: ['OfficePage', 'generateMetadata'],
    file: 'src/app/office/[slug]/page.tsx',
    isDynamic: true
  },
  {
    id: 'office-agent',
    path: '/office/[slug]/agent/[agentSlug]',
    category: 'office',
    title: 'עמוד סוכן AI מומחה ספציפי',
    description: 'תקשורת ישירה עם סוכן בעל התמחות מקצועית (קופירייטר, מעצב, מנהל קמפיינים).',
    components: ['AgentChatShell', 'AgentProfileBadge', 'TaskDispatcher'],
    functions: ['AgentPage'],
    file: 'src/app/office/[slug]/agent/[agentSlug]/page.tsx',
    isDynamic: true
  },
  {
    id: 'office-smart-worker',
    path: '/office/[slug]/smart-worker/[employeeSlug]',
    category: 'office',
    title: 'עמוד עובד דיגיטלי חכם',
    description: 'ממשק הפעלת עובד חכם אוטונומי לביצוע משימות ארגוניות ועיבוד נתונים.',
    components: ['SmartWorkerShell', 'TaskQueueTable', 'ActionResultsView'],
    functions: ['EmployeePage'],
    file: 'src/app/office/[slug]/smart-worker/[employeeSlug]/page.tsx',
    isDynamic: true
  },
  {
    id: 'dashboard-home',
    path: '/dashboard',
    category: 'dashboard',
    title: 'דשבורד משתמש ראשי',
    description: 'מרכז הפיקוד של המשתמש: מפת מיתוג, שלבי התקדמות, עריכת שירותים ורשתות חברתיות.',
    components: ['DashboardShell', 'DashboardClient', 'BrandingTab', 'ServicesTab', 'SocialNetworksTab', 'ContactDetailsTab'],
    functions: ['DashboardPage', 'handleSaveBranding', 'handleTabChange'],
    file: 'src/app/dashboard/page.tsx'
  },
  {
    id: 'dashboard-crm',
    path: '/dashboard/crm',
    category: 'dashboard',
    title: 'ניהול קהילה ו-CRM מתקדם',
    description: 'טבלת לידים ואנשי קשר, סינונים מתקדמים, ייבוא/ייצוא CSV, ציר זמן מלא ומודאל איש קשר.',
    components: ['CRMDashboardPage', 'ContactModal', 'ImportExportModal', 'MessageModal', 'TimelineView'],
    functions: ['CRMDashboardPage', 'handleEditContact', 'handleBulkDelete', 'handleFilterStatus'],
    file: 'src/app/dashboard/crm/page.tsx'
  },
  {
    id: 'dashboard-whatsapp',
    path: '/dashboard/whatsapp',
    category: 'dashboard',
    title: 'מרכז שליטה בוואטסאפ (GreenAPI)',
    description: 'חיבור מספר טלפון ב-QR, שליחת הודעות ישירות, דיוור קמפיינים המוני ומעקב מסירות.',
    components: ['WhatsAppDashboard', 'ConnectionTab', 'GroupSendTab', 'HistoryTab'],
    functions: ['WhatsAppDashboardPage', 'handleConnect', 'handleSendCampaign', 'handleRetractMessage'],
    file: 'src/app/dashboard/whatsapp/page.tsx'
  },
  {
    id: 'dashboard-receipts',
    path: '/dashboard/receipts',
    category: 'dashboard',
    title: 'הפקת קבלות ידניות בקשר',
    description: 'טופס הפקת קבלה חשבונאית מיידית ללקוח עם סנכרון ישיר למערכת קשר.',
    components: ['KesherManualReceiptsForm', 'ReceiptTypeSelector', 'CustomerAutoComplete'],
    functions: ['ReceiptsPage', 'handleSubmitReceipt', 'handleSendWhatsAppReceipt'],
    file: 'src/app/dashboard/receipts/page.tsx'
  },
  {
    id: 'dashboard-services',
    path: '/dashboard/services',
    category: 'dashboard',
    title: 'ניהול מוצרים ושירותים',
    description: 'רשימת השירותים של העסק, עריכת תיאורים, קביעת מחירים ומחולל תוכן אוטומטי ב-AI.',
    components: ['ServicesDashboardClient', 'ServiceForm', 'ServiceListClient', 'AIServiceGeneratorModal'],
    functions: ['ServicesDashboardPage', 'handleSaveService', 'handleDeleteService', 'generateServiceWithAI'],
    file: 'src/app/dashboard/services/page.tsx'
  },
  {
    id: 'dashboard-expenses',
    path: '/dashboard/expenses',
    category: 'dashboard',
    title: 'מעקב וניהול הוצאות עסק',
    description: 'הזנת הוצאות שוטפות, העלאת קבלות וחשבוניות, וסיכומים תקופתיים לרואה חשבון.',
    components: ['ExpenseForm', 'ExpensesList', 'ExpenseCategoryBadge', 'MonthlySummaryCard'],
    functions: ['ExpensesPage', 'handleAddExpense', 'handleDeleteExpense'],
    file: 'src/app/dashboard/expenses/page.tsx'
  },
  {
    id: 'dashboard-incomes',
    path: '/dashboard/incomes',
    category: 'dashboard',
    title: 'מעקב הכנסות ותזרים',
    description: 'טבלאות מעקב הכנסות מכלל מקורות התשלום, תרשימי הכנסה חודשיים ודוחות תקופתיים.',
    components: ['IncomesDashboardClient', 'IncomeBreakdownChart', 'IncomesTable'],
    functions: ['IncomesDashboardPage', 'handleFilterPeriod'],
    file: 'src/app/dashboard/incomes/page.tsx'
  },
  {
    id: 'dashboard-automations',
    path: '/dashboard/automations',
    category: 'dashboard',
    title: 'קנבס אוטומציות מונחה AI',
    description: 'בניית תהליכים אוטומטיים: שליחת וואטסאפ בליד חדש, הפקת קבלה ברכישה, תזכורות יומן.',
    components: ['GenericCanvas', 'AutomationNodeList', 'TriggerSelector', 'ActionStepModal'],
    functions: ['AutomationsPage', 'handleSaveAutomation', 'handleTestRun'],
    file: 'src/app/dashboard/automations/page.tsx'
  },
  {
    id: 'dashboard-campaigns',
    path: '/dashboard/campaigns',
    category: 'dashboard',
    title: 'ניהול קמפיינים שיווקיים',
    description: 'תכנון ושיגור קמפיינים רב-ערוציים (וואטסאפ, SMS, אימייל) עם פילוח קהלי יעד.',
    components: ['GenericCanvas', 'CampaignEditor', 'AudienceSegmentSelector'],
    functions: ['CampaignsPage', 'handleLaunchCampaign'],
    file: 'src/app/dashboard/campaigns/page.tsx'
  },
  {
    id: 'dashboard-calendar',
    path: '/dashboard/calendar',
    category: 'dashboard',
    title: 'יומן פגישות ואירועים מסונכרן',
    description: 'תצוגת יומן חודשית ושבועית עם סנכרון דו-כיווני לחשבון Google Calendar של המשתמש.',
    components: ['CalendarView', 'EventModal', 'GoogleAuthSyncButton'],
    functions: ['CalendarPage', 'handleCreateEvent', 'handleDeleteEvent'],
    file: 'src/app/dashboard/calendar/page.tsx'
  },
  {
    id: 'dashboard-settings',
    path: '/dashboard/settings',
    category: 'dashboard',
    title: 'הגדרות פרופיל וחיבורי API',
    description: 'הגדרת פרטי העסק, הזנת מפתחות קשר (Terminal/Password), פרטי GreenAPI וחשבון Google.',
    components: ['SettingsTabs', 'UserProfileSettingsForm', 'KesherSettingsForm', 'GoogleSettingsCard', 'WhatsAppSettingsForm', 'AiSettingsForm'],
    functions: ['SettingsPage', 'handleSaveSettings', 'handleTestConnection'],
    file: 'src/app/dashboard/settings/page.tsx'
  },
  {
    id: 'dashboard-mosaic',
    path: '/dashboard/mosaic',
    category: 'dashboard',
    title: 'תפריט פסיפס מהיר (Mosaic Grid)',
    description: 'ממשק ניווט ויזואלי מהיר המציג כרטיסים אינטראקטיביים לכל כלי המערכת.',
    components: ['MosaicGrid', 'MosaicCard'],
    functions: ['MosaicDashboardPage'],
    file: 'src/app/dashboard/mosaic/page.tsx'
  },
  {
    id: 'dashboard-welcome',
    path: '/dashboard/welcome',
    category: 'dashboard',
    title: 'אשף הדרכה והיכרות (Welcome Wizard)',
    description: 'הדרכה ראשונית המנחה את המשתמש בהגדרת המיני-סייט והחיבורים השונים.',
    components: ['WelcomeDashboardClient', 'OnboardingWizard'],
    functions: ['WelcomeOnboardingPage'],
    file: 'src/app/dashboard/welcome/page.tsx'
  },
  {
    id: 'admin-home',
    path: '/admin',
    category: 'admin',
    title: 'לוח בקרה ראשי למנהל מערכת',
    description: 'סקירה גלובלית על כלל המשתמשים, תנועות כספיות, עומסי מערכת ושימוש ב-AI.',
    components: ['AdminLayout', 'AdminDashboard', 'SystemStatsCards', 'RecentUsersWidget'],
    functions: ['AdminDashboard', 'handleRefreshStats'],
    file: 'src/app/admin/page.tsx'
  },
  {
    id: 'admin-users',
    path: '/admin/users',
    category: 'admin',
    title: 'ניהול משתמשים והתחזות (Impersonate)',
    description: 'צפייה בכל המשתמשים, עריכת הרשאות (Admin/User), איפוס סיסמאות והתחזות לתמיכה.',
    components: ['UsersTable', 'UserEditModal', 'ImpersonateButton', 'CreateUserModal'],
    functions: ['UsersPage', 'handleEdit', 'handleNew', 'handleDelete', 'impersonateUser'],
    file: 'src/app/admin/users/page.tsx'
  },
  {
    id: 'admin-form-builder',
    path: '/admin/form-builder',
    category: 'admin',
    title: 'מחולל טפסים חכם מבוסס AI',
    description: 'בונה טפסי לידים וטפסי רישום חכמים עם יצירת שדות אוטומטית על בסיס Prompt ב-Gemini.',
    components: ['AdminFormBuilderClient', 'CRMFormBuilder', 'CRMFormRenderer', 'FieldDragDropList'],
    functions: ['AdminFormBuilderPage', 'handleGenerateFormWithAI', 'handleSaveFormSchema'],
    file: 'src/app/admin/form-builder/page.tsx'
  },
  {
    id: 'admin-receipts',
    path: '/admin/receipts',
    category: 'admin',
    title: 'ניהול קבלות גלובלי של קשר',
    description: 'מעקב וניהול כלל הקבלות שהופקו במערכת מול מסוף קשר הראשי.',
    components: ['KesherManualReceiptsForm', 'GlobalReceiptsLogTable'],
    functions: ['AdminReceiptsPage'],
    file: 'src/app/admin/receipts/page.tsx'
  },
  {
    id: 'admin-content',
    path: '/admin/content',
    category: 'admin',
    title: 'ניהול תוכן אתר ראשי',
    description: 'עריכת תוכן דפי המערכת הגלובליים, שירותים מומלצים ומאמרי הדרכה.',
    components: ['ServicesDashboardClient', 'ContentEditorModal'],
    functions: ['AdminContentPage'],
    file: 'src/app/admin/content/page.tsx'
  },
  {
    id: 'admin-settings',
    path: '/admin/settings',
    category: 'admin',
    title: 'הגדרות מערכת גלובליות',
    description: 'הגדרת מפתחות מאסטר (Firebase Admin, Gemini API Master Key, Kesher Master ID).',
    components: ['AdminSettingsClient', 'MasterKeyManager'],
    functions: ['AdminSettingsPage', 'handleSaveMasterSettings'],
    file: 'src/app/admin/settings/page.tsx'
  }
];

export const API_ROUTES: ApiItem[] = [
  {
    id: 'api-kesher-token',
    endpoint: '/api/kesher/get-token',
    method: 'POST',
    category: 'kesher',
    title: 'הפקת טוקן לתשלום (GetLinkToken)',
    description: 'מייצר טוקן תשלום זמני ומאובטח מול Kesher API עבור עמוד הסליקה (Checkout).',
    services: ['Kesher Payment API', 'Firestore Transaction Cache'],
    file: 'src/app/api/kesher/get-token/route.ts'
  },
  {
    id: 'api-kesher-send',
    endpoint: '/api/kesher/send-transaction',
    method: 'POST',
    category: 'kesher',
    title: 'הפקת קבלה ועסקה (SendTransaction)',
    description: 'שולח עסקת תשלום ומפיק מסמך קבלה חשבונאי רשמי במערכת קשר.',
    services: ['Kesher Payment API', 'Firestore Receipts Collection'],
    file: 'src/app/api/kesher/send-transaction/route.ts'
  },
  {
    id: 'api-kesher-webhook',
    endpoint: '/api/kesher-webhook',
    method: 'GET',
    category: 'kesher',
    title: 'קליטת אישורי תשלום מקשר (Webhook)',
    description: 'נקודת האזנה שמקבלת חיוויי תשלום מוצלחים מקשר ומעדכנת את סטטוס ההזמנה.',
    services: ['Kesher Webhook', 'Firestore Order Status'],
    file: 'src/app/api/kesher-webhook/route.ts'
  },
  {
    id: 'api-debug-kesher',
    endpoint: '/api/debug-kesher',
    method: 'GET',
    category: 'kesher',
    title: 'בדיקת תקינות וחיבורי קשר',
    description: 'בודק את תקינות המפתחות, המסופים והלוגים האחרונים של אינטגרציית קשר.',
    services: ['Kesher Diagnostic Tool'],
    file: 'src/app/api/debug-kesher/route.ts'
  },
  {
    id: 'api-ai-form-builder',
    endpoint: '/api/ai/form-builder',
    method: 'POST',
    category: 'ai',
    title: 'מחולל שדות טופס ב-AI',
    description: 'מקבל תיאור מילולי של עסק או צורך ומייצר אוטומטית מערך שדות טופס מותאם ב-JSON.',
    services: ['Google Gemini API', 'Form Schema Builder'],
    file: 'src/app/api/ai/form-builder/route.ts'
  },
  {
    id: 'api-dotty-chat',
    endpoint: '/api/dotty-chat',
    method: 'ALL',
    category: 'ai',
    title: 'מנוע שיחה של הסוכנת Dotty',
    description: 'מנהל שיחות צ\'אט שוטפות ומחזיר מענה אינטליגנטי מבוסס פרומפטים מותאמים.',
    services: ['Google Gemini 2.0 Flash', 'Chat Session Memory'],
    file: 'src/app/api/dotty-chat/route.ts'
  },
  {
    id: 'api-ed-chat',
    endpoint: '/api/ed-chat',
    method: 'POST',
    category: 'ai',
    title: 'מנוע שיחה של היועץ השיווקי Ed',
    description: 'מספק ייעוץ שיווקי מתקדם וניתוח עסקי בהתבסס על פרופיל החברה ומסעות לקוח.',
    services: ['Gemini Interactions API', 'Marketing Advisor Knowledge'],
    file: 'src/app/api/ed-chat/route.ts'
  },
  {
    id: 'api-checkout',
    endpoint: '/api/checkout',
    method: 'POST',
    category: 'kesher',
    title: 'עיבוד עסקת רכישה וליד',
    description: 'קולט נתוני לקוח, יוצר איש קשר ב-CRM, ומפעיל את תהליך הסליקה בקשר.',
    services: ['Multi-Tenant CRM', 'Kesher API'],
    file: 'src/app/api/checkout/route.ts'
  },
  {
    id: 'api-upload-url',
    endpoint: '/api/upload-url',
    method: 'POST',
    category: 'system',
    title: 'הפקת קישור מאובטח להעלאת קבצים',
    description: 'מייצר Signed Upload URL להעלאת תמונות, לוגואים וקבלות ל-Firebase Storage.',
    services: ['Firebase Storage Admin'],
    file: 'src/app/api/upload-url/route.ts'
  },
  {
    id: 'api-cron',
    endpoint: '/api/cron',
    method: 'GET',
    category: 'system',
    title: 'מתזמן משימות ואוטומציות ברקע',
    description: 'מופעל במרווחי זמן קבועים לביצוע אוטומציות מושהות, עדכון סטטוסי וואטסאפ ובדיקות שבת.',
    services: ['Cron Task Runner', 'Automation Engine'],
    file: 'src/app/api/cron/route.ts'
  },
  {
    id: 'api-track-email',
    endpoint: '/api/track-email',
    method: 'GET',
    category: 'whatsapp',
    title: 'מעקב פתיחת אימיילים (Pixel)',
    description: 'מחזיר תמונת פיקסל שקופה ורושם אירוע פתיחה של קמפיין אימייל.',
    services: ['Firestore Email Campaign Stats'],
    file: 'src/app/api/track-email/route.ts'
  },
  {
    id: 'api-webhooks',
    endpoint: '/api/webhooks/[webhookId]',
    method: 'ALL',
    category: 'system',
    title: 'קולט Webhooks חיצוניים',
    description: 'מקבל נתונים ממערכות צד-שלישי (טפסים חיצוניים, GreenAPI Webhooks) ומזין לאוטומציות.',
    services: ['Multi-Tenant Event Receiver'],
    file: 'src/app/api/webhooks/[webhookId]/route.ts'
  },
  {
    id: 'api-employee',
    endpoint: '/api/employee',
    method: 'GET',
    category: 'ai',
    title: 'מידע והגדרות עובדים דיגיטליים',
    description: 'שולף נתוני הגדרה, משימות והרשאות של סוכני AI פעילים במשרד.',
    services: ['Multi-Tenant Office DB'],
    file: 'src/app/api/employee/route.ts'
  },
  {
    id: 'api-admin-migrate-crm',
    endpoint: '/api/admin/migrate-crm',
    method: 'GET',
    category: 'admin',
    title: 'מיגרציית מבנה CRM ל-Multi-Tenant',
    description: 'ממיר אנשי קשר ולידים מהמבנה הישן למבנה היררכי רב-דיירי ב-Firestore.',
    services: ['Firebase Admin SDK Migration'],
    file: 'src/app/api/admin/migrate-crm/route.ts'
  },
  {
    id: 'api-admin-cleanup',
    endpoint: '/api/admin/cleanup',
    method: 'GET',
    category: 'admin',
    title: 'ניקוי נתונים יתומים',
    description: 'מוחק רשומות בדיקה, קבצים ללא שיוך ומשתמשי טסט.',
    services: ['Firestore DB Cleaner'],
    file: 'src/app/api/admin/cleanup/route.ts'
  },
  {
    id: 'api-admin-clear-cache',
    endpoint: '/api/admin/clear-cache',
    method: 'GET',
    category: 'admin',
    title: 'איפוס מטמון מערכת',
    description: 'מנקה מטמוני זיכרון ונתונים זמניים לשמירה על ביצועים גבוהים.',
    services: ['Cache Flush'],
    file: 'src/app/api/admin/clear-cache/route.ts'
  }
];

export const FEATURE_MODULES: FeatureModule[] = [
  {
    id: 'crm',
    name: 'CRM & ניהול קהילה',
    icon: 'Users',
    description: 'מערכת ניהול אנשי קשר ולידים רב-דיירית הכוללת סינון מתקדם, ייבוא/ייצוא CSV, ותיעוד ציר זמן מלא.',
    folder: 'src/features/crm',
    actionsFile: 'src/features/crm/actions.ts',
    functions: [
      { name: 'getContacts', signature: '(userId: string, filters: ContactFilters)', description: 'שליפת אנשי קשר עם תמיכה בחיפוש, תגיות, סטטוס ועימוד' },
      { name: 'createContact', signature: '(userId: string, data: ContactInput)', description: 'יצירת איש קשר חדש עם אימות נתונים ונרמול מספרי טלפון' },
      { name: 'updateContact', signature: '(userId: string, contactId: string, data: Partial<ContactInput>)', description: 'עדכון פרטי לקוח ושמירת היסטוריה' },
      { name: 'deleteContact', signature: '(userId: string, contactId: string)', description: 'מחיקת איש קשר ומחיקת ציר הזמן המשויך אליו' },
      { name: 'bulkDeleteContacts', signature: '(userId: string, contactIds: string[])', description: 'מחיקה מרוכזת של רשימת אנשי קשר בבת אחת' },
      { name: 'getTimeline', signature: '(userId: string, contactId: string)', description: 'שליפת היסטוריית פעולות, שיחות וואטסאפ, קבלות ורכישות' },
      { name: 'addTimelineEvent', signature: '(userId: string, contactId: string, event: TimelineEventInput)', description: 'הוספת אירוע חדש לציר הזמן (הערה, שיחה, תשלום)' },
      { name: 'bulkUpdateTags', signature: '(userId: string, contactIds: string[], addTags: string[], removeTags: string[])', description: 'הוספה והסרה קבוצתית של תגיות' },
      { name: 'importContactsFromCSV', signature: '(userId: string, contacts: any[])', description: 'ייבוא המוני של אנשי קשר מקובץ CSV/Excel' }
    ],
    components: ['ContactModal.tsx', 'ImportExportModal.tsx', 'MessageModal.tsx', 'TimelineTab.tsx', 'ContactsTable.tsx']
  },
  {
    id: 'mini-site-builder',
    name: 'בונה אתרים מונחה AI',
    icon: 'Sparkles',
    description: 'מנוע לבניית מיני-סייטים אינטראקטיבי המשלב ניתוח שוק, זיהוי מתחרים, יצירת לוגו ומערכת מטבעות קרדיט.',
    folder: 'src/features/mini-site-builder',
    actionsFile: 'src/features/mini-site-builder/actions/builderActions.ts',
    functions: [
      { name: 'analyzeProblemAndFindCompetitorsWithAI', signature: '(problemPitch: string)', description: 'ניתוח בעיית השוק, איתור 3 מתחרים וניסוח הצעת ערך' },
      { name: 'evaluateDifferentiatorAndGrantCoins', signature: '(differentiator: string)', description: 'הערכת איכות הבידול העסקי והענקת מטבעות קרדיט בונוס' },
      { name: 'generateSlugOptionsWithAI', signature: '(name: string, niche: string)', description: 'יצירת 4 הצעות לכתובות אינטרנט קליטות באנגלית ובעברית' },
      { name: 'generateRichVisionAndInsightsWithAI', signature: '(data: BuilderStateData)', description: 'ניסוח חזון עסקי מעמיק ותובנות שיווקיות' },
      { name: 'generateLogoWithAI', signature: '(prompt: string, style: string)', description: 'יצירת לוגו מקצועי באמצעות מנוע Imagen / Gemini' },
      { name: 'generateSingleLogoWithFeedback', signature: '(feedback: string, prevLogo: string)', description: 'עידון ודיוק לוגו לפי הערות המשתמש' },
      { name: 'createServicePageWithAI', signature: '(serviceDetails: any)', description: 'יצירת דף שירות שלם מותאם אישית' },
      { name: 'saveBuilderProgress', signature: '(userId: string, state: BuilderStateData)', description: 'שמירת התקדמות האשף ב-Firestore לשחזור עתידי' }
    ],
    components: ['LiveBuilderShell.tsx', 'LiveBuilderPreview.tsx', 'CoinBalanceBadge.tsx', 'TypewriterText.tsx']
  },
  {
    id: 'whatsapp',
    name: 'וואטסאפ GreenAPI',
    icon: 'MessageSquare',
    description: 'מרכז דיוור ושליחת הודעות וואטסאפ ישירות וקמפיינים המוניים דרך שרתי GreenAPI.',
    folder: 'src/features/whatsapp',
    actionsFile: 'src/features/whatsapp/actions.ts',
    functions: [
      { name: 'getWhatsAppConnection', signature: '(userId: string)', description: 'בדיקת סטטוס החיבור הנוכחי (authorized / notAuthorized)' },
      { name: 'getWhatsAppQR', signature: '(userId: string)', description: 'שליפת קוד QR עדכני לסריקה מהטלפון הנייד' },
      { name: 'logoutWhatsApp', signature: '(userId: string)', description: 'ניתוק המספר וסגירת החיבור הפעיל' },
      { name: 'sendWhatsAppMessage', signature: '(userId: string, toPhone: string, message: string)', description: 'שליחת הודעת טקסט אישית לאיש קשר' },
      { name: 'sendWhatsAppFile', signature: '(userId: string, toPhone: string, fileUrl: string, fileName: string, caption?: string)', description: 'שליחת תמונה, מסמך או קבלה בוואטסאפ' },
      { name: 'saveWhatsAppCampaign', signature: '(userId: string, campaign: WhatsAppCampaign)', description: 'שמירת קמפיין דיוור המוני ושיגורו למערך הנמענים' },
      { name: 'getWhatsAppCampaigns', signature: '(userId: string)', description: 'שליפת היסטוריית כל הקמפיינים שנשלחו ואחוזי המסירה' },
      { name: 'getWhatsAppMessageStatus', signature: '(messageId: string)', description: 'בדיקת סטטוס קריאה ומסירה (sent, delivered, read)' },
      { name: 'retractWhatsAppMessage', signature: '(messageId: string)', description: 'מחיקת הודעה שנשלחה לכולם (Revoke)' }
    ],
    components: ['ConnectionTab.tsx', 'GroupSendTab.tsx', 'HistoryTab.tsx', 'WhatsAppDashboard.tsx', 'WhatsAppSettingsForm.tsx']
  },
  {
    id: 'users',
    name: 'משתמשים, הרשאות והתחזות',
    icon: 'Shield',
    description: 'ניהול משתמשים מלא, חלוקת תפקידים (Admin / User), ופונקציית Impersonate למנהלים.',
    folder: 'src/features/users',
    actionsFile: 'src/features/users/actions.ts',
    functions: [
      { name: 'getUsers', signature: '()', description: 'שליפת כל המשתמשים הרשומים במערכת עם תפקידם' },
      { name: 'createUser', signature: '(data: UserDoc)', description: 'יצירת משתמש חדש והקצאת מסד נתונים מבודד' },
      { name: 'updateUser', signature: '(id: string, data: Partial<UserDoc>)', description: 'עדכון פרטי משתמש והרשאות' },
      { name: 'deleteUser', signature: '(id: string)', description: 'מחיקת משתמש מהמערכת' },
      { name: 'impersonateUser', signature: '(targetUserId: string)', description: 'התחברות לחשבון לקוח לצורכי תמיכה (Super Admin)' },
      { name: 'stopImpersonating', signature: '()', description: 'סיום התחזות וחזרה לחשבון המנהל' }
    ],
    components: ['UsersTable.tsx', 'AccountSettingsForm.tsx']
  },
  {
    id: 'services-posts',
    name: 'שירותים, פוסטים ותוכן',
    icon: 'FileText',
    description: 'ניהול עמודי תוכן, שירותי העסק, מאמרי בלוג ומחוללי תוכן חכמים ב-AI.',
    folder: 'src/features/services & posts',
    actionsFile: 'src/features/services/actions.ts',
    functions: [
      { name: 'getAllServices', signature: '(userId: string)', description: 'שליפת כל השירותים המוגדרים בעסק' },
      { name: 'saveServicePage', signature: '(userId: string, data: any)', description: 'שמירה או עדכון של דף שירות' },
      { name: 'deleteServicePage', signature: '(userId: string, id: string)', description: 'מחיקת דף שירות' },
      { name: 'generatePageWithAI', signature: '(topic: string, tone: string)', description: 'יצירת דף תוכן שלם באמצעות Gemini' },
      { name: 'generateHeroImageWithAI', signature: '(prompt: string)', description: 'יצירת תמונת Hero מעוצבת' },
      { name: 'generateMiniSiteWithAI', signature: '(businessInfo: any)', description: 'יצירת אתר שלם מהיסוד על פי פרטי עסק' },
      { name: 'getAllPosts', signature: '(userId: string)', description: 'שליפת כל המאמרים והפוסטים' },
      { name: 'savePost', signature: '(userId: string, post: any)', description: 'שמירת מאמר חדש' }
    ],
    components: ['ServiceForm.tsx', 'ServiceListClient.tsx', 'ServicesDashboardClient.tsx']
  },
  {
    id: 'finance',
    name: 'כספים, קבלות והוצאות',
    icon: 'CreditCard',
    description: 'הפקת קבלות קשר, מעקב הכנסות ותזרים, ותיעוד הוצאות שוטפות של העסק.',
    folder: 'src/features/expenses & incomes & receipts',
    actionsFile: 'src/features/expenses/actions.ts',
    functions: [
      { name: 'getExpenses', signature: '(userId: string, filters: any)', description: 'שליפת הוצאות העסק וסיכומי קטגוריות' },
      { name: 'addExpense', signature: '(userId: string, expense: any)', description: 'הזנת הוצאה חדשה וצילום קבלה' },
      { name: 'getIncomes', signature: '(userId: string, period: string)', description: 'שליפת נתוני הכנסות לפי חודש/שנה' }
    ],
    components: ['ExpenseForm.tsx', 'ExpensesList.tsx', 'KesherManualReceiptsForm.tsx']
  },
  {
    id: 'ai-agents-dotty',
    name: 'סוכני AI חכמים (Dotty)',
    icon: 'Bot',
    description: 'מנוע הסוכנים החכמים, כלי עריכה וניהול מודלים, ותפקוד אוטונומי של Dotty ואחרים.',
    folder: 'src/app/api/dotty-chat',
    actionsFile: 'src/app/api/dotty-chat/route.ts',
    functions: [
      { name: 'switch_agent_context', signature: '(agentIdOrName: string)', description: 'החלפת ההקשר של דותי לעריכת סוכן ספציפי (למשל: בטי)' },
      { name: 'edit_agent_profile', signature: '(agentId: string, name: string, role: string, prompt_instructions: string...)', description: 'עדכון תצורה והגדרות אופי של סוכן AI במסד הנתונים' },
      { name: 'add_agent_agreed_answer', signature: '(agentId: string, question: string, answer: string)', description: 'אימון הסוכן והוספת תשובה מוסכמת לשאלה מסוימת' },
      { name: 'get_agent_details', signature: '(agentIdOrName: string)', description: 'שליפת נתוני סוכן וצפייה בהגדרות הקיימות' },
      { name: 'list_system_agents', signature: '()', description: 'הצגת רשימת כל העובדים והסוכנים הקיימים במערכת' },
      { name: 'create_smart_employee', signature: '(name, role, prompt, voice, tools)', description: 'יצירת עובד וירטואלי חדש והגדרת יכולותיו' },
      { name: 'query_database', signature: '(collectionName: string)', description: 'שאילתת AI חכמה לקריאת נתונים ממסד הנתונים של החברה' }
    ],
    components: ['DottyChatClient.tsx', 'AgentChatShell.tsx']
  }
];

export const CORE_LIBS: CoreLibItem[] = [
  {
    name: 'firebase-admin.ts',
    path: 'src/lib/firebase-admin.ts',
    description: 'מנהל את שכבת ה-Multi-Tenancy של Firebase Admin ומייצר מסד נתונים מבודד לכל משתמש.',
    exports: ['getUserDb', 'adminDb', 'adminAuth'],
    functions: ['getUserDb', 'createMockDb', 'getDocObj', 'getColObj']
  },
  {
    name: 'firebase.ts',
    path: 'src/lib/firebase.ts',
    description: 'מאתחל את שירותי ה-Firebase בצד הלקוח (Auth, Firestore, Storage).',
    exports: ['auth', 'db', 'storage'],
    functions: ['getFirestore', 'getAuth', 'getStorage']
  },
  {
    name: 'automations/engine.ts',
    path: 'src/lib/automations/engine.ts',
    description: 'מנוע ביצוע אוטומציות מבוסס תבניות טקסט, שלבים וטריגרים.',
    exports: ['Trigger', 'ActionStep', 'Automation', 'parseTemplate', 'runAutomation'],
    functions: ['parseTemplate', 'executeStep', 'runAutomation']
  },
  {
    name: 'google-calendar.ts',
    path: 'src/lib/google-calendar.ts',
    description: 'שירות תקשורת מול Google Calendar API (יצירה, עדכון ומחיקת אירועים).',
    exports: ['GoogleCalendarService'],
    functions: ['createEvent', 'listEvents', 'deleteEvent', 'getAuthClient']
  },
  {
    name: 'system-logger.ts',
    path: 'src/lib/system-logger.ts',
    description: 'מודול רישום לוגים מערכתי (Audit Logs) למעקב תקלות ואירועי אבטחה.',
    exports: ['LogLevel', 'LogModule', 'SystemLog', 'logSystemEvent', 'getSystemLogs'],
    functions: ['logSystemEvent', 'getSystemLogs']
  },
  {
    name: 'utils.ts',
    path: 'src/lib/utils.ts',
    description: 'פונקציות עזר כלליות: איחוד Tailwind classes (cn) ונרמול טלפונים ישראליים.',
    exports: ['cn', 'normalizePhone'],
    functions: ['cn', 'normalizePhone']
  },
  {
    name: 'validations.ts',
    path: 'src/lib/validations.ts',
    description: 'סכמות אימות נתונים קפדניות מבוססות ספריית Zod.',
    exports: ['UserSchema', 'User'],
    functions: ['UserSchema.parse']
  },
  {
    name: 'useAuthStore.ts',
    path: 'src/store/useAuthStore.ts',
    description: 'חנות ניהול מצב גלובלי של משתמש מחובר ב-Zustand.',
    exports: ['useAuthStore'],
    functions: ['setUser', 'logout', 'setLoading']
  },
  {
    name: 'useUIStore.ts',
    path: 'src/store/useUIStore.ts',
    description: 'חנות ניהול מצב ממשק (Dark mode, מצב Sidebar, הודעות).',
    exports: ['useUIStore'],
    functions: ['toggleDarkMode', 'setSidebarOpen']
  }
];
