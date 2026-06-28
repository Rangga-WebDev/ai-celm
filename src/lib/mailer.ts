/** @format */

/**
 * Mailer pluggable.
 *
 * Strategi pengiriman ditentukan otomatis dari environment variable:
 * - Bila `RESEND_API_KEY` di-set → kirim via Resend HTTP API (tanpa dependency).
 * - Bila tidak → mode pengembangan: email hanya dicatat ke console/log.
 *
 * Variabel terkait:
 * - MAIL_FROM       Alamat pengirim default, mis. "AI-CELM <no-reply@domain.com>".
 * - RESEND_API_KEY  API key Resend untuk pengiriman nyata.
 */

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const DEFAULT_FROM = "AI-CELM <no-reply@ai-celm.local>";

function resolveFrom(): string {
  return process.env.MAIL_FROM?.trim() || DEFAULT_FROM;
}

/** Ubah HTML sederhana menjadi teks polos untuk fallback `text`. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sendViaResend(message: MailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY!;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resolveFrom(),
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text ?? htmlToText(message.html),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend gagal (${res.status}): ${detail}`);
  }
}

function logToConsole(message: MailMessage): void {
  console.info(
    [
      "",
      "──────────── EMAIL (mode dev) ────────────",
      `From   : ${resolveFrom()}`,
      `To     : ${message.to}`,
      `Subject: ${message.subject}`,
      "------------------------------------------",
      message.text ?? htmlToText(message.html),
      "──────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

/**
 * Kirim email. Mengembalikan `true` jika terkirim lewat provider nyata,
 * `false` bila hanya dicatat (mode dev). Tidak melempar pada mode dev.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(message);
    return true;
  }

  logToConsole(message);
  return false;
}

/** Apakah pengiriman email sungguhan sudah dikonfigurasi. */
export function isMailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
