import { Router } from 'express';
import { z } from 'zod';

import { authController } from '../controllers/authController';
import { validateBody } from '../middleware/validate';
import { loginSchema, registerSchema } from '../services/authService';

const logoutSchema = z.object({
  refreshToken: z.string().min(10),
});

export const authRoutes = Router();

authRoutes.post('/register', validateBody(registerSchema), authController.register);
authRoutes.post('/login', validateBody(loginSchema), authController.login);
authRoutes.post('/logout', validateBody(logoutSchema), authController.logout);
