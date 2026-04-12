import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
}

export interface UserProfile {
  id: string
  email: string
  displayName: string | null
}

export interface Household {
  id: string
  name: string
  role: string
}

export type SessionStatus = 'loading' | 'local_only' | 'signed_out' | 'needs_access' | 'ready'

interface SessionState {
  status: SessionStatus
  isConfigured: boolean
  user: AuthUser | null
  profile: UserProfile | null
  household: Household | null
  authError: string | null
  isSyncing: boolean
  lastSyncAt: Date | null
  syncError: string | null
  setConfigured: (configured: boolean) => void
  setSession: (input: {
    status: SessionStatus
    user?: AuthUser | null
    profile?: UserProfile | null
    household?: Household | null
    authError?: string | null
  }) => void
  setAuthError: (authError: string | null) => void
  setSyncState: (input: {
    isSyncing?: boolean
    lastSyncAt?: Date | null
    syncError?: string | null
  }) => void
  reset: (status?: SessionStatus) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  isConfigured: true,
  user: null,
  profile: null,
  household: null,
  authError: null,
  isSyncing: false,
  lastSyncAt: null,
  syncError: null,
  setConfigured: (configured) => set({
    isConfigured: configured,
    status: configured ? 'loading' : 'local_only',
  }),
  setSession: ({ status, user = null, profile = null, household = null, authError = null }) => set({
    status,
    user,
    profile,
    household,
    authError,
  }),
  setAuthError: (authError) => set({ authError }),
  setSyncState: ({ isSyncing, lastSyncAt, syncError }) => set((state) => ({
    isSyncing: typeof isSyncing === 'boolean' ? isSyncing : state.isSyncing,
    lastSyncAt: lastSyncAt !== undefined ? lastSyncAt : state.lastSyncAt,
    syncError: syncError !== undefined ? syncError : state.syncError,
  })),
  reset: (status = 'signed_out') => set({
    status,
    user: null,
    profile: null,
    household: null,
    authError: null,
    isSyncing: false,
    lastSyncAt: null,
    syncError: null,
  }),
}))
