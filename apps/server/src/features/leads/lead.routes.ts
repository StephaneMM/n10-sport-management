import { Router } from 'express';
import { validateResource } from '../../middlewares/validateRessource';
import { createLeadSchema } from './lead.schema';
import { createLeadHandler } from './createLead';
import { getLeadsHandler } from './getLeads';
import { requireUser } from '../../middlewares/requireUser';
import { publicLeadLimiter } from '../../middlewares/rateLimit';
import { getLeadSchema } from './lead.schema';
import { getLeadHandler } from './getLead';
import { updateLeadSchema } from './lead.schema';
import { updateLeadHandler } from './updateLead';
// Make sure requireUser is still imported!
const leadRouter = Router();

// PUBLIC ROUTE
leadRouter.post('/', publicLeadLimiter, validateResource(createLeadSchema), createLeadHandler);


// ADMIN ROUTE - checks for 'ADMIN' in getLeadsHandler and JWT with requireUser
// TODO: create an requireAdmin bouncer middleware instead of doing it in the handler
leadRouter.get('/', requireUser, getLeadsHandler);

// ADMIN ROUTE - Get a single lead by ID
leadRouter.get(
  '/:id', 
  requireUser, 
  validateResource(getLeadSchema), 
  getLeadHandler
);

// ADMIN ROUTE - Update a lead (e.g., add admin comments)
leadRouter.patch(
  '/:id', 
  requireUser, 
  validateResource(updateLeadSchema), 
  updateLeadHandler
);

export { leadRouter };