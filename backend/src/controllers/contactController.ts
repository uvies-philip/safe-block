import { NextFunction, Request, Response } from 'express';

import { contactService } from '../services/contactService';

export const contactController = {
  async list(request: Request, response: Response, next: NextFunction) {
    try {
      response.json(await contactService.list(request.userId as string));
    } catch (error) {
      next(error);
    }
  },

  async add(request: Request, response: Response, next: NextFunction) {
    try {
      const contact = await contactService.add(request.userId as string, request.body);
      response.status(201).json(contact);
    } catch (error) {
      next(error);
    }
  },

  async remove(request: Request, response: Response, next: NextFunction) {
    try {
      await contactService.remove(request.userId as string, String(request.params.contactId));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
