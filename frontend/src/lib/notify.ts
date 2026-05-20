const WEBHOOK_URL = process.env.NEXT_PUBLIC_SHEETS_WEBHOOK_URL ?? "";

export async function notifyWebhook(payload: Record<string, unknown>) {
  if (!WEBHOOK_URL) return;
  try {
    // no-cors: skips preflight OPTIONS — Google Apps Script doesn't support it.
    // Response is opaque (unreadable) but the request reaches the script fine.
    // Content-Type must be text/plain; application/json would trigger preflight.
    await fetch(WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });
  } catch {
    // silent — notifications must never break the user flow
  }
}
