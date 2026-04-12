import { type PropsWithChildren, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { initializeDatabase } from '../../db/seed'
import { getFriendlyAuthSetupError, resolveSessionContext } from '../../services/authService'
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
        const context = await resolveSessionContext(session)
        if (!isActive) return

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
