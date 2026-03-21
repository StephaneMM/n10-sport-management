import { Router } from 'express';
import { createProfileHandler } from './createProfile';
import { requireUser } from '../../middlewares/requireUser';
import { validateResource } from '../../middlewares/validateRessource';
import { createProfileSchema, updateProfileSchema } from './profile.schema';
import { getProfileHandler } from './getProfile';
import { updateProfileHandler } from './updateProfile';

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

// Route 3: UPDATE (The new PATCH route!)
profileRouter.patch(
  '/me', 
  requireUser, 
  validateResource(updateProfileSchema), 
  updateProfileHandler
);

console.log("🏀 Profile Router has been successfully loaded!");

export { profileRouter };



