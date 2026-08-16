"use server";

import { adminDb } from "@/lib/firebase-admin";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CoinTransaction {
  id: string;
  amount: number; // positive for additions, negative for deductions
  reason: string;
  timestamp: string;
  balanceAfter: number;
}

export interface UserCoinsData {
  coins: number;
  pitchBonusGranted: boolean;
  activePagesCount: number;
  lastDailyDeduction?: string;
}

/**
 * Get current coins balance for a user
 */
export async function getUserCoins(userId?: string): Promise<UserCoinsData> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      targetUserId = session.user.id;
    }

    const userDoc = await adminDb.collection("users").doc(targetUserId).get();
    const data = userDoc.exists ? userDoc.data() : {};

    return {
      coins: typeof data?.coins === "number" ? data.coins : 0,
      pitchBonusGranted: !!data?.pitchBonusGranted,
      activePagesCount: typeof data?.activePagesCount === "number" ? data.activePagesCount : 1,
      lastDailyDeduction: data?.lastDailyDeduction || undefined,
    };
  } catch (error) {
    console.error("Error fetching user coins:", error);
    return { coins: 0, pitchBonusGranted: false, activePagesCount: 1 };
  }
}

/**
 * Grant +100 Pitch Bonus Coins on pitch qualification
 */
export async function grantPitchBonusCoins(userId?: string): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      targetUserId = session.user.id;
    }

    const userRef = adminDb.collection("users").doc(targetUserId);
    const userDoc = await userRef.get();
    const data = userDoc.exists ? userDoc.data() : {};

    if (data?.pitchBonusGranted) {
      return { success: true, newBalance: data?.coins || 100 };
    }

    const currentCoins = typeof data?.coins === "number" ? data.coins : 0;
    const newBalance = currentCoins + 100;

    await userRef.set({
      coins: newBalance,
      pitchBonusGranted: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Record transaction
    await userRef.collection("credit_transactions").add({
      amount: 100,
      reason: "מתנת הצטרפות מהסוכן (Pitch Bonus)",
      timestamp: new Date().toISOString(),
      balanceAfter: newBalance,
    });

    revalidatePath("/agentonbord");
    return { success: true, newBalance };
  } catch (error: any) {
    console.error("Error granting pitch bonus:", error);
    return { success: false, newBalance: 0, error: error.message || "Failed to grant coins" };
  }
}

/**
 * Deduct coins for a specific action (e.g. Logo generation = 10, Image = 10, Page = 10)
 */
export async function deductCoins(
  amount: number,
  reason: string,
  userId?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    let targetUserId = userId;
    if (!targetUserId) {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      targetUserId = session.user.id;
    }

    const userRef = adminDb.collection("users").doc(targetUserId);
    const userDoc = await userRef.get();
    const data = userDoc.exists ? userDoc.data() : {};

    const currentCoins = typeof data?.coins === "number" ? data.coins : 0;
    if (currentCoins < amount) {
      return { 
        success: false, 
        newBalance: currentCoins, 
        error: `אין מספיק מטבעות. נדרשים ${amount} מטבעות, יתרה נוכחית: ${currentCoins}` 
      };
    }

    const newBalance = currentCoins - amount;

    await userRef.set({
      coins: newBalance,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Record transaction
    await userRef.collection("credit_transactions").add({
      amount: -amount,
      reason,
      timestamp: new Date().toISOString(),
      balanceAfter: newBalance,
    });

    revalidatePath("/agentonbord");
    return { success: true, newBalance };
  } catch (error: any) {
    console.error("Error deducting coins:", error);
    return { success: false, newBalance: 0, error: error.message || "Failed to deduct coins" };
  }
}

/**
 * Calculate and deduct coins based on AI token / word count
 * Formula: 1 coin per 1,000 words (rounded up, minimum 1 coin for any AI response)
 */
export async function deductAiTextCoins(
  generatedText: string,
  actionName: string = "תשובת AI",
  userId?: string
): Promise<{ success: boolean; wordCount: number; coinsDeducted: number; newBalance: number }> {
  if (!generatedText || generatedText.trim().length === 0) {
    const balance = (await getUserCoins(userId)).coins;
    return { success: true, wordCount: 0, coinsDeducted: 0, newBalance: balance };
  }

  // Count words in text
  const cleanText = generatedText.replace(/<[^>]*>?/gm, "").trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 1 coin per 1000 words (minimum 1 coin if words > 0)
  const coinsDeducted = Math.max(1, Math.ceil(wordCount / 1000));

  const res = await deductCoins(coinsDeducted, `${actionName} (${wordCount} מילים)`, userId);

  return {
    success: res.success,
    wordCount,
    coinsDeducted: res.success ? coinsDeducted : 0,
    newBalance: res.newBalance,
  };
}

/**
 * Admin action to explicitly set a user's coin balance
 */
export async function adminUpdateUserCoins(userId: string, newBalance: number, reason: string = "עדכון מנהל מערכת"): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") throw new Error("Unauthorized: Superadmin only");

    if (!userId) throw new Error("User ID is required");
    if (typeof newBalance !== "number" || isNaN(newBalance)) throw new Error("Invalid balance");

    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
       throw new Error("User not found");
    }

    await userRef.set({
      coins: newBalance,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Record transaction
    await userRef.collection("credit_transactions").add({
      amount: newBalance - (userDoc.data()?.coins || 0),
      reason,
      timestamp: new Date().toISOString(),
      balanceAfter: newBalance,
    });

    revalidatePath("/admin/users");
    return { success: true, newBalance };
  } catch (error: any) {
    console.error("Error updating user coins:", error);
    return { success: false, error: error.message || "Failed to update coins" };
  }
}

