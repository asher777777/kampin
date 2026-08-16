export interface SmartGoals {
  s: string; // Specific
  m: string; // Measurable (KPIs)
  a: string; // Achievable
  r: string; // Relevant
  t: string; // Time-bound
}

export interface ProjectCharter {
  lockedBudget: number;
  durationDays: number;
  signedBy: string | null;
  signedAt: string | null;
}

export interface RaciMatrix {
  r: string; // Responsible (e.g. "דרוש מעצב" or dynamic user names)
  a: string; // Accountable (e.g. Project Manager)
  c: string; // Consulted
  i: string; // Informed
}

export interface WbsTask {
  id: string;
  parentId: string | null;
  title: string;
  durationDays: number;
  cost: number;
  dependencies: string[];
  raci: RaciMatrix;
}

export interface ValidatorResult {
  estimatedCostMin: number;
  estimatedCostMax: number;
  estimatedDurationDays: number;
  risks: string[];
  demandValidation: string; // Needs Validation results summary
}

export interface ProjectData {
  id?: string;
  name: string;
  type: "new" | "recurring";
  status: "draft" | "active";
  smartGoals: SmartGoals;
  charter: ProjectCharter;
  tasks: WbsTask[];
  createdAt?: string;
  updatedAt?: string;
  userId: string;
  baseline?: ProjectBaseline;
  roles?: RoleRequirement[];
  changeRequests?: ChangeRequest[];
  warRoomMessages?: WarRoomMessage[];
  metrics?: {
    budget: number;
    hours: number;
    deadlineDays: number;
  };
}

export interface RiskItem {
  id: string;
  risk: string;
  probability: "Low" | "Medium" | "High";
  impact: "Low" | "Medium" | "High";
  mitigation: string;
  approved: boolean;
}

export interface ProjectBaseline {
  inScope: string[];
  outScope: string[];
  milestones: { taskId: string; financialFlag?: string; contractualFlag?: string }[];
  risks: RiskItem[];
  lockedAt?: string;
}

export interface RoleRequirement {
  id: string;
  taskId: string;
  roleTitle: string;
  requirements: string;
  budget: number;
  presenceMilestoneId?: string; // milestone presence required
  assignedContactId?: string;
  assignedContactName?: string;
  status: "draft" | "invited" | "signed" | "active";
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  budgetImpact: number;
  scheduleImpactDays: number;
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string[];
}

export interface WarRoomMessage {
  id: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
  channel: string;
}
