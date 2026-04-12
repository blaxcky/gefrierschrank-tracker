import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AuthUser, Household, UserProfile } from '../store/useSessionStore'
import { clearLocalData } from './syncService'

interface HouseholdMemberRow {
  household_id: string
  role: string
}

interface HouseholdRow {
  id: string
  name: string
}

export interface SessionContext {
  user: AuthUser
  profile: UserProfile
  household: Household | null
}

function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase ist noch nicht konfiguriert.')
  }

  return supabase
}

export async function signInWithPassword(email: string, password: string) {
  const client = getSupabaseClient()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(error.message)
  }
}

export async function signOutUser() {
  if (supabase) {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }

  await clearLocalData()
}

export async function resolveSessionContext(session: Session): Promise<SessionContext> {
  const client = getSupabaseClient()
  const email = session.user.email ?? ''
  const displayName = typeof session.user.user_metadata.display_name === 'string'
    ? session.user.user_metadata.display_name
    : null

  const { error: profileError } = await client.from('profiles').upsert({
    id: session.user.id,
    email,
    display_name: displayName,
  })

  if (profileError) {
    throw new Error(profileError.message)
  }

  const user: AuthUser = {
    id: session.user.id,
    email,
  }

  const profile: UserProfile = {
    id: session.user.id,
    email,
    displayName,
  }

  const { data: membership, error: membershipError } = await client
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', session.user.id)
    .limit(1)
    .maybeSingle<HouseholdMemberRow>()

  if (membershipError) {
    throw new Error(membershipError.message)
  }

  if (!membership) {
    return {
      user,
      profile,
      household: null,
    }
  }

  const { data: householdRow, error: householdError } = await client
    .from('households')
    .select('id, name')
    .eq('id', membership.household_id)
    .single<HouseholdRow>()

  if (householdError) {
    throw new Error(householdError.message)
  }

  return {
    user,
    profile,
    household: {
      id: householdRow.id,
      name: householdRow.name,
      role: membership.role,
    },
  }
}
