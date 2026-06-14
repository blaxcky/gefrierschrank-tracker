import { type PropsWithChildren, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { initializeDatabase } from '../../db/seed'
import {
  cacheSessionContext,
  getFriendlyAuthSetupError,
  resolveOfflineSessionContext,
  resolveSessionContext,
  type SessionContext,
} from '../../services/authService'
import { clearLocalData, hydrateSyncStateFromDatabase, synchronizeHousehold } from '../../services/syncService'
import { useSessionStore } from '../../store/useSessionStore'
import { isLocalOnlyPreferred, setLocalOnlyPreferred } from '../../utils/localMode'

export default function AppBootstrap({ children }: PropsWithChildren) {
  const setConfigured = useSessionStore((state) => state.setConfigured)
  const setSession = useSessionStore((state) => state.setSession)
  const setAuthError = useSessionStore((state) => state.setAuthError)
  const reset = useSessionStore((state) => state.reset)
  const setSyncState = useSessionStore((state) => state.setSyncState)

  useEffect(() => {
    let isActive = true

    const handleSession = async (session: Session | null) => {
      if (!isActive) return

      if (!session) {
        if (isSupabaseConfigured && isLocalOnlyPreferred()) {
          await initializeDatabase()
          if (!isActive) return
          setSession({
            status: 'local_only',
            user: null,
            profile: null,
            household: null,
            authError: null,
          })
          setSyncState({
            isSyncing: false,
            syncError: null,
            lastSyncAt: null,
          })
          return
        }

        reset('signed_out')
        return
      }

      try {
        setLocalOnlyPreferred(false)
        setAuthError(null)
        let context: SessionContext
        let offlineSyncError: string | null = null

        try {
          context = await resolveSessionContext(session)
        } catch (error) {
          const offlineContext = await resolveOfflineSessionContext(session)
          if (!offlineContext) {
            throw error
          }

          context = offlineContext
          const message = error instanceof Error
            ? error.message
            : 'Supabase ist aktuell nicht erreichbar.'
          offlineSyncError = `Supabase ist aktuell nicht erreichbar. Lokale Daten werden offline verwendet; neue Änderungen werden später synchronisiert. Technischer Hinweis: ${message}`
        }

        if (!isActive) return

        if (!offlineSyncError) {
          try {
            await cacheSessionContext(context)
          } catch {
            // A stale cache is preferable to blocking a valid online session.
          }
          if (!isActive) return
        }

        if (!context.household) {
          await clearLocalData()
          if (!isActive) return
          setSession({
            status: 'needs_access',
            user: context.user,
            profile: context.profile,
            household: null,
            authError: null,
          })
          return
        }

        setSession({
          status: 'ready',
          user: context.user,
          profile: context.profile,
          household: context.household,
          authError: null,
        })

        await hydrateSyncStateFromDatabase()
        if (!isActive) return

        if (offlineSyncError) {
          setSyncState({
            isSyncing: false,
            syncError: offlineSyncError,
          })
          return
        }

        try {
          await synchronizeHousehold()
        } catch {
          // Sync state is already reflected in the session store.
        }
      } catch (error) {
        if (!isActive) return
        setSession({
          status: 'signed_out',
          user: null,
          profile: null,
          household: null,
          authError: getFriendlyAuthSetupError(error),
        })
        setSyncState({
          isSyncing: false,
          syncError: null,
        })
      }
    }

    setConfigured(isSupabaseConfigured)

    if (!isSupabaseConfigured || !supabase) {
      setLocalOnlyPreferred(true)
      void initializeDatabase().then(() => {
        if (!isActive) return
        setSession({
          status: 'local_only',
          user: null,
          profile: null,
          household: null,
          authError: null,
        })
        setSyncState({
          isSyncing: false,
          syncError: null,
          lastSyncAt: null,
        })
      })

      return () => {
        isActive = false
      }
    }

    void hydrateSyncStateFromDatabase()
    void supabase.auth.getSession().then(({ data }) => handleSession(data.session))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleSession(session)
    })

    return () => {
      isActive = false
      subscription.unsubscribe()
    }
  }, [reset, setAuthError, setConfigured, setSession, setSyncState])

  return <>{children}</>
}
