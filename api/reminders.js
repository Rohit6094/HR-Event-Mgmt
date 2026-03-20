import { formatDate, getReminderEvents, getReminderRunConfig } from "../lib/reminders.js";

function isAuthorized(req) {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!cronSecret && !adminSecret) {
    return process.env.VERCEL_ENV !== "production";
  }

  return authHeader === `Bearer ${cronSecret}` || authHeader === `Bearer ${adminSecret}`;
}

function buildEmailHtml(events) {
  const items = events
    .map(
      (event) => `
        <li style="margin-bottom:16px;">
          <strong>${event.name}</strong><br />
          ${formatDate(event.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}<br />
          ${event.daysAway} day${event.daysAway === 1 ? "" : "s"} remaining<br />
          ${event.desc}<br />
          Source: ${event.source}
        </li>
      `
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#171717;">
      <h1 style="margin-bottom:12px;">Nepal HR Calendar reminders</h1>
      <p>The following events are approaching your reminder windows.</p>
      <ul style="padding-left:20px;">${items}</ul>
    </div>
  `;
}

async function sendEmail({ to, subject, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.REMINDER_FROM_EMAIL,
      to,
      subject,
      html
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend API error: ${response.status} ${details}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!process.env.RESEND_API_KEY || !process.env.REMINDER_FROM_EMAIL) {
    return res.status(500).json({
      error: "Missing required environment variables",
      required: ["RESEND_API_KEY", "REMINDER_FROM_EMAIL"]
    });
  }

  const reminderConfig = await getReminderRunConfig();
  const recipients = reminderConfig.recipients;
  if (!recipients.length) {
    return res.status(500).json({ error: "No recipients configured" });
  }

  const reminderEvents = getReminderEvents(new Date(), reminderConfig.reminderDays);
  if (!reminderEvents.length) {
    return res.status(200).json({
      sent: false,
      reason: "No events matched reminder windows today",
      configSource: reminderConfig.source
    });
  }

  const subjectPrefix = reminderConfig.subjectPrefix || process.env.EMAIL_SUBJECT_PREFIX || "Nepal HR Calendar";
  await sendEmail({
    to: recipients,
    subject: `${subjectPrefix}: ${reminderEvents.length} event reminder${reminderEvents.length === 1 ? "" : "s"}`,
    html: buildEmailHtml(reminderEvents)
  });

  return res.status(200).json({
    sent: true,
    recipients,
    configSource: reminderConfig.source,
    events: reminderEvents.map((event) => ({
      name: event.name,
      date: event.date,
      daysAway: event.daysAway
    }))
  });
}
