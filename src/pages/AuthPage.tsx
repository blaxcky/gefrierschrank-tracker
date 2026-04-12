import { useState } from 'react'
import { Button, Page } from 'konsta/react'
import { initializeDatabase } from '../db/seed'
import { signInWithPassword } from '../services/authService'
import { useSessionStore } from '../store/useSessionStore'
import { setLocalOnlyPreferred } from '../utils/localMode'

export default function AuthPage() {
  const authError = useSessionStore((state) => state.authError)
  const setSession = useSessionStore((state) => state.setSession)
  const setAuthError = useSessionStore((state) => state.setAuthError)
  const setSyncState = useSessionStore((state) => state.setSyncState)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEnterLocalMode = async () => {
    setLocalOnlyPreferred(true)
    await initializeDatabase()
    setSession({
      status: 'local_only',
      user: null,
      profile: null,
      household: null,
      authError: null,
    })
    setAuthError(null)
    setSyncState({
      isSyncing: false,
      syncError: null,
      lastSyncAt: null,
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Bitte alle Pflichtfelder ausfüllen.')
      return
    }

    setIsSubmitting(true)
    setAuthError(null)
    setError(null)

    try {
      await signInWithPassword(email.trim(), password)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Anmeldung fehlgeschlagen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Page style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, #EFF6FF 0%, #F8FAFC 55%, #F2F2F7 100%)' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', padding: '48px 20px 32px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 22,
            }}
            >
              ❄
            </div>
            <div>
              <div style={{ fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', color: '#64748B' }}>
                Gemeinsamer Vorrat
              </div>
              <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, color: '#0F172A' }}>
                Gefrierschrank Tracker
              </h1>
            </div>
          </div>
          <p style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>
            Melde dich mit deinem manuell freigeschalteten Konto an. Neue Konten werden nicht in der App registriert, sondern von dir in Supabase angelegt.
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          borderRadius: 24,
          padding: 18,
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
        }}
        >
          <div
            style={{
              marginBottom: 18,
              borderRadius: 14,
              padding: '12px 14px',
              background: '#0F172A',
              color: 'white',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            Login
          </div>

          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                E-Mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="du@example.com"
                autoComplete="email"
                style={inputStyle}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Passwort
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Dein Passwort"
                autoComplete="current-password"
                style={inputStyle}
              />
            </label>

            {error && (
              <div style={messageStyle('#FEF2F2', '#DC2626')}>
                {error}
              </div>
            )}

            {!error && authError && (
              <div style={messageStyle('#FEF2F2', '#B91C1C')}>
                {authError}
              </div>
            )}

            <Button large type="submit" disabled={isSubmitting} style={{ width: '100%', background: '#2563EB', color: 'white' }}>
              {isSubmitting ? 'Bitte warten...' : 'Anmelden'}
            </Button>
          </form>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #E2E8F0' }}>
            <button
              onClick={() => { void handleEnterLocalMode() }}
              style={{
                width: '100%',
                border: '1px solid #CBD5E1',
                borderRadius: 14,
                padding: '12px 14px',
                background: '#F8FAFC',
                color: '#334155',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Ohne Konto lokal nutzen
            </button>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#64748B', lineHeight: 1.45 }}>
              Die App bleibt voll nutzbar, speichert dann aber nur auf diesem Gerät.
            </p>
          </div>
        </div>
      </div>
    </Page>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #CBD5E1',
  borderRadius: 14,
  padding: '14px 15px',
  fontSize: 15,
  background: '#FFF',
  boxSizing: 'border-box',
}

function messageStyle(background: string, color: string): React.CSSProperties {
  return {
    marginBottom: 14,
    background,
    color,
    borderRadius: 14,
    padding: '12px 14px',
    fontSize: 13,
    lineHeight: 1.45,
  }
}
