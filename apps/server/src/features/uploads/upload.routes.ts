import { Router, Request, Response } from 'express';
import { upload } from '../../middlewares/upload.middleware'; // Don't forget the .js!
import { requireUser } from '../../middlewares/requireUser';
import { uploadFileToCloud } from '../../lib/storage.service';

const uploadRouter = Router();

// Notice the new bouncer: upload.single('document')
// This tells Multer: "Catch exactly ONE file from the field named 'document'"
uploadRouter.post(
  '/', 
  requireUser, 
  upload.single('document'), 
  async (req: Request, res: Response): Promise<void> => {
    try {
      // If Multer succeeds, it attaches the file info to req.file!
      if (!req.file) {
        res.status(400).json({ error: 'No file was uploaded.' });
        return;
      }

      // Hand the file to the Strategy Pattern Switchboard
      const publicUrl = await uploadFileToCloud(req.file);

      res.status(200).json({
        message: 'File uploaded successfully!',
        url: publicUrl, // This will be a GDrive, R2 link, or Local link! no more guessing with res .file, .googleDriveId and .r2Url
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Internal server error during upload.' });
    }
  }
);

console.log("☁️ Upload Router has been successfully loaded!");

export { uploadRouter };

