import { z } from 'zod';

import { TrustedContact } from '../models/types';
import { createId } from '../utils/id';
import { AppError } from '../utils/errors';
import { store } from './store';

export const addContactSchema = z.object({
  contactName: z.string().min(2),
  phone: z.string().min(7),
  relationship: z.string().min(2),
});

export const contactService = {
  list(userId: string) {
    return store.contacts.filter((contact) => contact.userId === userId);
  },

  add(userId: string, input: z.infer<typeof addContactSchema>) {
    const contact: TrustedContact = {
      id: createId(),
      userId,
      contactName: input.contactName,
      phone: input.phone,
      relationship: input.relationship,
      createdAt: new Date().toISOString(),
    };

    store.contacts.push(contact);

    const user = store.users.find((entry) => entry.id === userId);
    if (user) {
      user.trustedContacts.push(contact.id);
    }

    return contact;
  },

  remove(userId: string, contactId: string) {
    const index = store.contacts.findIndex((contact) => contact.id === contactId && contact.userId === userId);

    if (index === -1) {
      throw new AppError('Trusted contact not found', 404);
    }

    store.contacts.splice(index, 1);

    const user = store.users.find((entry) => entry.id === userId);
    if (user) {
      user.trustedContacts = user.trustedContacts.filter((entry) => entry !== contactId);
    }
  },
};
