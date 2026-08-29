import { Router } from 'express';
import { requireUser } from '../../middlewares/requireUser';
import { validateResource } from '../../middlewares/validateRessource';
import { upload } from '../../middlewares/upload.middleware';
import {
  createProfileSchema,
  updateProfileSchema,
  addDocumentSchema,
  documentIdParamSchema,
} from './profile.schema';
import { createProfileHandler } from './createProfile';
import { getProfileHandler } from './getProfile';
import { updateProfileHandler } from './updateProfile';
import { addDocumentHandler } from './addDocument';
import { downloadDocumentHandler } from './downloadDocument';
import { deleteDocumentHandler } from './deleteDocument';

const profileRouter = Router();

profileRouter.post('/', requireUser, validateResource(createProfileSchema), createProfileHandler);

profileRouter.get('/me', requireUser, getProfileHandler);

profileRouter.patch('/me', requireUser, validateResource(updateProfileSchema), updateProfileHandler);

// Upload a document (multipart: `document` file + `type` field)
profileRouter.post(
  '/me/documents',
  requireUser,
  upload.single('document'),
  validateResource(addDocumentSchema),
  addDocumentHandler,
);

// Download a document — streamed from storage, own documents only
profileRouter.get(
  '/me/documents/:id/download',
  requireUser,
  validateResource(documentIdParamSchema),
  downloadDocumentHandler,
);

// Remove a document from the vault
profileRouter.delete(
  '/me/documents/:id',
  requireUser,
  validateResource(documentIdParamSchema),
  deleteDocumentHandler,
);

export { profileRouter };
