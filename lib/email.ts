import "server-only";
import { formatKobo } from "@/lib/format";
import { env } from "@/lib/env";
import type { Order, OrderItem } from "@/lib/types";

export type EmailProvider = "brevo" | "mailgun";

/** Which provider sends email. Set EMAIL_PROVIDER in the environment; defaults to Brevo. */
function getProvider(): EmailProvider {
  const value = (process.env.EMAIL_PROVIDER ?? "brevo").toLowerCase();
  if (value !== "brevo" && value !== "mailgun") {
    throw new Error(`EMAIL_PROVIDER must be "brevo" or "mailgun", got "${value}".`);
  }
  return value;
}

type OutgoingEmail = {
  to: { email: string; name: string };
  subject: string;
  html: string;
  text: string;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

function renderOrderEmail(order: Order, items: OrderItem[]) {
  const orderUrl = `${env.siteUrl}/orders/${order.id}`;

  const rows = items
    .map(
      (i) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee5d8;">${escapeHtml(i.product_name)} &times; ${i.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee5d8;text-align:right;">${formatKobo(i.line_total_kobo)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;color:#1f2430;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbf8f2;border:1px solid #ddd3c2;border-radius:16px;padding:32px;">
          <tr><td>
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6e6a62;">Order ${escapeHtml(order.order_number)}</p>
            <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;">Thank you, ${escapeHtml(order.full_name.split(" ")[0] ?? order.full_name)}.</h1>
            <p style="margin:0 0 24px;line-height:1.5;">We have received your order and will contact you on ${escapeHtml(order.phone)} before delivery.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
              ${rows}
              <tr><td style="padding:10px 0;color:#6e6a62;">Subtotal</td><td style="padding:10px 0;text-align:right;color:#6e6a62;">${formatKobo(order.subtotal_kobo)}</td></tr>
              <tr><td style="padding:4px 0;color:#6e6a62;">Shipping</td><td style="padding:4px 0;text-align:right;color:#6e6a62;">${order.shipping_kobo === 0 ? "Free" : formatKobo(order.shipping_kobo)}</td></tr>
              <tr><td style="padding:12px 0;font-weight:bold;font-size:16px;">Total</td><td style="padding:12px 0;text-align:right;font-weight:bold;font-size:16px;">${formatKobo(order.total_kobo)}</td></tr>
            </table>
            <p style="margin:24px 0 8px;font-size:13px;color:#6e6a62;">Delivering to</p>
            <p style="margin:0 0 24px;line-height:1.5;">${escapeHtml(order.address)}<br>${escapeHtml(order.city)}</p>
            <a href="${orderUrl}" style="display:inline-block;background:#c2552f;color:#fff8f2;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">View your order</a>
          </td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#6e6a62;">MickyHill Store · HNG Internship 15 project</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    `Thank you for your order, ${order.full_name}.`,
    `Order number: ${order.order_number}`,
    "",
    ...items.map((i) => `${i.product_name} x ${i.quantity}: ${formatKobo(i.line_total_kobo)}`),
    "",
    `Subtotal: ${formatKobo(order.subtotal_kobo)}`,
    `Shipping: ${order.shipping_kobo === 0 ? "Free" : formatKobo(order.shipping_kobo)}`,
    `Total: ${formatKobo(order.total_kobo)}`,
    "",
    `Delivering to: ${order.address}, ${order.city}`,
    `View your order: ${orderUrl}`,
  ].join("\n");

  return { html, text };
}

/** Brevo transactional email API. Free plan: 300 emails a day, no card needed. */
async function sendWithBrevo(email: OutgoingEmail): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    throw new Error("Brevo is not configured: set BREVO_API_KEY and BREVO_SENDER_EMAIL.");
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: process.env.BREVO_SENDER_NAME ?? "MickyHill Store" },
      to: [email.to],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo responded ${res.status}: ${detail.slice(0, 300)}`);
  }
}

/** Mailgun HTTP API. Kept as an alternative provider. */
async function sendWithMailgun(email: OutgoingEmail): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) {
    throw new Error("Mailgun is not configured: set MAILGUN_API_KEY and MAILGUN_DOMAIN.");
  }
  const apiBase = (process.env.MAILGUN_API_BASE ?? "https://api.mailgun.net").replace(/\/$/, "");
  const from = process.env.MAILGUN_FROM ?? `MickyHill Store <orders@${domain}>`;

  const res = await fetch(`${apiBase}/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      from,
      to: `${email.to.name} <${email.to.email}>`,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Mailgun responded ${res.status}: ${detail.slice(0, 300)}`);
  }
}

/** Sends the order confirmation through the configured provider. Throws on failure. */
export async function sendOrderConfirmation(order: Order, items: OrderItem[]): Promise<void> {
  const { html, text } = renderOrderEmail(order, items);
  const email: OutgoingEmail = {
    to: { email: order.email, name: order.full_name },
    subject: `Order confirmed: ${order.order_number}`,
    html,
    text,
  };

  if (getProvider() === "mailgun") {
    await sendWithMailgun(email);
  } else {
    await sendWithBrevo(email);
  }
}
