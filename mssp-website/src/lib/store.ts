import { create } from 'zustand'

export type AssetCategory = 'endpoint' | 'cloud' | 'server' | 'saas' | 'user'
export type SocModuleId = 'siem' | 'xdr' | 'soar' | 'ndr' | 'ti'
export type ContactIntent = 'assessment' | 'demo'

interface UIState {
  /** Preloader finished — kicks off the hero intro. */
  ready: boolean
  setReady: () => void

  /** Asset category highlighted from either the legend or the 3D scene. */
  hoveredAsset: AssetCategory | null
  setHoveredAsset: (c: AssetCategory | null) => void

  activeModule: SocModuleId
  setActiveModule: (m: SocModuleId) => void

  /** Active attack-chain stage (0..4) driven by scroll. */
  chainStage: number
  setChainStage: (s: number) => void

  contact: ContactIntent | null
  openContact: (intent: ContactIntent) => void
  closeContact: () => void
}

export const useUI = create<UIState>((set) => ({
  ready: false,
  setReady: () => set({ ready: true }),

  hoveredAsset: null,
  setHoveredAsset: (hoveredAsset) => set({ hoveredAsset }),

  activeModule: 'siem',
  setActiveModule: (activeModule) => set({ activeModule }),

  chainStage: 0,
  setChainStage: (chainStage) => set({ chainStage }),

  contact: null,
  openContact: (contact) => set({ contact }),
  closeContact: () => set({ contact: null }),
}))
