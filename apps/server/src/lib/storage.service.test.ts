import { Readable } from 'node:stream';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return { ...actual, S3Client: jest.fn(() => ({ send: mockSend })) };
});

jest.mock('../config/env', () => ({
  env: {
    R2_ACCOUNT_ID: 'acc123',
    R2_ACCESS_KEY_ID: 'ak',
    R2_SECRET_ACCESS_KEY: 'sk',
    R2_BUCKET: 'n10-docs',
  },
}));

import { putObject, getObjectStream } from './storage.service';

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    originalname: 'transcript.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake'),
    size: 12,
    ...overrides,
  } as Express.Multer.File;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('putObject', () => {
  it('uploads under an opaque documents/<uuid>/<name> key', async () => {
    mockSend.mockResolvedValue({});

    const result = await putObject(makeFile());

    expect(result.fileName).toBe('transcript.pdf');
    expect(result.key).toMatch(/^documents\/[0-9a-f-]{36}\/transcript\.pdf$/);

    const command = mockSend.mock.calls[0][0];
    expect(command.input).toMatchObject({
      Bucket: 'n10-docs',
      Key: result.key,
      ContentType: 'application/pdf',
    });
  });

  it('sanitises the file name against header/path injection', async () => {
    mockSend.mockResolvedValue({});

    const result = await putObject(makeFile({ originalname: 'ev"il;\r\n ../x.pdf' }));

    expect(result.fileName).not.toMatch(/["\r\n;/]/);
    expect(result.key).not.toMatch(/["\r\n;]/);
  });
});

describe('getObjectStream', () => {
  it('returns the object body stream', async () => {
    const body = Readable.from(Buffer.from('bytes'));
    mockSend.mockResolvedValue({ Body: body });

    await expect(getObjectStream('documents/x/y.pdf')).resolves.toBe(body);
  });

  it('throws when the object has no body', async () => {
    mockSend.mockResolvedValue({});
    await expect(getObjectStream('missing')).rejects.toThrow(/no body/);
  });
});
