import { get, put } from "@vercel/blob";

const SETTINGS_PATHNAME = "config/reminder-settings.json";

const defaultSettings = {
  recipients: [],
  subjectPrefix: "Nepal HR Calendar",
  reminderDays: [7, 1]
};

function normalizeRecipients(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeReminderDays(value) {
  if (!Array.isArray(value)) return defaultSettings.reminderDays;

  const days = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0);

  return days.length ? [...new Set(days)] : defaultSettings.reminderDays;
}

export function normalizeSettings(input = {}) {
  return {
    recipients: normalizeRecipients(input.recipients),
    subjectPrefix: String(input.subjectPrefix || defaultSettings.subjectPrefix).trim() || defaultSettings.subjectPrefix,
    reminderDays: normalizeReminderDays(input.reminderDays)
  };
}

export async function getStoredSettings() {
  const envSettings = {
    ...defaultSettings,
    recipients: normalizeRecipients(process.env.REMINDER_TO_EMAIL),
    subjectPrefix: process.env.EMAIL_SUBJECT_PREFIX || defaultSettings.subjectPrefix
  };

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { settings: envSettings, source: "env" };
  }

  const result = await get(SETTINGS_PATHNAME, { access: "private" });
  if (result?.statusCode !== 200) {
    return { settings: envSettings, source: "env" };
  }

  if (!result.stream) {
    throw new Error("Unable to read settings blob stream");
  }

  const payload = await new Response(result.stream).json();
  return {
    settings: normalizeSettings(payload),
    source: "blob"
  };
}

export async function saveStoredSettings(input) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required to save settings");
  }

  const settings = normalizeSettings(input);
  await put(SETTINGS_PATHNAME, JSON.stringify(settings, null, 2), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json"
  });

  return settings;
}
