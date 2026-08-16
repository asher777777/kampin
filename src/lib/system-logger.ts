import { adminDb } from "./firebase-admin";

export type LogLevel = "info" | "warn" | "error" | "success";
export type LogModule = "calendar" | "automation" | "auth" | "crm" | "general" | "whatsapp" | "email";

export interface SystemLog {
  id?: string;
  level: LogLevel;
  module: LogModule;
  action: string;
  description: string;
  ownerId?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export async function logSystemEvent(log: SystemLog) {
  try {
    const logData = {
      ...log,
      timestamp: log.timestamp || new Date().toISOString(),
    };
    
    await adminDb.collection("system_logs").add(logData);
    
    if (log.level === "error") {
      console.error(`[${log.module}] ${log.action}: ${log.description}`, log.metadata);
    } else {
      console.log(`[${log.module}] ${log.action}: ${log.description}`);
    }
  } catch (error) {
    console.error("Failed to write to system_logs", error);
  }
}

export async function getSystemLogs(options?: { ownerId?: string; module?: LogModule; limit?: number }) {
  try {
    let query: FirebaseFirestore.Query = adminDb.collection("system_logs");
    
    if (options?.ownerId) {
      query = query.where("ownerId", "==", options.ownerId);
    }
    
    if (options?.module) {
      query = query.where("module", "==", options.module);
    }
    
    query = query.orderBy("timestamp", "desc");
    
    if (options?.limit) {
      query = query.limit(options.limit);
    } else {
      query = query.limit(100);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Failed to get system logs", error);
    return [];
  }
}
