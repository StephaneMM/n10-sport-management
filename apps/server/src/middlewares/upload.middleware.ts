import multer from 'multer';
import path from 'path';

// 1. The Storage Engine (Where and How to save)
const storage = multer.diskStorage({
  // Tell Multer which folder to drop the files into
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  // Give every single file a mathematically unique name
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Extract the original extension (e.g., ".pdf" or ".png")
    const extension = path.extname(file.originalname);
    // Result: "document-1710000000000-123456789.pdf"
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// 2. The Security Guard (What files are allowed?)
const fileFilter = (
  req: any, 
  file: Express.Multer.File, 
  cb: multer.FileFilterCallback
) => {
  // Only Images (Profile Pics) and PDFs (Transcripts)
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // If they try to upload an MP4, Multer kicks them out immediately.
    cb(new Error('Invalid file type. Please use YouTube links for videos. Only JPG, PNG, and PDF are allowed for direct upload.'));
  }
};
// 3. Export the actual configured Bouncer
export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Hard limit: 5 Megabytes (protects your RAM!)
  }
});