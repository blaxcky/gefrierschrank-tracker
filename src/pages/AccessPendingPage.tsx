import { useState } from 'react'
import { Button, Page } from 'konsta/react'
import { signOutUser } from '../services/authService'
import { useSessionStore } from '../store/useSessionStore'

export default function AccessPendingPage() {
  const user = useSessionStore((state) => state.user)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOutUser()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <Page style={{ minHeight: '100dvh', background: 'linear-gradient(180deg, #FFF7ED 0%, #F8FAFC 60%)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '52px 20px 32px' }}>
        <div style={{
          background: 'white',
          borderRadius: 24,
          padding: 24,
          border: '1px solid #FED7AA',
          boxShadow: '0 18px 40px rgba(124, 45, 18, 0.08)',
        }}
        >
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 18,
            background: '#FDBA74',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            marginBottom: 18,
          }}
          >
            !
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 28, color: '#7C2D12' }}>
            Zugang noch nicht freigeschaltet
          </h1>
          <p style={{ margin: '0 0 16px', color: '#9A3412', lineHeight: 1.6 }}>
            {user?.email ?? 'Dieses Konto'} ist angemeldet, aber noch keinem gemeinsamen Haushalt zugeordnet.
          </p>
          <p style={{ margin: '0 0 20px', color: '#475569', lineHeight: 1.6 }}>
            Lege den Nutzer in Supabase in `household_members` an oder fuge die E-Mail uber die vorbereiteten SQL-Schritte hinzu. Danach reicht ein neuer Login.
          </p>
          <Button large disabled={isSigningOut} onClick={handleSignOut} style={{ width: '100%', background: '#7C2D12', color: 'white' }}>
            {isSigningOut ? 'Meldet ab...' : 'Abmelden'}
          </Button>
        </div>
      </div>
    </Page>
  )
}
