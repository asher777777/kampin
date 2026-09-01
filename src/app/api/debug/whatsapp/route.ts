import { NextResponse } from "next/server";
import { getWhatsAppSettings, getWhatsAppConnection, getWhatsAppQR } from "@/features/whatsapp/actions";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
  try {
    const settings = await getWhatsAppSettings();
    const globalDoc = await adminDb.collection("configs").doc("global").get();
    const globalData = globalDoc.exists ? globalDoc.data() : null;

    const usersSnap = await adminDb.collection("users").get();
    const usersSummary = usersSnap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        email: d.email,
        username: d.username,
        role: d.role,
        useAdminGreenApi: d.useAdminGreenApi,
        hasGreenApiSettings: !!d.greenApiSettings,
        greenApiSettingsInstanceId: d.greenApiSettings?.instanceId || d.greenApiSettings?.idInstance || null,
      };
    });

    let connectionTest = null;
    let qrTest = null;

    if (settings.idInstance && settings.apiToken) {
      try {
        connectionTest = await getWhatsAppConnection();
      } catch (err: any) {
        connectionTest = { error: err.message };
      }

      try {
        qrTest = await getWhatsAppQR();
      } catch (err: any) {
        qrTest = { error: err.message };
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      resolvedSettings: {
        idInstance: settings.idInstance ? `${settings.idInstance.substring(0, 4)}***` : "EMPTY",
        hasToken: !!settings.apiToken,
      },
      globalConfig: {
        hasGlobalGreenApiInstanceId: !!globalData?.greenApiInstanceId,
        hasGlobalGreenApiToken: !!globalData?.greenApiToken,
      },
      usersSummary,
      connectionTest,
      qrTestStatus: qrTest?.status || null,
      qrTestError: qrTest?.error || null,
      hasQrCode: !!qrTest?.qrCode,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e.message,
      stack: e.stack,
    }, { status: 500 });
  }
}
