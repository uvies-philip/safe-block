import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { PublicUser, User } from '../models/types';
import { createId } from '../utils/id';
import { env } from '../utils/env';
import { AppError } from '../utils/errors';
import { store } from './store';

export const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email(),
  password: z.string().min(8),
  photoUrl: z.string().url().optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  email: user.email,
  photoUrl: user.photoUrl,
  homeLocation: user.homeLocation,
  trustedContacts: user.trustedContacts,
  guardianAvailable: user.guardianAvailable ?? false,
  guardianVerificationBadge: user.guardianVerificationBadge ?? 'NONE',
  guardianAssistCount: user.guardianAssistCount ?? 0,
  createdAt: user.createdAt,
});

const createTokens = (userId: string) => {
  const accessToken = jwt.sign({ sub: userId }, env.jwtAccessSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: userId }, env.jwtRefreshSecret, { expiresIn: '7d' });
  store.refreshTokens.set(refreshToken, userId);

  return { accessToken, refreshToken };
};

export const authService = {
  async register(input: z.infer<typeof registerSchema>) {
    const existingUser = store.users.find((user) => user.email.toLowerCase() === input.email.toLowerCase());

    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user: User = {
      id: createId(),
      name: input.name,
      phone: input.phone,
      email: input.email.toLowerCase(),
      photoUrl: input.photoUrl ?? '',
      passwordHash,
      homeLocation: null,
      trustedContacts: [],
      guardianAvailable: false,
      guardianVerificationBadge: 'NONE',
      guardianAssistCount: 0,
      createdAt: new Date().toISOString(),
    };

    store.users.push(user);

    return {
      user: toPublicUser(user),
      tokens: createTokens(user.id),
    };
  },

  async login(input: z.infer<typeof loginSchema>) {
    const user = store.users.find((entry) => entry.email.toLowerCase() === input.email.toLowerCase());

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError('Invalid email or password', 401);
    }

    return {
      user: toPublicUser(user),
      tokens: createTokens(user.id),
    };
  },

  logout(refreshToken: string) {
    store.refreshTokens.delete(refreshToken);
  },

  getProfile(userId: string) {
    const user = store.users.find((entry) => entry.id === userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return toPublicUser(user);
  },
};
