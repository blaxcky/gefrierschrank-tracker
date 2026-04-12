import { type PropsWithChildren, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { initializeDatabase } from '../../db/seed'
import { resolveSessionContext } from '../../services/authService'
import { clearLocalData, hydrateSyncStateFromDatabase, synchronizeHousehold } from '../../services/syncService'
import { useSessionStore } from '../../store/useSessionStore'

export default function AppBootstrap({ children }: PropsWithChildren) {
  const setConfigured = useSessionStore((state) => state.setConfigured)
  const setSession = useSessionStore((state) => state.setSession)
  const reset = useSessionStore((state) => state.reset)
  const setSyncState = useSessionStore((state) => state.setSyncState)

  useEffect(() => {
    let isActive = true

    const handleSession = async (session: Session | null) => {
      if (!isActive) return

      if (!session) {
        reset('signed_out')
        return
      }

      try {
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
          })
          return
        }

        setSession({
          status: 'ready',
          user: context.user,
          profile: context.profile,
          household: context.household,
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
        setSyncState({
          syncError: error instanceof Error ? error.message : 'Sitzung konnte nicht geladen werden.',
        })
      }
    }

    setConfigured(isSupabaseConfigured)

    if (!isSupabaseConfigured || !supabase) {
      void initializeDatabase().then(() => {
        if (!isActive) return
        setSession({
          status: 'local_only',
          user: null,
          profile: null,
          household: null,
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
  }, [reset, setConfigured, setSession, setSyncState])

  return <>{children}</>
}
