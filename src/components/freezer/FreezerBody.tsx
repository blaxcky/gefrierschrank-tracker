import type { ReactNode } from 'react'

interface FreezerBodyProps {
  children: ReactNode
}

export default function FreezerBody({ children }: FreezerBodyProps) {
  return (
    <div
      style={{
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 8,
        paddingBottom: 'calc(16px + var(--sab))',
      }}
    >
      {children}
    </div>
  )
}
