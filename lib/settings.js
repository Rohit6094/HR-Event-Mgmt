export function normalizeSettings() {
  return {
    recipients: [],
    subjectPrefix: "",
    reminderDays: []
  };
}

export async function getStoredSettings() {
  return {
    settings: normalizeSettings(),
    source: "disabled"
  };
}

export async function saveStoredSettings() {
  throw new Error("Static website mode does not support saved settings.");
}
