export default async function handler(req, res) {
  return res.status(410).json({
    enabled: false,
    message: "This project is static-only. Email reminders are disabled."
  });
}
