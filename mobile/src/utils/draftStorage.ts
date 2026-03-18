import AsyncStorage from '@react-native-async-storage/async-storage';

import { IncidentDraft } from '../types';

const DRAFT_STORAGE_KEY = 'safeblock:incident_drafts';

export const draftStorage = {
  async loadDrafts(): Promise<IncidentDraft[]> {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as IncidentDraft[]) : [];
    } catch {
      return [];
    }
  },

  async saveDraft(draft: IncidentDraft): Promise<void> {
    const drafts = await draftStorage.loadDrafts();
    const next = [...drafts.filter((d) => d.draftId !== draft.draftId), draft];
    await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
  },

  async removeDraft(draftId: string): Promise<void> {
    const drafts = await draftStorage.loadDrafts();
    await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts.filter((d) => d.draftId !== draftId)));
  },

  async updateDraftStatus(
    draftId: string,
    status: IncidentDraft['status'],
    lastError?: string
  ): Promise<void> {
    const drafts = await draftStorage.loadDrafts();
    const next = drafts.map((d) => {
      if (d.draftId !== draftId) {
        return d;
      }

      return {
        ...d,
        status,
        retryCount: status === 'failed' ? d.retryCount + 1 : d.retryCount,
        lastError: lastError ?? d.lastError,
      };
    });
    await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
  },
};
