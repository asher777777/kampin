"use server";

import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { GoogleCalendarService } from "@/lib/google-calendar";
import { logSystemEvent } from "@/lib/system-logger";

export type UnifiedEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "google" | "task" | "meeting" | "reminder" | "interaction";
  description?: string;
  sourceId?: string; // Original ID from source
};

async function getAuthSession() {
  const session = await auth();
  return session;
}

export async function fetchUnifiedEvents(timeMin: string, timeMax: string): Promise<UnifiedEvent[]> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return [];
    
    const ownerId = session.user.id;
    
    const events: UnifiedEvent[] = [];
    
    // 1. Fetch from Google Calendar if connected
    const accessToken = (session as any).accessToken;
    const refreshToken = (session as any).refreshToken;
    
    if (accessToken) {
      try {
        const gcalService = new GoogleCalendarService(accessToken, refreshToken, ownerId);
        const gcalEvents = await gcalService.listEvents(timeMin, timeMax);
        
        for (const item of gcalEvents) {
          if (item.start?.dateTime || item.start?.date) {
            events.push({
              id: `gcal_${item.id}`,
              sourceId: item.id || undefined,
              title: item.summary || "ללא כותרת",
              start: item.start.dateTime || item.start.date || "",
              end: item.end?.dateTime || item.end?.date || item.start.dateTime || item.start.date || "",
              type: "google",
              description: item.description || undefined,
            });
          }
        }
      } catch (gcalError) {
        console.error("Error fetching Google Calendar events", gcalError);
        // Continue fetching other events
      }
    }
    
    // 2. Fetch Tasks from Firebase
    const tasksSnap = await adminDb.collection("tasks")
      .where("ownerId", "==", ownerId)
      .where("dueDate", ">=", timeMin)
      .where("dueDate", "<=", timeMax)
      .get();
      
    tasksSnap.forEach(doc => {
      const data = doc.data();
      events.push({
        id: `task_${doc.id}`,
        sourceId: doc.id,
        title: data.title,
        start: data.dueDate,
        end: data.dueDate, // Tasks usually have just a due date
        type: "task",
        description: data.description
      });
    });

    // 3. Fetch Meetings from Firebase
    const meetingsSnap = await adminDb.collection("meetings")
      .where("ownerId", "==", ownerId)
      .where("startTime", ">=", timeMin)
      .where("startTime", "<=", timeMax)
      .get();
      
    meetingsSnap.forEach(doc => {
      const data = doc.data();
      events.push({
        id: `meeting_${doc.id}`,
        sourceId: doc.id,
        title: data.title,
        start: data.startTime,
        end: data.endTime,
        type: "meeting",
        description: data.description
      });
    });

    // 4. Fetch interactions (from CRM events potentially, simplified here)
    const contactsSnap = await adminDb.collection("contacts")
      .where("ownerId", "==", ownerId)
      .get();
      
    contactsSnap.forEach(doc => {
      const data = doc.data();
      const contactEvents = data.events || [];
      for (const ev of contactEvents) {
        if (ev.time >= timeMin && ev.time <= timeMax) {
          events.push({
            id: `interaction_${doc.id}_${ev.time}`,
            sourceId: doc.id,
            title: `אינטראקציה: ${ev.title} (${data.conta_name})`,
            start: ev.time,
            end: ev.time,
            type: "interaction",
            description: ev.text
          });
        }
      }
    });

    return events;
  } catch (error: any) {
    console.error("Error fetching unified events", error);
    return [];
  }
}

export async function createLocalEvent(type: "task" | "meeting" | "reminder", data: any) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const ownerId = session.user.id;
    
    let collectionName = "tasks";
    if (type === "meeting") collectionName = "meetings";
    if (type === "reminder") collectionName = "reminders";
    
    const docData = {
      ...data,
      ownerId,
      createdAt: new Date().toISOString()
    };
    
    const ref = await adminDb.collection(collectionName).add(docData);
    
    await logSystemEvent({
      level: "success",
      module: "calendar",
      action: `create_local_${type}`,
      description: `נוצר ${type} חדש: ${data.title}`,
      ownerId,
    });
    
    return { success: true, id: ref.id };
  } catch (error: any) {
    await logSystemEvent({
      level: "error",
      module: "calendar",
      action: `create_local_${type}_failed`,
      description: `שגיאה ביצירת ${type}`,
      ownerId: (await auth())?.user?.id || "unknown",
      metadata: { error: error.message }
    });
    return { success: false, error: error.message };
  }
}

// Optionally, sync a local event to Google Calendar
export async function syncToGoogleCalendar(title: string, start: string, end: string, description?: string) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const accessToken = (session as any).accessToken;
    const refreshToken = (session as any).refreshToken;
    
    if (!accessToken) throw new Error("No Google Calendar connected");
    
    const gcalService = new GoogleCalendarService(accessToken, refreshToken, session.user.id);
    
    const result = await gcalService.createEvent({
      summary: title,
      description: description,
      start: { dateTime: new Date(start).toISOString() },
      end: { dateTime: new Date(end).toISOString() }
    });
    
    return { success: true, gcalId: result.id };
  } catch (error: any) {
    console.error("Error syncing to Google Calendar", error);
    return { success: false, error: error.message };
  }
}

export async function fetchContacts() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return [];
    
    const snap = await adminDb.collection("contacts")
      .where("ownerId", "==", session.user.id)
      .get();
      
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.conta_name || "ללא שם",
        phone: data.conta_phone || ""
      };
    });
  } catch (error) {
    console.error("Error fetching contacts", error);
    return [];
  }
}

