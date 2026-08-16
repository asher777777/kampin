import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = performance.now();
  try {
    const body = await req.json();
    const { type = 'action', functionName, endpoint, method = 'GET', params = {}, userId = '1' } = body;

    let result: any = null;
    let logMessage = '';

    // 1. EXECUTE SERVER ACTIONS
    if (type === 'action' || functionName) {
      const fn = functionName || '';

      switch (fn) {
        // Settings
        case 'getGlobalSettings': {
          const { getGlobalSettings } = await import('@/features/settings/actions');
          result = await getGlobalSettings(params.userId || userId);
          logMessage = 'Fetched global settings';
          break;
        }

        // CRM
        case 'getContacts': {
          const { getContacts } = await import('@/features/crm/actions');
          result = await getContacts(params.filters || {});
          logMessage = 'Executed getContacts';
          break;
        }

        // WhatsApp
        case 'getWhatsAppConnection': {
          const { getWhatsAppConnection } = await import('@/features/whatsapp/actions');
          result = await (getWhatsAppConnection as any)(params.userId || userId);
          logMessage = 'Checked WhatsApp connection';
          break;
        }
        case 'getWhatsAppSettings': {
          const { getWhatsAppSettings } = await import('@/features/whatsapp/actions');
          result = await (getWhatsAppSettings as any)(params.userId || userId);
          logMessage = 'Fetched WhatsApp settings';
          break;
        }
        case 'getWhatsAppCampaigns': {
          const { getWhatsAppCampaigns } = await import('@/features/whatsapp/actions');
          result = await (getWhatsAppCampaigns as any)(params.userId || userId);
          logMessage = 'Fetched WhatsApp campaigns';
          break;
        }

        // Shabbat
        case 'getShabbatTimes': {
          const { getShabbatTimes } = await import('@/features/shabbat/actions');
          result = await (getShabbatTimes as any)(params.userId || userId);
          logMessage = 'Fetched Shabbat times for user';
          break;
        }
        case 'fetchShabbatTimesFromAPI': {
          const { fetchShabbatTimesFromAPI } = await import('@/features/shabbat/actions');
          result = await fetchShabbatTimesFromAPI();
          logMessage = 'Fetched live Shabbat times from Hebcal API';
          break;
        }

        // Services & Content
        case 'getAllServices': {
          const { getAllServices } = await import('@/features/services/actions');
          result = await (getAllServices as any)(params.userId || userId);
          logMessage = 'Fetched all business services';
          break;
        }
        case 'getAllPosts': {
          const { getAllPosts } = await import('@/features/posts/actions');
          result = await (getAllPosts as any)(params.userId || userId);
          logMessage = 'Fetched all posts';
          break;
        }

        // Users & Admin
        case 'getUsers': {
          const { getUsers } = await import('@/features/users/actions');
          result = await getUsers();
          logMessage = 'Fetched all registered users';
          break;
        }

        // Mini-Site Builder
        case 'getBuilderProgress': {
          const { getBuilderProgress } = await import('@/features/mini-site-builder/actions/builderActions');
          result = await getBuilderProgress(params.userId || userId);
          logMessage = 'Fetched builder progress';
          break;
        }
        case 'generateSlugOptionsWithAI': {
          const { generateSlugOptionsWithAI } = await import('@/features/mini-site-builder/actions/builderActions');
          result = await generateSlugOptionsWithAI(params.businessName || 'קפה גן סיפור');
          logMessage = 'Generated slug options via AI';
          break;
        }

        // Automations & Helpers
        case 'parseTemplate': {
          const { parseTemplate } = await import('@/lib/automations/engine');
          result = parseTemplate(params.template || 'שלום {name}, הסטטוס הוא {status}', params.data || { name: 'ישראל ישראלי', status: 'פעיל' });
          logMessage = 'Parsed automation template';
          break;
        }
        case 'normalizePhone': {
          const { normalizePhone } = await import('@/lib/utils');
          result = normalizePhone(params.phone || '0501234567');
          logMessage = 'Normalized phone number';
          break;
        }
        case 'getSystemLogs': {
          const { getSystemLogs } = await import('@/lib/system-logger');
          result = await getSystemLogs(params.limit || 20);
          logMessage = 'Fetched system audit logs';
          break;
        }

        default:
          if (body.actionFile) {
             let mod: any;
             try {
               if (body.actionFile.includes("crm/actions")) mod = await import('@/features/crm/actions');
               else if (body.actionFile.includes("whatsapp/actions")) mod = await import('@/features/whatsapp/actions');
               else if (body.actionFile.includes("services/actions")) mod = await import('@/features/services/actions');
               else if (body.actionFile.includes("posts/actions")) mod = await import('@/features/posts/actions');
               else if (body.actionFile.includes("users/actions")) mod = await import('@/features/users/actions');
               else if (body.actionFile.includes("mini-site-builder/actions")) mod = await import('@/features/mini-site-builder/actions/builderActions');
               else if (body.actionFile.includes("settings/actions")) mod = await import('@/features/settings/actions');
               else if (body.actionFile.includes("shabbat/actions")) mod = await import('@/features/shabbat/actions');
               
               if (mod && typeof mod[fn] === "function") {
                   const argsArray = params && typeof params === "object" ? Object.values(params) : [];
                   result = await mod[fn](...argsArray);
                   logMessage = `Dynamically executed ${fn} from ${body.actionFile}`;
                   break;
               } else {
                   throw new Error(`Function ${fn} not found in ${body.actionFile}`);
               }
             } catch (e: any) {
               return NextResponse.json({ success: false, error: e.message }, { status: 400 });
             }
          }

          return NextResponse.json({
            success: false,
            error: `הפונקציה '${fn}' טרם הוגדרה במריץ הפונקציות המאובטח. ניתן להריץ ישירות כל נתיב API.`,
            executionTimeMs: Math.round(performance.now() - startTime)
          }, { status: 400 });
      }
    }

    // 2. EXECUTE API ROUTE
    else if (type === 'api' || endpoint) {
      const url = new URL(endpoint, req.url).toString();
      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'x-internal-invoker': 'system-map'
        }
      };

      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && Object.keys(params).length > 0) {
        fetchOptions.body = JSON.stringify(params);
      }

      const apiRes = await fetch(url, fetchOptions);
      const contentType = apiRes.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        result = await apiRes.json();
      } else {
        result = await apiRes.text();
      }
      logMessage = `Invoked API ${method} ${endpoint} (Status: ${apiRes.status})`;
    }

    const executionTimeMs = Math.round(performance.now() - startTime);

    return NextResponse.json({
      success: true,
      executionTimeMs,
      logMessage,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    return NextResponse.json({
      success: false,
      executionTimeMs,
      error: err?.message || 'שגיאה בהרצת הפונקציה',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
