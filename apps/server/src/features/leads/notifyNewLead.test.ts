import type { Lead } from '@prisma/client';
import { buildLeadEmailText, notifyNewLead } from './notifyNewLead';

const lead: Lead = {
  id: 'lead-1',
  firstName: 'Ana',
  lastName: 'Silva',
  email: 'ana@example.com',
  phone: '+55 11 99999-9999',
  country: 'Brazil',
  dateOfBirth: new Date('2008-05-14T00:00:00.000Z'),
  nationality: 'Brazilian',
  gender: 'Female',
  sport: 'Volleyball',
  positions: ['Outside Hitter'],
  heightCm: 182,
  weightKg: 70,
  verticalJumpCm: null,
  league: null,
  currentClub: 'Minas',
  highlightLinks: ['https://youtu.be/abc'],
  source: 'INSTAGRAM',
  preferredLanguage: null,
  consentToContact: true,
  guardianName: null,
  guardianEmail: null,
  guardianPhone: null,
  guardianRelationship: null,
  messageToUs: 'Hello N10',
  adminComment: null,
  status: 'NEW',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const config = {
  RESEND_API_KEY: 're_test_key',
  LEAD_NOTIFICATION_TO: 'n10.sportsmanagement@gmail.com',
  LEAD_NOTIFICATION_FROM: 'N10 Website <notifications@n10-sportsmanagement.com>',
  ADMIN_APP_URL: 'https://n10.example.com/',
};

describe('notifyNewLead', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue(new Response('{"id":"email-1"}', { status: 200 }));
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('does nothing when RESEND_API_KEY is unset', async () => {
    await notifyNewLead(lead, { ...config, RESEND_API_KEY: undefined });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the lead to the N10 inbox with reply-to set to the applicant', async () => {
    await notifyNewLead(lead, config);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');

    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      from: 'N10 Website <notifications@n10-sportsmanagement.com>',
      to: ['n10.sportsmanagement@gmail.com'],
      reply_to: 'ana@example.com',
      subject: 'New lead: Ana Silva (Volleyball, Brazil)',
    });
    expect(body.text).toContain('Email: ana@example.com');
  });

  it('logs and swallows a rejected send', async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"invalid key"}', { status: 401 }));

    await expect(notifyNewLead(lead, config)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      'Lead notification rejected by Resend',
      expect.objectContaining({ leadId: 'lead-1', status: 401 }),
    );
  });

  it('logs and swallows a network failure', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));

    await expect(notifyNewLead(lead, config)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      'Lead notification failed',
      expect.objectContaining({ leadId: 'lead-1' }),
    );
  });
});

describe('buildLeadEmailText', () => {
  it('includes the key fields, the message and a link to the lead', () => {
    const text = buildLeadEmailText(lead, config.ADMIN_APP_URL);

    expect(text).toContain('Name: Ana Silva');
    expect(text).toContain('Date of birth: 2008-05-14');
    expect(text).toContain('Positions: Outside Hitter');
    expect(text).toContain('League: —');
    expect(text).toContain('https://youtu.be/abc');
    expect(text).toContain('Hello N10');
    expect(text).toContain('Open in admin: https://n10.example.com/admin/leads/lead-1');
  });

  it('adds guardian contact for minors and omits the link without ADMIN_APP_URL', () => {
    const text = buildLeadEmailText({
      ...lead,
      guardianName: 'Rosa Silva',
      guardianRelationship: 'Mother',
      guardianEmail: 'rosa@example.com',
      guardianPhone: '+55 11 98888-0000',
    });

    expect(text).toContain('Guardian: Rosa Silva (Mother)');
    expect(text).toContain('Guardian email: rosa@example.com');
    expect(text).not.toContain('Open in admin');
  });
});
