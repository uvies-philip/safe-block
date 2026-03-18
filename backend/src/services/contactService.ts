import { z } from 'zod';

import { TrustedContact } from '../models/types';
import { AppError } from '../utils/errors';
import { prisma } from './prisma';

export const addContactSchema = z.object({
  contactName: z.string().min(2),
  phone: z.string().min(7),
  relationship: z.string().min(2),
});

export const contactService = {
  async list(userId: string) {
    const contacts = await prisma.trustedContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return contacts.map((contact) => ({
      id: contact.id,
      userId: contact.userId,
      contactName: contact.contactName,
      phone: contact.phone,
      relationship: contact.relationship,
      createdAt: contact.createdAt.toISOString(),
    }));
  },

  async add(userId: string, input: z.infer<typeof addContactSchema>) {
    const contact = await prisma.trustedContact.create({
      data: {
        userId,
        contactName: input.contactName,
        phone: input.phone,
        relationship: input.relationship,
      },
    });

    const mapped: TrustedContact = {
      id: contact.id,
      userId: contact.userId,
      contactName: contact.contactName,
      phone: contact.phone,
      relationship: contact.relationship,
      createdAt: contact.createdAt.toISOString(),
    };

    return mapped;
  },

  async remove(userId: string, contactId: string) {
    const deleted = await prisma.trustedContact.deleteMany({
      where: { id: contactId, userId },
    });

    if (deleted.count === 0) {
      throw new AppError('Trusted contact not found', 404);
    }
  },
};
