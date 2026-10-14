// Transactional email via Resend, from contact@zartsants.com.

const FROM = 'Զարցանց Zartsants <contact@zartsants.com>';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Resend allows ~2 requests/second per account, shared by everything this
// server sends — so space sends out and retry when refused.
let lastSend = 0;
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    const wait = lastSend + 600 - Date.now();
    lastSend = Math.max(Date.now(), lastSend + 600);
    if (wait > 0) await sleep(wait);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${import.meta.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (res.ok) return;
    if (res.status === 429 && attempt < 4) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    throw new Error(`Resend → ${res.status}: ${await res.text()}`);
  }
}
