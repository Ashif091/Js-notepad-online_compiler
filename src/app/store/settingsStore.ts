import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
    tabFunction: boolean
    formatFunction: boolean
    useCodeEditor: boolean
    autoClosing:boolean
    autoAdjust:boolean
    setAutoAdjust: (value: boolean) => void
    setAutoClosing: (value: boolean) => void
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
        autoClosing: true,
        autoAdjust:true,
        setAutoAdjust: (value) => set({ autoAdjust: value }),
        setAutoClosing: (value) => set({ autoClosing: value }),
        setTabFunction: (value) => set({ tabFunction: value }),
        setFormatFunction: (value) => set({ formatFunction: value }),
        setUseCodeEditor: (value) => set({ useCodeEditor: value }),
    }),
    {
      name: "settings-storage", 
    }
  )
);
