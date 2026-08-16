import { auth } from "@/lib/auth";
import { SettingsTabs } from "./SettingsTabs";

export default async function SettingsPage() {
  const session = await auth();
  const isGoogleConnected = !!(session as any)?.accessToken;

  return (
    <div dir="rtl">
      <SettingsTabs isGoogleConnected={isGoogleConnected} />
    </div>
  );
}
