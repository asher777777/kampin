export interface Campaign {
  id: string;
  title: string;
  subtitle?: string;
  targetGoal: number;
  totalRaised: number;
  donorCount: number;
  currency?: string;
  endDate?: string;
  svgTrendPreset?: "curve_up" | "timeline" | "percentage_gauge" | "custom";
  customSvgPath?: string;
  bannerImage?: string;
  description?: string;
  createdAt?: any;
  ownerId?: string;
}

export interface Ambassador {
  id: string;
  campaignId: string;
  name: string;
  slug: string;
  targetGoal: number;
  totalRaised: number;
  donorCount: number;
  message?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  createdAt: any;
}

export interface Donation {
  id: string;
  campaignId: string;
  ambassadorId?: string | null;
  ambassadorName?: string | null;
  donorName: string;
  amount: number;
  monthlyAmount?: number;
  recurringMonths?: number;
  isRecurring?: boolean;
  dedication?: string;
  isAnonymous?: boolean;
  paymentStatus: "completed" | "pending" | "failed";
  paymentMethod?: string;
  createdAt: any;
}

export interface DonationTier {
  id: string;
  title: string;
  monthlyAmount: number;
  subtitle?: string;
  imageSrc?: string;
  imageShape?: "circle" | "square" | "rounded";
  isDefault?: boolean;
}

export interface CampaignHeaderConfig {
  visible: boolean;
  campaignId?: string;
  title?: string;
  subtitle?: string;
  targetGoal?: number;
  totalRaised?: number;
  currency?: string;
  svgTrendPreset?: "curve_up" | "timeline" | "percentage_gauge" | "custom";
  customSvgPath?: string;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  anchorId?: string;
}

export interface CampaignDonorsConfig {
  visible: boolean;
  campaignId?: string;
  title?: string;
  showSearch?: boolean;
  showSort?: boolean;
  defaultTab?: "donors" | "teams" | "about";
  cardLayout?: "grid-2" | "grid-3" | "list" | "compact";
  cardBgColor?: string;
  cardTextColor?: string;
  cardBorderColor?: string;
  cardBadgeBgColor?: string;
  cardStyle?: "shadow" | "bordered" | "flat" | "glassmorphism";
  donationType?: "one_time" | "recurring" | "both";
  recurringMonths?: number;
  tiers?: DonationTier[];
  allowCustomAmount?: boolean;
  primaryColor?: string;
  backgroundColor?: string;
  anchorId?: string;
}
