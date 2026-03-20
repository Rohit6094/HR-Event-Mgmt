import { getStoredSettings, saveStoredSettings } from "../../lib/settings.js";

function isAuthorized(req) {
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  if (!adminSecret) return false;
  return req.headers.authorization === `Bearer ${adminSecret}`;
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    const { settings, source } = await getStoredSettings();
    return res.status(200).json({ settings, source });
  }

  if (req.method === "POST") {
    const saved = await saveStoredSettings(req.body || {});
    return res.status(200).json({ saved: true, settings: saved });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
