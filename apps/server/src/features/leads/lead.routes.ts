import { Router } from 'express';
import { validateResource } from '../../middlewares/validateRessource';
import { createLeadSchema } from './lead.schema';
import { createLeadHandler } from './createLead';
import { getLeadsHandler } from './getLeads';
import { requireUser } from '../../middlewares/requireUser';

const leadRouter = Router();

// PUBLIC ROUTE
leadRouter.post('/', validateResource(createLeadSchema), createLeadHandler);


// ADMIN ROUTE - checks for 'ADMIN' in getLeadsHandler and JWT with requireUser
// TODO: create an requireAdmin bouncer middleware instead of doing it in the handler
leadRouter.get('/', requireUser, getLeadsHandler);

export { leadRouter };