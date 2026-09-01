import { Router } from 'express';
import { validateResource } from '../../middlewares/validateRessource';
import { createLeadSchema } from './lead.schema';
import { createLeadHandler } from './createLead';
import { getLeadsHandler } from './getLeads';
import { requireUser } from '../../middlewares/requireUser';
import { requireAdmin } from '../../middlewares/requireAdmin';
import { publicLeadLimiter } from '../../middlewares/rateLimit';
import { verifyTurnstile } from '../../middlewares/verifyTurnstile';
import { getLeadSchema } from './lead.schema';
import { getLeadHandler } from './getLead';
import { updateLeadSchema } from './lead.schema';
import { updateLeadHandler } from './updateLead';
// Make sure requireUser is still imported!
const leadRouter = Router();

// PUBLIC ROUTE — rate limit, then bot check, then validate, then handle.
leadRouter.post(
  '/',
  publicLeadLimiter,
  verifyTurnstile,
  validateResource(createLeadSchema),
  createLeadHandler,
);


// ADMIN ROUTES — JWT, then role gate, then (where relevant) validation.
leadRouter.get('/', requireUser, requireAdmin, getLeadsHandler);

leadRouter.get('/:id', requireUser, requireAdmin, validateResource(getLeadSchema), getLeadHandler);

leadRouter.patch(
  '/:id',
  requireUser,
  requireAdmin,
  validateResource(updateLeadSchema),
  updateLeadHandler,
);

export { leadRouter };