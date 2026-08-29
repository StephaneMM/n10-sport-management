import { Router } from 'express';
import { createProfileHandler } from './createProfile';
import { requireUser } from '../../middlewares/requireUser';
import { validateResource } from '../../middlewares/validateRessource';
import { createProfileSchema, updateProfileSchema } from './profile.schema';
import { getProfileHandler } from './getProfile';
import { updateProfileHandler } from './updateProfile';
import { addDocumentHandler } from './addDocument';
import { addDocumentSchema } from './profile.schema';

const profileRouter = Router();

// requireUser: Do you have a valid JWT?
// validateResource: Is your sports data perfectly formatted?
// createProfileHandler: Save it to PostgreSQL!
profileRouter.post(
  '/', 
  requireUser, 
  validateResource(createProfileSchema), 
  createProfileHandler
);

profileRouter.get('/me', requireUser, getProfileHandler);

// UPDATE PROFILE
profileRouter.patch(
  '/me', 
  requireUser, 
  validateResource(updateProfileSchema), 
  updateProfileHandler
);

// ADD DOCUMENT TO VAULT
profileRouter.post(
  '/me/documents',
  requireUser,
  validateResource(addDocumentSchema),
  addDocumentHandler
);

export { profileRouter };



