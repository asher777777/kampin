import { WhatsAppSettings } from "./types";

// Helper to determine Green API Host URL dynamically
export function getGreenApiHost(settings: WhatsAppSettings): string {
  if (settings.apiUrl && settings.apiUrl.trim()) {
    return settings.apiUrl.trim().replace(/\/+$/, "");
  }
  const trimmedId = (settings.idInstance || "").trim();
  // Green API instance IDs often start with the 4-digit cluster host prefix, e.g. 7103... -> https://7103.api.greenapi.com
  const match = trimmedId.match(/^(\d{4})/);
  if (match) {
    return `https://${match[1]}.api.greenapi.com`;
  }
  return "https://api.green-api.com";
}

// Helper to construct Green API Endpoint URLs
export function getGreenApiUrl(settings: WhatsAppSettings, action: string): string {
  const host = getGreenApiHost(settings);
  return `${host}/waInstance${settings.idInstance}/${action}/${settings.apiToken}`;
}
