import { formatDate, getAllEvents } from "../script.js";
import { getStoredSettings } from "./settings.js";

export { formatDate };

export function getReminderEvents(baseDate = new Date(), reminderDays = [7, 1]) {
  const normalizedBaseDate = new Date(Date.UTC(
    baseDate.getUTCFullYear(),
    baseDate.getUTCMonth(),
    baseDate.getUTCDate()
  ));

  const allowedDays = new Set(reminderDays);

  return getAllEvents()
    .map((event) => ({
      ...event,
      daysAway: Math.round((event.parsedDate - normalizedBaseDate) / 86400000)
    }))
    .filter((event) => allowedDays.has(event.daysAway))
    .sort((a, b) => a.daysAway - b.daysAway || a.parsedDate - b.parsedDate);
}

export async function getReminderRunConfig() {
  const { settings, source } = await getStoredSettings();
  return {
    source,
    recipients: settings.recipients,
    subjectPrefix: settings.subjectPrefix,
    reminderDays: settings.reminderDays
  };
}
