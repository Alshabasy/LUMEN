import { create } from 'zustand'

interface ExplorerState {
  siteId: string
  compareSiteId: string
  cursor: number
  isPlaying: boolean
  compare: boolean
  setSiteId: (siteId: string) => void
  setCompareSiteId: (siteId: string) => void
  setCursor: (cursor: number) => void
  setPlaying: (isPlaying: boolean) => void
  setCompare: (compare: boolean) => void
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  siteId: 'apollo-11',
  compareSiteId: 'apollo-12',
  cursor: 0,
  isPlaying: false,
  compare: false,
  setSiteId: (siteId) => set((state) => ({
    siteId,
    cursor: 0,
    compareSiteId: state.compareSiteId === siteId
      ? (siteId === 'apollo-11' ? 'apollo-12' : 'apollo-11')
      : state.compareSiteId,
  })),
  setCompareSiteId: (compareSiteId) => set({ compareSiteId }),
  setCursor: (cursor) => set({ cursor }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCompare: (compare) => set({ compare }),
}))
