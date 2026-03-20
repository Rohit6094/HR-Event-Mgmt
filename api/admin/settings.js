export default async function handler(req, res) {
  return res.status(410).json({
    enabled: false,
    message: "Static website mode does not support admin settings."
  });
}
