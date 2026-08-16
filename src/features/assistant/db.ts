import { adminDb } from "@/lib/firebase-admin";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  ownerId: string;
  contextType: string;
  updatedAt: string;
  createdAt: string;
}

/**
 * Gets or creates a chat session for a user in a specific context.
 * For example, contextType could be "dashboard", "crm", "landing", etc.
 */
export async function getOrCreateChatSession(userId: string, contextType: string): Promise<string> {
  const sessionsRef = adminDb.collection("assistant_sessions");
  
  // Find an existing session for this context
  const snap = await sessionsRef
    .where("ownerId", "==", userId)
    .where("contextType", "==", contextType)
    .limit(1)
    .get();

  if (!snap.empty) {
    const doc = snap.docs[0];
    return doc.id;
  }

  // Create new session
  const newSessionRef = sessionsRef.doc();
  const now = new Date().toISOString();
  await newSessionRef.set({
    id: newSessionRef.id,
    ownerId: userId,
    contextType,
    createdAt: now,
    updatedAt: now,
  });

  return newSessionRef.id;
}

/**
 * Gets all messages for a session, ordered by creation time.
 */
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const messagesRef = adminDb.collection("assistant_sessions").doc(sessionId).collection("messages");
  const snap = await messagesRef.orderBy("createdAt", "asc").get();
  
  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      role: data.role,
      content: data.content,
      createdAt: data.createdAt,
    } as ChatMessage;
  });
}

/**
 * Adds a new message to the session.
 */
export async function addMessageToSession(sessionId: string, role: "user" | "assistant", content: string): Promise<void> {
  const sessionRef = adminDb.collection("assistant_sessions").doc(sessionId);
  const messagesRef = sessionRef.collection("messages");
  const now = new Date().toISOString();

  await messagesRef.add({
    role,
    content,
    createdAt: now,
  });

  // Update session updatedAt
  await sessionRef.update({
    updatedAt: now,
  });
}

/**
 * Clears all messages in a session.
 */
export async function clearSessionMessages(sessionId: string): Promise<void> {
  const messagesRef = adminDb.collection("assistant_sessions").doc(sessionId).collection("messages");
  
  // Note: For large collections, we'd use a batch delete loop, but for chat history this is fine.
  const snap = await messagesRef.get();
  
  const batch = adminDb.batch();
  snap.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
}
