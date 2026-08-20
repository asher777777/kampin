import { NextResponse } from "next/server";
import { syncAllExistingContactsToCampaigns } from "@/features/campaigns/actions";

export async function GET() {
  try {
    const res = await syncAllExistingContactsToCampaigns();
    return NextResponse.json({ success: true, ...res });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
