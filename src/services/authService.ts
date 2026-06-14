import type { Session } from '@supabase/supabase-js'
import { db, type SyncEntityBase } from '../db/database'
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

const LAST_SESSION_CONTEXT_KEY = 'auth:last-session-context'

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

export async function cacheSessionContext(context: SessionContext) {
  await db.appMeta.put({
    key: LAST_SESSION_CONTEXT_KEY,
    value: JSON.stringify(context),
  })
}

function readSessionProfile(session: Session): UserProfile {
  const email = session.user.email ?? ''
  const displayName = typeof session.user.user_metadata.display_name === 'string'
    ? session.user.user_metadata.display_name
    : null

  return {
    id: session.user.id,
    email,
    displayName,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseCachedSessionContext(value: string): SessionContext | null {
  try {
    const parsed = JSON.parse(value) as unknown
    if (!isRecord(parsed) || !isRecord(parsed.user) || !isRecord(parsed.profile)) {
      return null
    }

    const household = parsed.household
    if (
      household !== null
      && (
        !isRecord(household)
        || typeof household.id !== 'string'
        || typeof household.name !== 'string'
        || typeof household.role !== 'string'
      )
    ) {
      return null
    }

    if (
      typeof parsed.user.id !== 'string'
      || typeof parsed.user.email !== 'string'
      || typeof parsed.profile.id !== 'string'
      || typeof parsed.profile.email !== 'string'
      || (
        parsed.profile.displayName !== null
        && typeof parsed.profile.displayName !== 'string'
      )
    ) {
      return null
    }

    const validatedHousehold: Household | null = household === null
      ? null
      : {
          id: household.id as string,
          name: household.name as string,
          role: household.role as string,
        }

    return {
      user: {
        id: parsed.user.id,
        email: parsed.user.email,
      },
      profile: {
        id: parsed.profile.id,
        email: parsed.profile.email,
        displayName: parsed.profile.displayName,
      },
      household: validatedHousehold,
    }
  } catch {
    return null
  }
}

async function resolveSingleLocalHouseholdId(): Promise<string | null> {
  const householdIds = new Set<string>()
  const collectHouseholdId = (entity: Pick<SyncEntityBase, 'householdId'>) => {
    if (entity.householdId) {
      householdIds.add(entity.householdId)
    }
  }

  const [freezers, drawers, items, tags] = await Promise.all([
    db.freezers.toArray(),
    db.drawers.toArray(),
    db.items.toArray(),
    db.tags.toArray(),
  ])

  freezers.forEach(collectHouseholdId)
  drawers.forEach(collectHouseholdId)
  items.forEach(collectHouseholdId)
  tags.forEach(collectHouseholdId)

  return householdIds.size === 1 ? [...householdIds][0] : null
}

export async function resolveOfflineSessionContext(session: Session): Promise<SessionContext | null> {
  const cachedContext = await db.appMeta.get(LAST_SESSION_CONTEXT_KEY)
  if (cachedContext) {
    const context = parseCachedSessionContext(cachedContext.value)
    if (context?.user.id === session.user.id && context.household) {
      return context
    }
  }

  const householdId = await resolveSingleLocalHouseholdId()
  if (!householdId) {
    return null
  }

  const profile = readSessionProfile(session)
  return {
    user: {
      id: session.user.id,
      email: profile.email,
    },
    profile,
    household: {
      id: householdId,
      name: 'Haushalt',
      role: 'member',
    },
  }
}

export function getFriendlyAuthSetupError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unbekannter Fehler beim Laden der Sitzung.'
  const normalized = message.toLowerCase()

  if (
    normalized.includes('profiles')
    || normalized.includes('row-level security')
    || normalized.includes('violates row-level security policy')
  ) {
    return 'Anmeldung hat funktioniert, aber das Profil konnte nicht geladen oder angelegt werden. Prüfe `public.profiles` sowie die zugehörigen RLS-Policies.'
  }

  if (normalized.includes('household_members')) {
    return 'Anmeldung hat funktioniert, aber der Zugriff auf `public.household_members` ist fehlgeschlagen. Prüfe Mitgliedschaft und RLS-Policies.'
  }

  if (normalized.includes('permission denied') || normalized.includes('not allowed')) {
    return 'Anmeldung hat funktioniert, aber Supabase blockiert den Datenzugriff. Prüfe RLS-Policies und Tabellenrechte für `profiles` und `household_members`.'
  }

  return `Anmeldung hat funktioniert, aber die Sitzung konnte nicht vorbereitet werden. Prüfe \`public.profiles\`, \`public.household_members\` und die Supabase-Policies. Technischer Hinweis: ${message}`
}
