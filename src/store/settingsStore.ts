import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  currency: string;
  locale: string;
  setCurrency: (currency: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: 'ILS',
      locale: 'he-IL',
      setCurrency: (currency) => set({ currency }),
    }),
    { name: 'junkie-settings' }
  )
);
