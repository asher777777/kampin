import { google, calendar_v3 } from "googleapis";
import { logSystemEvent } from "./system-logger";

export class GoogleCalendarService {
  private auth;
  private calendar: calendar_v3.Calendar;
  private ownerId: string;

  constructor(accessToken: string, refreshToken: string, ownerId: string) {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    this.auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    this.calendar = google.calendar({ version: "v3", auth: this.auth });
    this.ownerId = ownerId;
  }

  async listEvents(timeMin?: string, timeMax?: string) {
    try {
      const response = await this.calendar.events.list({
        calendarId: "primary",
        timeMin: timeMin || (new Date()).toISOString(),
        timeMax: timeMax,
        maxResults: 100,
        singleEvents: true,
        orderBy: "startTime",
      });
      
      await logSystemEvent({
        level: "info",
        module: "calendar",
        action: "fetch_events",
        description: `Fetched ${response.data.items?.length || 0} events from Google Calendar`,
        ownerId: this.ownerId,
      });

      return response.data.items || [];
    } catch (error: any) {
      await logSystemEvent({
        level: "error",
        module: "calendar",
        action: "fetch_events_failed",
        description: "Failed to fetch events from Google Calendar",
        ownerId: this.ownerId,
        metadata: { error: error.message },
      });
      throw error;
    }
  }

  async createEvent(eventData: calendar_v3.Schema$Event) {
    try {
      const response = await this.calendar.events.insert({
        calendarId: "primary",
        requestBody: eventData,
      });
      
      await logSystemEvent({
        level: "success",
        module: "calendar",
        action: "create_event",
        description: `Created event: ${eventData.summary}`,
        ownerId: this.ownerId,
        metadata: { eventId: response.data.id },
      });

      return response.data;
    } catch (error: any) {
      await logSystemEvent({
        level: "error",
        module: "calendar",
        action: "create_event_failed",
        description: "Failed to create event in Google Calendar",
        ownerId: this.ownerId,
        metadata: { error: error.message, eventData },
      });
      throw error;
    }
  }

  async updateEvent(eventId: string, eventData: calendar_v3.Schema$Event) {
    try {
      const response = await this.calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        requestBody: eventData,
      });
      
      await logSystemEvent({
        level: "success",
        module: "calendar",
        action: "update_event",
        description: `Updated event: ${eventId}`,
        ownerId: this.ownerId,
      });

      return response.data;
    } catch (error: any) {
      await logSystemEvent({
        level: "error",
        module: "calendar",
        action: "update_event_failed",
        description: "Failed to update event in Google Calendar",
        ownerId: this.ownerId,
        metadata: { error: error.message, eventId },
      });
      throw error;
    }
  }

  async deleteEvent(eventId: string) {
    try {
      await this.calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
      });
      
      await logSystemEvent({
        level: "info",
        module: "calendar",
        action: "delete_event",
        description: `Deleted event: ${eventId}`,
        ownerId: this.ownerId,
      });

      return true;
    } catch (error: any) {
      await logSystemEvent({
        level: "error",
        module: "calendar",
        action: "delete_event_failed",
        description: "Failed to delete event in Google Calendar",
        ownerId: this.ownerId,
        metadata: { error: error.message, eventId },
      });
      throw error;
    }
  }
}
