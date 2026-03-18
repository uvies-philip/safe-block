import { Request, Response } from 'express';

import { contactService } from '../services/contactService';

export const contactController = {
  list(request: Request, response: Response) {
    response.json(contactService.list(request.userId as string));
  },

  add(request: Request, response: Response) {
    const contact = contactService.add(request.userId as string, request.body);
    response.status(201).json(contact);
  },

  remove(request: Request, response: Response) {
    contactService.remove(request.userId as string, String(request.params.contactId));
    response.status(204).send();
  },
};
