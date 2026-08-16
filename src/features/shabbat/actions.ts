"use server";

import { adminDb } from "@/lib/firebase-admin";

export interface ShabbatTimesData {
  candleLighting: string;
  havdalah: string;
  parashaHebrew: string;
  parashaEnglish: string;
  dvarTorah: string;
  prayerTimes: {
    minchaErevShabbat: string;
    shacharitShabbat: string;
    minchaShabbat: string;
    arvitMotzeiShabbat: string;
  };
  weekdayPrayerTimes?: {
    shacharit: string;
    mincha: string;
    arvit: string;
  };
  titles?: {
    prayerTitle?: string;
    prayerSubtitle?: string;
    shabbatTitle?: string;
    weekdayTitle?: string;
  };
  updatedAt: string;
}

export async function getShabbatTimes(): Promise<ShabbatTimesData | null> {
  try {
    const docRef = adminDb.collection("configs").doc("shabbat");
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      return docSnap.data() as ShabbatTimesData;
    }
    return null;
  } catch (error) {
    console.warn("Error fetching Shabbat times:", (error as Error).message);
    return null;
  }
}

export async function saveShabbatTimes(data: ShabbatTimesData) {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const docRef = adminDb.collection("configs").doc("shabbat");
    await docRef.set({ ...data, updatedAt: new Date().toISOString() });
    return { success: true };
  } catch (error) {
    console.error("Error saving Shabbat times:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function fetchShabbatTimesFromAPI(): Promise<{ success: boolean; data?: Partial<ShabbatTimesData>; error?: string }> {
  try {
    // Tel Aviv geonameid is 293397. m=50 for havdalah mins
    const res = await fetch("https://www.hebcal.com/shabbat?cfg=json&geonameid=293397&m=50");
    if (!res.ok) throw new Error("Failed to fetch from Hebcal");
    
    const data = await res.json();
    
    let candleLighting = "";
    let havdalah = "";
    let parashaHebrew = "";
    let parashaEnglish = "";
    
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: any) => {
        if (item.category === "candles") {
          // Time is in item.date like "2023-10-13T17:45:00+03:00"
          const dateObj = new Date(item.date);
          candleLighting = dateObj.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
        } else if (item.category === "havdalah") {
          const dateObj = new Date(item.date);
          havdalah = dateObj.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
        } else if (item.category === "parashat") {
          parashaHebrew = item.hebrew || item.title;
          parashaEnglish = item.title;
        }
      });
    }
    
    return { 
      success: true, 
      data: {
        candleLighting,
        havdalah,
        parashaHebrew,
        parashaEnglish
      } 
    };
  } catch (error) {
    console.error("Error fetching from API:", error);
    return { success: false, error: (error as Error).message };
  }
}
