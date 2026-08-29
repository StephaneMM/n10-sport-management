import multer from 'multer';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** Thrown by the file filter; the global error handler turns it into a 400. */
export class UnsupportedFileTypeError extends Error {
  constructor() {
    super('Only JPG, PNG, WEBP and PDF files are allowed.');
    this.name = 'UnsupportedFileTypeError';
  }
}

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new UnsupportedFileTypeError());
  }
};

/**
 * In-memory upload handling: the file lives in `req.file.buffer` and is streamed
 * straight to object storage. Nothing touches the local disk, which is ephemeral
 * or read-only on the hosts we deploy to.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
