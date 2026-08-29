import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '../config/env';

export interface StoredObject {
  /** Opaque object key — the only handle we persist. */
  key: string;
  /** Sanitised original file name, for the download filename. */
  fileName: string;
}

function getClient() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error(
      'Object storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.',
    );
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });

  return { client, bucket: R2_BUCKET };
}

/** Keep only characters that are safe in a file name and an HTTP header. */
function safeFileName(originalName: string): string {
  const cleaned = originalName.replace(/[^\w.\- ]+/g, '_').replace(/^\.+/, '').slice(0, 200);
  return cleaned || 'file';
}

/** Uploads an in-memory file to R2 under an opaque, unguessable key. */
export async function putObject(file: Express.Multer.File): Promise<StoredObject> {
  const { client, bucket } = getClient();
  const fileName = safeFileName(file.originalname);
  const key = `documents/${randomUUID()}/${fileName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
    }),
  );

  return { key, fileName };
}

/** Opens a readable stream of an object's bytes, for the download proxy. */
export async function getObjectStream(key: string): Promise<Readable> {
  const { client, bucket } = getClient();
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

  if (!response.Body) {
    throw new Error(`Object ${key} has no body.`);
  }

  return response.Body as Readable;
}

/** Permanently removes an object. */
export async function deleteObject(key: string): Promise<void> {
  const { client, bucket } = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
