import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { PublicUser, User } from '../models/types';
import { env } from '../utils/env';
import { AppError } from '../utils/errors';
import { prisma } from './prisma';
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

const toPublicUser = (
  user: {
    id: string;
    name: string;
    phone: string;
    email: string;
    photoUrl: string;
    homeLatitude: number | null;
    homeLongitude: number | null;
    guardianAvailable: boolean;
    guardianVerificationBadge: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';
    guardianAssistCount: number;
    createdAt: Date;
    trustedContacts: { id: string }[];
  } | User
): PublicUser => ({
  id: user.id,
  name: user.name,
  phone: user.phone,
  email: user.email,
  photoUrl: user.photoUrl,
  homeLocation:
    'homeLocation' in user
      ? user.homeLocation
      : user.homeLatitude != null && user.homeLongitude != null
        ? { latitude: user.homeLatitude, longitude: user.homeLongitude }
        : null,
  trustedContacts:
    'trustedContacts' in user && Array.isArray(user.trustedContacts)
      ? user.trustedContacts.map((entry) => (typeof entry === 'string' ? entry : entry.id))
      : [],
  guardianAvailable: user.guardianAvailable ?? false,
  guardianVerificationBadge: user.guardianVerificationBadge ?? 'NONE',
  guardianAssistCount: user.guardianAssistCount ?? 0,
  createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
});

const createTokens = (userId: string) => {
  const accessToken = jwt.sign({ sub: userId }, env.jwtAccessSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ sub: userId }, env.jwtRefreshSecret, { expiresIn: '7d' });
  store.refreshTokens.set(refreshToken, userId);

  return { accessToken, refreshToken };
};

export const authService = {
  async register(input: z.infer<typeof registerSchema>) {
    const email = input.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        email,
        photoUrl: input.photoUrl ?? '',
        passwordHash,
      },
      include: {
        trustedContacts: {
          select: { id: true },
        },
      },
    });

    return {
      user: toPublicUser(user),
      tokens: createTokens(user.id),
    };
  },

  async login(input: z.infer<typeof loginSchema>) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        trustedContacts: {
          select: { id: true },
        },
      },
    });

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

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trustedContacts: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return toPublicUser(user);
  },

  async updateProfile(
    userId: string,
    updates: {
      name?: string;
      phone?: string;
      photoUrl?: string;
      homeLocation?: { latitude: number; longitude: number } | null;
    }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
        ...(updates.photoUrl !== undefined ? { photoUrl: updates.photoUrl } : {}),
        ...(updates.homeLocation !== undefined
          ? {
              homeLatitude: updates.homeLocation?.latitude ?? null,
              homeLongitude: updates.homeLocation?.longitude ?? null,
            }
          : {}),
      },
      include: {
        trustedContacts: {
          select: { id: true },
        },
      },
    });

    return toPublicUser(user);
  },
};
