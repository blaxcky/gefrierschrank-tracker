import { Page } from 'konsta/react'

export default function ConfigRequiredPage() {
  return (
    <Page style={{ minHeight: '100dvh', background: '#F8FAFC' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px 32px' }}>
        <div style={{
          background: 'white',
          borderRadius: 24,
          padding: 24,
          border: '1px solid #E2E8F0',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
        }}
        >
          <h1 style={{ margin: '0 0 12px', fontSize: 28, color: '#0F172A' }}>
            Supabase fehlt noch
          </h1>
          <p style={{ margin: '0 0 18px', color: '#475569', lineHeight: 1.6 }}>
            Die App ist jetzt auf Anmeldung und gemeinsame Synchronisation vorbereitet. Damit sie startet, müssen die Supabase-Umgebungsvariablen gesetzt werden.
          </p>

          <div style={codeBlockStyle}>
            VITE_SUPABASE_URL=...
            <br />
            VITE_SUPABASE_ANON_KEY=...
          </div>

          <p style={{ margin: '18px 0 8px', fontWeight: 600, color: '#0F172A' }}>
            Im Repository vorbereitet:
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', lineHeight: 1.7 }}>
            <li>`docs/supabase-setup.md` mit den Einrichtungsschritten</li>
            <li>`supabase/schema.sql` mit Tabellen, Policies und Triggern</li>
            <li>`src/pages/AuthPage.tsx` fur Login und Registrierung</li>
          </ul>
        </div>
      </div>
    </Page>
  )
}

const codeBlockStyle: React.CSSProperties = {
  background: '#0F172A',
  color: '#E2E8F0',
  borderRadius: 16,
  padding: '14px 16px',
  fontSize: 14,
  lineHeight: 1.6,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}
