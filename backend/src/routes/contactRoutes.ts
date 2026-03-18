import { Router } from 'express';

import { contactController } from '../controllers/contactController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { addContactSchema } from '../services/contactService';

export const contactRoutes = Router();

contactRoutes.use(requireAuth);
contactRoutes.get('/', contactController.list);
contactRoutes.post('/', validateBody(addContactSchema), contactController.add);
contactRoutes.delete('/:contactId', contactController.remove);
