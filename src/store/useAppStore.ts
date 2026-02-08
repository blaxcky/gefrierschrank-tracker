import { create } from 'zustand'

interface AppState {
  isAddItemSheetOpen: boolean
  isAddDrawerSheetOpen: boolean
  editingDrawerId: string | null

  setAddItemSheetOpen: (open: boolean) => void
  setAddDrawerSheetOpen: (open: boolean) => void
  setEditingDrawerId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  isAddItemSheetOpen: false,
  isAddDrawerSheetOpen: false,
  editingDrawerId: null,

  setAddItemSheetOpen: (open) => set({ isAddItemSheetOpen: open }),
  setAddDrawerSheetOpen: (open) => set({ isAddDrawerSheetOpen: open }),
  setEditingDrawerId: (id) => set({ editingDrawerId: id }),
}))
