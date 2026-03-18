import { api } from './api';
import { TrustedContact } from '../types';

export const contactService = {
  async listContacts() {
    const response = await api.get<TrustedContact[]>('/contacts');
    return response.data;
  },

  async addTrustedContact(payload: { contactName: string; phone: string; relationship: string }) {
    const response = await api.post<TrustedContact>('/contacts', payload);
    return response.data;
  },

  async removeTrustedContact(contactId: string) {
    await api.delete(`/contacts/${contactId}`);
    return contactId;
  },

  notifyContacts(contactIds: string[]) {
    return contactIds;
  },
};
