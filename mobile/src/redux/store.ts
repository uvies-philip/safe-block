import { configureStore } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice';
import contactsReducer from './slices/contactsSlice';
import hotspotsReducer from './slices/hotspotsSlice';
import incidentsReducer from './slices/incidentsSlice';
import sosReducer from './slices/sosSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    contacts: contactsReducer,
    hotspots: hotspotsReducer,
    incidents: incidentsReducer,
    sos: sosReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
