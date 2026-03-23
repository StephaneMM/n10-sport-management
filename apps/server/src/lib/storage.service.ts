import { google } from 'googleapis'; 
import fs from 'fs';


const ACTIVE_PROVIDER = process.env.ACTIVE_STORAGE_PROVIDER || 'LOCAL';

// THE GOOGLE DRIVE STRATEGY
const uploadToGoogleDrive = async (file: Express.Multer.File): Promise<string> => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY
        ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '')
        : undefined,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  // Send the file from your local uploads folder to Google Drive!
  const response = await drive.files.create({
    requestBody: {
      name: file.filename,
      parents: [process.env.GDRIVE_N10_FOLDER_ID!], // Put it in a specific N10 folder
    },
    media: {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path), // Read the file Multer just saved
    },
  });

  return `https://drive.google.com/uc?id=${response.data.id}`; // File url 
};

// THE LOCAL STRATEGY (Fallback)
const uploadToLocal = async (file: Express.Multer.File): Promise<string> => {
  // If we are just using local storage, the file is already saved by Multer!
  // We just return the local path.
  return `http://localhost:4000/${file.path}`;
};

// 4. THE SWITCHBOARD 
export const uploadFileToCloud = async (file: Express.Multer.File): Promise<string> => {
  if (ACTIVE_PROVIDER === 'GDRIVE') {
    console.log("☁️ Feature Flag: Routing file to Google Drive...");
    return await uploadToGoogleDrive(file);
  } 
  
  if (ACTIVE_PROVIDER === 'R2') {
    console.log("☁️ Feature Flag: Routing file to Cloudflare R2...");
    // TODO
    // return await uploadToCloudflareR2(file);
  }

  console.log("📁 Feature Flag: Routing file to Local Storage...");
  return await uploadToLocal(file);
};