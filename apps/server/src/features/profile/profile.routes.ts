import { Router } from 'express';
import { createProfileHandler } from './createProfile';
import { requireUser } from '../../middlewares/requireUser';
import { validateResource } from '../../middlewares/validateRessource';
import { createProfileSchema } from './profile.schema';

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

console.log("🏀 Profile Router has been successfully loaded!");

export { profileRouter };