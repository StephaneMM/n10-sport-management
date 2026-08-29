import { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { UnsupportedFileTypeError } from './upload.middleware';

const MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'The file exceeds the 5 MB limit.',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
};

/**
 * Terminal error handler. Turns known request errors into JSON 4xx responses and
 * everything else into a logged 500 — so a thrown error never leaks a stack
 * trace or an HTML error page to the client. Must be registered last.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof MulterError) {
    res.status(400).json({ error: MULTER_MESSAGES[err.code] ?? 'Invalid file upload.' });
    return;
  }

  if (err instanceof UnsupportedFileTypeError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ errors: err.issues });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
};
