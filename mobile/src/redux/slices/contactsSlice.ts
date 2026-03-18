import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { contactService } from '../../services/contactService';
import { TrustedContact } from '../../types';

type ContactsState = {
  items: TrustedContact[];
  loading: boolean;
  error: string | null;
};

const initialState: ContactsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchContacts = createAsyncThunk('contacts/list', contactService.listContacts);
export const addContact = createAsyncThunk('contacts/add', contactService.addTrustedContact);
export const removeContact = createAsyncThunk('contacts/remove', contactService.removeTrustedContact);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load contacts';
      })
      .addCase(addContact.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(removeContact.fulfilled, (state, action) => {
        state.items = state.items.filter((contact) => contact.id !== action.payload);
      });
  },
});

export default contactsSlice.reducer;
