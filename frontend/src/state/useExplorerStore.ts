import { create } from 'zustand'

interface ExplorerState {
  siteId: string
  cursor: number
  isPlaying: boolean
  compare: boolean
  setSiteId: (siteId: string) => void
  setCursor: (cursor: number) => void
  setPlaying: (isPlaying: boolean) => void
  setCompare: (compare: boolean) => void
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  siteId: 'apollo-11',
  cursor: 0,
  isPlaying: false,
  compare: false,
  setSiteId: (siteId) => set({ siteId, cursor: 0 }),
  setCursor: (cursor) => set({ cursor }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCompare: (compare) => set({ compare }),
}))
