import { Router, Request, Response } from 'express';
import { upload } from '../../middlewares/upload.middleware'; // Don't forget the .js!
import { requireUser } from '../../middlewares/requireUser';

const uploadRouter = Router();

// Notice the new bouncer: upload.single('document')
// This tells Multer: "Catch exactly ONE file from the field named 'document'"
uploadRouter.post(
  '/', 
  requireUser, 
  upload.single('document'), 
  (req: Request, res: Response): void => {
    try {
      // If Multer succeeds, it attaches the file info to req.file!
      if (!req.file) {
        res.status(400).json({ error: 'No file was uploaded.' });
        return;
      }

      res.status(200).json({
        message: 'File uploaded successfully!',
        file: {
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: req.file.path // e.g., "uploads/document-123.pdf"
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Internal server error during upload.' });
    }
  }
);

console.log("☁️ Upload Router has been successfully loaded!");

export { uploadRouter };

