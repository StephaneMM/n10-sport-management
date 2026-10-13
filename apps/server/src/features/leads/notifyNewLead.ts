import type { Lead } from '@prisma/client';
import { env, type Env } from '../../config/env';

const RESEND_URL = 'https://api.resend.com/emails';

// A slow email provider must not hold the applicant's submission hostage.
const SEND_TIMEOUT_MS = 5000;

type NotifyConfig = Pick<
  Env,
  'RESEND_API_KEY' | 'LEAD_NOTIFICATION_TO' | 'LEAD_NOTIFICATION_FROM' | 'ADMIN_APP_URL'
>;

/**
 * Emails the N10 team that a new lead came in.
 *
 * Best effort: the lead is already saved when this runs, so a failure is logged
 * and swallowed rather than turned into an error for the applicant. A no-op
 * when RESEND_API_KEY is unset, so local development and the test suite never
 * send mail.
 *
 * Plain text only — every field is applicant-controlled, and text needs no
 * escaping.
 */
export async function notifyNewLead(lead: Lead, config: NotifyConfig = env): Promise<void> {
  if (!config.RESEND_API_KEY) return;

  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.LEAD_NOTIFICATION_FROM,
        to: [config.LEAD_NOTIFICATION_TO],
        // Hitting "Reply" in the inbox goes straight to the applicant.
        reply_to: lead.email,
        subject: `New lead: ${lead.firstName} ${lead.lastName} (${lead.sport}, ${lead.country})`,
        text: buildLeadEmailText(lead, config.ADMIN_APP_URL),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error('Lead notification rejected by Resend', {
        leadId: lead.id,
        status: response.status,
        body: await response.text(),
      });
    }
  } catch (error) {
    console.error('Lead notification failed', { leadId: lead.id, error });
  }
}

export function buildLeadEmailText(lead: Lead, adminAppUrl?: string): string {
  const optional = (value: string | number | null | undefined) =>
    value === null || value === undefined || value === '' ? '—' : String(value);

  const lines = [
    'A new application was submitted on the N10 website.',
    '',
    `Name: ${lead.firstName} ${lead.lastName}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone}`,
    `Country: ${lead.country}`,
    `Nationality: ${lead.nationality}`,
    `Date of birth: ${lead.dateOfBirth.toISOString().slice(0, 10)}`,
    `Gender: ${lead.gender}`,
    '',
    `Sport: ${lead.sport}`,
    `Positions: ${lead.positions.length > 0 ? lead.positions.join(', ') : '—'}`,
    `Height: ${lead.heightCm} cm`,
    `Weight: ${lead.weightKg} kg`,
    `Club: ${optional(lead.currentClub)}`,
    `League: ${optional(lead.league)}`,
    `Found us via: ${optional(lead.source)}`,
    `Language: ${optional(lead.preferredLanguage)}`,
  ];

  if (lead.guardianName) {
    lines.push(
      '',
      `Guardian: ${lead.guardianName} (${optional(lead.guardianRelationship)})`,
      `Guardian email: ${optional(lead.guardianEmail)}`,
      `Guardian phone: ${optional(lead.guardianPhone)}`,
    );
  }

  if (lead.highlightLinks.length > 0) {
    lines.push('', 'Highlights:', ...lead.highlightLinks.map((link) => `  ${link}`));
  }

  if (lead.messageToUs) {
    lines.push('', 'Message:', lead.messageToUs);
  }

  if (adminAppUrl) {
    lines.push('', `Open in admin: ${adminAppUrl.replace(/\/+$/, '')}/admin/leads/${lead.id}`);
  }

  return lines.join('\n');
}
