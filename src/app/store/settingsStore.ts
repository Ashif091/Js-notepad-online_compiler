import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
    tabFunction: boolean
    formatFunction: boolean
    useCodeEditor: boolean
    setTabFunction: (value: boolean) => void
    setFormatFunction: (value: boolean) => void
    setUseCodeEditor: (value: boolean) => void
  }
  

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
        tabFunction: true,
        formatFunction: true,
        useCodeEditor: false,
        setTabFunction: (value) => set({ tabFunction: value }),
        setFormatFunction: (value) => set({ formatFunction: value }),
        setUseCodeEditor: (value) => set({ useCodeEditor: value }),
    }),
    {
      name: "settings-storage", 
    }
  )
);
